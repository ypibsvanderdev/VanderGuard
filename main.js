
document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let isRegisterMode = false;
    let currentUser = null;
    let activeKeys = [];
    let whitelistData = [];
    let blacklistData = [];
    let myApps = [];

    // --- ELEMENTS ---
    const authScreen = document.getElementById('auth-screen');
    const appWrapper = document.getElementById('app-wrapper');
    const authTitle = document.getElementById('auth-title');
    const authBtn = document.getElementById('auth-btn');
    const toggleAuthMode = document.getElementById('toggle-auth-mode');
    
    // Tabs
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    // Key Gen
    const keygenTbody = document.getElementById('keygen-tbody');
    const keygenGenerateBtn = document.getElementById('keygen-generate-btn');
    const keygenResult = document.getElementById('keygen-result');
    const keygenResultText = document.getElementById('keygen-result-text');

    // Integration
    const vaultInput = document.getElementById('vault-input');
    const vaultScriptSelector = document.getElementById('vault-script-selector');
    const keySystemToggle = document.getElementById('key-system-toggle');
    const keySelectionArea = document.getElementById('key-selection-area');
    const vaultKeySelect = document.getElementById('vault-key-select');
    const generateLoadstringBtn = document.getElementById('generate-loadstring');
    const loadstringOutput = document.getElementById('loadstring-output');
    const loadstringText = document.getElementById('loadstring-text');
    const wrappedCodePreview = document.getElementById('wrapped-code-preview');
    const integrationIdle = document.getElementById('integration-idle');

    const toast = document.getElementById('notification');
    const toastMsg = document.getElementById('toast-message');

    // --- SCRIPTS & WRAPPER ---
    const VANDER_SCRIPTS = {
        vander_duels: `-- [[ 🌌 VANDER DUELS ELITE ]]\n-- Premium Optimized Script\nprint("[Vander]: Initializing Duels Engine...")\nloadstring(game:HttpGet("https://raw.githubusercontent.com/Vander/Scripts/main/duels.lua"))()`,
        vander_desync: `-- [[ 🌀 VANDER DESYNC V3 ]]\n-- Ultimate Desync Protocol\nprint("[Vander]: Activating Desync V3...")\nloadstring(game:HttpGet("https://raw.githubusercontent.com/Vander/Scripts/main/desync.lua"))()`,
        kawatan_hub: `-- [[ 🥷 KAWATAN HUB ]]\n-- The Ultimate Stealth Tool\nprint("[Vander]: Loading Kawatan Hub...")\nloadstring(game:HttpGet("https://raw.githubusercontent.com/Vander/Scripts/main/kawatan.lua"))()`,
        nemesis_hub: `-- [[ 👺 NEMESIS HUB PREMIUM ]]\n-- Dominance Restored\nprint("[Vander]: Initializing Nemesis Core...")\nloadstring(game:HttpGet("https://raw.githubusercontent.com/Vander/Scripts/main/nemesis.lua"))()`
    };

    const ELITE_WRAPPER = `-- [[ 🎭 VANDER GUARD | ELITE ENFORCER V4.2 ]] --
local VG_KEY = "PLACEHOLDER_KEY"
local VG_APP = "PLACEHOLDER_APP"
local VG_SECRET = "VANDER_X88_SECURE"

-- [ SECURITY PROTOCOLS ] --
local function getHWID() return game:GetService("RbxAnalyticsService"):GetClientId() end

local function validate()
    local hwid = getHWID()
    local url = "https://vander-guard.vercel.app/api/verify?key="..VG_KEY.."&hwid="..hwid.."&app="..VG_APP
    local ok, res = pcall(function() return game:HttpGet(url) end)
    
    if ok and res:find("STATUS_SUCCESS") then
        print("[VANDER-GUARD]: Access Authorized for " .. VG_APP)
        -- Polling to ensure live revocation
        task.spawn(function()
            while task.wait(45) do
                local ok2, res2 = pcall(function() return game:HttpGet(url) end)
                if not (ok2 and res2:find("STATUS_SUCCESS")) then 
                    game:GetService("Players").LocalPlayer:Kick("[VG]: License Terminated.") 
                end
            end
        end)
        return true
    end
    return false
end

if validate() then
    -- [[ EXECUTE PAYLOAD ]]
    PLACEHOLDER_PAYLOAD
else
    game:GetService("Players").LocalPlayer:Kick("[VANDER-GUARD]: Unauthorized Device or Invalid License.")
end`;

    // --- AUTHENTICATION ---
    authBtn.onclick = () => {
        const uid = document.getElementById('login-uid').value.trim();
        const pin = document.getElementById('login-pin').value.trim();

        if (!uid || !pin) {
            showToast("Please enter valid credentials.", "fa-solid fa-triangle-exclamation");
            return;
        }

        initSession(uid);
        authScreen.classList.remove('active');
        setTimeout(() => {
            authScreen.style.display = 'none';
            appWrapper.style.display = 'grid';
            showToast("Device Authorized Successfully", "fa-solid fa-shield-check");
        }, 300);
    };

    function initSession(uid) {
        currentUser = uid;
        document.getElementById('user-display').innerText = uid;
        document.getElementById('user-pfp').innerText = uid.charAt(0).toUpperCase();

        activeKeys = JSON.parse(localStorage.getItem(`vg_keys_${uid}`)) || [];
        whitelistData = JSON.parse(localStorage.getItem(`vg_whitelist_${uid}`)) || [];
        blacklistData = JSON.parse(localStorage.getItem(`vg_blacklist_${uid}`)) || [];
        
        renderKeygenTable();
        populateKeySelect();
        updateDashboard();
    }

    function saveAndRender() {
        if (!currentUser) return;
        localStorage.setItem(`vg_keys_${currentUser}`, JSON.stringify(activeKeys));
        renderKeygenTable();
        populateKeySelect();
        updateDashboard();
    }

    // --- NAVIGATION ---
    navItems.forEach(item => {
        item.onclick = () => {
            const target = item.getAttribute('data-tab');
            navItems.forEach(i => i.classList.remove('active'));
            tabContents.forEach(t => t.classList.remove('active'));
            item.classList.add('active');
            document.getElementById(`tab-${target}`).classList.add('active');
        };
    });

    // --- KEY GEN ---
    if (keygenGenerateBtn) {
        keygenGenerateBtn.onclick = () => {
            const app = document.getElementById('keygen-target-app').value;
            const durationSelect = document.getElementById('keygen-duration');
            const duration = durationSelect.options[durationSelect.selectedIndex].text;
            
            if (app === 'none') {
                showToast("Please select a target script.", "fa-solid fa-triangle-exclamation");
                return;
            }

            const newKey = "VG-" + Math.floor(Math.random() * 900000 + 100000);
            activeKeys.unshift({
                key: newKey,
                app: app,
                type: duration,
                hwid: "UNLOCKED"
            });

            saveAndRender();
            
            keygenResult.style.display = 'flex';
            keygenResultText.innerText = newKey;

            // LOADER GENERATION ON KEY GEN
            const loaderArea = document.getElementById('keygen-loader-area');
            const loaderText = document.getElementById('keygen-loader-text');
            
            const dummyId = Math.random().toString(36).substring(7);
            const loadstring = `loadstring(game:HttpGet("https://vander-guard.vercel.app/loader/${app}?key=${newKey}&v=${dummyId}"))()`;
            
            loaderArea.style.display = 'block';
            loaderText.innerText = loadstring;

            showToast(`Key & Loader Created!`, "fa-solid fa-sparkles");
        };
    }

    function renderKeygenTable() {
        if (!keygenTbody) return;
        keygenTbody.innerHTML = activeKeys.length === 0 ?
            `<tr><td colspan="5" style="text-align:center; padding: 2rem; color: var(--text-muted);">No managed keys.</td></tr>` :
            activeKeys.map((k, idx) => `
            <tr>
                <td><span class="key-val">${k.key}</span></td>
                <td><span class="badge active">${k.app.replace('_',' ').toUpperCase()}</span></td>
                <td>${k.type}</td>
                <td><span style="font-size:0.65rem; color:${k.hwid === 'UNLOCKED' ? 'var(--cyan)' : 'var(--text-muted)'};">${k.hwid}</span></td>
                <td style="display:flex; gap:10px;">
                    <button onclick="window.resetKeyHWID(${idx})" style="background:none; border:none; color:var(--cyan); cursor:pointer;"><i class="fa-solid fa-redo"></i></button>
                    <button onclick="window.deleteKey(${idx})" style="background:none; border:none; color:var(--red); cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    }

    window.deleteKey = (idx) => {
        activeKeys.splice(idx, 1);
        saveAndRender();
    };

    window.resetKeyHWID = (idx) => {
        activeKeys[idx].hwid = 'UNLOCKED';
        saveAndRender();
        showToast("HWID Unlocked Successfully", "fa-solid fa-sync");
    };

    // --- INTEGRATION ---
    if (vaultScriptSelector) {
        vaultScriptSelector.onchange = () => {
            const val = vaultScriptSelector.value;
            if (VANDER_SCRIPTS[val]) {
                vaultInput.value = VANDER_SCRIPTS[val];
            } else if (val === 'raw') {
                vaultInput.value = '';
            }
        };
    }

    if (keySystemToggle) {
        keySystemToggle.onchange = () => {
            keySelectionArea.style.display = keySystemToggle.checked ? 'block' : 'none';
        };
    }

    function populateKeySelect() {
        if (!vaultKeySelect) return;
        vaultKeySelect.innerHTML = '<option value="none">Select an active key...</option>' + 
            activeKeys.map(k => `<option value="${k.key}">${k.key} (${k.app.replace('_',' ')})</option>`).join('');
    }

    if (generateLoadstringBtn) {
        generateLoadstringBtn.onclick = () => {
            const rawScript = vaultInput.value.trim();
            const currentAppId = vaultScriptSelector.value;
            
            if (!rawScript || currentAppId === 'none') {
                showToast("Please select and load a source script.", "fa-solid fa-triangle-exclamation");
                return;
            }

            let finalScript = rawScript;
            
            if (keySystemToggle.checked) {
                const selectedKey = vaultKeySelect.value;
                if (selectedKey === 'none') {
                    showToast("Choose a key to embed in the enforcer.", "fa-solid fa-key");
                    return;
                }
                
                finalScript = ELITE_WRAPPER
                    .replace('PLACEHOLDER_KEY', selectedKey)
                    .replace('PLACEHOLDER_APP', currentAppId)
                    .replace('PLACEHOLDER_PAYLOAD', rawScript);
            }

            // Show result
            integrationIdle.style.display = 'none';
            loadstringOutput.style.display = 'block';
            
            const dummyId = Math.random().toString(36).substring(7);
            const loadstring = `loadstring(game:HttpGet("https://vander-guard.vercel.app/secure/${dummyId}"))()`;
            
            loadstringText.innerText = loadstring;
            wrappedCodePreview.innerText = finalScript;
            
            showToast("Elite Enforcer Payload Generated!", "fa-solid fa-shield-virus");
        };
    }

    function updateDashboard() {
        document.getElementById('stat-total-users').innerText = whitelistData.length + 542; // Example bias
        document.getElementById('stat-active-keys').innerText = activeKeys.length;
        document.getElementById('stat-terminated').innerText = blacklistData.length + 12;
    }

    window.copyText = (id) => {
        const text = document.getElementById(id).innerText;
        navigator.clipboard.writeText(text).then(() => {
            showToast("Copied to Clipboard", "fa-solid fa-check");
        });
    };

    function showToast(message, icon) {
        toastMsg.innerText = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
});
