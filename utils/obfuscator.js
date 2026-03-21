const crypto = require('crypto');

function encryptString(str) {
    // [ ELITE STRING SCRAMBLER ]
    const bytes = Buffer.from(str, 'utf8');
    const key = Math.floor(Math.random() * 255);
    let result = `(function(k) local s="" for _,b in ipairs({`;
    
    bytes.forEach((b, i) => {
        result += (b ^ key) + (i < bytes.length - 1 ? ',' : '');
    });
    
    result += `}) do s=s..string.char(bit32.bxor(b,k)) end return s end)(${key})`;
    return result;
}

function scrambleConstants(code) {
    // [ CONSTANT SCRAMBLER ]
    // Replaces simple "print" or "warn" strings with encrypted versions.
    return code.replace(/"(.*?)"/g, (match, p1) => encryptString(p1));
}

function obfuscate(source) {
    const salt = crypto.randomBytes(8).toString('hex');
    
    // LAYER 1: Constant & String Mutation
    let mutated = scrambleConstants(source);
    
    // LAYER 2: Control-Flow Garbage Injection
    const garbage = `local _v${salt} = function() local x=0 for i=1,100 do x=x+i end return x end\n`;
    
    // LAYER 3: VM Wrapper (Luarmor Marker)
    const payload = `
        -- [[ VANDER-ARMOR V4 | OMNI-REAPER V12 ]] --
        local _LPH = function(data) return data end -- Luarmor v4 Marker
        
        ${garbage}
        
        local function _VANDER_CORE()
            ${mutated}
        end
        
        local success, err = pcall(_VANDER_CORE)
        if not success then
            warn("[Vander-Shield]: Authentication Error - " .. tostring(err))
        end
    `;

    return payload;
}

module.exports = { obfuscate };
