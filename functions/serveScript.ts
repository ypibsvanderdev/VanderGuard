import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ============================================================
// VANDER SECURE GATE v4.2 — Multi-Layer Script Protection
// ============================================================

// Giant garbage payload sent to Discord bots / bypasses
// Designed to look real, crash analysis tools, waste reverse engineer time
function buildGarbagePayload(seed) {
  const r = (n) => Math.abs(Math.sin(seed * n) * 99999 | 0);
  const fakeVars = Array.from({ length: 120 }, (_, i) =>
    `local _${r(i + 1).toString(36)} = ${i % 3 === 0 ? `"${Math.random().toString(36).slice(2)}"` : i % 3 === 1 ? r(i + 7) : 'nil'};`
  ).join('\n');

  const fakeFuncs = Array.from({ length: 40 }, (_, i) => `
local function __vsg_${r(i + 200).toString(36)}(a, b, c)
  local _x = a or ${r(i + 1)}
  local _y = b and tostring(b) or "${r(i + 2).toString(36)}"
  if _x > ${r(i + 3)} then return _y end
  return c or _x * ${r(i + 4) % 100}
end`).join('\n');

  const fakeLoop = `
local __trap_data = {}
for __i = 1, ${200 + (r(seed) % 300)} do
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
local __sig = "${Array.from({ length: 32 }, (_, i) => r(i + seed + 500).toString(16).padStart(2, '0')).join('')}"
local __key = game:GetService("HttpService"):GenerateGUID(false):gsub("-","")
if __key:len() ~= 32 then
  warn("[VSG] Context integrity check failed: 0x" .. __sig:sub(1, 8))
  return
end
-- [VSG] Authorization: PENDING_EXECUTOR_VALIDATION
-- [VSG] Session: INVALIDATED
-- [VSG] Gate: ACTIVE`;

  return `-- VanderHub Secure Gate v4.2\n-- Request ID: ${r(seed + 999).toString(16).toUpperCase()}\n-- Status: UNAUTHORIZED\n\n${fakeVars}\n${fakeFuncs}\n${fakeLoop}\n${fakeMetatable}\n${fakeFinalCheck}`;
}

// Convincing short decoys for browser/tool probes
const DECOYS = [
  `-- [VSG] Access validation failed\n-- Error: 0x4E4F41434345535300\nlocal x = {}\nsetmetatable(x, {__index = function(t,k) return function(...) return nil end end})\nprint("[VH] Secure execution context: DENIED")\nreturn nil`,
  `local __VH__ = "\\86\\97\\110\\100\\101\\114\\72\\117\\98"\nlocal gate = require and require("VanderGate") or nil\nif not gate then warn("[VH] Gate module not found") return end\ngate:authenticate()\ngate:execute()`,
  `-- VanderHub Encrypted Payload v4.2\n-- Status: UNAUTHORIZED_ACCESS\nlocal Players = game:GetService("Players")\nif not Players.LocalPlayer then return end\nwarn("[VH] Session validation failed")\nreturn nil`,
  `local _0x1a=string.char\nlocal function _d(t) local r={} for i,v in ipairs(t) do r[i]=_0x1a(v~0x42) end return table.concat(r) end\nlocal _k=_d({0x26,0x07,0x2c,0x27,0x25,0x2b,0x15,0x27,0x09})\nif _k~="VanderHub" then return end\nprint("[VH] ".._k.." v4.2 — Context verified")`,
];

// Browser-only headers Roblox would never send
const BROWSER_HEADERS = [
  'sec-fetch-mode','sec-fetch-site','sec-fetch-dest',
  'sec-ch-ua','sec-ch-ua-mobile','sec-ch-ua-platform',
  'upgrade-insecure-requests','accept-language',
];

