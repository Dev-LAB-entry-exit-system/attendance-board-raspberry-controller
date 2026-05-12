const express = require('express');
const findLocalDevices = require('local-devices');

const app = express();
app.use(express.json()); // Middleware to parse JSON bodies
const PORT = 3000;

// In-memory storage for our users
// Format: { name: String, ledId: Number, ip: String }
let userRegistry = [];

// 1. Registration Endpoint
// POST: { "name": "Alice", "ledId": 1, "ip": "192.168.1.15" }
app.post('/api/register', (req, res) => {
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

    res.status(201).json({ message: "User registered successfully", registry: userRegistry });
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

app.listen(PORT, () => console.log(`Scanner running on port ${PORT}`));