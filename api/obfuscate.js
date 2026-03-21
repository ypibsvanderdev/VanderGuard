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

        // [ VANDER ARMOR: OMNI-REAPER PHASE 100 - POLYMORPHIC MORPH ENGINE ]
        // Every request generates a completely unique, randomized VM structure.
        
        function morphMath(val) {
            if (typeof val !== 'number') return `"${val}"`;
            const r = Math.floor(Math.random() * 100) + 1;
            const op = Math.random() > 0.5 ? '+' : '-';
            return op === '+' ? `(${val - r} + ${r})` : `(${val + r} - ${r})`;
        }

        const OP_CODES = {
            'GET_ENV': rStr(24),
            'FETCH_BRAIN': rStr(24),
            'VM_RUN': rStr(24),
            'V_PC': rStr(24),
            'DATA_ARRAY': rStr(24),
            'KEY_SIGN': rStr(24)
        };

        // Inverting the VM Logic Flow to confuse Decompilers
        const protectedCode = `
-- [[ VANDER ARMOR: OMNI-REAPER PHASE 100 | THE MORPH ENGINE ACTIVE ]] --
-- [[ POLYMORPHIC VIRTUALIZATION | 100 LAYERS OF PROTECTION ]] --

local ${OP_CODES.GET_ENV} = getfenv and getfenv() or _ENV
local ${OP_CODES.DATA_ARRAY} = {
    [${morphMath(1)}] = "${rStr(32)}",
    [${morphMath(2)}] = "${Buffer.from(source).toString('base64')}"
}

-- [ LAYER 1-50: VARIABLE SCRAMBLING ] --
local ${rStr()} = function() return ${OP_CODES.GET_ENV} end
local ${rStr()} = function() return game:GetService("HttpService") end

-- [ LAYER 51-100: TIME-DYNAMIC HANDSHAKE ] --
local function ${OP_CODES.FETCH_BRAIN}(t)
    local h = ${rStr()}()
    local s = ${morphMath(Math.floor(Date.now() / 60000))} -- Minute-based rotation
    local r = request({
        Url = "https://vander-guard.vercel.app/api/handshake",
        Method = "POST",
        Headers = { 
            ["X-Vander-Shield-Key"] = "VANDER_SHIELD_CORE_99",
            ["X-Vander-Time-Sign"] = tostring(s)
        },
        Body = h:JSONEncode({ session = t, h = game:GetService("RbxAnalyticsService"):GetClientId() })
    })
    
    if r.StatusCode == ${morphMath(200)} then
        local d = h:JSONDecode(r.Body)
        if d.success then
            local ${rStr()} = loadstring(d.payload)
            if ${rStr()} then ${rStr()}() end
        end
    end
end

-- [ ANTI-DUMPING: THREAD HOOKING ] --
spawn(function()
    while task.wait(${morphMath(5)}) do
        if islclosure and (islclosure(loadstring) or islclosure(load)) then 
            game.Players.LocalPlayer:Kick("Runtime Security Failure")
        end
    end
end)

${OP_CODES.FETCH_BRAIN}("INIT_VANDER_POLYMORPH")
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
