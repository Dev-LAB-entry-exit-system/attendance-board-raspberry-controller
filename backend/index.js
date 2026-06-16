require('dotenv').config();

const express = require('express');
const findLocalDevices = require('local-devices');
const fs = require('fs/promises');
const path = require('path');
const net = require('net');
const cors = require('cors');
const discordMirror = require('./discord');

// Import the LED control function from led_controller.js
const { updateLeds, testLedControl } = require('./led_controller');

const app = express();
const PORT = 3000;
const REGISTRY_FILE = path.join(__dirname, 'users.json');

// Presence detection: scan often, require multiple hits per minute to reduce false positives.
// Example default: 6 scans/min (every 10s), present if seen in at least 4 of the last 6 scans.
const SCAN_INTERVAL_MS = Number(process.env.SCAN_INTERVAL_MS) || 30 * 1000;
const SCANS_PER_WINDOW = Number(process.env.SCANS_PER_WINDOW) || 6;
const PRESENCE_THRESHOLD = Number(process.env.PRESENCE_THRESHOLD) || 1;
const LOG_PRESENCE = process.env.LOG_PRESENCE === 'true';

// mac -> last LAN isPresent (for transition log lines)
const previousPresenceState = new Map();

const corsOptions = {
    origin: ['http://localhost:8080'], // allowed origins
    methods: ['GET', 'POST', 'OPTIONS'], // allowed HTTP methods
    allowedHeaders: ['Content-Type'], // allowed headers
    optionsSuccessStatus: 204 // Translates the OPTIONS preflight check and 204 response
};

app.use(express.json()); // Middleware to parse JSON bodies

// Allow cross-origin requests from the Vue dev server
app.use(cors(corsOptions));

// Tell Express it is sitting behind a proxy (like Vite, Nginx, or a Load Balancer)
app.set('trust proxy', true);

// In-memory storage for our users (persisted to users.json)
// Format: { name: String, ledId: Number, mac: String, discordId?: String }
let userRegistry = [];
let deviceCache = [];
let lastScanTime = 0;
let scanInProgress = false;
// mac (lowercase) -> recent scan results (true = seen on LAN)
const presenceHistory = new Map();

async function loadUserRegistry() {
    try {
        const data = await fs.readFile(REGISTRY_FILE, 'utf8');
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
            userRegistry = parsed;
        } else {
            userRegistry = [];
        }
    } catch (error) {
        // ENOENT means users.json does not exist yet; start empty.
        if (error.code !== 'ENOENT') {
            console.error('Failed to load users.json:', error);
        }
        userRegistry = [];
    }
}

async function saveUserRegistry() {
    await fs.writeFile(REGISTRY_FILE, JSON.stringify(userRegistry, null, 2), 'utf8');
}

function normalizeDiscordId(id) {
    if (id === undefined || id === null || id === '') {
        return undefined;
    }
    const s = String(id).trim();
    if (!/^\d{17,20}$/.test(s)) {
        return undefined;
    }
    return s;
}

async function updateUserRegister(name, ledId, mac, res, discordId) {
    // Delete any existing user that has this exact ledId
    userRegistry = userRegistry.filter(user => user.ledId !== ledId);

    // Update if MAC already exists, otherwise add new
    const normalizedMac = mac.toLowerCase();
    const index = userRegistry.findIndex(u => u.mac === normalizedMac);
    const normalizedDiscord = normalizeDiscordId(discordId);
    const preservedDiscord =
        index !== -1 ? normalizeDiscordId(userRegistry[index].discordId) : undefined;

    const entry = { name, ledId, mac: normalizedMac };
    if (normalizedDiscord) {
        entry.discordId = normalizedDiscord;
    } else if (preservedDiscord) {
        entry.discordId = preservedDiscord;
    }

    if (index !== -1) {
        userRegistry[index] = entry;
    } else {
        userRegistry.push(entry);
    }

    try {
        await saveUserRegistry();
        res.status(201).json({ message: "User registered successfully", registry: userRegistry });
    } catch (error) {
        res.status(500).json({ error: "Failed to save user registry" });
    }
}

