import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function getFirebaseToken() {
  const privateKey = Deno.env.get("FIREBASE_PRIVATE_KEY").replace(/\\n/g, '\n');
  const clientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL");
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: clientEmail, sub: clientEmail,
    aud: "https://oauth2.googleapis.com/token",
    iat: now, exp: now + 3600,
    scope: "https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email",
  };
  const encode = (obj) => btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const unsigned = `${encode(header)}.${encode(payload)}`;
  const keyData = privateKey.replace('-----BEGIN PRIVATE KEY-----', '').replace('-----END PRIVATE KEY-----', '').replace(/\s/g, '');
  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey("pkcs8", binaryKey, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')}`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error("Failed to get Firebase token");
  return tokenData.access_token;
}

// ~500KB garbage Lua payload
function buildGarbagePayload(seed) {
  const r = (n) => Math.abs(Math.sin(seed * n) * 99999 | 0);

  const fakeVars = Array.from({ length: 120 }, (_, i) =>
    `local _${r(i + 1).toString(36)} = ${i % 3 === 0 ? `"${Math.random().toString(36).slice(2)}"` : i % 3 === 1 ? r(i + 7) : 'nil'};`
  ).join('\n');

  const fakeFuncs = Array.from({ length: 80 }, (_, i) => `
local function __vsg_${r(i + 200).toString(36)}(a, b, c)
  local _x = a or ${r(i + 1)}
  local _y = b and tostring(b) or "${r(i + 2).toString(36)}"
  local _z = c or math.random(${r(i + 3) % 100}, ${r(i + 4) % 200 + 100})
  if _x > ${r(i + 3)} then return _y end
  if _z % 2 == 0 then return _x * _z end
  return c or _x * ${r(i + 4) % 100}
end`).join('\n');

  const fakeTable = `local __vsg_data = {\n` +
    Array.from({ length: 3000 }, (_, i) =>
      `  [${i + 1}] = "${Array.from({ length: 32 }, (_, j) => r(i * 32 + j + seed).toString(16).padStart(2, '0')).join('')}",`
    ).join('\n') +
    `\n}`;

  const fakeLoop = `
local __trap_data = {}
for __i = 1, ${500 + (r(seed) % 500)} do
  __trap_data[__i] = math.sin(__i * ${(r(seed + 1) % 99) + 1}) * tostring(__i):len()
end`;

  const fakeMetatable = `
local __vsg_env = setmetatable({}, {
  __index = function(t, k)
    return function(...) return nil end
  end,
  __newindex = function(t, k, v) end,
  __tostring = function() return "VSG_GATE_${r(seed + 9).toString(16).toUpperCase()}" end,
})`;

  const fakeFinalCheck = `
-- VSG Integrity Verification Block
local __sig = "${Array.from({ length: 64 }, (_, i) => r(i + seed + 500).toString(16).padStart(2, '0')).join('')}"
local __key = game:GetService("HttpService"):GenerateGUID(false):gsub("-","")
if __key:len() ~= 32 then
  warn("[VSG] Context integrity check failed: 0x" .. __sig:sub(1, 8))
  return
end
-- [VSG] Authorization: PENDING_EXECUTOR_VALIDATION
-- [VSG] Session: INVALIDATED
-- [VSG] Gate: ACTIVE`;

  return `-- VanderHub Secure Gate v4.2\n-- Request ID: ${r(seed + 999).toString(16).toUpperCase()}\n-- Status: UNAUTHORIZED\n\n${fakeVars}\n${fakeFuncs}\n${fakeTable}\n${fakeLoop}\n${fakeMetatable}\n${fakeFinalCheck}`;
}

