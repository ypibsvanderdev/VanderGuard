const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 4444;
const BASE_URL = process.env.BASE_URL || `https://vander-guard.onrender.com`;
const FIREBASE_URL = 'https://vanderhub-default-rtdb.firebase.com/vander_guard.json';

// --- CLOUD SYNC ENGINE ---
const db = {
    vault: {},
    users: [],
    registry: { whitelist: [], blacklist: [] },
    threats: [],
    messages: [],
    settings: {
        globalKillSwitch: false,
        antiDump: true,
        autoBlacklist: true,
        privacyMode: false
    }
};

async function syncToCloud() {
    try {
        await axios.put(FIREBASE_URL, db);
        console.log("[GUARD]: Network state persisted to Firebase.");
    } catch (e) {
        console.error("[GUARD]: Persistence failed:", e.message);
    }
}

async function loadFromCloud() {
    try {
        const res = await axios.get(FIREBASE_URL);
        if (res.data) {
            db.vault = res.data.vault || {};
            db.users = res.data.users || [];
            db.registry = res.data.registry || { whitelist: [], blacklist: [] };
            db.threats = res.data.threats || [];
            db.messages = res.data.messages || [];
            db.settings = res.data.settings || { globalKillSwitch: false, antiDump: true, autoBlacklist: true, privacyMode: false };
            console.log("[GUARD]: Network protocols loaded successfully.");
        } else {
            console.log("[GUARD]: Initializing new network protocols...");
            await syncToCloud();
        }
    } catch (e) {
        console.error("[GUARD]: Protocol load failed:", e.message);
    }
}

// Initial Load
loadFromCloud();

const JWT_SECRET = 'VANDER-GUARD-ULTRA-SECURE-999';
const GOOGLE_CLIENT_ID = '945575151017-o0mh8usjvn9r23lnid2th5g13qg8lpgv.apps.googleusercontent.com';
const gClient = new OAuth2Client(GOOGLE_CLIENT_ID);

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// --- AUTH MIDDLEWARE ---
const authenticate = (req, res, next) => {
    const token = req.cookies.vander_session;
    if (!token) return res.status(401).json({ error: "UNAUTHORIZED: Security Clearance Required." });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: "CLEARANCE EXPIRED: Please re-authenticate." });
    }
};

// --- VANDER GUARD ENGINE ---
class VanderGuardEngine {
    constructor() {
        this.metrics = { total_crypts: 0, threats_neutralized: 0, active_users: 124 };
        setInterval(() => this.updateMetrics(), 10000);
    }
    updateMetrics() {
        this.metrics.threats_neutralized = db.threats.length;
        this.metrics.total_crypts = Object.keys(db.vault).length;
    }
}
const engine = new VanderGuardEngine();

app.get('/api/analytics', authenticate, (req, res) => res.json({ ...engine.metrics, uptime: process.uptime(), server_status: "SHIELD_ACTIVE" }));
app.get('/api/threats', authenticate, (req, res) => res.json(db.threats));

app.delete('/api/scripts/:name', authenticate, (req, res) => {
    const fileName = req.params.name.replace(/\./g, '_dot_');
    const file = db.vault[fileName];
    if (file) {
        if (file.owner !== req.user.email && req.user.email !== 'meqda@gmail.com') {
            return res.status(403).json({ error: "Only the author can shred this asset." });
        }
        delete db.vault[fileName];
        syncToCloud();
        res.json({ success: true });
    } else res.status(404).json({ error: "Asset not found" });
});

app.post('/api/messages/send', authenticate, (req, res) => {
    const { to, content, type = 'text', scriptName = null } = req.body;
    if (!to || !content) return res.status(400).json({ error: "Recipient and data required." });

    const msg = {
        id: crypto.randomUUID(),
        from: req.user.username,
        to,
        content,
        type,
        scriptName,
        timestamp: new Date().toISOString(),
        read: false
    };

    db.messages.push(msg);

    if (type === 'invite' && scriptName) {
        const fileName = scriptName.replace(/\./g, '_dot_');
        if (db.vault[fileName] && !db.vault[fileName].sharedWith.includes(to)) {
            db.vault[fileName].sharedWith.push(to);
        }
    }

    syncToCloud();
    res.json({ success: true });
});

app.get('/api/messages', authenticate, (req, res) => {
    const userMsgs = db.messages.filter(m => m.to === req.user.username).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(userMsgs);
});

app.get('/api/settings', authenticate, (req, res) => res.json(db.settings));
app.post('/api/settings', authenticate, (req, res) => {
    if (req.user.email !== 'meqda@gmail.com') return res.status(403).json({ error: "Root access required for protocol changes." });
    db.settings = { ...db.settings, ...req.body };
    syncToCloud();
    res.json({ success: true, settings: db.settings });
});

