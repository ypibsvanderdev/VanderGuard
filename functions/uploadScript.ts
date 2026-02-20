import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function getFirebaseToken() {
  const privateKey = Deno.env.get("FIREBASE_PRIVATE_KEY").replace(/\\n/g, '\n');
  const clientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL");

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email",
  };

  const encode = (obj) => btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const unsigned = `${encode(header)}.${encode(payload)}`;

  const keyData = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", cryptoKey,
    new TextEncoder().encode(unsigned)
  );

  const jwt = `${unsigned}.${btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    console.error("Token error:", JSON.stringify(tokenData));
    throw new Error("Failed to get Firebase access token");
  }
  return tokenData.access_token;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { content, filename, scriptId } = await req.json();
    if (!content) return Response.json({ error: 'No content provided' }, { status: 400 });
    if (!scriptId) return Response.json({ error: 'No scriptId provided' }, { status: 400 });

    const accessToken = await getFirebaseToken();
    const dbUrl = "https://vander--hub-default-rtdb.firebaseio.com";

    // Store content in RTDB at /scripts/{scriptId}
    const res = await fetch(`${dbUrl}/scripts/${scriptId}.json?access_token=${accessToken}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, filename, updatedAt: Date.now() }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("RTDB write error:", err);
      return Response.json({ error: "Failed to store in Firebase", detail: err }, { status: 500 });
    }

    // Return a special rtdb:// URL so serveRaw knows to fetch from RTDB
    const file_url = `rtdb://${scriptId}`;
    return Response.json({ file_url });
  } catch (error) {
    console.error("uploadScript error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});