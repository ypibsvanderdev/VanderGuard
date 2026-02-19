import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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
    ).join('\n') + `\n}`;
  return `-- VanderHub Secure Gate v4.2\n-- Status: UNAUTHORIZED\n\n${fakeVars}\n${fakeFuncs}\n${fakeTable}`;
}

// Browser block HTML page
function buildBrowserBlockPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>VanderHub: Access Denied</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#0d1117;color:#e0e0e0;font-family:'Courier New',monospace;display:flex;align-items:center;justify-content:center;min-height:100vh;flex-direction:column;gap:16px}
  .shield{font-size:3rem}.title{color:#ff4444;font-size:1.2rem;font-weight:bold;letter-spacing:4px;text-transform:uppercase}
  .sub{color:#555;font-size:.8rem}.info{color:#333;font-size:.7rem;border:1px solid #1a1a2e;padding:8px 16px;border-radius:6px}
</style></head>
<body>
  <div class="shield">🛡️</div>
  <div class="title">VANDERHUB: ACCESS DENIED</div>
  <div class="sub">Raw source code is protected. Browser access is forbidden.</div>
  <div class="info">VSG v4.2 · Session: INVALIDATED · Gate: ACTIVE</div>
</body></html>`;
}

const BROWSER_HEADERS = ['sec-fetch-mode','sec-fetch-site','sec-fetch-dest','sec-ch-ua','sec-ch-ua-mobile','sec-ch-ua-platform','upgrade-insecure-requests'];

const TOOL_UA = [
  /^curl\//i, /^python/i, /^wget\//i, /^httpie/i, /^axios/i,
  /^node-fetch/i, /^got\//i, /^undici/i, /postman/i, /insomnia/i,
  /^java\//i, /^ruby/i, /^go-http/i, /discordbot/i, /discord/i,
  /bot\//i, /spider/i, /crawler/i, /scraper/i, /^okhttp/i,
  /^aiohttp/i, /^requests\//i,
];

const BROWSER_UA = [/mozilla\/5\.0/i, /chrome\//i, /firefox\//i, /safari\//i, /opera\//i, /msie/i, /trident\//i, /edg\//i];

function isBrowserRequest(req, ua, accept) {
  let score = 0;
  for (const h of BROWSER_HEADERS) { if (req.headers.has(h)) score += 2; }
  if (accept.includes('text/html')) score += 5;
  if (accept.includes('application/xhtml')) score += 3;
  if (req.headers.has('referer')) score += 3;
  if (req.headers.has('cookie')) score += 2;
  if (req.headers.has('origin')) score += 1;
  for (const p of BROWSER_UA) { if (p.test(ua)) { score += 4; break; } }
  return score >= 4;
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

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const scriptId = url.searchParams.get('id');
  const token = url.searchParams.get('t');

  const ua = req.headers.get('user-agent') || '';
  const accept = req.headers.get('accept') || '';
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             req.headers.get('cf-connecting-ip') ||
             req.headers.get('x-real-ip') || 'unknown';

  const base44 = createClientFromRequest(req);
  const seed = Date.now() % 99999;

  // LAYER 1: Block browsers with HTML page
  if (isBrowserRequest(req, ua, accept)) {
    await logAttempt(base44, scriptId, ua, ip, 'browser', true);
    return new Response(buildBrowserBlockPage(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  // LAYER 2: Discord bots / tools → log IP + 500KB garbage + delay
  if (isToolRequest(ua)) {
    console.log(`[BLOCKED] Tool/Bot request from IP: ${ip} | UA: ${ua}`);
    await logAttempt(base44, scriptId, ua, ip, 'unknown_tool', true);
    await new Promise(r => setTimeout(r, 400 + Math.floor(Math.random() * 800)));
    return new Response(buildGarbagePayload(seed), {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  // LAYER 3: Missing token / id
  if (!scriptId || !token) {
    await new Promise(r => setTimeout(r, 200));
    return new Response(buildGarbagePayload(seed), {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  // LAYER 4: Validate script from DB
  try {
    const scripts = await base44.asServiceRole.entities.Script.filter({ id: scriptId });
    const script = scripts[0];

    if (!script || script.loadstring_token !== token) {
      await logAttempt(base44, scriptId, ua, ip, 'unknown_tool', true);
      await new Promise(r => setTimeout(r, 600));
      return new Response(buildGarbagePayload(seed), {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    if (!script.is_active) {
      return new Response('-- Script is disabled', {
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // Valid executor — serve real content
    await logAttempt(base44, scriptId, ua, ip, 'valid', false);
    try {
      await base44.asServiceRole.entities.Script.update(scriptId, {
        fetch_count: (script.fetch_count || 0) + 1,
      });
    } catch (_e) {}

    return new Response(script.content, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store, no-cache',
        'X-VSG-Status': 'authorized',
      },
    });

  } catch (error) {
    console.error('serveRaw error:', error.message);
    return new Response(buildGarbagePayload(seed), {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
});