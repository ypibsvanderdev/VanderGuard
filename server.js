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
    const h = req.headers;
    return h['cf-connecting-ip'] || 
           h['x-vercel-forwarded-for'] || 
           h['x-real-ip'] || 
           (h['x-forwarded-for'] ? h['x-forwarded-for'].split(',')[0].trim() : req.socket.remoteAddress);
};

// --- SECURITY KERNEL V11.2 (STABLE SENTRY) ---
const COOLDOWN = {};

async function validateLoadstring(req) {
    const h = req.headers;
    const ua = (h['user-agent'] || '').toLowerCase();
    const verifiedIP = getRealIP(req);
    
    // 1. BURST RATE LIMITER
    const now = Date.now();
    if (COOLDOWN[verifiedIP] && (now - COOLDOWN[verifiedIP]) < 3000) {
        db.threats.push({ type: "BURST_FETCH", ip: verifiedIP, ua: ua, time: new Date().toISOString() });
        await saveDB();
        return { valid: false, reason: "COOLDOWN_ACTIVE" };
    }
    COOLDOWN[verifiedIP] = now;

    // 2. SIGNATURE ENFORCEMENT
    const allowedHeaders = [
        'user-agent', 'host', 'connection', 'accept-encoding', 'accept', 'accept-language',
        'content-type', 'content-length', 'cache-control', 'pragma', 'identity',
        'x-forwarded-for', 'x-forwarded-proto', 'x-real-ip', 
        'x-vercel-forwarded-for', 'cf-connecting-ip', 'cf-ipcountry', 'cf-ray', 
        'cf-visitor', 'x-vercel-id', 'x-vercel-proxy-signature', 'x-vercel-proxy-signature-common'
    ];

    for (const key of Object.keys(h)) {
        if (!allowedHeaders.includes(key.toLowerCase())) {
            db.threats.push({ type: "ILLEGAL_HEADER", detail: key, ip: verifiedIP, ua: ua, time: new Date().toISOString() });
            await saveDB();
            return { valid: false, reason: "SIGNATURE_REJECTED" };
        }
    }

    // 3. ENCODING CHECK (Optional but Strict)
    if (h['accept-encoding'] && h['accept-encoding'].includes('br')) {
         db.threats.push({ type: "ENCODING_MISMATCH", detail: h['accept-encoding'], ip: verifiedIP, ua: ua, time: new Date().toISOString() });
         await saveDB();
         return { valid: false, reason: "SIGNATURE_REJECTED" };
    }

    // 4. INDUSTRIAL UA WHITELIST
    const whitelist = ['roblox', 'delta', 'fluxus', 'codex', 'arceus', 'vegax', 'hydrogen', 'wave', 'solara', 'xeno', 'celery'];
    if (!ua || !whitelist.some(k => ua.includes(k))) {
        db.threats.push({ type: "INVALID_UA", ip: verifiedIP, ua: ua, time: new Date().toISOString() });
        await saveDB();
        return { valid: false, reason: "SIGNATURE_REJECTED" };
    }

    // 5. RESIDENTIAL ORACLE
    try {
        const ipCheck = await axios.get(`http://ip-api.com/json/${verifiedIP}?fields=isp,org,as,hosting,proxy,status`, { timeout: 3000 });
        if (ipCheck.data && ipCheck.data.status === 'success') {
            const isp = (ipCheck.data.isp || '').toLowerCase();
            const org = (ipCheck.data.org || '').toLowerCase();
            const as = (ipCheck.data.as || '').toLowerCase();
            
            const serverKeywords = ['digitalocean', 'amazon', 'aws', 'google', 'cloud', 'ovh', 'linode', 'hetzner', 'microsoft', 'azure', 'vultr', 'm247', 'hosting', 'datacenter', 'oracle', 'ibm', 'server', 'choopa', 'quadranet', 'leaseweb'];

            if (serverKeywords.some(k => isp.includes(k) || org.includes(k) || as.includes(k)) || ipCheck.data.proxy === true || ipCheck.data.hosting === true) {
                db.threats.push({ type: "DATA_CENTER_BLOCK", provider: isp, ip: verifiedIP, ua: ua, time: new Date().toISOString() });
                await saveDB();
                return { valid: false, reason: "INFRASTRUCTURE_REDACTED" };
            }
        }
    } catch (e) {}
    // 6. DB BLACKLIST
    if (db.blacklist && db.blacklist.ips && db.blacklist.ips.includes(verifiedIP)) {
        return { valid: false, reason: "BANNED" };
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
    const check = await validateLoadstring(req);
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
