import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Convincing decoy scripts that look real but do nothing
// Rotated randomly to make pattern analysis harder
const DECOYS = [
  `-- VanderHub Secure Gate v4.2
-- Copyright 2025 VanderHub Systems
-- Authorization: PENDING VALIDATION

local VH = {}
VH.Version = "4.2.1"
VH.Secure = true
VH.Gate = "VSG_ACTIVE"

local function __init()
    local _env = getfenv and getfenv() or {}
    local _sig = game:GetService("HttpService"):GenerateGUID(false)
    VH._session = _sig
    local _ok = pcall(function()
        local f = Instance.new("Folder")
        f.Name = "_VH_Gate"
        f.Parent = game.CoreGui
    end)
    if not _ok then
        VH.Gate = "RESTRICTED"
    end
end

__init()
return VH`,

  `-- [VSG] Access validation failed
-- Error: 0x4E4F41434345535300
-- Request signature mismatch detected
-- Vander Secure Gate has intercepted this request

local x = {}
setmetatable(x, {
    __index = function(t, k)
        return function(...) return nil end
    end
})

for _i = 1, 3 do
    x.verify()
    x.checkSig()
end

print("[VH] Secure execution context: DENIED")
return nil`,

  `local __VH__ = "\86\97\110\100\101\114\72\117\98"
local function __decode(s) return s end
local _ = __decode(__VH__)

-- VanderHub Encrypted Payload v4.2
-- Decryption key: REDACTED
-- Status: UNAUTHORIZED_ACCESS

local gate = require and require("VanderGate") or nil
if not gate then
    warn("[VH] Gate module not found in execution context")
    return
end

gate:authenticate()
gate:execute()`,

  `-- Vander Script Loader
-- Loading secure payload...

local Players = game:GetService("Players")
local HttpService = game:GetService("HttpService")
local RunService = game:GetService("RunService")

local player = Players.LocalPlayer
if not player then return end

local sessionKey = HttpService:GenerateGUID(false)
local function validate(key)
    if type(key) ~= "string" then return false end
    if #key ~= 36 then return false end
    return true
end

if not validate(sessionKey) then
    warn("[VH] Session validation failed")
    return
end

-- Payload decryption failed: invalid executor context
return nil`,

  `local _0x1a = string.char
local _0x2b = table.concat
local _0x3c = math.floor

local function _decode(t)
    local r = {}
    for i, v in ipairs(t) do
        r[i] = _0x1a(v ~ 0x42)
    end
    return _0x2b(r)
end

-- [VH-GATE] Payload masked — executor fingerprint required
local _sig = {0x26,0x07,0x2c,0x27,0x25,0x2b,0x15,0x27,0x09}
local _key = _decode(_sig)

if _key ~= "VanderHub" then
    return
end

print("[VH] " .. _key .. " v4.2 — Context verified")`,
];

// Browser-only headers that Roblox would never send
const BROWSER_HEADERS = [
  'sec-fetch-mode',
  'sec-fetch-site',
  'sec-fetch-dest',
  'sec-ch-ua',
  'sec-ch-ua-mobile',
  'sec-ch-ua-platform',
  'upgrade-insecure-requests',
];

// Known HTTP tool UAs that are not Roblox
const TOOL_UA_PATTERNS = [
  /^curl\//i,
  /^python-requests/i,
  /^python\//i,
  /^wget\//i,
  /^httpie/i,
  /^axios/i,
  /^node-fetch/i,
  /^got\//i,
  /^undici/i,
  /postman/i,
  /insomnia/i,
  /^java\//i,
  /^ruby/i,
  /^go-http/i,
];

// Browser UA patterns (NOT Roblox)
const BROWSER_UA_PATTERNS = [
  /mozilla\/5\.0/i,
  /chrome\//i,
  /firefox\//i,
  /safari\//i,
  /opera\//i,
  /msie/i,
  /trident\//i,
  /edg\//i,
];

function getDecoy() {
  return DECOYS[Math.floor(Math.random() * DECOYS.length)];
}

