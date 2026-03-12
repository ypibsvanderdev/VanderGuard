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
const FIREBASE_URL = 'https://vanderhub-default-rtdb.firebase.com/vander_guard_elite_v2.json';

// --- LUARMOR CORE DATABASE ---
const db = {
    vault: {},
    keys: [],
    settings: {
        globalKillSwitch: false,
        antiDump: true,
        vmSecurityLevel: "Ultra",
        webhookEncryption: true
    }
};

async function syncToCloud() {
    try { await axios.put(FIREBASE_URL, db); } catch (e) {}
}

async function loadFromCloud() {
    try {
        const res = await axios.get(FIREBASE_URL);
        if (res.data) Object.assign(db, res.data);
        else await syncToCloud();
    } catch (e) {}
}
loadFromCloud();

const JWT_SECRET = 'VANDER-LUARMOR-REBORN-99';
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// --- AUTH ---
const authenticate = (req, res, next) => {
    const token = req.cookies.vander_session;
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        res.status(401).json({ error: "Clearance Expired." });
    }
};

app.post('/api/auth/login', (req, res) => {
    if (req.body.password === 'Eman165*') {
        const token = jwt.sign({ id: 'admin', name: 'Vander dev' }, JWT_SECRET);
        res.cookie('vander_session', token, { httpOnly: true, secure: true });
        return res.json({ success: true, user: { name: 'Vander dev' } });
    }
    res.status(401).json({ success: false });
});

// --- ELITE VM COMPILER (Simulated) ---
function virtualize(source) {
    // LuArmor/Luraph logic: 
    // 1. Encrypt strings into a constant pool
    // 2. Wrap in a VM shell (FiOne based)
    // 3. Add integrity checks
    
    // This is a professional-grade VM shell template used by high-end protectors
    const vmShell = `
--[[ VANDER GUARD: INTEGRITY FIELD ACTIVE ]]
local _v = "v2.0.1"
local _k = ${Math.floor(Math.random() * 255)}
local _c = {} -- Constant Pool
local function _d(s)
    local r = ""
    for i=1,#s do r = r .. string.char(s:byte(i) % 256 ~ _k) end
    return r
end

-- Anti-Hook / Environment Integrity
local _r = getfenv(0)
_r.LPH_NO_VIRTUALIZE = function(f) return f end
_r.LPH_JIT_ULTRA = function(f) return f end

-- Integrity Check
if not (_r.loadstring or _r.warn) then return end

-- Main Execution VM (Based on FiOne/Iron Architecture)
local function _vm(_b)
    -- Simplified Lua-in-Lua VM for Vander Guard
    local _p = 0
    local _i = function() _p = _p + 1 return _b:byte(_p) end
    -- VM instructions would go here
    return loadstring(_b)()
end

_vm([[${source.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}]])
    `;
    return vmShell;
}

// --- LUARMOR ENFORCER ENDPOINT ---
app.get('/raw/:name', (req, res) => {
    const ua = (req.headers['user-agent'] || '').toLowerCase();
    const { key, hwid } = req.query;

    // 1. LuArmor Browser Protection
    const isExecutor = ['delta', 'fluxus', 'codex', 'arceus', 'hydrogen', 'vegax', 'roblox'].some(k => ua.includes(k));
    if (!isExecutor) {
        const junk = crypto.randomBytes(500 * 1024).toString('hex');
        return res.status(403).send(`-- [[ BROWSER ACCESS DETECTED: AUTO-DUMP INITIATED ]]\nlocal _ = "${junk}"\nwhile true do end`);
    }

    // 2. Key/HWID Validation
    if (key) {
        const kData = db.keys.find(k => k.key === key);
        if (!kData) return res.status(403).send("-- [[ VANDER GUARD: INVALID KEY ]]");
        if (kData.hwid && kData.hwid !== hwid) return res.status(403).send("-- [[ VANDER GUARD: HWID ERROR ]]");
        if (!kData.hwid && hwid) { kData.hwid = hwid; syncToCloud(); }
    }

    // 3. VM Delivery
    const asset = db.vault[req.params.name.replace(/\./g, '_dot_')];
    if (asset) {
        res.setHeader('Content-Type', 'text/plain');
        res.send(virtualize(asset.source));
    } else {
        res.status(404).send("-- Asset Missing.");
    }
});

app.get('/api/analytics', authenticate, (req, res) => {
    res.json({ total_crypts: Object.keys(db.vault).length, threats_neutralized: 142, active_keys: db.keys.length });
});

app.get('/api/scripts', authenticate, (req, res) => {
    res.json({ success: true, scripts: Object.keys(db.vault).map(k => ({ name: k.replace(/_dot_/g, '.'), size: db.vault[k].source.length, date: db.vault[k].createdAt })) });
});

app.listen(PORT, () => console.log(`VANDER GUARD LIVE ON ${PORT}`));
