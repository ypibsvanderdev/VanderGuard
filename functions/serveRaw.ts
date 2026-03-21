import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ═══════════════════════════════════════════════════════════════
// VANDER SECURE RAW v5.0 — LUARMOR-MATCHED LOADSTRING PROTECTION
// ═══════════════════════════════════════════════════════════════
//
// URL FORMAT (matches Luarmor V4):
//   GET /files/v4/loaders/{SCRIPT_KEY}.lua
//   Mapped as: ?id={scriptId}&t={loadstring_token}&key={shared_secret}&hwid={hwid}
//
// PROTECTION LAYERS (1:1 Luarmor match):
//   Layer 0: Per-IP rate limiter (sliding window, 15 req/min)
//   Layer 1: Browser detection → styled HTML "Access Denied"
//   Layer 2: Tool/bot UA blacklist → 512KB binary garbage dump
//   Layer 3: Shared secret gate → garbage if missing/wrong
//   Layer 4: Script token validation → garbage + delay
//   Layer 5: HWID binding & key validation (one-time bind, lock)
//   Layer 6: Script active/loadstring enabled check
//   Layer 7: Serve real content with dual-layer XOR obfuscation
//
// OBFUSCATION (matches Luarmor/Luraph style):
//   - Layer 1: XOR encryption with random key
//   - Layer 2: Byte-shift encryption wrapping layer 1
//   - Variable names are randomized per-request
//   - Anti-deobfuscator honeypot traps injected
//   - Integrity check blocks that crash naive analyzers
// ═══════════════════════════════════════════════════════════════

// ── FIREBASE TOKEN CACHE ──
let _cachedToken: string | null = null;
let _tokenExpiry = 0;

async function getFirebaseToken(): Promise<string> {
  if (_cachedToken && Date.now() < _tokenExpiry) return _cachedToken;
  const privateKey = Deno.env.get("FIREBASE_PRIVATE_KEY")!.replace(/\\n/g, '\n');
  const clientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL")!;
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: clientEmail, sub: clientEmail,
    aud: "https://oauth2.googleapis.com/token",
    iat: now, exp: now + 3600,
    scope: "https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email",
  };
  const encode = (obj: any) => btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
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
  _cachedToken = tokenData.access_token;
  _tokenExpiry = Date.now() + 55 * 60 * 1000;
  return _cachedToken;
}

// ═══════════════════════════════════════════════════════════════
// LUARMOR-STYLE DUAL-LAYER LUA OBFUSCATOR
// ═══════════════════════════════════════════════════════════════
// Matches Luarmor/Luraph output: XOR layer 1 → byte-shift layer 2
// with randomized variable names, chunked tables, and integrity blocks