function normalizeMac(mac) {
    return mac.toLowerCase();
}

function getPresenceHits(mac) {
    const history = presenceHistory.get(normalizeMac(mac)) || [];
    return history.filter(Boolean).length;
}

function isUserPresent(mac) {
    const history = presenceHistory.get(normalizeMac(mac)) || [];
    if (history.length < SCANS_PER_WINDOW) {
        return false;
    }
    return history.filter(Boolean).length >= PRESENCE_THRESHOLD;
}

function recordScanPresence(detectedMacs) {
    const detectedSet = new Set(detectedMacs.map(normalizeMac));

    for (const user of userRegistry) {
        const mac = normalizeMac(user.mac);
        if (!presenceHistory.has(mac)) {
            presenceHistory.set(mac, []);
        }
        const history = presenceHistory.get(mac);
        history.push(detectedSet.has(mac));
        while (history.length > SCANS_PER_WINDOW) {
            history.shift();
        }
    }
}

function formatHistoryDots(history) {
    if (history.length === 0) {
        return '(no data yet)';
    }
    return history.map(seen => (seen ? '●' : '○')).join('');
}

function getPresenceStatusLabel(mac) {
    const history = presenceHistory.get(normalizeMac(mac)) || [];
    if (history.length < SCANS_PER_WINDOW) {
        return `WARMING UP (${history.length}/${SCANS_PER_WINDOW})`;
    }
    return isUserPresent(mac) ? 'PRESENT' : 'ABSENT';
}

function logPresenceToConsole() {
    if (!LOG_PRESENCE) {
        return;
    }

    const timestamp = new Date().toISOString();
    const activeCount = getActiveUsers().length;
    console.log('');
    console.log(`── Scan @ ${timestamp} ──`);
    console.log(
        `  LAN devices: ${deviceCache.length} | ` +
        `Present: ${activeCount}/${userRegistry.length} | ` +
        `Rule: ${PRESENCE_THRESHOLD}+ hits in last ${SCANS_PER_WINDOW} scans` +
            (discordMirror.isDiscordRoleSyncEnabled() ? ' | Discord at HILab role sync: ON' : '')
    );

    if (userRegistry.length === 0) {
        console.log('  (no registered users in users.json)');
        console.log('────────────────────────────');
        return;
    }

    for (const user of userRegistry) {
        const mac = normalizeMac(user.mac);
        const key = mac;
        const history = presenceHistory.get(mac) || [];
        const hits = history.filter(Boolean).length;
        const seenNow = deviceCache.some(d => normalizeMac(d.mac) === mac);
        const present = isUserPresent(mac);
        const warmingUp = history.length < SCANS_PER_WINDOW;
        const status = getPresenceStatusLabel(mac);
        const device = deviceCache.find(d => normalizeMac(d.mac) === mac);
        const ip = device ? device.ip : '-';

        const prev = previousPresenceState.get(key);
        if (prev !== undefined && prev !== present && !warmingUp) {
            const change = present ? '→ IN ROOM' : '→ LEFT';
            console.log(`  ★ ${user.name} ${change}`);
        }
        previousPresenceState.set(key, present);

        const discordNote = normalizeDiscordId(user.discordId) ? ' | Discord: mirror at HILab' : '';
        console.log(
            `  ${user.name} (LED ${user.ledId})` +
            ` | ${hits}/${SCANS_PER_WINDOW} ${formatHistoryDots(history)}` +
            ` | this scan: ${seenNow ? 'seen' : '---'}` +
            ` | IP: ${ip}` +
            ` | ${status}` +
            discordNote
        );
    }

    console.log('────────────────────────────');
}

