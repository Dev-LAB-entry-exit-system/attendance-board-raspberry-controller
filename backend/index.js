const express = require('express');
const findLocalDevices = require('local-devices');
const fs = require('fs/promises');
const path = require('path');
const net = require('net');
const cors = require('cors')

const app = express();
const PORT = 3000;
const REGISTRY_FILE = path.join(__dirname, 'users.json');
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
// Format: { name: String, ledId: Number, ip: String }
let userRegistry = [];
let deviceCache = [];
let lastScanTime = 0;
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

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

async function updateUserRegister(name, ledId, mac, res) {
    // Delete any existing user that has this exact ledId
    userRegistry = userRegistry.filter(user => user.ledId !== ledId);

    // Update if MAC already exists, otherwise add new
    const normalizedMac = mac.toLowerCase();
    const index = userRegistry.findIndex(u => u.mac === normalizedMac);
    if (index !== -1) {
        userRegistry[index] = { name, ledId, mac: normalizedMac };
    } else {
        userRegistry.push({ name, ledId, mac: normalizedMac });
    }

    try {
        await saveUserRegistry();
        res.status(201).json({ message: "User registered successfully", registry: userRegistry });
    } catch (error) {
        res.status(500).json({ error: "Failed to save user registry" });
    }
}

async function fetchLocalDevicesList(force = false) {
    const currentTime = Date.now();

    // Check if cache is expired or empty
    if (currentTime - lastScanTime > CACHE_TTL_MS || deviceCache.length === 0 || force) {
        deviceCache = await findLocalDevices();
        lastScanTime = currentTime;
        console.log(`[${new Date().toISOString()}] Performed fresh network scan.`);
        return true;
    }
    return false;
}

async function getLocalDeviceList () {
    await fetchLocalDevicesList();

    // Map through discovered devices and "attach" user info if a match is found
    return deviceCache.map(device => {
        const normalizedDeviceMac = device.mac.toLowerCase();
        const user = userRegistry.find(u => u.mac === normalizedDeviceMac);
        return {
            ip: device.ip,
            mac: device.mac,
            name: user ? user.name : "Unknown",
            ledId: user ? user.ledId : null,
            isRegistered: !!user
        };
    });
}

function getIP(req) {
    return (req.ip || req.socket.remoteAddress).replace('::ffff:', '');
}

async function getMac(ip) {
    const devices = await getLocalDeviceList();

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
    const { name, ledId, ip } = req.body;
    await fetchLocalDevicesList(true);

    // This will be the Public IP if they are on the internet.
    // It will be the Private IP if they are on the same WiFi as the server.
    const clientIp = getIP(req);
    console.log(`[${new Date().toISOString()}] POST from:`, clientIp);

    const finalIpAddress = ip ? ip : clientIp;

    if (!name || ledId === undefined || !finalIpAddress) {
        console.error(`[${new Date().toISOString()}] Missing name, ledId or ip address`, name, ledId, ip);
        return res.status(400).json({ error: "Missing required fields: name, ledId, or ip" });
    } else if (net.isIP(finalIpAddress) !== 4) {
        console.error(`[${new Date().toISOString()}] Invalid ip address`);
        return res.status(400).json({ error: "Invalid IP address format provided." });
    }

    const finalMac = await getMac(finalIpAddress);

    if (!finalMac) {
        console.error(`[${new Date().toISOString()}] Could not identify MAC address for IP:`, finalIpAddress);
        return res.status(400).json({ error: "MAC address cannot be identified." });
    }

    await updateUserRegister(name, ledId, finalMac, res);
});

// 2. Extended Device Scan Endpoint
app.get('/api/devices', async (req, res) => {
    try {
        const currentTime = Date.now();
        let fromCache = !(await fetchLocalDevicesList());

        console.log(`[${new Date().toISOString()}] GET from:`, getIP(req));

        const results =  await getLocalDeviceList();

        res.json({
            meta: {
                fromCache,
                cacheAgeSeconds: Math.round((currentTime - lastScanTime) / 1000)
            },
            count: results.length,
            activeUsers: results.filter(d => d.isRegistered),
            allDevices: results
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Scan failed:`, error);
        res.status(500).json({ error: "Scan failed" });
    }
});

loadUserRegistry().finally(() => {
    app.listen(PORT, () => console.log(`Scanner running on port ${PORT}`));
});