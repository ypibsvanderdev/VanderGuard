// --- VANDER GUARD (VG-1) - ELITE KEY SYSTEM ENGINE V2.2 (ROBLOX GOVERNANCE) ---

document.addEventListener('DOMContentLoaded', () => {
    const authScreen = document.getElementById('auth-screen');
    const appWrapper = document.getElementById('app-wrapper');
    const authBtn = document.getElementById('auth-btn');
    const toggleAuthMode = document.getElementById('toggle-auth-mode');
    const authTitle = document.getElementById('auth-title');
    const authDesc = document.getElementById('auth-desc');
    const authSwitchText = document.getElementById('auth-switch-text');

    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    const userDisplay = document.getElementById('user-display');
    const userPfp = document.getElementById('user-pfp');
    const logoutBtn = document.getElementById('logout-btn');

    const toast = document.getElementById('notification');
    const toastMsg = document.getElementById('toast-message');

    // NEW KEY GEN ELEMENTS
    const keygenTbody = document.getElementById('keygen-tbody');
    const keygenGenerateBtn = document.getElementById('keygen-generate-btn');
    const keygenResult = document.getElementById('keygen-result');
    const keygenResultText = document.getElementById('keygen-result-text');

    // INTEGRATION ELEMENTS
    const keySystemToggle = document.getElementById('key-system-toggle');
    const keySelectionArea = document.getElementById('key-selection-area');
    const vaultKeySelect = document.getElementById('vault-key-select');
    const vaultScriptSelector = document.getElementById('vault-script-selector');
    const vaultInput = document.getElementById('vault-input');
    const generateLoadstringBtn = document.getElementById('generate-loadstring');
    const loadstringOutput = document.getElementById('loadstring-output');
    const loadstringText = document.getElementById('loadstring-text');

    let isRegisterMode = false;
    let currentUser = null;

    // --- DATA STATE (NO PRE-LOADED JUNK) ---
    let myApps = [];
    let activeKeys = [];
    let whitelistData = [];
    let blacklistData = [];

    // --- INITIALIZATION ---
    const savedSession = localStorage.getItem('vg_session');
    if (savedSession) initSession(JSON.parse(savedSession));

    authBtn.onclick = () => {
        const uid = document.getElementById('login-uid').value.trim();
        const pin = document.getElementById('login-pin').value.trim();
        if (!uid || !pin) return;

        authBtn.disabled = true;
        authBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> SYNCING...';

        setTimeout(() => {
            const userData = { uid: uid, firstChar: uid.charAt(0).toUpperCase() };
            if (isRegisterMode) localStorage.setItem('vg_account', JSON.stringify(userData));
            localStorage.setItem('vg_session', JSON.stringify(userData));
            initSession(userData);
        }, 1000);
    };

    function initSession(userData) {
        currentUser = userData;
        if (userDisplay) userDisplay.innerText = userData.uid;
        if (userPfp) userPfp.innerText = userData.firstChar || userData.uid.charAt(0).toUpperCase();
        if (authScreen) authScreen.classList.remove('active');
        if (appWrapper) appWrapper.style.display = 'grid';
        document.body.classList.remove('auth-mode');
        loadUserData();
    }

    function loadUserData() {
        const uid = currentUser.uid;
        activeKeys = JSON.parse(localStorage.getItem(`vg_keys_${uid}`)) || [];
        myApps = JSON.parse(localStorage.getItem(`vg_apps_${uid}`)) || [];
        whitelistData = JSON.parse(localStorage.getItem(`vg_whitelist_${uid}`)) || [];
        blacklistData = JSON.parse(localStorage.getItem(`vg_blacklist_${uid}`)) || [];

        renderEverything();
        populateKeySelect();
    }

    function renderEverything() {
        renderProjects();
        renderKeygenTable();
        renderWhitelist();
        renderBlacklist();
        loadDashboardStats();
    }

    // --- NAVIGATION ---
    navItems.forEach(item => {
        item.onclick = () => {
            const tabId = item.dataset.tab;
            navItems.forEach(i => i.classList.remove('active'));
            tabContents.forEach(c => {
                c.classList.remove('active');
                c.style.display = 'none';
            });
            item.classList.add('active');
            const targetTab = document.getElementById(`tab-${tabId}`);
            if (targetTab) {
                targetTab.classList.add('active');
                targetTab.style.display = 'block';
            }
        };
    });

    // --- WHITELIST LOGIC ---
    document.getElementById('add-whitelist-btn').onclick = () => {
        const username = document.getElementById('whitelist-input').value.trim();
        if (!username) return;

        whitelistData.unshift({
            username: username,
            userId: Math.floor(Math.random() * 999999999),
            date: new Date().toLocaleDateString(),
            status: 'AUTHORIZED'
        });

        saveAndRender('whitelist');
        document.getElementById('whitelist-input').value = '';
        showToast(`${username} Whitelisted!`, "fa-solid fa-user-shield");
    };

    function renderWhitelist() {
        if (!whitelistTbody) return;
        whitelistTbody.innerHTML = whitelistData.length === 0 ?
            `<tr><td colspan="5" style="text-align:center; padding: 2rem; color: var(--text-muted);">Whitelist is empty.</td></tr>` :
            whitelistData.map((user, idx) => `
            <tr>
                <td style="font-weight:700;">${user.username}</td>
                <td style="font-family:var(--font-mono); font-size:0.75rem; color:var(--text-muted);">${user.userId}</td>
                <td>${user.date}</td>
                <td><span class="badge active">${user.status}</span></td>
                <td><button onclick="deleteWhitelist(${idx})" style="background:none; border:none; color:var(--red); cursor:pointer;"><i class="fa-solid fa-trash"></i></button></td>
            </tr>
        `).join('');
    }

    window.deleteWhitelist = (idx) => {
        whitelistData.splice(idx, 1);
        saveAndRender('whitelist');
    };

    // --- BLACKLIST LOGIC ---
    document.getElementById('add-blacklist-btn').onclick = () => {
        const username = document.getElementById('blacklist-input').value.trim();
        if (!username) return;

        blacklistData.unshift({
            username: username,
            userId: Math.floor(Math.random() * 999999999),
            reason: "Violation of Terms",
            date: new Date().toLocaleDateString()
        });

        saveAndRender('blacklist');
        document.getElementById('blacklist-input').value = '';
        showToast(`${username} Banned!`, "fa-solid fa-user-slash");
    };

    function renderBlacklist() {
        if (!blacklistTbody) return;
        blacklistTbody.innerHTML = blacklistData.length === 0 ?
            `<tr><td colspan="5" style="text-align:center; padding: 2rem; color: var(--text-muted);">Blacklist is empty.</td></tr>` :
            blacklistData.map((user, idx) => `
            <tr>
                <td style="font-weight:700; color:var(--red);">${user.username}</td>
                <td style="font-family:var(--font-mono); font-size:0.75rem; color:var(--text-muted);">${user.userId}</td>
                <td>${user.reason}</td>
                <td>${user.date}</td>
                <td><button onclick="deleteBlacklist(${idx})" style="background:none; border:none; color:var(--cyan); cursor:pointer;"><i class="fa-solid fa-user-check"></i></button></td>
            </tr>
        `).join('');
    }

    window.deleteBlacklist = (idx) => {
        blacklistData.splice(idx, 1);
        saveAndRender('blacklist');
    };

    // --- OTHER UI LOGIC ---
    function saveAndRender(type) {
        const uid = currentUser.uid;
        if (type === 'whitelist') {
            localStorage.setItem(`vg_whitelist_${uid}`, JSON.stringify(whitelistData));
            renderWhitelist();
        } else if (type === 'blacklist') {
            localStorage.setItem(`vg_blacklist_${uid}`, JSON.stringify(blacklistData));
            renderBlacklist();
        } else if (type === 'keys') {
            localStorage.setItem(`vg_keys_${uid}`, JSON.stringify(activeKeys));
            renderKeys();
        } else if (type === 'apps') {
            localStorage.setItem(`vg_apps_${uid}`, JSON.stringify(myApps));
            renderProjects();
        }
        loadDashboardStats();
    }

    // --- KEY GEN SYSTEM (NEW) ---
    function renderKeygenTable() {
        if (!keygenTbody) return;
        keygenTbody.innerHTML = activeKeys.length === 0 ?
            `<tr><td colspan="5" style="text-align:center; padding: 2rem; color: var(--text-muted);">No managed keys.</td></tr>` :
            activeKeys.map((k, idx) => `
            <tr>
                <td><span class="key-val">${k.key}</span></td>
                <td><span class="badge ${k.app === 'none' ? '' : 'active'}">${k.app === 'none' ? 'GLOBAL' : k.app.toUpperCase()}</span></td>
                <td>${k.type}</td>
                <td><span style="font-size:0.6rem; color:${k.hwid === 'UNLOCKED' ? 'var(--cyan)' : 'var(--text-muted)'};">${k.hwid}</span></td>
                <td style="display:flex; gap:10px;">
                    <button onclick="resetKeyHWID(${idx})" style="background:none; border:none; color:var(--cyan); cursor:pointer;" title="Reset HWID"><i class="fa-solid fa-redo"></i></button>
                    <button onclick="deleteKey(${idx})" style="background:none; border:none; color:var(--red); cursor:pointer;" title="Delete Key"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    }

    window.deleteKey = (idx) => {
        const keyVal = activeKeys[idx].key;
        activeKeys.splice(idx, 1);
        saveAndRender('keys');
        populateKeySelect();
        showToast(`Key ${keyVal} Terminated!`, "fa-solid fa-bolt");
    };

    window.resetKeyHWID = (idx) => {
        const keyVal = activeKeys[idx].key;
        activeKeys[idx].hwid = 'UNLOCKED';
        saveAndRender('keys');
        showToast(`Key ${keyVal} HWID Reset!`, "fa-solid fa-sync");
    };

    if (keygenGenerateBtn) {
        keygenGenerateBtn.onclick = () => {
            const app = document.getElementById('keygen-target-app').value;
            const durationSelect = document.getElementById('keygen-duration');
            const duration = durationSelect.options[durationSelect.selectedIndex].text;
            
            const newKey = "VG-" + Math.floor(Math.random() * 900000 + 100000);
            activeKeys.unshift({
                key: newKey,
                app: app,
                type: duration,
                hwid: "UNLOCKED"
            });

            saveAndRender('keys');
            populateKeySelect();
            
            keygenResult.style.display = 'flex';
            keygenResultText.innerText = newKey;

            // LOADER GENERATION ON KEY GEN
            if (app !== 'none') {
                const loaderArea = document.getElementById('keygen-loader-area');
                const loaderText = document.getElementById('keygen-loader-text');
                
                // Simulate a cloud URL for the script
                const dummyId = Math.random().toString(36).substring(7);
                const loadstring = `loadstring(game:HttpGet("https://vander.guard/v2/scripts/${app}/auth?key=${newKey}&v=${dummyId}"))()`;
                
                loaderArea.style.display = 'block';
                loaderText.innerText = loadstring;
            } else {
                document.getElementById('keygen-loader-area').style.display = 'none';
            }

            showToast(`Key ${newKey} Generated!`, "fa-solid fa-sparkles");
        };
    }

    // --- UTILITIES ---
    window.copyText = (id) => {
        const textToCopy = document.getElementById(id).innerText;
        navigator.clipboard.writeText(textToCopy).then(() => {
            showToast("Copied to clipboard!", "fa-solid fa-check");
        });
    };

    // --- INTEGRATION & KEY SYSTEM WRAPPING ---
    if (keySystemToggle) {
        keySystemToggle.onchange = () => {
            keySelectionArea.style.display = keySystemToggle.checked ? 'block' : 'none';
        };
    }

    function populateKeySelect() {
        if (!vaultKeySelect) return;
        vaultKeySelect.innerHTML = '<option value="none">Select an active key...</option>' + 
            activeKeys.map(k => `<option value="${k.key}">${k.key} (${k.app === 'none' ? 'Global' : k.app})</option>`).join('');
    }

    const VANDER_SCRIPTS = {
        vander_duels: `-- [[ 🌌 VANDER DUELS ELITE ]]\n-- Authenticated via Vander Guard\nprint("[Vander]: Loading Duels...")\nloadstring(game:HttpGet("https://raw.githubusercontent.com/Vander/Scripts/main/duels.lua"))()`,
        vander_desync: `-- [[ 🌀 VANDER DESYNC V3 ]]\n-- Authenticated via Vander Guard\nprint("[Vander]: Loading Desync...")\nloadstring(game:HttpGet("https://raw.githubusercontent.com/Vander/Scripts/main/desync.lua"))()`,
        kawatan_hub: `-- [[ 🥷 KAWATAN HUB ]]\n-- Instant Steal Script\nprint("[Vander]: Loading Kawatan Hub...")\nloadstring(game:HttpGet("https://raw.githubusercontent.com/Vander/Scripts/main/kawatan.lua"))()`
    };

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

    const KEY_SYSTEM_TEMPLATE = `
-- [[ VANDER GUARD ENFORCER ]] --
local VG_KEY = "PLACEHOLDER_KEY"
local VG_SCRIPT_ID = "PLACEHOLDER_SCRIPT_ID"

local function authenticate()
    local hwid = game:GetService("RbxAnalyticsService"):GetClientId()
    local url = "https://vander.guard/v3/auth?key=" .. VG_KEY .. "&hwid=" .. hwid .. "&id=" .. VG_SCRIPT_ID
    local ok, res = pcall(function() return game:HttpGet(url) end)
    
    if ok and res:find("SUCCESS") then
        print("[VG] ACCESS GRANTED")
        -- Polling to kick user if key is deleted
        task.spawn(function()
            while task.wait(60) do
                local ok2, res2 = pcall(function() return game:HttpGet(url) end)
                if not (ok2 and res2:find("SUCCESS")) then
                    game:GetService("Players").LocalPlayer:Kick("[VG] LICENSE REVOKED")
                end
            end
        end)
        
        -- PAYLOAD EXECUTION
        PLACEHOLDER_PAYLOAD
    else
        game:GetService("Players").LocalPlayer:Kick("[VG] ERROR: Invalid Key or HWID Mismatch")
    end
end
authenticate()`;

    if (generateLoadstringBtn) {
        generateLoadstringBtn.onclick = () => {
            const rawScript = vaultInput.value.trim();
            const currentAppId = vaultScriptSelector.value;
            if (!rawScript) {
                showToast("Please select a script library first.", "fa-solid fa-triangle-exclamation");
                return;
            }

            let finalScript = rawScript;
            
            if (keySystemToggle.checked) {
                const selectedKey = vaultKeySelect.value;
                if (selectedKey === 'none') {
                    showToast("Select a generated key for this script.", "fa-solid fa-key");
                    return;
                }
                
                finalScript = KEY_SYSTEM_TEMPLATE
                    .replace('PLACEHOLDER_KEY', selectedKey)
                    .replace('PLACEHOLDER_SCRIPT_ID', currentAppId)
                    .replace('PLACEHOLDER_PAYLOAD', rawScript);
            }

            // In a real app, this would upload to a server. Here we just show the "link".
            const demoId = Math.random().toString(36).substring(7);
            const loadstring = `loadstring(game:HttpGet("https://vander.guard/v2/scripts/${demoId}"))()`;
            
            loadstringOutput.style.display = 'flex';
            loadstringText.innerText = loadstring;
            showToast("Secure Loadstring Generated!", "fa-solid fa-link");
        };
    }

    function renderProjects() {
        if (!reposGrid) return;
        reposGrid.innerHTML = myApps.length === 0 ?
            `<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">No scripts hosted.</div>` :
            myApps.map(app => `
                <div class="app-card glass-card">
                    <span class="app-badge tag-private">PRIVATE</span>
                    <h2>${app.name}</h2>
                    <p style="color:var(--text-muted); font-size:0.8rem;">Roblox Script Repository</p>
                </div>
            `).join('');
    }

    function loadDashboardStats() {
        document.getElementById('stat-total-users').innerText = whitelistData.length;
        document.getElementById('stat-active-keys').innerText = activeKeys.length;
        document.getElementById('stat-terminated').innerText = blacklistData.length;
    }

    function showToast(message, icon) {
        if (!toast) return;
        toastMsg.innerText = message;
        toast.querySelector('i').className = icon;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // Toggle logic for register mode
    if (toggleAuthMode) {
        toggleAuthMode.onclick = () => {
            isRegisterMode = !isRegisterMode;
            authTitle.innerText = isRegisterMode ? "Create Account" : "Welcome Back";
            authBtn.innerText = isRegisterMode ? "INITIALIZE ENROLLMENT" : "AUTHORIZE DEVICE";
            toggleAuthMode.innerText = isRegisterMode ? "Log In" : "Create Account";
        };
    }
});