async function performBackgroundScan() {
    if (scanInProgress) {
        if (LOG_PRESENCE) {
            console.log(`[${new Date().toISOString()}] Scan skipped (previous scan still running)`);
        }
        return false;
    }

    scanInProgress = true;
    try {
        deviceCache = await findLocalDevices();
        lastScanTime = Date.now();
        recordScanPresence(deviceCache.map(device => device.mac));
        logPresenceToConsole();
        await discordMirror.syncDiscordRolesFromLanPresence(userRegistry, presenceHistory, isUserPresent, normalizeDiscordId);

        const activeUsers = getActiveUsers();
        const activeLedIds = [...new Set(activeUsers.map(u => u.ledId).filter(id => id !== null && id !== undefined))];
        updateLeds(activeLedIds, LOG_PRESENCE);

        return true;
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Background scan failed:`, error);
        return false;
    } finally {
        scanInProgress = false;
    }
}

function startBackgroundScanner() {
    performBackgroundScan();
    setInterval(performBackgroundScan, SCAN_INTERVAL_MS);
    console.log(
        `Presence scanner: every ${SCAN_INTERVAL_MS / 1000}s, ` +
        `present if >= ${PRESENCE_THRESHOLD}/${SCANS_PER_WINDOW} scans in window`
    );
    if (LOG_PRESENCE) {
        console.log('Presence console log: ON');
    }
}

function getLocalDeviceList() {
    return deviceCache.map(device => {
        const normalizedDeviceMac = normalizeMac(device.mac);
        const user = userRegistry.find(u => normalizeMac(u.mac) === normalizedDeviceMac);
        const registered = !!user;
        return {
            ip: device.ip,
            mac: device.mac,
            name: user ? user.name : "Unknown",
            ledId: user ? user.ledId : null,
            isRegistered: registered,
            seenInLatestScan: true,
            isPresent: registered && isUserPresent(user.mac),
            presenceSource: registered ? 'lan' : null,
            presenceHits: registered ? getPresenceHits(device.mac) : null,
            presenceScans: registered ? (presenceHistory.get(normalizedDeviceMac) || []).length : null
        };
    });
}

function getActiveUsers() {
    return userRegistry
        .filter(user => isUserPresent(user.mac))
        .map(user => {
            const mac = normalizeMac(user.mac);
            const device = deviceCache.find(d => normalizeMac(d.mac) === mac);
            const history = presenceHistory.get(mac) || [];
            return {
                name: user.name,
                ledId: user.ledId,
                mac: user.mac,
                discordId: user.discordId || null,
                ip: device ? device.ip : null,
                presenceSource: 'lan',
                presenceHits: history.filter(Boolean).length,
                presenceScans: history.length,
                isPresent: true
            };
        });
}

function getIP(req) {
    return (req.ip || req.socket.remoteAddress).replace('::ffff:', '');
}

async function getMac(ip) {
    const devices = getLocalDeviceList();

    const index = devices.findIndex(device => device.ip === ip);
    if (index !== -1) {
        return devices[index].mac.toLowerCase();
    } else {
        return null;
    }
}

// 1. Registration Endpoint
// POST: { "name": "Alice", "ledId": 1, "ip": "192.168.1.15" }
app.post('/api/register', async (req, res) => {
    try {
        const {name, ledId, ip, discordId} = req.body;
        await performBackgroundScan();

        const clientIp = getIP(req);
        console.log(`[${new Date().toISOString()}] POST /api/register from:`, clientIp);

        const finalIpAddress = ip ? ip : clientIp;

        if (!name || ledId === undefined || !finalIpAddress) {
            console.error(`[${new Date().toISOString()}] Missing name, ledId or ip address`, name, ledId, ip);
            return res.status(400).json({error: "Missing required fields: name, ledId, or ip"});
        } else if (net.isIP(finalIpAddress) !== 4) {
            console.error(`[${new Date().toISOString()}] Invalid ip address`);
            return res.status(400).json({error: "Invalid IP address format provided."});
        }

        const finalMac = await getMac(finalIpAddress);

        if (!finalMac) {
            console.error(`[${new Date().toISOString()}] Could not identify MAC address for IP:`, finalIpAddress);
            return res.status(400).json({error: "MAC address cannot be identified."});
        }

        if (discordId !== undefined && discordId !== null && discordId !== '') {
            if (!normalizeDiscordId(discordId)) {
                console.error(`[${new Date().toISOString()}] Invalid discordId`);
                return res.status(400).json({error: "Invalid discordId (use numeric snowflake)"});
            }
        }

        await updateUserRegister(name, ledId, finalMac, res, discordId);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Registration failed critically:`, error);
        res.status(500).json({ error: "Registration failed" });
    }
});