const ACCESS_DENIED_HTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Access Denied | VanderGuard</title>
    <style>
        body { background: #000; color: #fff; font-family: 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; overflow: hidden; }
        .container { text-align: center; }
        .shield { font-size: 80px; margin-bottom: 20px; display: block; filter: drop-shadow(0 0 20px #00f2ff) drop-shadow(0 0 40px #ff4d00); animation: pulse 2s infinite ease-in-out; }
        h1 { font-size: 28px; letter-spacing: 2px; font-weight: 800; margin: 0; text-transform: uppercase; color: #fff; }
        p { color: #808080; font-size: 10px; letter-spacing: 1px; font-weight: 600; margin-top: 10px; text-transform: uppercase; }
        @keyframes pulse { 0% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.05); opacity: 1; } 100% { transform: scale(1); opacity: 0.8; } }
    </style>
</head>
<body>
    <div class="container">
        <span class="shield">🛡️</span>
        <h1>VANDER GUARD: ACCESS DENIED</h1>
        <p>INTEGRITY CHALLENGE FAILED | SECURITY PROTOCOL 403-X</p>
    </div>
</body>
</html>`;

const accessLogs = {};

function validateAccess(req) {
    const ua = (req.headers['user-agent'] || '').toLowerCase();
    const h = req.headers;
    const ip = req.ip;
    const accept = (h['accept'] || '').toLowerCase();

    if (db.registry.blacklist.includes(ip) && !ua.includes('roblox')) return false;

    accessLogs[ip] = accessLogs[ip] || { attempts: 0 };

    const hardFingerprints = ['sec-ch-ua', 'sec-ch-ua-mobile', 'sec-ch-ua-platform', 'sec-fetch-user', 'sec-fetch-dest', 'sec-fetch-mode', 'sec-fetch-site'];
    const hasHardFingerprint = hardFingerprints.some(key => h[key]);

    const whitelist = ['delta', 'fluxus', 'codex', 'arceus', 'hydrogen', 'vegax', 'robloxproxy', 'android', 'iphone', 'ipad'];
    const isWhitelisted = whitelist.some(k => ua.includes(k));
    const isRobloxEngine = ua.includes('roblox') || ua === 'roblox/wininet';

    if (hasHardFingerprint || accept.includes('text/html') || (!isWhitelisted && !isRobloxEngine)) {
        accessLogs[ip].attempts++;
        if (accessLogs[ip].attempts >= 5) {
            if (!db.registry.blacklist.includes(ip)) {
                db.registry.blacklist.push(ip);
                syncToCloud();
            }
        }
        return false;
    }

    accessLogs[ip].attempts = 0;
    return true;
}

app.get('/raw/:name', (req, res) => {
    if (!validateAccess(req)) {
        db.threats.unshift({ ip: req.ip, method: "ILLEGAL_FETCH_ATTEMPT", time: new Date().toISOString(), userAgent: req.headers['user-agent'] });
        syncToCloud();

        if (db.settings.antiDump) {
            const junkHex = crypto.randomBytes(400 * 1024).toString('hex');
            const garbage = `--[[ VANDER GUARD SECURITY: DUMP ATTEMPT LOGGED ]]\nlocal _ = "${junkHex}"\nwhile true do end`;
            return res.status(200).set('Content-Type', 'text/plain').send(garbage);
        }
        return res.status(403).send(ACCESS_DENIED_HTML);
    }

    const fileName = (req.params.name.endsWith('.lua') ? req.params.name : req.params.name + '.lua').replace(/\./g, '_dot_');
    const file = db.vault[fileName];

    if (file) {
        res.setHeader('Content-Type', 'text/plain');
        res.send(file.source);
    } else res.status(404).send("-- VANDER GUARD: Asset not located.");
});

app.get('/api/scripts', authenticate, (req, res) => {
    try {
        const scripts = Object.keys(db.vault)
            .filter(key => {
                const f = db.vault[key];
                return f.owner === req.user.email || (f.sharedWith && f.sharedWith.includes(req.user.email)) || req.user.email === 'meqda@gmail.com';
            })
            .map(key => {
                const f = db.vault[key];
                return {
                    name: key.replace(/_dot_/g, '.'),
                    size: f.source.length,
                    date: f.createdAt,
                    isOwner: f.owner === req.user.email
                };
            });
        res.json({ success: true, scripts });
    } catch (e) { res.json({ success: false, scripts: [] }); }
});

app.get('/api/scripts/:name', authenticate, (req, res) => {
    const fileName = (req.params.name.endsWith('.lua') ? req.params.name : req.params.name + '.lua').replace(/\./g, '_dot_');
    const file = db.vault[fileName];
    if (file) {
        if (file.owner !== req.user.email && (!file.sharedWith || !file.sharedWith.includes(req.user.email)) && req.user.email !== 'meqda@gmail.com') {
            return res.status(403).json({ error: "ACCESS DENIED: Insufficient permissions." });
        }
        res.json({ success: true, content: file.source });
    } else res.status(404).json({ error: "Asset not found." });
});

app.post('/api/auth/login', async (req, res) => {
    const { password, email } = req.body;
    if (password !== 'Eman165*') return res.status(401).json({ error: "INVALID CREDENTIALS" });

    const user = { id: 'admin', email: 'meqda@gmail.com', name: 'VanderAdmin' };
    const token = jwt.sign({ id: user.id, email: user.email, username: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('vander_session', token, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
});

app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('vander_session');
    res.json({ success: true });
});

app.get('/api/auth/me', authenticate, (req, res) => res.json({ success: true, user: req.user }));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(` VANDER GUARD REBORN ONLINE`);
    console.log(` PORT: ${PORT}`);
    console.log(`========================================\n`);
});