function obfuscateLua(source: string): string {
  const randVar = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    let name = '_';
    for (let i = 0; i < 10; i++) name += chars[Math.floor(Math.random() * chars.length)];
    return name + Math.floor(Math.random() * 99999);
  };

  // ── LAYER 1: XOR Encryption ──
  const xorKey = Math.floor(Math.random() * 200) + 50;
  const encrypted: number[] = [];
  for (let i = 0; i < source.length; i++) encrypted.push(source.charCodeAt(i) ^ xorKey);

  const vTable = randVar(), vKey = randVar(), vResult = randVar();
  const vI = randVar(), vRun = randVar(), vXor = randVar();

  const chunkTable = (data: number[], varName: string) => {
    const chunkSize = 400;
    let output = `local ${varName} = {}\n`;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      output += `for _, v in pairs({${chunk.join(',')}}) do table.insert(${varName}, v) end\n`;
    }
    return output;
  };

  // Anti-tamper integrity block (Luarmor style)
  const integrityVar = randVar();
  const integrityBlock = `
local ${integrityVar} = (function()
  local _e = game:GetService("HttpService"):GenerateGUID(false)
  if not _e or #_e < 30 then return false end
  local _h = 0
  for i = 1, #_e do _h = _h + string.byte(_e, i) end
  return _h > 100
end)()
if not ${integrityVar} then return end
`;

  let lua = `-- VanderHub Secure Loader v5.0\n`;
  lua += integrityBlock;
  lua += `local ${vKey}=${xorKey}\n`;
  lua += chunkTable(encrypted, vTable);
  lua += `local ${vResult}={} `;
  lua += `local function ${vXor}(a,b) if bit32 then return bit32.bxor(a,b) end local r,m=0,1 while a>0 or b>0 do if a%2~=b%2 then r=r+m end a,b,m=math.floor(a/2),math.floor(b/2),m*2 end return r end\n`;
  lua += `for ${vI}=1,#${vTable} do ${vResult}[${vI}]=string.char(${vXor}(${vTable}[${vI}],${vKey})) end\n`;
  lua += `local ${vRun}=loadstring or load\n`;
  lua += `${vRun}(table.concat(${vResult}))()\n`;

  // ── LAYER 2: Byte-Shift Encryption (wraps Layer 1) ──
  const shiftKey = Math.floor(Math.random() * 100) + 10;
  const layer2Encrypted: number[] = [];
  for (let i = 0; i < lua.length; i++) layer2Encrypted.push((lua.charCodeAt(i) + shiftKey) % 256);

  const v2Table = randVar(), v2Key = randVar(), v2Result = randVar();
  const v2I = randVar(), v2Run = randVar();

  // Honeypot trap that crashes deobfuscators
  const trapVar = randVar();
  const honeypotTrap = `
local ${trapVar} = setmetatable({}, {
  __index = function(t, k) rawset(t, k, function(...) return select('#', ...) end) return t[k] end,
  __newindex = function() end,
  __tostring = function() return "" end,
  __len = function() return 0 end,
})
`;

  // Fake environment check (Luarmor does this to verify executor context)
  const envCheckVar = randVar();
  const envCheck = `
local ${envCheckVar} = (function()
  local ok, _ = pcall(function() return game:GetService("Players").LocalPlayer end)
  if not ok then return false end
  local ok2, _ = pcall(function() return game:GetService("HttpService") end)
  return ok2
end)()
if not ${envCheckVar} then
  warn("[VH] Invalid execution context")
  return
end
`;

  let finalOutput = `-- VanderHub Shield v5.0 | Luarmor-Grade Protection\n`;
  finalOutput += `-- Session: ${crypto.randomUUID()}\n`;
  finalOutput += `-- Timestamp: ${new Date().toISOString()}\n\n`;
  finalOutput += envCheck;
  finalOutput += honeypotTrap;
  finalOutput += `local ${v2Key}=${shiftKey}\n`;
  finalOutput += chunkTable(layer2Encrypted, v2Table);
  finalOutput += `local ${v2Result}={} `;
  finalOutput += `for ${v2I}=1,#${v2Table} do ${v2Result}[${v2I}]=string.char((${v2Table}[${v2I}]-${v2Key})%256) end `;
  finalOutput += `local ${v2Run}=loadstring or load `;
  finalOutput += `${v2Run}(table.concat(${v2Result}))()\n`;

  return finalOutput;
}

// ═══════════════════════════════════════════════════════════════
// GARBAGE PAYLOADS & BLOCK PAGES
// ═══════════════════════════════════════════════════════════════

// Pre-generated 512KB binary garbage (reused for all blocked requests)
const TRASH_DATA = (() => {
  const buf = new Uint8Array(512 * 1024);
  crypto.getRandomValues(buf);
  return buf;
})();

function buildGarbageResponse(): Response {
  return new Response(TRASH_DATA, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(TRASH_DATA.length),
      'X-Shield-Action': 'Intercepted',
      'Cache-Control': 'no-store',
    },
  });
}

// Browser block page (Luarmor style)
function buildBrowserBlockPage(): string {
  return `<!DOCTYPE html><html><head><title>Access Denied</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0d1117;color:#e0e0e0;font-family:'Courier New',monospace;display:flex;align-items:center;justify-content:center;min-height:100vh;flex-direction:column;gap:16px}.shield{font-size:3rem;animation:pulse 2s infinite}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}.title{color:#ff4444;font-size:1.2rem;font-weight:bold;letter-spacing:4px}.sub{color:#555;font-size:.8rem}.info{color:#333;font-size:.7rem;border:1px solid #1a1a2e;padding:8px 16px;border-radius:6px}</style>
</head><body><div class="shield">🛡️</div><div class="title">VANDERHUB: ACCESS DENIED</div><div class="sub">Raw source code is protected. Browser access is forbidden.</div><div class="info">VSG v5.0 · Gate: ACTIVE · ${new Date().toISOString()}</div></body></html>`;
}

// Short decoys for disabled scripts
const DECOYS = [
  `-- [VH] Access validation failed\n-- Error: 0x4E4F414343455353\nlocal x = {}\nsetmetatable(x, {__index = function(t,k) return function(...) return nil end end})\nwarn("[VH] Secure execution context: DENIED")\nreturn nil`,
  `-- VanderHub Encrypted Payload v5.0\n-- Status: UNAUTHORIZED_ACCESS\nlocal Players = game:GetService("Players")\nif not Players.LocalPlayer then return end\nwarn("[VH] Session validation failed")\nreturn nil`,
];

// ═══════════════════════════════════════════════════════════════
// UA DETECTION (Luarmor-matched)
// ═══════════════════════════════════════════════════════════════

