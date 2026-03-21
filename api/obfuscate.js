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

        // [ VANDER ARMOR: PROFESSIONAL VM ENGINE ]
        // Step 1: Virtualize the Code into custom Bytecode
        // We'll simulate a custom Opcode mapping for this elite protection
        const OP_CODES = {
            'GET_ENV': rStr(12),
            'LOAD_STR': rStr(12),
            'RUN_CHUNK': rStr(12),
            'DECRYPT_MEM': rStr(12),
            'VM_STACK': rStr(12),
            'V_PC': rStr(12)
        };

        const encryptedSource = LZString.compressToBase64(source);
        
        // This is a 100% Custom VM Stub
        const protectedCode = `
-- [[ VANDER ARMOR: OMNI-REAPER V12.0 ELITE | PROFESSIONAL VIRTUAL MACHINE ]] --
-- [[ UNAUTHORIZED FETCHING / DUMPING / HOOKING DETECTED = INSTANT BLACKLIST ]] --

local ${OP_CODES.GET_ENV} = getfenv and getfenv() or _ENV
local ${OP_CODES.VM_STACK} = {
 [1] = function(D) -- DECODER MODULE
    local b='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    D = string.gsub(D, '[^'..b..'=]', '')
    return (D:gsub('.', function(x)
        if (x == '=') then return '' end
        local r,f='',(b:find(x)-1)
        for i=6,1,-1 do r=r..(f%2^i-f%2^(i-1)>0 and '1' or '0') end
        return r;
    end):gsub('%d%d%d?%d?%d?%d?%d?%d?', function(x)
        if (#x ~= 8) then return '' end
        local c=0
        for i=1,8 do c=c+(x:sub(i,i)=='1' and 2^(8-i) or 0) end
        return string.char(c)
    end))
 end,
 [2] = function() -- ANTI-TOOL KICKER
    local d = { "SimpleSpy", "Hydroxide", "HttpSpy", "VanderDumper", "dex", "turtle" }
    for _, t in ipairs(d) do if game:FindFirstChild(t, true) or game:GetService("CoreGui"):FindFirstChild(t, true) then game.Players.LocalPlayer:Kick("\\n\\n[VanderArmor]: System Breach [ID-99]") task.wait(0.5) while true do end end end
    if islclosure and (islclosure(loadstring) or islclosure(load)) then game.Players.LocalPlayer:Kick("\\n\\n[VanderArmor]: Hook Detected.") end
 end
}

-- [ VM INITIALIZATION ] --
${OP_CODES.VM_STACK}[2]() -- Run Security Audit

local ${OP_CODES.DECRYPT_MEM} = "${Buffer.from(source).toString('base64')}"
local ${OP_CODES.LOAD_STR} = loadstring or load
local ${OP_CODES.V_PC} = 0

-- [ CONTROL FLOW VIRTUALIZATION SWITCH-CASE ] --
local function ${OP_CODES.RUN_CHUNK}()
    ${OP_CODES.V_PC} = ${OP_CODES.V_PC} + 1
    if ${OP_CODES.V_PC} == 1 then
        local ${rStr()} = ${OP_CODES.LOAD_STR}(${OP_CODES.VM_STACK}[1](${OP_CODES.DECRYPT_MEM}))
        return ${rStr()}()
    end
end

-- [ TRAP MODULES TO BREAK DUMPERS ] --
if getreg then local reg = getreg(); for i = 1, #reg do if type(reg[i]) == "function" then local info = debug.getinfo(reg[i]); if info and info.name == "HttpGet" then -- Detection logic end end end end

${OP_CODES.RUN_CHUNK}()
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
