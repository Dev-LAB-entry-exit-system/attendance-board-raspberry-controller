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

async function updateUserRegister(name, ledId, ip, res) {
    // 1. Delete any existing user that has this exact ledId
    userRegistry = userRegistry.filter(user => user.ledId !== ledId);

    // Update if IP already exists, otherwise add new
    const index = userRegistry.findIndex(u => u.ip === ip);
    if (index !== -1) {
        userRegistry[index] = { name, ledId, ip: ip };
    } else {
        userRegistry.push({ name, ledId, ip: ip });
    }

    try {
        await saveUserRegistry();
        res.status(201).json({ message: "User registered successfully", registry: userRegistry });
    } catch (error) {
        res.status(500).json({ error: "Failed to save user registry" });
    }
}

// 1. Registration Endpoint
// POST: { "name": "Alice", "ledId": 1, "ip": "192.168.1.15" }
app.post('/api/register', async (req, res) => {
    const { name, ledId, ip } = req.body;

    // This will be the Public IP if they are on the internet.
    // It will be the Private IP if they are on the same WiFi as the server.
    const clientIp = (req.ip || req.socket.remoteAddress).replace('::ffff:', '');
    console.log('POST from:', clientIp);

    const finalIpAddress = ip ? ip : clientIp;

    if (!name || ledId === undefined || !finalIpAddress) {
        console.error('Missing name, ledId or ip address', name, ledId, ip);
        return res.status(400).json({ error: "Missing required fields: name, ledId, or ip" });
    } else if (net.isIP(finalIpAddress) !== 4) {
        console.error('Invalid ip address');
        return res.status(400).json({ error: "Invalid IP address format provided." });
    }

    await updateUserRegister(name, ledId, finalIpAddress, res);
});

// 2. Extended Device Scan Endpoint
app.get('/api/devices', async (req, res) => {
    try {
        const discoveredDevices = await findLocalDevices();

        // This will be the Public IP if they are on the internet.
        // It will be the Private IP if they are on the same WiFi as the server.
        const clientIp = (req.ip || req.socket.remoteAddress).replace('::ffff:', '');
        console.log('GET from:', clientIp);

        // Map through discovered devices and "attach" user info if a match is found
        const results = discoveredDevices.map(device => {
            const user = userRegistry.find(u => u.ip === device.ip);
            return {
                ip: device.ip,
                mac: device.mac,
                name: user ? user.name : "Unknown",
                ledId: user ? user.ledId : null,
                isRegistered: !!user
            };
        });

        res.json({
            count: results.length,
            activeUsers: results.filter(d => d.isRegistered),
            allDevices: results
        });
    } catch (error) {
        res.status(500).json({ error: "Scan failed" });
    }
});

loadUserRegistry().finally(() => {
    app.listen(PORT, () => console.log(`Scanner running on port ${PORT}`));
});