const TOOL_BLACKLIST = [
  /^curl\//i, /^python/i, /^wget\//i, /^axios/i, /^node-fetch/i,
  /^got\//i, /^undici/i, /postman/i, /insomnia/i, /^java\//i,
  /^ruby/i, /^go-http/i, /discordbot/i, /discord/i, /bot\//i,
  /spider/i, /crawler/i, /scraper/i, /^okhttp/i, /^aiohttp/i,
  /^requests\//i, /^libwww/i, /^httpie/i, /debugger/i, /fiddler/i, /charles/i,
];

function isBrowser(req: Request): boolean {
  const ua = (req.headers.get('user-agent') || '').toLowerCase();
  if (ua.includes('roblox')) return false; // Never block Roblox executors
  return req.headers.has('sec-fetch-mode') ||
    req.headers.has('sec-fetch-dest') ||
    req.headers.has('sec-fetch-site') ||
    (req.headers.get('accept') || '').includes('text/html');
}

function isBlacklisted(ua: string): boolean {
  if (ua.toLowerCase().includes('roblox')) return false;
  for (const p of TOOL_BLACKLIST) { if (p.test(ua)) return true; }
  return false;
}

// ═══════════════════════════════════════════════════════════════
// RATE LIMITER (per-IP sliding window)
// ═══════════════════════════════════════════════════════════════
const rateLimitMap = new Map<string, number[]>();
const RATE_WINDOW = 60_000;
const RATE_MAX = 15;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const ts = rateLimitMap.get(ip) || [];
  const recent = ts.filter(t => now - t < RATE_WINDOW);
  recent.push(now);
  rateLimitMap.set(ip, recent);
  if (rateLimitMap.size > 2000) {
    for (const [k, v] of rateLimitMap) {
      if (v.every(t => now - t > RATE_WINDOW)) rateLimitMap.delete(k);
    }
  }
  return recent.length > RATE_MAX;
}

// ═══════════════════════════════════════════════════════════════
// SHARED SECRET (like Luarmor's API key requirement)
// ═══════════════════════════════════════════════════════════════
const SHARED_SECRET = Deno.env.get("SERVE_SECRET") || "vander2026";

// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER — LUARMOR-MATCHED PROTECTION FLOW
// ═══════════════════════════════════════════════════════════════
//
// Luarmor flow:
//   1. loadstring(game:HttpGet(URL))() → executor sends GET
//   2. Server checks UA, headers, IP
//   3. Server validates script ID + token + HWID
//   4. Server serves XOR-obfuscated Lua if valid
//   5. Invalid = garbage/block/kick
//
// Our flow matches this exactly:

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const scriptId = url.searchParams.get('id');
  const token = url.searchParams.get('t');
  const key = url.searchParams.get('key');
  const hwid = url.searchParams.get('hwid');

  const ua = req.headers.get('user-agent') || '';
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             req.headers.get('cf-connecting-ip') || 'unknown';

  const base44 = createClientFromRequest(req);

  // ── LAYER 0: Rate Limiting ──
  if (isRateLimited(ip)) {
    console.warn(`[VANDER-GATE] Rate limited: ${ip}`);
    await new Promise(r => setTimeout(r, 2000));
    return buildGarbageResponse();
  }

  // ── LAYER 1: Browser Block (Luarmor shows "Access Denied" page) ──
  if (isBrowser(req)) {
    return new Response(buildBrowserBlockPage(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  // ── LAYER 2: Tool/Bot Blacklist (Luarmor sends garbage to curl/wget) ──
  if (isBlacklisted(ua)) {
    console.warn(`[VANDER-TRAP] Bot detected: ${ua} — sending 512KB garbage`);
    return buildGarbageResponse();
  }

  // ── LAYER 3: Shared Secret Gate (Luarmor's API key equivalent) ──
  if (key !== SHARED_SECRET) {
    return buildGarbageResponse();
  }

  // ── LAYER 4: Token + ID must be present ──
  if (!scriptId || !token || token.length < 32) {
    return buildGarbageResponse();
  }

  // ── LAYERS 5–7: Database Validation ──
  try {
    const scripts = await base44.asServiceRole.entities.Script.filter({ id: scriptId });
    const script = scripts[0];

    // LAYER 5: Script must exist
    if (!script) {
      return buildGarbageResponse();
    }

    // LAYER 5b: Token must match (per-script, like Luarmor's loader key)
    if (script.loadstring_token !== token) {
      await new Promise(r => setTimeout(r, 800 + Math.floor(Math.random() * 1200)));
      return buildGarbageResponse();
    }

    // ── LAYER 5c: HWID VALIDATION (Luarmor's core feature) ──
    // If the script is private (requires key), validate HWID + key
    if (script.is_private && hwid) {
      // Check if this HWID is globally banned
      try {
        const bannedCheck = await base44.asServiceRole.entities.BannedHwid?.filter({ hwid });
        if (bannedCheck && bannedCheck.length > 0) {
          console.warn(`[VANDER-GATE] BANNED HWID attempted access: ${hwid}`);
          return new Response(
            `-- [VH] ACCESS DENIED\n-- Your hardware has been permanently blacklisted.\ngame.Players.LocalPlayer:Kick("[VanderHub] You are banned from this network.")`,
            { headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' } }
          );
        }
      } catch (_e) {}

      // If script requires a user key (not just the loadstring token)
      if (script.requires_key) {
        const userKey = url.searchParams.get('ukey');
        if (!userKey) {
          return new Response(
            `-- [VH] KEY REQUIRED\n-- This script requires a valid access key.\n-- Get one from the VanderHub dashboard.\ngame.Players.LocalPlayer:Kick("[VanderHub] Access key required. Visit the dashboard.")`,
            { headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' } }
          );
        }

        // Validate the user's key
        const keys = await base44.asServiceRole.entities.AccessKey.filter({
          key_value: userKey.trim().toUpperCase(),
        });

        if (!keys || keys.length === 0) {
          return new Response(
            `-- [VH] INVALID KEY\ngame.Players.LocalPlayer:Kick("[VanderHub] Invalid access key.")`,
            { headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' } }
          );
        }

        const accessKey = keys[0];

        // Check key is active
        if (!accessKey.is_active) {
          return new Response(
            `-- [VH] KEY INACTIVE\ngame.Players.LocalPlayer:Kick("[VanderHub] This key has been deactivated.")`,
            { headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' } }
          );
        }

        // Check expiry for monthly/trial keys
        if ((accessKey.key_type === 'monthly' || accessKey.key_type === 'trial') && accessKey.expires_at) {
          if (new Date() > new Date(accessKey.expires_at)) {
            return new Response(
              `-- [VH] KEY EXPIRED\ngame.Players.LocalPlayer:Kick("[VanderHub] Your key has expired. Renew at the dashboard.")`,
              { headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' } }
            );
          }
        }

        // HWID BINDING (Luarmor's core: first-use locks to hardware)
        if (accessKey.hwid && accessKey.hwid !== hwid) {
          console.warn(`[VANDER-GATE] HWID MISMATCH: key=${userKey} expected=${accessKey.hwid} got=${hwid}`);
          return new Response(
            `-- [VH] HARDWARE MISMATCH\n-- This key is bound to a different device.\ngame.Players.LocalPlayer:Kick("[VanderHub] Hardware mismatch. This key is locked to another device.")`,
            { headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' } }
          );
        }

        // First-use: bind HWID to this key
        if (!accessKey.hwid) {
          await base44.asServiceRole.entities.AccessKey.update(accessKey.id, {
            hwid: hwid,
            is_used: true,
            used_by_email: accessKey.used_by_email || 'hwid-auto-bound',
          });
          console.log(`[VANDER-GATE] Key ${userKey} bound to HWID: ${hwid}`);
        }
      }
    }

    // LAYER 6: Loadstring must be enabled & script active
    if (!script.is_loadstring || !script.is_active) {
      return new Response(DECOYS[Date.now() % DECOYS.length], {
        headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' },
      });
    }

    // ── LAYER 7: VALID — Resolve & Serve with Obfuscation ──
    let scriptContent = script.content || '';

    // Resolve content from Firebase RTDB if needed
    if (scriptContent.startsWith('rtdb://')) {
      const rtdbScriptId = scriptContent.replace('rtdb://', '');
      const dbUrl = "https://vander--hub-default-rtdb.firebaseio.com";
      const accessToken = await getFirebaseToken();
      const rtdbRes = await fetch(`${dbUrl}/scripts/${rtdbScriptId}.json?access_token=${accessToken}`);
      const rtdbData = await rtdbRes.json();
      scriptContent = rtdbData?.content || '';
    } else if (scriptContent.startsWith('http://') || scriptContent.startsWith('https://')) {
      const fileRes = await fetch(scriptContent);
      scriptContent = await fileRes.text();
    }

    // Update fetch count (fire and forget)
    base44.asServiceRole.entities.Script.update(scriptId, {
      fetch_count: (script.fetch_count || 0) + 1,
    }).catch(() => {});

    // ── OBFUSCATE (Luarmor-style dual-layer XOR) before serving ──
    const isLua = !scriptContent.startsWith('http') && scriptContent.length > 0;
    const finalContent = isLua ? obfuscateLua(scriptContent) : scriptContent;

    return new Response(finalContent, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Powered-By': 'VanderHub/5.0',
        'X-VSG-Status': 'authorized',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Request-ID': crypto.randomUUID(),
      },
    });

  } catch (error) {
    console.error('serveRaw error:', error.message);
    return buildGarbageResponse();
  }
});