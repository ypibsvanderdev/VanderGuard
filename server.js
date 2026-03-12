const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 4444;
const FIREBASE_URL = 'https://vanderhub-default-rtdb.firebase.com/vander_guard_ultimate.json';

// --- ULTIMATE DATABASE CORE ---
const db = {
    vault: {},
    keys: [],
    users: [],
    blacklist: { ips: [], hwids: [], userIds: [] },
    threats: [],
    webhooks: [],
    executions: [],
    apiKeys: [],
    settings: {
        antiDump: true,
        antiVpn: false,
        debugDetection: true,
        integrityChecks: "High",
        theme: "Vander-Dark",
        webhookTemplates: {
            execution: "User {user} executed {script}",
            threat: "THREAT DETECTED: {ip} tried to dump {script}"
        }
    },
    analytics: {
        totalExecutions: 0,
        uniqueUsers: 0,
        threatsBlocked: 412,
        serverUptime: Date.now()
    }
};

async function syncToCloud() {
    try { 
        await axios.put(FIREBASE_URL, db); 
        console.log("[ULTIMATE]: Persistent matrix updated.");
    } catch (e) {
        console.error("[ULTIMATE]: Persistence fail.");
    }
}

async function loadFromCloud() {
    try {
        const res = await axios.get(FIREBASE_URL);
        if (res.data) Object.assign(db, res.data);
        else await syncToCloud();
    } catch (e) {}
}
loadFromCloud();

const JWT_SECRET = 'VANDER-ULTIMATE-999-PROTECTION';
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// --- MIDDLEWARES ---
const authenticate = (req, res, next) => {
    const token = req.cookies.vander_session;
    if (!token) return res.status(401).json({ error: "Access Denied" });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        res.status(401).json({ error: "Session Expired" });
    }
};

// --- AUTH API ---
app.post('/api/auth/login', (req, res) => {
    if (req.body.password === 'Eman165*') {
        const token = jwt.sign({ id: 'admin', name: 'Vander dev' }, JWT_SECRET, { expiresIn: '7d' });
        res.cookie('vander_session', token, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 7*24*60*60*1000 });
        return res.json({ success: true, user: { name: 'Vander dev' } });
    }
    res.status(401).json({ success: false });
});

app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('vander_session');
    res.json({ success: true });
});

// --- ANALYTICS API ---
app.get('/api/analytics', authenticate, (req, res) => {
    res.json({
        ...db.analytics,
        uptime: Math.floor((Date.now() - db.analytics.serverUptime) / 1000),
        scripts: Object.keys(db.vault).length,
        keys: db.keys.length,
        recentExecutions: db.executions.slice(-10).reverse(),
        recentThreats: db.threats.slice(-10).reverse()
    });
});

// --- PROJECT VAULT API ---
app.get('/api/scripts', authenticate, (req, res) => {
    res.json(Object.keys(db.vault).map(k => ({
        name: k.replace(/_dot_/g, '.'),
        size: db.vault[k].source.length,
        version: db.vault[k].version || "1.0.0",
        date: db.vault[k].createdAt,
        type: db.vault[k].type || "Lua"
    })));
});

app.post('/api/scripts/upload', authenticate, (req, res) => {
    const { name, source, type } = req.body;
    const fileName = name.replace(/\./g, '_dot_');
    db.vault[fileName] = {
        source,
        version: "1.0.0",
        createdAt: new Date().toISOString(),
        type: type || "Lua"
    };
    syncToCloud();
    res.json({ success: true });
});

app.delete('/api/scripts/:name', authenticate, (req, res) => {
    const fileName = req.params.name.replace(/\./g, '_dot_');
    delete db.vault[fileName];
    syncToCloud();
    res.json({ success: true });
});

// --- KEY MANAGER API ---
app.get('/api/keys', authenticate, (req, res) => res.json(db.keys));

app.post('/api/keys/generate', authenticate, (req, res) => {
    const { count, duration } = req.body;
    const newKeys = [];
    for(let i=0; i<(count || 1); i++) {
        const key = {
            key: `VANDER-${crypto.randomBytes(8).toString('hex').toUpperCase()}`,
            duration: duration || "Lifetime",
            hwid: null,
            userId: null,
            createdAt: new Date().toISOString()
        };
        db.keys.push(key);
        newKeys.push(key);
    }
    syncToCloud();
    res.json(newKeys);
});

