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

        const protectedCode = `
-- [ VANDER ARMOR: OMNI-REAPER ULTIMATE ] --
local ${SYMBOLS.ENV} = getfenv and getfenv() or _ENV
local ${SYMBOLS.DECODE} = function(e)
    local b='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    e = string.gsub(e, '[^'..b..'=]', '')
    return (e:gsub('.', function(x)
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
end

-- ANTI-DUMP & ANTI-LOG PROTOCOL [LUArmor Pattern]
local function ProtectRuntime()
    local detect = { "SimpleSpy", "Hydroxide", "HttpSpy", "VanderDumper", "dex", "turtle" }
    for _, tool in ipairs(detect) do
        if ${SYMBOLS.ENV}.game:FindFirstChild(tool, true) or ${SYMBOLS.ENV}.game:GetService("CoreGui"):FindFirstChild(tool, true) then
            ${SYMBOLS.ENV}.game.Players.LocalPlayer:Kick("\\n\\n[VanderArmor]: Malicious Debugger Detected [ID-99]")
            task.wait(0.5) while true do end
        end
    end
    -- Hook Protection
    if islclosure and islclosure(loadstring or load) then
        ${SYMBOLS.ENV}.game.Players.LocalPlayer:Kick("\\n\\n[VanderArmor]: Runtime Hook Detected.")
    end
end
ProtectRuntime()

local ${SYMBOLS.PAYLOAD} = "${Buffer.from(source).toString('base64')}"
local ${SYMBOLS.RUN} = loadstring or load
${SYMBOLS.RUN}(${SYMBOLS.DECODE}(${SYMBOLS.PAYLOAD}))()
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
