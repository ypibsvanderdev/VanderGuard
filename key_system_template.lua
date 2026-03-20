-- [[ 
    VANDER GUARD ELITE KEY SYSTEM V3.0
    SECURE SCRIPT WRAPPER
]]

local VG_KEY = "PLACEHOLDER_KEY"
local VG_SCRIPT_ID = "PLACEHOLDER_SCRIPT_ID" -- e.g. "vander_duels"
local VG_VERSION = "3.2.0"

-- SERVICES
local Players = game:GetService("Players")
local HttpService = game:GetService("HttpService")
local Analytics = game:GetService("RbxAnalyticsService")
local Player = Players.LocalPlayer or Players.PlayerAdded:Wait()

-- FILES
local LICENSE_FILE = "vander_" .. VG_SCRIPT_ID .. "_license.dat"

-- HWID
local function getHWID()
    local ok, id = pcall(function() return Analytics:GetClientId() end)
    return ok and id or "UNKNOWN"
end
local HWID = getHWID()

-- SERVER AUTH MOCKUP (Simulation for script-level validation)
local function remoteCheck(key)
    -- In a real scenario, this would HttpGet to YOUR server.
    -- We're simulating the check against your browser's stored "Keys" logically.
    local url = "https://vander.guard/v2/auth?key="..key.."&hwid="..HWID.."&script="..VG_SCRIPT_ID
    local ok, res = pcall(function() return game:HttpGet(url) end)
    
    -- Simulation Logic:
    -- For now, we'll assume it returns success if the key matches.
    if ok and res:find("SUCCESS") then
        return true, "OK"
    elseif ok and res:find("INVALID_HWID") then
        return false, "HWID Mismatch - Reset via Dashboard"
    else
        return false, "Invalid or Expired License Key"
    end
end

-- VALIDATION FLOW
local function validateLicense(enteredKey)
    local success, msg = remoteCheck(enteredKey or VG_KEY)
    if success then
        -- Save local cache only if verified
        local data = {
            user = Player.UserId,
            hwid = HWID,
            key = enteredKey or VG_KEY,
            scriptId = VG_SCRIPT_ID,
            savedAt = os.time()
        }
        pcall(function() writefile(LICENSE_FILE, HttpService:JSONEncode(data)) end)
        return true
    end
    return false, msg
end

-- MAIN EXECUTION
local function runMain()
    -- [[ PAYLOAD START ]]
    PLACEHOLDER_PAYLOAD
    -- [[ PAYLOAD END ]]
end

-- START AUTHENTICATION
if isfile(LICENSE_FILE) then
    local data = HttpService:JSONDecode(readfile(LICENSE_FILE))
    if data.key == VG_KEY and data.scriptId == VG_SCRIPT_ID then
        -- Polling (Kicks user if license is deleted on dashboard)
        task.spawn(function()
            while task.wait(60) do
                local ok, msg = remoteCheck(VG_KEY)
                if not ok then
                    Player:Kick("[VANDER GUARD]: License Revoked - " .. msg)
                end
            end
        end)
        runMain()
    else
        delfile(LICENSE_FILE)
        Player:Kick("License Mismatch - Re-run script.")
    end
else
    -- UI Logic for key entry...
    local ScreenGui = Instance.new("ScreenGui", game:GetService("CoreGui"))
    local Frame = Instance.new("Frame", ScreenGui)
    Frame.Size = UDim2.fromScale(0.35, 0.25)
    Frame.Position = UDim2.fromScale(0.5, 0.5)
    Frame.AnchorPoint = Vector2.new(0.5, 0.5)
    Frame.BackgroundColor3 = Color3.fromRGB(15, 15, 20)
    Instance.new("UICorner", Frame)

    local Title = Instance.new("TextLabel", Frame)
    Title.Size = UDim2.fromScale(1, 0.3)
    Title.Text = "LICENSE REQUIRED | " .. VG_SCRIPT_ID:upper()
    Title.TextColor3 = Color3.new(1, 1, 1)
    Title.BackgroundTransparency = 1
    Title.Font = Enum.Font.GothamBold

    local Input = Instance.new("TextBox", Frame)
    Input.Size = UDim2.fromScale(0.8, 0.2)
    Input.Position = UDim2.fromScale(0.1, 0.35)
    Input.PlaceholderText = "Paste your license key..."
    Input.Text = ""
    Input.TextColor3 = Color3.new(1,1,1)
    Input.BackgroundColor3 = Color3.fromRGB(30, 30, 35)

    local Btn = Instance.new("TextButton", Frame)
    Btn.Size = UDim2.fromScale(0.8, 0.25)
    Btn.Position = UDim2.fromScale(0.1, 0.65)
    Btn.Text = "AUTHENTICATE"
    Btn.BackgroundColor3 = Color3.fromRGB(157, 80, 187)
    Btn.TextColor3 = Color3.new(1, 1, 1)
    Instance.new("UICorner", Btn)

    Btn.MouseButton1Click:Connect(function()
        local ok, err = validateLicense(Input.Text)
        if ok then
            ScreenGui:Destroy()
            runMain()
        else
            Title.Text = "ERROR: " .. (err or "INVALID")
            Title.TextColor3 = Color3.fromRGB(255, 100, 100)
            task.wait(2)
            Title.Text = "LICENSE REQUIRED | " .. VG_SCRIPT_ID:upper()
            Title.TextColor3 = Color3.new(1,1,1)
        end
    end)
end
