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
const FIREBASE_URL = 'https://vanderhub-default-rtdb.firebaseio.com/vander_guard_ultimate.json';

// --- ULTIMATE DATABASE CORE ---
let db = {
    vault: {},
    keys: [],
    users: [],
    blacklist: { ips: [], hwids: [], userIds: [] },
    threats: [],
    webhooks: [],
    executions: [],
    analytics: {
        totalExecutions: 0,
        uniqueUsers: 0,
        threatsBlocked: 412,
        serverUptime: Date.now()
    }
};

async function syncDB() {
    try {
        const res = await axios.get(FIREBASE_URL);
        if (res.data) {
            db.vault = res.data.vault || {};
            db.keys = res.data.keys || [];
            db.blacklist = res.data.blacklist || { ips: [], hwids: [], userIds: [] };
            db.threats = res.data.threats || [];
            db.webhooks = res.data.webhooks || [];
            db.executions = res.data.executions || [];
            db.analytics = res.data.analytics || db.analytics;
        }
    } catch (e) {
        console.error("Cloud DB connect fail.");
    }
}

async function saveDB() {
    try {
        await axios.put(FIREBASE_URL, db);
    } catch (e) {
        console.error("Cloud DB save fail.");
    }
}

const JWT_SECRET = 'VANDER-ULTIMATE-999-PROTECTION';
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to sync DB before processing
app.use(async (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/raw')) {
        await syncDB();
    }
    next();
});

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

const getRealIP = (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    return forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;
};

// --- SECURITY KERNEL V5.0 (NUCLEAR SENTRY) ---
function validateLoadstring(req) {
    const h = req.headers;
    const ua = (h['user-agent'] || '').toLowerCase();
    const realIP = getRealIP(req);
    
    // 1. HEADER LEANNESS (Executor Fingerprint)
    // Real Roblox executors send 4-6 headers max. Scrapers send 10-20.
    const headerCount = Object.keys(h).length;
    if (headerCount > 9) {
        db.threats.push({ type: "EXCESSIVE_HEADERS", count: headerCount, ip: realIP, ua: ua, time: new Date().toISOString() });
        return { valid: false, reason: "NUCLEAR_BLOCK" };
    }

    // 2. FORBIDDEN FRAGMENTS (Browser/Scraper Detection)
    const forbiddenKeys = ['sec-', 'fetch-', 'upgrade-', 'referer', 'accept-language'];
    for (const key of Object.keys(h)) {
        const k = key.toLowerCase();
        if (forbiddenKeys.some(f => k.includes(f))) {
            db.threats.push({ type: "BAD_HEADER", detail: k, ip: realIP, ua: ua, time: new Date().toISOString() });
            return { valid: false, reason: "NUCLEAR_BLOCK" };
        }
    }

    // 3. FINGERPRINT: AXIOS/NODE-FETCH DETECTION
    if (h['accept'] && h['accept'].includes('application/json')) {
         db.threats.push({ type: "JSON_FINGERPRINT", ip: realIP, ua: ua, time: new Date().toISOString() });
         return { valid: false, reason: "NUCLEAR_BLOCK" };
    }

    // 4. IP SENTRY (Strict Proxy Check)
    if (h['x-forwarded-for'] && h['x-forwarded-for'].includes(',')) {
        db.threats.push({ type: "PROXY_CHAIN", ip: realIP, ua: ua, time: new Date().toISOString() });
        return { valid: false, reason: "NUCLEAR_BLOCK" };
    }

    // 5. UA WHITELIST (STRICT)
    const executorUA = [
        'roblox', 'delta', 'fluxus', 'codex', 'hydrogen', 
        'arceus', 'vegax', 'wave', 'solara', 'xeno', 'celery'
    ];
    if (!ua || !executorUA.some(k => ua.includes(k))) {
        db.threats.push({ type: "INVALID_UA", ip: realIP, ua: ua, time: new Date().toISOString() });
        return { valid: false, reason: "NUCLEAR_BLOCK" };
    }

    // 6. DB BLACKLIST
    if (db.blacklist && db.blacklist.ips && db.blacklist.ips.includes(realIP)) {
        return { valid: false, reason: "BANNED_ENTITY" };
    }
    
    return { valid: true };
}