function scoreRequest(req, ua, accept) {
  let score = 0;

  // Browser header signals
  for (const h of BROWSER_HEADERS) {
    if (req.headers.has(h)) score += 2;
  }

  // Accept header signals
  if (accept.includes('text/html')) score += 3;
  if (accept.includes('application/xhtml')) score += 3;
  if (accept.includes('*/*') && !ua.toLowerCase().includes('roblox')) score += 1;

  // Referer means a browser navigated here
  if (req.headers.has('referer')) score += 2;

  // UA analysis
  const uaLower = ua.toLowerCase();
  const isRoblox = uaLower.includes('roblox');

  if (isRoblox) {
    score -= 10; // Strong negative signal
  } else {
    for (const pattern of BROWSER_UA_PATTERNS) {
      if (pattern.test(ua)) { score += 3; break; }
    }
    for (const pattern of TOOL_UA_PATTERNS) {
      if (pattern.test(ua)) { score += 2; break; }
    }
    // Empty UA is suspicious
    if (!ua || ua.length < 5) score += 2;
  }

  return { score, isRoblox };
}

async function logAttempt(base44Client, scriptId, ua, type, headers) {
  try {
    await base44Client.asServiceRole.entities.SecurityLog.create({
      script_id: scriptId || 'probe',
      user_agent: ua.substring(0, 500),
      request_type: type,
      headers_snapshot: JSON.stringify(headers).substring(0, 1200),
    });
  } catch (_e) {
    // Silent fail on logging
  }
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const scriptId = url.searchParams.get('id');
  const token = url.searchParams.get('t');

  const ua = req.headers.get('user-agent') || '';
  const accept = req.headers.get('accept') || '';

  const { score, isRoblox } = scoreRequest(req, ua, accept);

  // Capture headers for logging (sanitized)
  const headerMap = {};
  for (const [k, v] of req.headers.entries()) {
    headerMap[k] = v;
  }

  const base44 = createClientFromRequest(req);

  // LAYER 1-3: Browser/tool detection
  // Score >= 3 means it looks like a browser or tool
  if (score >= 3 || (!isRoblox && score >= 1 && !scriptId)) {
    await logAttempt(base44, scriptId, ua, 'decoy_served', headerMap);

    // Artificial jitter delay — wastes attacker time and breaks timing analysis
    const delay = 180 + Math.floor(Math.random() * 450);
    await new Promise(r => setTimeout(r, delay));

    return new Response(getDecoy(), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Powered-By': 'VanderHub/4.2',
        'X-VSG-Status': 'active',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Request-ID': crypto.randomUUID(),
      },
    });
  }

  // LAYER 4: Parameter validation
  if (!scriptId || !token || token.length < 32) {
    await logAttempt(base44, scriptId, ua, 'blocked', headerMap);
    await new Promise(r => setTimeout(r, 120 + Math.floor(Math.random() * 200)));
    return new Response(getDecoy(), {
      headers: { 'Content-Type': 'text/plain', 'X-Powered-By': 'VanderHub/4.2' },
    });
  }

  // LAYER 5: Database token validation
  try {
    const scripts = await base44.asServiceRole.entities.Script.filter({ id: scriptId });
    const script = scripts[0];

    // LAYER 6: Token match check + loadstring enabled check
    if (!script || script.secure_token !== token || !script.is_loadstring) {
      await logAttempt(base44, scriptId, ua, 'invalid_token', headerMap);

      // Longer delay for token probing — wastes brute force attempts
      const delay = 300 + Math.floor(Math.random() * 700);
      await new Promise(r => setTimeout(r, delay));

      // Return a DIFFERENT decoy than the one for browsers — adds confusion
      const probeDecoy = DECOYS[(Math.floor(Math.random() * DECOYS.length) + 2) % DECOYS.length];
      return new Response(probeDecoy, {
        headers: {
          'Content-Type': 'text/plain',
          'X-Powered-By': 'VanderHub/4.2',
          'X-VSG-Status': 'active',
        },
      });
    }

    // VALID REQUEST — deliver script
    await logAttempt(base44, scriptId, ua, 'allowed', {});

    return new Response(script.content, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Powered-By': 'VanderHub/4.2',
        'X-VSG-Status': 'authorized',
        'Cache-Control': 'no-store, no-cache',
        'X-Request-ID': crypto.randomUUID(),
      },
    });

  } catch (error) {
    // On any error, serve decoy — never expose error details
    return new Response(getDecoy(), {
      headers: { 'Content-Type': 'text/plain', 'X-Powered-By': 'VanderHub/4.2' },
    });
  }
});