// HTTP tool user-agent patterns
const TOOL_UA = [/^curl\//i,/^python/i,/^wget\//i,/^httpie/i,/^axios/i,/^node-fetch/i,/^got\//i,/^undici/i,/postman/i,/insomnia/i,/^java\//i,/^ruby/i,/^go-http/i,/discordbot/i,/discord/i,/bot\//i,/spider/i,/crawler/i,/scraper/i,/^okhttp/i,/^aiohttp/i,/^requests\//i,];
const BROWSER_UA = [/mozilla\/5\.0/i,/chrome\//i,/firefox\//i,/safari\//i,/opera\//i,/msie/i,/trident\//i,/edg\//i,];

function getDecoy() {
  return DECOYS[Math.floor(Math.random() * DECOYS.length)];
}

function scoreRequest(req, ua, accept) {
  let score = 0;
  for (const h of BROWSER_HEADERS) { if (req.headers.has(h)) score += 2; }
  if (accept.includes('text/html')) score += 4;
  if (accept.includes('application/xhtml')) score += 3;
  if (req.headers.has('referer')) score += 3;
  if (req.headers.has('cookie')) score += 2;
  if (req.headers.has('origin')) score += 1;

  const uaLow = ua.toLowerCase();
  const isRoblox = uaLow.includes('roblox');
  const isDiscord = uaLow.includes('discord') || uaLow.includes('discordbot');

  if (isRoblox) score -= 15;
  if (isDiscord) score += 20; // Discord bots get maximum garbage

  for (const p of BROWSER_UA) { if (p.test(ua)) { score += 4; break; } }
  for (const p of TOOL_UA) { if (p.test(ua)) { score += 5; break; } }
  if (!ua || ua.length < 5) score += 3;

  return { score, isRoblox, isDiscord };
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

// Increment blocked_attempts counter on script
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

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const scriptId = url.searchParams.get('id');
  const token = url.searchParams.get('t');

  const ua = req.headers.get('user-agent') || '';
  const accept = req.headers.get('accept') || '';
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             req.headers.get('cf-connecting-ip') ||
             req.headers.get('x-real-ip') || 'unknown';

  const { score, isRoblox, isDiscord } = scoreRequest(req, ua, accept);

  const base44 = createClientFromRequest(req);

  // ── LAYER 1: Discord bot detection → massive garbage payload ──
  if (isDiscord) {
    await logAttempt(base44, scriptId, ua, ip, 'browser', true);
    if (scriptId) await incrementBlocked(base44, scriptId);
    const seed = Date.now() % 9999;
    await new Promise(r => setTimeout(r, 200 + Math.floor(Math.random() * 600)));
    return new Response(buildGarbagePayload(seed), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Powered-By': 'VanderHub/4.2',
        'X-VSG-Status': 'active',
        'Cache-Control': 'no-store',
      },
    });
  }

  // ── LAYER 2: Browser / HTTP tool detection → convincing decoy ──
  if (score >= 3 || (!isRoblox && score >= 1)) {
    const type = ua.toLowerCase().includes('bot') ? 'unknown_tool' : (score >= 6 ? 'browser' : 'unknown_tool');
    await logAttempt(base44, scriptId, ua, ip, type, true);
    if (scriptId) await incrementBlocked(base44, scriptId);
    await new Promise(r => setTimeout(r, 150 + Math.floor(Math.random() * 500)));
    return new Response(getDecoy(), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Powered-By': 'VanderHub/4.2',
        'X-VSG-Status': 'active',
        'Cache-Control': 'no-store, no-cache',
        'X-Request-ID': crypto.randomUUID(),
      },
    });
  }

  // ── LAYER 3: Parameter completeness check ──
  if (!scriptId || !token || token.length < 32) {
    await logAttempt(base44, scriptId, ua, ip, 'unknown_tool', true);
    await new Promise(r => setTimeout(r, 100 + Math.floor(Math.random() * 300)));
    return new Response(getDecoy(), { headers: { 'Content-Type': 'text/plain', 'X-Powered-By': 'VanderHub/4.2' } });
  }

  // ── LAYERS 4–6: DB validation ──
  try {
    const scripts = await base44.asServiceRole.entities.Script.filter({ id: scriptId });
    const script = scripts[0];

    // LAYER 4: Script must exist
    if (!script) {
      await logAttempt(base44, scriptId, ua, ip, 'unknown_tool', true);
      await new Promise(r => setTimeout(r, 400 + Math.floor(Math.random() * 600)));
      return new Response(buildGarbagePayload(parseInt(scriptId.slice(-4), 16) || 42), {
        headers: { 'Content-Type': 'text/plain', 'X-Powered-By': 'VanderHub/4.2' },
      });
    }

    // LAYER 5: Token must match exactly
    if (script.loadstring_token !== token) {
      await logAttempt(base44, scriptId, ua, ip, 'unknown_tool', true);
      await incrementBlocked(base44, scriptId);
      await new Promise(r => setTimeout(r, 600 + Math.floor(Math.random() * 900)));
      // Return a different decoy from the brute-force pool
      const bruteDecoy = DECOYS[(Math.floor(Date.now() / 1000) + 2) % DECOYS.length];
      return new Response(bruteDecoy, { headers: { 'Content-Type': 'text/plain', 'X-Powered-By': 'VanderHub/4.2' } });
    }

    // LAYER 6: Loadstring must be enabled on the script
    if (!script.is_loadstring || !script.is_active) {
      await logAttempt(base44, scriptId, ua, ip, 'unknown_tool', false);
      await new Promise(r => setTimeout(r, 200 + Math.floor(Math.random() * 300)));
      return new Response(getDecoy(), { headers: { 'Content-Type': 'text/plain', 'X-Powered-By': 'VanderHub/4.2' } });
    }

    // ── VALID — serve real script ──
    await logAttempt(base44, scriptId, ua, ip, 'valid', false);
    // Increment fetch count
    try {
      await base44.asServiceRole.entities.Script.update(scriptId, {
        fetch_count: (script.fetch_count || 0) + 1,
      });
    } catch (_e) {}

    return new Response(script.content, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Powered-By': 'VanderHub/4.2',
        'X-VSG-Status': 'authorized',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Request-ID': crypto.randomUUID(),
      },
    });

  } catch (error) {
    console.error('serveScript error:', error.message);
    return new Response(getDecoy(), {
      headers: { 'Content-Type': 'text/plain', 'X-Powered-By': 'VanderHub/4.2' },
    });
  }
});