// HTML block page for browsers
function buildBrowserBlockPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>VanderHub: Access Denied</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #0d1117;
    color: #e0e0e0;
    font-family: 'Courier New', monospace;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    flex-direction: column;
    gap: 16px;
  }
  .shield { font-size: 3rem; }
  .title { color: #ff4444; font-size: 1.2rem; font-weight: bold; letter-spacing: 4px; text-transform: uppercase; }
  .sub { color: #555; font-size: 0.8rem; }
  .info { color: #333; font-size: 0.7rem; font-family: monospace; border: 1px solid #1a1a2e; padding: 8px 16px; border-radius: 6px; }
</style>
</head>
<body>
  <div class="shield">🛡️</div>
  <div class="title">VANDERHUB: ACCESS DENIED</div>
  <div class="sub">Raw source code is protected. Browser access is forbidden.</div>
  <div class="info">VSG v4.2 · Session: INVALIDATED · Gate: ACTIVE</div>
</body>
</html>`;
}

const DECOYS = [
  `-- [VSG] Access validation failed\n-- Error: 0x4E4F41434345535300\nlocal x = {}\nsetmetatable(x, {__index = function(t,k) return function(...) return nil end end})\nprint("[VH] Secure execution context: DENIED")\nreturn nil`,
  `local __VH__ = "\\86\\97\\110\\100\\101\\114\\72\\117\\98"\nlocal gate = require and require("VanderGate") or nil\nif not gate then warn("[VH] Gate module not found") return end\ngate:authenticate()\ngate:execute()`,
  `-- VanderHub Encrypted Payload v4.2\n-- Status: UNAUTHORIZED_ACCESS\nlocal Players = game:GetService("Players")\nif not Players.LocalPlayer then return end\nwarn("[VH] Session validation failed")\nreturn nil`,
];

const BROWSER_HEADERS = [
  'sec-fetch-mode', 'sec-fetch-site', 'sec-fetch-dest',
  'sec-ch-ua', 'sec-ch-ua-mobile', 'sec-ch-ua-platform',
  'upgrade-insecure-requests',
];

const TOOL_UA = [
  /^curl\//i, /^python/i, /^wget\//i, /^httpie/i, /^axios/i,
  /^node-fetch/i, /^got\//i, /^undici/i, /postman/i, /insomnia/i,
  /^java\//i, /^ruby/i, /^go-http/i, /discordbot/i, /discord/i,
  /bot\//i, /spider/i, /crawler/i, /scraper/i, /^okhttp/i,
  /^aiohttp/i, /^requests\//i,
];

const DISCORD_UA = [
  /discord/i, /discordbot/i, /discordscraper/i, /discord\.js/i,
  /discord-fetch/i, /discord-fetcher/i, /eris/i, /oceanic/i,
  /serenity/i, /^got\//i, /^undici/i, /^node-fetch/i,
  /^axios/i, /^python/i, /^aiohttp/i, /^requests\//i,
];

function isDiscordBot(ua, req) {
  for (const p of DISCORD_UA) { if (p.test(ua)) return true; }
  const accept = req.headers.get('accept') || '';
  const hasNoBrowserSignals = !req.headers.has('sec-fetch-mode') && !req.headers.has('sec-ch-ua');
  const acceptStar = accept === '*/*' || accept === '';
  if (acceptStar && hasNoBrowserSignals && ua.length < 80) return true;
  return false;
}

const BROWSER_UA = [
  /mozilla\/5\.0/i, /chrome\//i, /firefox\//i, /safari\//i,
  /opera\//i, /msie/i, /trident\//i, /edg\//i,
];

function isBrowserRequest(req, ua, accept) {
  // sec-fetch-mode is ONLY sent by browsers — strongest signal, instant block
  if (req.headers.has('sec-fetch-mode')) return true;
  if (req.headers.has('sec-fetch-dest')) return true;
  if (req.headers.has('sec-fetch-site')) return true;

  // If accept explicitly wants HTML, it's a browser
  if (accept.includes('text/html') || accept.includes('application/xhtml')) return true;

  return false;
}

function isToolRequest(ua) {
  for (const p of TOOL_UA) { if (p.test(ua)) return true; }
  return false;
}

async function logAttempt(base44Client, scriptToken, ua, ip, type, decoyServed) {
  try {
    await base44Client.asServiceRole.entities.SecurityLog.create({
      script_token: scriptToken || 'probe',
      user_agent: ua.substring(0, 500),
      ip_hint: ip,
      attempt_type: type,
      decoy_served: decoyServed,
      timestamp: new Date().toISOString(),
    });
  } catch (_e) {}
}

async function incrementBlocked(base44Client, scriptId) {
  try {
    const scripts = await base44Client.asServiceRole.entities.Script.filter({ id: scriptId });
    if (scripts[0]) {
      await base44Client.asServiceRole.entities.Script.update(scriptId, {
        blocked_attempts: (scripts[0].blocked_attempts || 0) + 1,
      });
    }
  } catch (_e) {}
}

// The shared secret appended to every loadstring URL — must match exactly
const SHARED_SECRET = Deno.env.get("SERVE_SECRET") || "vander2026";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const scriptId = url.searchParams.get('id');
  const token = url.searchParams.get('t');
  const key = url.searchParams.get('key'); // shared secret gate

  const ua = req.headers.get('user-agent') || '';
  const accept = req.headers.get('accept') || '';
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             req.headers.get('cf-connecting-ip') ||
             req.headers.get('x-real-ip') || 'unknown';

  const base44 = createClientFromRequest(req);
  const seed = Date.now() % 99999;

  // BLOCK DISCORD BOTS / FETCHERS — serve 500KB garbage payload immediately
  if (isDiscordBot(ua, req)) {
    await logAttempt(base44, scriptId, ua, ip, 'unknown_tool', true);
    if (scriptId) await incrementBlocked(base44, scriptId);
    // Pad garbage to ~500KB
    const garbage = buildGarbagePayload(seed);
    const padNeeded = Math.max(0, 512000 - garbage.length);
    const padded = garbage + '\n' + Array.from({ length: Math.ceil(padNeeded / 80) }, (_, i) =>
      `-- ${Array.from({ length: 76 }, (__, j) => ((seed + i * 76 + j) % 36).toString(36)).join('')}`
    ).join('\n');
    return new Response(padded, {
      headers: { 'Content-Type': 'text/plain', 'X-Powered-By': 'VanderHub/4.2', 'Cache-Control': 'no-store' },
    });
  }

  // BLOCK BROWSERS FIRST — regardless of key, no browser ever gets the script
  if (isBrowserRequest(req, ua, accept)) {
    await logAttempt(base44, scriptId, ua, ip, 'browser', true);
    if (scriptId) await incrementBlocked(base44, scriptId);
    return new Response(buildBrowserBlockPage(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Powered-By': 'VanderHub/4.2', 'Cache-Control': 'no-store' },
    });
  }

  // LAYER 1: Shared secret must be present and correct
  if (key !== SHARED_SECRET) {
    await logAttempt(base44, scriptId, ua, ip, 'unknown_tool', true);
    if (scriptId) await incrementBlocked(base44, scriptId);
    await new Promise(r => setTimeout(r, 300 + Math.floor(Math.random() * 700)));
    return new Response(buildGarbagePayload(seed), {
      headers: { 'Content-Type': 'text/plain', 'X-Powered-By': 'VanderHub/4.2', 'Cache-Control': 'no-store' },
    });
  }

  // LAYER 2: Token must be present and correct length
  if (!scriptId || !token || token.length < 32) {
    await logAttempt(base44, scriptId, ua, ip, 'unknown_tool', true);
    await new Promise(r => setTimeout(r, 200 + Math.floor(Math.random() * 400)));
    return new Response(buildGarbagePayload(seed), {
      headers: { 'Content-Type': 'text/plain', 'X-Powered-By': 'VanderHub/4.2' },
    });
  }

  // LAYERS 4–6: DB validation
  try {
    const scripts = await base44.asServiceRole.entities.Script.filter({ id: scriptId });
    const script = scripts[0];

    // LAYER 4: Script must exist
    if (!script) {
      await logAttempt(base44, scriptId, ua, ip, 'unknown_tool', true);
      await new Promise(r => setTimeout(r, 500 + Math.floor(Math.random() * 500)));
      return new Response(buildGarbagePayload(seed), {
        headers: { 'Content-Type': 'text/plain', 'X-Powered-By': 'VanderHub/4.2' },
      });
    }

    // LAYER 5: Token must match exactly
    if (script.loadstring_token !== token) {
      await logAttempt(base44, scriptId, ua, ip, 'unknown_tool', true);
      await incrementBlocked(base44, scriptId);
      await new Promise(r => setTimeout(r, 800 + Math.floor(Math.random() * 1200)));
      return new Response(buildGarbagePayload(seed + 1), {
        headers: { 'Content-Type': 'text/plain', 'X-Powered-By': 'VanderHub/4.2' },
      });
    }

    // LAYER 6: Loadstring must be enabled & script active
    if (!script.is_loadstring || !script.is_active) {
      await logAttempt(base44, scriptId, ua, ip, 'unknown_tool', false);
      await new Promise(r => setTimeout(r, 200 + Math.floor(Math.random() * 300)));
      return new Response(DECOYS[seed % DECOYS.length], {
        headers: { 'Content-Type': 'text/plain', 'X-Powered-By': 'VanderHub/4.2' },
      });
    }

    // VALID — serve real script
    await logAttempt(base44, scriptId, ua, ip, 'valid', false);
    try {
      await base44.asServiceRole.entities.Script.update(scriptId, {
        fetch_count: (script.fetch_count || 0) + 1,
      });
    } catch (_e) {}

    // Resolve content from various storage backends
    let scriptContent = script.content;
    if (scriptContent && scriptContent.startsWith('rtdb://')) {
      // Firebase Realtime Database storage - requires auth token
      const rtdbScriptId = scriptContent.replace('rtdb://', '');
      const dbUrl = "https://vander--hub-default-rtdb.firebaseio.com";
      const accessToken = await getFirebaseToken();
      const rtdbRes = await fetch(`${dbUrl}/scripts/${rtdbScriptId}.json?access_token=${accessToken}`);
      const rtdbData = await rtdbRes.json();
      scriptContent = rtdbData?.content || '';
    } else if (scriptContent && (scriptContent.startsWith('http://') || scriptContent.startsWith('https://'))) {
      const fileRes = await fetch(scriptContent);
      scriptContent = await fileRes.text();
    }

    return new Response(scriptContent, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Powered-By': 'VanderHub/4.2',
        'X-VSG-Status': 'authorized',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Request-ID': crypto.randomUUID(),
      },
    });

  } catch (error) {
    console.error('serveRaw error:', error.message);
    return new Response(buildGarbagePayload(seed), {
      headers: { 'Content-Type': 'text/plain', 'X-Powered-By': 'VanderHub/4.2' },
    });
  }
});