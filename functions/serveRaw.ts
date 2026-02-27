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

// ==================== LUA OBFUSCATOR ====================
function obfuscateLua(source) {
  const randVar = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    let name = '_';
    for (let i = 0; i < 8; i++) name += chars[Math.floor(Math.random() * chars.length)];
    return name + Math.floor(Math.random() * 9999);
  };

  const key = Math.floor(Math.random() * 200) + 50;
  const encrypted = [];
  for (let i = 0; i < source.length; i++) encrypted.push(source.charCodeAt(i) ^ key);

  const vTable = randVar(), vKey = randVar(), vResult = randVar();
  const vI = randVar(), vRun = randVar(), vXor = randVar();

  const chunkTable = (data, varName) => {
    const chunkSize = 500;
    let output = `local ${varName} = {}\n`;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      output += `for _, v in pairs({${chunk.join(',')}}) do table.insert(${varName}, v) end\n`;
    }
    return output;
  };

  let lua = `-- VanderHub Core\n`;
  lua += `local ${vKey}=${key}\n`;
  lua += chunkTable(encrypted, vTable);
  lua += `local ${vResult}={} `;
  lua += `local function ${vXor}(a,b) if bit32 then return bit32.bxor(a,b) end local r,m=0,1 while a>0 or b>0 do if a%2~=b%2 then r=r+m end a,b,m=math.floor(a/2),math.floor(b/2),m*2 end return r end\n`;
  lua += `for ${vI}=1,#${vTable} do ${vResult}[${vI}]=string.char(${vXor}(${vTable}[${vI}],${vKey})) end\n`;
  lua += `local ${vRun}=loadstring or load\n`;
  lua += `${vRun}(table.concat(${vResult}))()\n`;

  const layer2Key = Math.floor(Math.random() * 100) + 10;
  const layer2Encrypted = [];
  for (let i = 0; i < lua.length; i++) layer2Encrypted.push((lua.charCodeAt(i) + layer2Key) % 256);

  const v2Table = randVar(), v2Key = randVar(), v2Result = randVar();
  const v2I = randVar(), v2Run = randVar();

  let finalOutput = `-- VanderHub Shield v2.6 | Fast Execution Shell\n`;
  finalOutput += `local ${v2Key}=${layer2Key}\n`;
  finalOutput += chunkTable(layer2Encrypted, v2Table);
  finalOutput += `local ${v2Result}={} `;
  finalOutput += `for ${v2I}=1,#${v2Table} do ${v2Result}[${v2I}]=string.char((${v2Table}[${v2I}]-${v2Key})%256) end `;
  finalOutput += `local ${v2Run}=loadstring or load `;
  finalOutput += `${v2Run}(table.concat(${v2Result}))()\n`;

  return finalOutput;
}

// ==================== GARBAGE PAYLOAD (512KB random binary) ====================
// Pre-generate once at cold start, reuse for all blocked requests
const TRASH_DATA = (() => {
  const buf = new Uint8Array(512 * 1024);
  crypto.getRandomValues(buf);
  return buf;
})();

function buildGarbageResponse() {
  return new Response(TRASH_DATA, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(TRASH_DATA.length),
      'X-Shield-Action': 'Intercepted',
      'Cache-Control': 'no-store',
    },
  });
}

// HTML block page for browsers
function buildBrowserBlockPage() {
  return `<!DOCTYPE html><html><head><title>Access Denied</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0d1117;color:#e0e0e0;font-family:'Courier New',monospace;display:flex;align-items:center;justify-content:center;min-height:100vh;flex-direction:column;gap:16px}.title{color:#ff4444;font-size:1.2rem;font-weight:bold;letter-spacing:4px}.sub{color:#555;font-size:.8rem}</style>
</head><body><div style="font-size:3rem">🛡️</div><div class="title">VANDERHUB: ACCESS DENIED</div><div class="sub">Raw source code is protected. Browser access is forbidden.</div></body></html>`;
}

// ==================== UA DETECTION ====================
const TOOL_BLACKLIST = [
  /^curl\//i, /^python/i, /^wget\//i, /^axios/i, /^node-fetch/i,
  /^got\//i, /^undici/i, /postman/i, /insomnia/i, /^java\//i,
  /^ruby/i, /^go-http/i, /discordbot/i, /discord/i, /bot\//i,
  /spider/i, /crawler/i, /scraper/i, /^okhttp/i, /^aiohttp/i,
  /^requests\//i, /^libwww/i, /^httpie/i, /debugger/i, /fiddler/i, /charles/i,
];

function isBrowser(req) {
  return req.headers.has('sec-fetch-mode') ||
    req.headers.has('sec-fetch-dest') ||
    req.headers.has('sec-fetch-site') ||
    (req.headers.get('accept') || '').includes('text/html');
}

function isBlacklisted(ua) {
  for (const p of TOOL_BLACKLIST) { if (p.test(ua)) return true; }
  return false;
}

// ==================== SHARED SECRET ====================
const SHARED_SECRET = Deno.env.get("SERVE_SECRET") || "vander2026";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const scriptId = url.searchParams.get('id');
  const token = url.searchParams.get('t');
  const key = url.searchParams.get('key');

  const ua = req.headers.get('user-agent') || '';
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             req.headers.get('cf-connecting-ip') || 'unknown';

  const base44 = createClientFromRequest(req);
  const seed = Date.now() % 99999;

  // BLOCK BROWSERS — no browser ever gets script content
  if (isBrowser(req)) {
    return new Response(buildBrowserBlockPage(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  // BLOCK KNOWN TOOLS/BOTS — serve 512KB garbage dump
  if (isBlacklisted(ua)) {
    console.warn(`[VANDER-TRAP] Bot detected: ${ua} — sending 512KB garbage`);
    return buildGarbageResponse();
  }

  // SHARED SECRET CHECK
  if (key !== SHARED_SECRET) {
    return buildGarbageResponse();
  }

  // TOKEN + ID MUST BE PRESENT
  if (!scriptId || !token || token.length < 32) {
    return buildGarbageResponse();
  }

  // DB VALIDATION
  try {
    const scripts = await base44.asServiceRole.entities.Script.filter({ id: scriptId });
    const script = scripts[0];

    if (!script) {
      return buildGarbageResponse();
    }

    if (script.loadstring_token !== token) {
      await new Promise(r => setTimeout(r, 800 + Math.floor(Math.random() * 1200)));
      return buildGarbageResponse();
    }

    if (!script.is_loadstring || !script.is_active) {
      return new Response('-- Script is not available.', {
        headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' },
      });
    }

    // VALID — resolve content
    let scriptContent = script.content || '';

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

    // OBFUSCATE LUA before serving
    const isLua = !scriptContent.startsWith('http') && scriptContent.length > 0;
    const finalContent = isLua ? obfuscateLua(scriptContent) : scriptContent;

    return new Response(finalContent, {
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
    return buildGarbageResponse();
  }
});