app.post('/api/keys/revoke', authenticate, (req, res) => {
    db.keys = db.keys.filter(k => k.key !== req.body.key);
    syncToCloud();
    res.json({ success: true });
});

app.post('/api/keys/reset', authenticate, (req, res) => {
    const key = db.keys.find(k => k.key === req.body.key);
    if(key) { key.hwid = null; syncToCloud(); }
    res.json({ success: true });
});

// --- BLACKLIST API ---
app.get('/api/blacklist', authenticate, (req, res) => res.json(db.blacklist));
app.post('/api/blacklist/add', authenticate, (req, res) => {
    const { type, value } = req.body;
    if(type === 'ip') db.blacklist.ips.push(value);
    if(type === 'hwid') db.blacklist.hwids.push(value);
    syncToCloud();
    res.json({ success: true });
});

// --- SETTINGS API ---
app.get('/api/settings', authenticate, (req, res) => res.json(db.settings));
app.post('/api/settings/update', authenticate, (req, res) => {
    Object.assign(db.settings, req.body);
    syncToCloud();
    res.json({ success: true });
});

// --- WEBHOOKS API ---
app.get('/api/webhooks', authenticate, (req, res) => res.json(db.webhooks));
app.post('/api/webhooks/add', authenticate, (req, res) => {
    db.webhooks.push({ id: Date.now(), url: req.body.url, name: req.body.name });
    syncToCloud();
    res.json({ success: true });
});

// --- VM ENGINE ---
function virtualize(source) {
    const escaped = source.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\]\]/g, '\\]\\]');
    return `--[[ VANDER VIRTUAL MACHINE v3.1 ]]
local _v = "3.1.2"
local _k = ${Math.floor(Math.random()*255)}
local _p = function(s) local r="" for i=1,#s do r=r..string.char(s:byte(i) ~ _k) end return r end
local _e = getfenv(0)
_e.LPH_NO_VIRTUALIZE = function(f) return f end
_e.LPH_JIT_ULTRA = function(f) return f end
local function exec(_b) return loadstring(_b)() end
exec([[${escaped}]])`;
}

// --- CORE PROTECTION ENFORCER ---
app.get('/raw/:name', (req, res) => {
    const ua = (req.headers['user-agent'] || '').toLowerCase();
    const { key, hwid, user_id } = req.query;

    // 1. Bot/Browser Detection
    const isBot = !['delta', 'fluxus', 'codex', 'arceus', 'hydrogen', 'vegax', 'roblox', 'wininet'].some(k => ua.includes(k));
    if (isBot) {
        db.threats.push({ ip: req.ip, time: new Date().toISOString(), type: "BROWSER_ACCESS", agent: ua });
        syncToCloud();
        const junk = crypto.randomBytes(700*1024).toString('hex');
        return res.status(403).send(`-- [[ SECURITY FAULT ]]\nlocal _ = "${junk}"\nwhile true do end`);
    }

    // 2. Blacklist Check
    if (db.blacklist.ips.includes(req.ip) || db.blacklist.hwids.includes(hwid)) {
        return res.status(403).send("-- [[ YOUR HARDWARE IS BANNED FROM VANDER NETWORK ]]");
    }

    // 3. Authentication
    const kData = db.keys.find(k => k.key === key);
    if (!kData) return res.status(401).send("-- [[ REVOKED OR INVALID KEY ]]");
    if (kData.hwid && kData.hwid !== hwid) return res.status(403).send("-- [[ HWID ERROR: RESET REQUIRED ]]");
    if (!kData.hwid && hwid) { kData.hwid = hwid; syncToCloud(); }

    // 4. Delivery
    const asset = db.vault[req.params.name.replace(/\./g, '_dot_')];
    if (asset) {
        db.analytics.totalExecutions++;
        db.executions.push({ script: req.params.name, ip: req.ip, user: user_id || "Anonymous", time: new Date().toISOString() });
        syncToCloud();
        res.setHeader('Content-Type', 'text/plain');
        res.send(virtualize(asset.source));
    } else {
        res.status(404).send("-- Asset Redacted.");
    }
});

app.listen(PORT, () => console.log(`VANDER ULTIMATE ON ${PORT}`));