// --- API ROUTES ---
app.post('/api/auth/login', (req, res) => {
    if (req.body.password === 'Eman165*') {
        const token = jwt.sign({ id: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
        res.cookie('vander_session', token, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 7*24*60*60*1000 });
        return res.json({ success: true });
    }
    res.status(401).json({ success: false });
});

app.get('/api/analytics', authenticate, (req, res) => {
    res.json({
        ...db.analytics,
        uptime: Math.floor((Date.now() - db.analytics.serverUptime) / 1000),
        scripts: Object.keys(db.vault).length,
        keys: db.keys.length,
        recentExecutions: db.executions.slice(-10).reverse()
    });
});

app.get('/api/scripts', authenticate, (req, res) => {
    res.json(Object.keys(db.vault).map(k => ({
        name: k.replace(/_dot_/g, '.'),
        size: db.vault[k].source.length,
        version: db.vault[k].version || "1.0.0",
        useKeySystem: db.vault[k].useKeySystem !== false
    })));
});

app.post('/api/scripts/upload', authenticate, async (req, res) => {
    const { name, source, useKeySystem } = req.body;
    const fileName = name.replace(/\./g, '_dot_');
    db.vault[fileName] = {
        source,
        version: "1.0.0",
        createdAt: new Date().toISOString(),
        useKeySystem: useKeySystem !== false
    };
    await saveDB();
    res.json({ success: true });
});

app.delete('/api/scripts/:name', authenticate, async (req, res) => {
    const fileName = req.params.name.replace(/\./g, '_dot_');
    if (db.vault[fileName]) {
        delete db.vault[fileName];
        await saveDB();
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "Not found" });
    }
});

app.get('/api/keys', authenticate, (req, res) => res.json(db.keys));

app.post('/api/keys/generate', authenticate, async (req, res) => {
    const { count, duration } = req.body;
    for(let i=0; i<(count || 1); i++) {
        db.keys.push({
            key: `VANDER-${crypto.randomBytes(8).toString('hex').toUpperCase()}`,
            duration: duration || "Lifetime",
            hwid: null,
            createdAt: new Date().toISOString()
        });
    }
    await saveDB();
    res.json({ success: true });
});

app.post('/api/keys/revoke', authenticate, async (req, res) => {
    db.keys = db.keys.filter(k => k.key !== req.body.key);
    await saveDB();
    res.json({ success: true });
});

app.post('/api/keys/reset', authenticate, async (req, res) => {
    const key = db.keys.find(k => k.key === req.body.key);
    if(key) { key.hwid = null; await saveDB(); }
    res.json({ success: true });
});

app.get('/api/blacklist', authenticate, (req, res) => res.json(db.blacklist));
app.post('/api/blacklist/add', authenticate, async (req, res) => {
    const { type, value } = req.body;
    if(type === 'ip') db.blacklist.ips.push(value);
    if(type === 'hwid') db.blacklist.hwids.push(value);
    await saveDB();
    res.json({ success: true });
});

app.get('/api/webhooks', authenticate, (req, res) => res.json(db.webhooks));
app.post('/api/webhooks/add', authenticate, async (req, res) => {
    db.webhooks.push({ id: Date.now(), url: req.body.url, name: req.body.name });
    await saveDB();
    res.json({ success: true });
});

// --- ENGINE ---
// --- SECURITY KERNEL ---
app.get('/raw/:name', async (req, res) => {
    const fileName = req.params.name.replace(/\./g, '_dot_');
    
    // 1. HARDENED HEADERS
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('X-Vander-Shield', 'Industrial/v4.2');
    res.setHeader('X-Powered-By', 'SushiX-Kernel-Matrix');
    res.setHeader('Server', 'Vander-Guard-Edge');

    // 2. INDUSTRIAL VALIDATION (Executor Detection)
    const check = validateLoadstring(req);
    if (!check.valid) {
        return res.redirect('/denied.html');
    }

    const asset = db.vault[fileName];
    if (!asset) return res.status(404).send("-- Asset Redacted.");

    // 3. LOG EXECUTION
    const realIP = getRealIP(req);
    db.analytics.totalExecutions++;
    db.executions.push({ 
        script: req.params.name, 
        user: realIP, 
        time: new Date().toISOString() 
    });
    await saveDB();
    
    // 4. DELIVER RAW SOURCE
    return res.send(asset.source);
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, '0.0.0.0', () => console.log(`VANDER ULTIMATE ON ${PORT}`));
}
module.exports = app;
