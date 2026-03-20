
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

    const ELITE_WRAPPER = `-- [[ 🎭 VANDER GUARD | ELITE ENFORCER V5.9 ]] --
local TEST_KEY = "PLACEHOLDER_KEY"
local SCRIPT_NAME = "PLACEHOLDER_NAME"
local LICENSE_FILE = "vander_license.dat"

local Players = game:GetService("Players")
local CoreGui = game:GetService("CoreGui")
local Lighting = game:GetService("Lighting")

local function runPayload()
    if game:GetService("Lighting"):FindFirstChild("VanderBlur") then game:GetService("Lighting").VanderBlur:Destroy() end
    -- [[ EXECUTE PAYLOAD ]]
    PLACEHOLDER_PAYLOAD
end

local function getSavedKey()
    if isfile and isfile(LICENSE_FILE) then return readfile(LICENSE_FILE) end
    return nil
end

if getSavedKey() == TEST_KEY then
    runPayload()
else
    local Blur = Instance.new("BlurEffect", Lighting)
    Blur.Name = "VanderBlur"; Blur.Size = 40
    
    local UI = Instance.new("ScreenGui", CoreGui)
    UI.DisplayOrder = 99999; UI.ResetOnSpawn = false
    
    local Main = Instance.new("Frame", UI)
    Main.BackgroundColor3 = Color3.new(0,0,0); Main.Size = UDim2.new(0,450,0,320)
    Main.Position = UDim2.new(0.5,0,0.5,0); Main.AnchorPoint = Vector2.new(0.5,0.5)
    Instance.new("UICorner", Main).CornerRadius = UDim.new(0,24)
    Instance.new("UIStroke", Main).Color = Color3.fromRGB(157, 80, 187)

    local KeyInput = Instance.new("TextBox", Main)
    KeyInput.BackgroundColor3 = Color3.fromRGB(200, 0, 255)
    KeyInput.Position = UDim2.new(0.5,0,0.5,0); KeyInput.AnchorPoint = Vector2.new(0.5,0.5)
    KeyInput.Size = UDim2.new(0,340,0,70); KeyInput.ZIndex = 100
    KeyInput.Font = Enum.Font.GothamBold; KeyInput.PlaceholderText = "text here"
    KeyInput.Text = ""; KeyInput.TextColor3 = Color3.new(1,1,1); KeyInput.TextSize = 22
    KeyInput.PlaceholderColor3 = Color3.new(1,1,1); KeyInput.TextXAlignment = Enum.TextXAlignment.Center
    Instance.new("UICorner", KeyInput).CornerRadius = UDim.new(0,15)

    local CloseBtn = Instance.new("TextButton", Main)
    CloseBtn.BackgroundTransparency = 1; CloseBtn.Position = UDim2.new(1,-50,0,10)
    CloseBtn.Size = UDim2.new(0,40,0,40); CloseBtn.Text = "X"; CloseBtn.TextColor3 = Color3.new(1,0,0); CloseBtn.TextSize = 24

    local AuthBtn = Instance.new("TextButton", Main)
    AuthBtn.BackgroundColor3 = Color3.fromRGB(157, 80, 187); AuthBtn.Position = UDim2.new(0.5,0,0.85,0)
    AuthBtn.AnchorPoint = Vector2.new(0.5,0.5); AuthBtn.Size = UDim2.new(0,340,0,50)
    AuthBtn.Text = "VERIFY LICENSE"; AuthBtn.TextColor3 = Color3.new(1,1,1); AuthBtn.Font = Enum.Font.GothamBold
    Instance.new("UICorner", AuthBtn).CornerRadius = UDim.new(0,12)

    CloseBtn.MouseButton1Click:Connect(function() UI:Destroy(); Blur:Destroy() end)
    AuthBtn.MouseButton1Click:Connect(function()
        if KeyInput.Text == TEST_KEY then
            if writefile then pcall(function() writefile(LICENSE_FILE, TEST_KEY) end) end
            UI:Destroy(); runPayload()
        else
            AuthBtn.Text = "INVALID KEY"; AuthBtn.BackgroundColor3 = Color3.new(1,0,0)
            task.wait(1); AuthBtn.Text = "VERIFY LICENSE"; AuthBtn.BackgroundColor3 = Color3.fromRGB(157, 80, 187)
        end
    end)
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
                    .replace('PLACEHOLDER_NAME', currentAppId.replace('_',' ').toUpperCase())
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
