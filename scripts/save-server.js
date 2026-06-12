const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const ROOT = path.join(__dirname, '..');
const LEVELS = path.join(ROOT, 'levels.json');

app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
 res.header('Access-Control-Allow-Origin', 'http://localhost:8080');
 res.header('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
 res.header('Access-Control-Allow-Headers', 'Content-Type');
 if (req.method === 'OPTIONS') return res.sendStatus(200);
 next();
});

app.get('/levels.json', (req, res) => {
 res.sendFile(LEVELS);
});

app.put('/levels.json', (req, res) => {
 if (!req.body || !req.body.levels) {
 return res.status(400).json({ error: 'body must have .levels' });
 }
 try {
 fs.writeFileSync(LEVELS, JSON.stringify(req.body, null, 2));
 res.json({ ok: true });
 } catch (e) {
 res.status(500).json({ error: e.message });
 }
});

app.listen(8081, () => console.log('save-server on :8081'));
