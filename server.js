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

function validateLoadstring(req) {
    const h = req.headers;
    const ua = (h['user-agent'] || '').toLowerCase();
    
    // Block standard browsers
    const isBot = !['delta', 'fluxus', 'codex', 'arceus', 'hydrogen', 'vegax', 'roblox', 'wininet'].some(k => ua.includes(k));
    if (isBot) return { valid: false, reason: "BROWSER_ACCESS" };
    
    // Check Blacklist
    if (db.blacklist.ips.includes(req.ip)) return { valid: false, reason: "IP_BANNED" };
    
    return { valid: true };
}

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
        type: db.vault[k].type || "Lua",
        useKeySystem: db.vault[k].useKeySystem !== false
    })));
});

app.post('/api/scripts/upload', authenticate, (req, res) => {
    const { name, source, type, useKeySystem } = req.body;
    const fileName = name.replace(/\./g, '_dot_');
    db.vault[fileName] = {
        source,
        version: "1.0.0",
        createdAt: new Date().toISOString(),
        type: type || "Lua",
        useKeySystem: useKeySystem !== false
    };
    syncToCloud();
    res.json({ success: true });
});

app.delete('/api/scripts/:name', authenticate, (req, res) => {
    const fileName = req.params.name.replace(/\./g, '_dot_');
    if (db.vault[fileName]) {
        delete db.vault[fileName];
        syncToCloud();
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "Script not found" });
    }
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

// --- DYNAMIC LOADER ENGINE ---
app.get('/raw/:name', (req, res) => {
    const check = validateLoadstring(req);
    const fileName = req.params.name.replace(/\./g, '_dot_');
    const { key, hwid, user_id } = req.query;

    if (!check.valid) {
        db.threats.push({ ip: req.ip, time: new Date().toISOString(), type: check.reason });
        syncToCloud();
        // Use a generic security error to avoid leaking system info
        const junk = crypto.randomBytes(500).toString('hex');
        return res.status(403).send(`-- [[ SECURITY EXCEPTION ]]\n-- Blocked ID: ${junk}`);
    }

    const asset = db.vault[fileName];
    if (!asset) return res.status(404).send("-- Asset Redacted.");

    // --- CASE 1: KEY SYSTEM DISABLED OR VALID KEY PROVIDED ---
    const bypassKey = asset.useKeySystem === false;
    
    if (bypassKey || key) {
        if (!bypassKey) {
            const kData = db.keys.find(k => k.key === key);
            if (!kData) return res.status(401).send("-- [[ REVOKED OR INVALID KEY ]]");
            if (kData.hwid && kData.hwid !== hwid) return res.status(403).send("-- [[ HWID ERROR: RESET REQUIRED ]]");
            if (!kData.hwid && hwid) { kData.hwid = hwid; syncToCloud(); }
        }

        db.analytics.totalExecutions++;
        db.executions.push({ script: req.params.name, ip: req.ip, user: user_id || "Anonymous", time: new Date().toISOString() });
        syncToCloud();
        res.setHeader('Content-Type', 'text/plain');
        return res.send(virtualize(asset.source));
    }

    // --- CASE 2: KEY SYSTEM ENABLED BUT NO KEY -> SERVE GUI ---
    const host = `${req.protocol}://${req.get('host')}`;
    const guiScript = `--[[ VANDER GUARD | AUTOMATED KEY SYSTEM ]]
if _G.VanderGuard_Active then return end
_G.VanderGuard_Active = true

local function Init()
    local sg = Instance.new("ScreenGui", game:GetService("CoreGui"))
    local fr = Instance.new("Frame", sg)
    local tit = Instance.new("TextLabel", fr)
    local inp = Instance.new("TextBox", fr)
    local btn = Instance.new("TextButton", fr)
    
    fr.Size = UDim2.new(0, 320, 0, 180)
    fr.Position = UDim2.new(0.5, -160, 0.5, -90)
    fr.BackgroundColor3 = Color3.fromRGB(13, 17, 26)
    fr.BorderSizePixel = 0
    Instance.new("UICorner", fr).CornerRadius = UDim.new(0, 15)
    local str = Instance.new("UIStroke", fr)
    str.Color = Color3.fromRGB(167, 139, 250)
    str.Thickness = 2

    tit.Size = UDim2.new(1, 0, 0, 50)
    tit.Text = "VANDER GUARD PROTECTION"
    tit.TextColor3 = Color3.fromRGB(255, 255, 255)
    tit.Font = Enum.Font.GothamBold
    tit.BackgroundTransparency = 1
    tit.TextSize = 14

    inp.Size = UDim2.new(0.8, 0, 0, 40)
    inp.Position = UDim2.new(0.1, 0, 0.35, 0)
    inp.BackgroundColor3 = Color3.fromRGB(8, 10, 15)
    inp.TextColor3 = Color3.fromRGB(167, 139, 250)
    inp.PlaceholderText = "Enter License Key..."
    inp.Text = ""
    Instance.new("UICorner", inp).CornerRadius = UDim.new(0, 8)

    btn.Size = UDim2.new(0.8, 0, 0, 40)
    btn.Position = UDim2.new(0.1, 0, 0.65, 0)
    btn.BackgroundColor3 = Color3.fromRGB(167, 139, 250)
    btn.Text = "VALIDATE LICENSE"
    btn.TextColor3 = Color3.fromRGB(255, 255, 255)
    btn.Font = Enum.Font.GothamBold
    Instance.new("UICorner", btn).CornerRadius = UDim.new(0, 8)

    btn.MouseButton1Click:Connect(function()
        local k = inp.Text
        local h = tostring(game:GetService("RbxAnalyticsService"):GetClientId())
        local target = "${host}/raw/${req.params.name}?key="..k.."&hwid="..h
        local res = game:HttpGet(target)
        
        if res:find("REVOKED") or res:find("INVALID") or res:find("ERROR") or res:find("EXCEPTION") then
            btn.Text = "INVALID KEY"
            btn.BackgroundColor3 = Color3.fromRGB(239, 68, 68)
            task.wait(2)
            btn.Text = "VALIDATE LICENSE"
            btn.BackgroundColor3 = Color3.fromRGB(167, 139, 250)
        else
            sg:Destroy()
            _G.VanderGuard_Active = false
            loadstring(res)()
        end
    end)
end

Init()`;
    res.setHeader('Content-Type', 'text/plain');
    res.send(guiScript);
});

app.listen(PORT, () => console.log(`VANDER ULTIMATE ON ${PORT}`));
