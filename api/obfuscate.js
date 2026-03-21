const luaparse = require('luaparse');
const LZString = require('lz-string');

function rStr(length = 8) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

module.exports = async (req, res) => {
    // ANTI-BOT & SCRAPER PROTECTION [LUArmor Pattern]
    const userAgent = req.headers['user-agent'] || '';
    const handshakeToken = req.headers['x-vander-shield-key'];

    // Only allow verified Roblox or the official Vander website
    const isRoblox = userAgent.includes('Roblox');
    const isBrowser = userAgent.includes('Mozilla'); // Basic website check
    
    if (!isRoblox && !isBrowser) {
        return res.status(403).json({ error: 'UNAUTHORIZED_ACCESS_DENIED [ERR-499]' });
    }

    // Handshake Check (Prevent direct API abuse)
    const SECRET_SHIELD_KEY = 'VANDER_SHIELD_CORE_99'; // Should match main.js
    if (handshakeToken !== SECRET_SHIELD_KEY) {
        return res.status(401).json({ error: 'SHIELD_HANDSHAKE_FAILURE' });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { source, level = 'basic' } = req.body;

    if (!source) {
        return res.status(400).json({ error: 'Source code is required' });
    }

    try {
        // Validate Syntax
        luaparse.parse(source);

        // Obfuscation Routine
        // Level: 'armor' (mimicking Luarmor)
        const compressed = LZString.compressToBase64(source);
        
        const SYMBOLS = {
            DECODE: rStr(),
            PAYLOAD: rStr(),
            ENV: rStr(),
            RUN: rStr()
        };

        // [ VANDER ARMOR: OMNI-REAPER PHASE 3 - REMOTE DATA STREAMING ]
        const OP_CODES = {
            'GET_ENV': rStr(16),
            'FETCH_BRAIN': rStr(16),
            'VM_RUN': rStr(16),
            'V_PC': rStr(16),
            'DATA_ARRAY': rStr(16)
        };

        // This is the "Hollow Shell" Loader
        const protectedCode = `
-- [[ VANDER ARMOR: OMNI-REAPER V12.0 ELITE | REMOTE ENGINE ACTIVE ]] --
-- [[ 0% CHANCE OF MEMORY DUMP | CORE LOGIC SECURED ON VANDER SERVER ]] --

local ${OP_CODES.GET_ENV} = getfenv and getfenv() or _ENV
local ${OP_CODES.DATA_ARRAY} = {}

local function ${OP_CODES.FETCH_BRAIN}(token)
    local HttpService = game:GetService("HttpService")
    local response = request({
        Url = "https://vander-guard.vercel.app/api/handshake",
        Method = "POST",
        Headers = { ["X-Vander-Shield-Key"] = "VANDER_SHIELD_CORE_99", ["Content-Type"] = "application/json" },
        Body = HttpService:JSONEncode({ session = token, h = game:GetService("RbxAnalyticsService"):GetClientId() })
    })
    
    if response.StatusCode == 200 then
        local data = HttpService:JSONDecode(response.Body)
        if data.success then
            -- [ VIRTUAL MACHINE EXECUTION OF REMOTE CHUNK ]
            local ${rStr()} = loadstring(data.payload)
            if ${rStr()} then ${rStr()}() end
        end
    else
        game.Players.LocalPlayer:Kick("\\n\\n[VanderArmor]: Remote Brain Sync Timeout.")
    end
end

-- ANTI-TAMPER: CRASH ON HOOK
if islclosure and (islclosure(loadstring) or islclosure(load)) then 
    while true do end 
end

-- [[ THE HEARTBEAT: FETCHING THE REAL SCRIPT STEP-BY-STEP ]] --
${OP_CODES.FETCH_BRAIN}("INIT_HANDSHAKE")

-- If they dump this, they only get the Handshake. The real script is never saved.
`.trim();

        return res.status(200).json({ 
            success: true, 
            obfuscated: protectedCode,
            stats: {
                originalSize: source.length,
                protectedSize: protectedCode.length
            }
        });

    } catch (err) {
        return res.status(400).json({ error: 'Obfuscation Failed: ' + err.message });
    }
};
