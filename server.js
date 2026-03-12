const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 4444;
const BASE_URL = process.env.BASE_URL || `https://vander-guard.onrender.com`;
const FIREBASE_URL = 'https://vanderhub-default-rtdb.firebase.com/vander_guard_reborn.json';

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
        console.log("[VANDER GUARD]: Matrix states synced to cloud.");
    } catch (e) {
        console.error("[VANDER GUARD]: Sync error:", e.message);
    }
}

async function loadFromCloud() {
    try {
        const res = await axios.get(FIREBASE_URL);
        if (res.data) {
            Object.assign(db, res.data);
            console.log("[VANDER GUARD]: Protocols established.");
        } else {
            await syncToCloud();
        }
    } catch (e) {
        console.error("[VANDER GUARD]: Protocol failure:", e.message);
    }
}

loadFromCloud();

const JWT_SECRET = 'VANDER-GUARD-REBORN-SECRET-X';
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// --- AUTH MIDDLEWARE ---
const authenticate = (req, res, next) => {
    const token = req.cookies.vander_session;
    if (!token) return res.status(401).json({ error: "Access Denied: Clearance Level 0." });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: "Session Expired: Re-authorize." });
    }
};

// --- CORE ENGINE ---
app.get('/api/analytics', authenticate, (req, res) => {
    res.json({
        total_crypts: Object.keys(db.vault).length,
        threats_neutralized: db.threats.length,
        active_users: 142,
        server_status: "NOMINAL"
    });
});

app.get('/api/scripts', authenticate, (req, res) => {
    const scripts = Object.keys(db.vault).map(key => {
        const f = db.vault[key];
        return {
            name: key.replace(/_dot_/g, '.'),
            size: f.source.length,
            date: f.createdAt
        };
    });
    res.json({ success: true, scripts });
});

app.get('/api/scripts/:name', authenticate, (req, res) => {
    const fileName = req.params.name.replace(/\./g, '_dot_');
    const file = db.vault[fileName];
    if (file) res.json({ success: true, content: file.source });
    else res.status(404).json({ error: "No asset found." });
});

app.post('/api/auth/login', (req, res) => {
    const { password } = req.body;
    if (password !== 'Eman165*') return res.status(401).json({ success: false });

    const user = { id: 'admin', name: 'Vander Admin', email: 'meqda@gmail.com' };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('vander_session', token, { httpOnly: true, secure: true, sameSite: 'strict' });
    res.json({ success: true, user });
});

app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('vander_session');
    res.json({ success: true });
});

// --- PROTECTION LOGIC ---
const ACCESS_DENIED_PAGE = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Access Denied | VanderGuard</title>
    <style>
        body { background: #000; color: #fff; font-family: 'Inter', sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; overflow: hidden; }
        .box { text-align: center; border: 1px solid #da3633; padding: 40px; border-radius: 12px; background: #0d1117; box-shadow: 0 0 30px rgba(218, 54, 51, 0.4); }
        h1 { font-size: 40px; margin: 0; letter-spacing: 5px; color: #da3633; }
        p { color: #8b949e; margin-top: 10px; font-size: 14px; text-transform: uppercase; }
        .icon { font-size: 60px; margin-bottom: 20px; animation: pulse 1.5s infinite; }
        @keyframes pulse { 0% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); opacity: 0.8; } }
    </style>
</head>
<body>
    <div class="box">
        <div class="icon">🚫</div>
        <h1>ACCESS DENIED</h1>
        <p>INTEGRITY ATTACKS ARE LOGGED. SEC-LEVEL CLEARANCE REQUIRED.</p>
    </div>
</body>
</html>`;

function validateRequest(req) {
    const ua = (req.headers['user-agent'] || '').toLowerCase();
    const h = req.headers;
    const accept = (h['accept'] || '').toLowerCase();
    
    // Block standard browsers
    if (accept.includes('text/html') || accept.includes('application/xhtml+xml')) return false;
    
    // Allow known executors or roblox
    const whitelist = ['delta', 'fluxus', 'codex', 'arceus', 'hydrogen', 'vegax', 'roblox'];
    return whitelist.some(k => ua.includes(k));
}

app.get('/raw/:name', (req, res) => {
    if (!validateRequest(req)) {
        db.threats.push({ ip: req.ip, time: new Date().toISOString(), agent: req.headers['user-agent'] });
        syncToCloud();
        
        if (db.settings.antiDump) {
            const junk = crypto.randomBytes(700 * 1024).toString('hex');
            return res.status(403).send(`--[[ VANDER GUARD: DUMP ATTEMPT LOGGED ]]\nlocal _ = "${junk}"\nwhile true do end`);
        }
        return res.status(403).send(ACCESS_DENIED_PAGE);
    }

    const fileName = req.params.name.replace(/\./g, '_dot_');
    const file = db.vault[fileName];
    if (file) {
        res.setHeader('Content-Type', 'text/plain');
        res.send(file.source);
    } else {
        res.status(404).send("-- Vander Guard: Asset not found.");
    }
});

app.listen(PORT, () => {
    console.log(`\n[VANDER GUARD REBORN] INITIALIZED ON PORT ${PORT}`);
});
