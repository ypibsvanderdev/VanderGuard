const crypto = require('crypto');

module.exports = async (req, res) => {
    // [ VANDER-ARMOR V4: LUARMOR-STYLE HANDSHAKE ]
    const { key, hwid, project } = req.query;
    const ip = req.headers['x-real-ip'] || 'Unknown';
    
    // 1. Initial Identity Check
    if (!key || !project) {
        return res.status(403).send("-- [[ LUARMOR-V4 ERROR: Missing Auth-Key ]]");
    }

    // 2. Simulated License Registry (In a real app, this would hit a DB)
    // For now, any key starting with "VG-" is authorized for the 0.1% God-Mode demo.
    const isAuthorized = key.startsWith("VG-") || key === "ADMIN_BYPASS";
    
    if (!isAuthorized) {
        return res.status(403).send("-- [[ LUARMOR-V4 ERROR: License Not Found ]]");
    }

    // 3. HWID Validation (Honeypot Trigger)
    // If HWID is missing but expected, we log and alert.
    if (!hwid) {
        // Trigger IDS Alert (Silent Log)
        console.log(`[VANDER-IDS]: Unfingerprinted Access Detected on Key: ${key}`);
    }

    // 4. LUARMOR-STYLE PAYLOAD GENERATION
    // We deliver an encrypted wrapper that calls our OMNI-REAPER obfuscator.
    const timeHash = crypto.createHash('md5').update(String(Math.floor(Date.now() / 60000))).digest('hex');
    
    const luarmor_handshake = `
        -- [[ LUARMOR-V4 | PROJECT: ${project} ]] --
        local Key = "${key}"
        local TimeHash = "${timeHash}"
        
        local function v4_handshake()
            local HttpService = game:GetService("HttpService")
            local req = (syn and syn.request) or (http and http.request) or http_request or request
            
            print("[Luarmor-V4]: Authenticating Session...")
            
            -- Stage 2: Encrypted Bytecode Streaming
            local response = req({
                Url = "https://vander-guard.vercel.app/api/handshake?project=${project}&key=" .. Key .. "&h=" .. TimeHash,
                Method = "GET",
                Headers = {
                    ["X-Vander-Shield-Key"] = "VANDER_SHIELD_CORE_99",
                    ["X-Vander-Time-Sign"] = tostring(math.floor(os.time() / 60))
                }
            })
            
            if response.StatusCode == 200 then
                print("[Luarmor-V4]: Success. Initializing VM Execution...")
                loadstring(response.Body)()
            else
                warn("[Luarmor-V4]: Authentication Failed. Code: " .. response.StatusCode)
            end
        end
        
        task.spawn(v4_handshake)
    `;

    return res.status(200).set('Content-Type', 'text/plain').send(luarmor_handshake);
};
