import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Decoy scripts - convincing but non-functional Lua that wastes reverser time
const DECOY_SCRIPTS = [
  `-- VanderHub Secure Script v4.2
local _0x1a2b = require(game:GetService("HttpService"))
local _0x3c4d = _0x1a2b:JSONDecode(_0x1a2b:GetAsync("https://api.vander-hub.com/v2/auth?t=" .. tostring(os.time())))
if _0x3c4d.valid then
  loadstring(_0x3c4d.payload)()
end`,
  `-- VSG v4.2 | Encrypted Delivery
local s=game:GetService
local h=s(game,"HttpService")
local r=s(game,"RunService")
if not r:IsClient() then return end
local _k=h:JSONDecode(h:GetAsync("https://gate.vander-secure.com/fetch?k=__TOKEN__"))
if _k and _k.sig==__CHECKSUM__ then
  return loadstring(_k.data)()
end`,
  `-- Vander Secure Gate | Access Verified
local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local lp = Players.LocalPlayer
local uid = tostring(lp.UserId)
local resp = HttpService:JSONDecode(HttpService:GetAsync("https://cdn.vander-hub.net/gate/" .. uid))
if resp.status == 200 and resp.checksum == __HASH__ then
  loadstring(resp.script)()
end`
];

// Deep multi-layer UA fingerprinting
function analyzeRequest(req) {
  const ua = (req.headers.get("user-agent") || "").toLowerCase();
  const accept = (req.headers.get("accept") || "").toLowerCase();
  const acceptLang = req.headers.get("accept-language") || "";
  const acceptEnc = req.headers.get("accept-encoding") || "";
  const secFetch = req.headers.get("sec-fetch-dest") || "";
  const secFetchSite = req.headers.get("sec-fetch-site") || "";
  const origin = req.headers.get("origin") || "";
  const referer = req.headers.get("referer") || "";
  const xForwarded = req.headers.get("x-forwarded-for") || "";
  const connection = (req.headers.get("connection") || "").toLowerCase();

  let threatScore = 0;
  let detectedAs = "unknown";

  // Layer 1: Browser detection via sec-fetch headers (added by all modern browsers)
  if (secFetch !== "") { threatScore += 80; detectedAs = "browser"; }
  if (secFetchSite !== "") { threatScore += 20; }
  if (origin !== "") { threatScore += 30; }
  if (referer !== "") { threatScore += 20; }

  // Layer 2: Browser UA string patterns
  const browserPatterns = [
    "mozilla", "chrome", "safari", "firefox", "edge", "opera",
    "webkit", "gecko", "trident", "msie", "blink"
  ];
  for (const pattern of browserPatterns) {
    if (ua.includes(pattern)) { threatScore += 25; detectedAs = "browser"; break; }
  }

  // Layer 3: Scripting tool detection
  const toolPatterns = [
    { pattern: "python", type: "python" },
    { pattern: "requests", type: "python" },
    { pattern: "urllib", type: "python" },
    { pattern: "curl", type: "curl" },
    { pattern: "wget", type: "curl" },
    { pattern: "httpie", type: "curl" },
    { pattern: "axios", type: "unknown_tool" },
    { pattern: "node-fetch", type: "unknown_tool" },
    { pattern: "go-http", type: "unknown_tool" },
    { pattern: "java", type: "unknown_tool" },
    { pattern: "ruby", type: "unknown_tool" },
    { pattern: "libwww", type: "unknown_tool" },
    { pattern: "lwp", type: "unknown_tool" },
    { pattern: "postman", type: "unknown_tool" },
    { pattern: "insomnia", type: "unknown_tool" },
    { pattern: "burp", type: "unknown_tool" },
  ];
  for (const { pattern, type } of toolPatterns) {
    if (ua.includes(pattern)) { threatScore += 90; detectedAs = type; break; }
  }

  // Layer 4: Suspicious Accept header (browsers send complex accept, raw tools send */*)
  if (accept === "*/*" && threatScore < 50) { threatScore += 40; detectedAs = "unknown_tool"; }
  if (accept.includes("text/html")) { threatScore += 50; detectedAs = "browser"; }

  // Layer 5: No accept-language is suspicious in browser context but common for tools
  if (acceptLang === "" && !ua.includes("roblox")) { threatScore += 15; }

  // Layer 6: Roblox-specific trust signals
  const isRoblox = ua.includes("roblox") || ua.includes("rbxhttprequest");
  if (isRoblox) { threatScore = 0; detectedAs = "valid"; }

  return {
    threatScore,
    detectedAs,
    isLegitimate: isRoblox && threatScore === 0
  };
}

// Generate a convincing but fake/useless decoy response
function serveDecoy(token, detectedAs) {
  const decoy = DECOY_SCRIPTS[Math.floor(Math.random() * DECOY_SCRIPTS.length)];
  // Replace placeholders with random-looking values to seem real
  const fakeHash = Array.from({length: 32}, () => Math.floor(Math.random()*16).toString(16)).join('');
  const fakeChecksum = Math.floor(Math.random() * 0xFFFFFF);
  const result = decoy
    .replace("__TOKEN__", token || "0x" + fakeHash.slice(0,16))
    .replace("__CHECKSUM__", "0x" + fakeHash.slice(0,8))
    .replace("__HASH__", fakeHash);
  return result;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { token } = body;

  if (!token) {
    // Return convincing decoy instead of error
    return new Response(serveDecoy("", "unknown"), {
      headers: { "content-type": "text/plain" }
    });
  }

  const analysis = analyzeRequest(req);

  // Log all attempts
  const logEntry = {
    script_token: token,
    user_agent: req.headers.get("user-agent") || "",
    attempt_type: analysis.detectedAs,
    decoy_served: !analysis.isLegitimate,
    timestamp: new Date().toISOString()
  };

  // Fire-and-forget log (don't await, don't let it block)
  base44.asServiceRole.entities.SecurityLog.create(logEntry).catch(() => {});

  if (!analysis.isLegitimate) {
    // Increment blocked attempts on script
    base44.asServiceRole.entities.Script.filter({ loadstring_token: token }).then(scripts => {
      if (scripts && scripts[0]) {
        base44.asServiceRole.entities.Script.update(scripts[0].id, {
          blocked_attempts: (scripts[0].blocked_attempts || 0) + 1
        });
      }
    }).catch(() => {});

    // Add artificial delay to slow down automated scanners
    await new Promise(r => setTimeout(r, 800 + Math.random() * 1200));

    // Return convincing decoy
    return new Response(serveDecoy(token, analysis.detectedAs), {
      headers: { "content-type": "text/plain" }
    });
  }

  // Legitimate Roblox request - fetch the real script
  const scripts = await base44.asServiceRole.entities.Script.filter({
    loadstring_token: token,
    is_active: true,
    is_loadstring: true
  });

  if (!scripts || scripts.length === 0) {
    return new Response(serveDecoy(token, "valid"), {
      headers: { "content-type": "text/plain" }
    });
  }

  const script = scripts[0];

  // Update fetch count
  base44.asServiceRole.entities.Script.update(script.id, {
    fetch_count: (script.fetch_count || 0) + 1
  }).catch(() => {});

  return new Response(script.content, {
    headers: { "content-type": "text/plain" }
  });
});