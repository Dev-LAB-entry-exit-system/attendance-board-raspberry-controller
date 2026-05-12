const express = require('express');
const findLocalDevices = require('local-devices');
const fs = require('fs/promises');
const path = require('path');

const app = express();
app.use(express.json()); // Middleware to parse JSON bodies

// Allow cross-origin requests from the Vue dev server
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

const PORT = 3000;
const REGISTRY_FILE = path.join(__dirname, 'users.json');

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

// 1. Registration Endpoint
// POST: { "name": "Alice", "ledId": 1, "ip": "192.168.1.15" }
app.post('/api/register', async (req, res) => {
    const { name, ledId, ip } = req.body;

    if (!name || ledId === undefined || !ip) {
        return res.status(400).json({ error: "Missing required fields: name, ledId, or ip" });
    }

    // Update if IP already exists, otherwise add new
    const index = userRegistry.findIndex(u => u.ip === ip);
    if (index !== -1) {
        userRegistry[index] = { name, ledId, ip };
    } else {
        userRegistry.push({ name, ledId, ip });
    }

    try {
        await saveUserRegistry();
        res.status(201).json({ message: "User registered successfully", registry: userRegistry });
    } catch (error) {
        res.status(500).json({ error: "Failed to save user registry" });
    }
});

// 2. Extended Device Scan Endpoint
app.get('/api/devices', async (req, res) => {
    try {
        const discoveredDevices = await findLocalDevices();

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