// 2. Extended Device Scan Endpoint
app.get('/api/devices', async (req, res) => {
    try {
        const activeUsers = getActiveUsers();
        if (LOG_PRESENCE) {
            console.log(
                `[${new Date().toISOString()}] GET /api/devices from ${getIP(req)}` +
                ` → ${activeUsers.length} present` +
                (activeUsers.length > 0
                    ? ` (${activeUsers.map(u => u.name).join(', ')})`
                    : '')
            );
        }

        const results = getLocalDeviceList();

        res.json({
            meta: {
                lastScanAgeSeconds: lastScanTime
                    ? Math.round((Date.now() - lastScanTime) / 1000)
                    : null,
                scanIntervalSeconds: SCAN_INTERVAL_MS / 1000,
                scansPerWindow: SCANS_PER_WINDOW,
                presenceThreshold: PRESENCE_THRESHOLD,
                discordRoleSync: discordMirror.isDiscordRoleSyncEnabled(),
                atHilabRoleId: discordMirror.getDiscordMeta().atHilabRoleId,
                atHilabRoleName: discordMirror.getDiscordMeta().atHilabRoleName
            },
            count: results.length,
            activeUsers,
            allDevices: results
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Scan failed:`, error);
        res.status(500).json({ error: "Scan failed" });
    }
});

app.get('/api/whoami', async (req, res) => {
    try {
        await performBackgroundScan();

        const clientIp = getIP(req);
        console.log(`[${new Date().toISOString()}] GET /api/whoami from:`, clientIp);

        if (net.isIP(clientIp) !== 4) {
            console.error(`[${new Date().toISOString()}] Invalid ip address`);
            return res.status(400).json({error: "Could not check IP address"});
        }

        const finalMac = await getMac(clientIp);

        if (!finalMac) {
            console.error(`[${new Date().toISOString()}] Could not identify MAC address for IP:`, clientIp);
            return res.status(400).json({error: "Who am I check failed: MAC address cannot be identified."});
        }

        const index = userRegistry.findIndex(u => u.mac === finalMac);
        let isRegistered = false;
        let userResult = {};

        if (index !== -1) {
            isRegistered = true;
            userResult = userRegistry[index];
            userResult.ip = clientIp;
        }

        return res.status(200).json({
            isRegistered,
            user: userResult,
            clientIp: clientIp
        })
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Who am I check failed:`, error);
        res.status(500).json({ error: "Who am I check failed" });
    }
});

loadUserRegistry().finally(() => {
    //testLedControl();
    app.listen(PORT, () => {
        console.log(`Scanner running on port ${PORT}`);
        console.log(`Registered users: ${userRegistry.length}`);
        if (userRegistry.length > 0 && LOG_PRESENCE) {
            for (const user of userRegistry) {
                console.log(
                    `  - ${user.name} (LED ${user.ledId}, MAC ${user.mac}` +
                    `${user.discordId ? `, Discord ${user.discordId}` : ''})`
                );
            }
        }
        discordMirror.startDiscordPresenceBot(() =>
            discordMirror.syncDiscordRolesFromLanPresence(userRegistry, presenceHistory, isUserPresent, normalizeDiscordId)
        );
        startBackgroundScanner();
    });
});