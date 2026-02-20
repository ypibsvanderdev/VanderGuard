import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function getFirebaseStorageToken() {
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
    scope: "https://www.googleapis.com/auth/devstorage.read_write",
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

    console.log("User authenticated:", user.email);

    const { content, filename } = await req.json();
    if (!content) return Response.json({ error: 'No content provided' }, { status: 400 });

    const accessToken = await getFirebaseStorageToken();
    console.log("Got access token, length:", accessToken?.length);

    // Firebase Storage bucket: "vander--hub.firebasestorage.app"
    let bucket = Deno.env.get("FIREBASE_STORAGE_BUCKET");
    bucket = bucket.replace(/^gs:\/\//, '');
    console.log("Bucket:", bucket);
    const safeFilename = (filename || Date.now()).toString().replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `scripts/${safeFilename}.lua`;
    const encodedPath = encodeURIComponent(path);

    // Firebase Storage REST API upload
    const projectId = Deno.env.get("FIREBASE_PROJECT_ID");
    // Try both bucket formats
    console.log("Using bucket:", bucket);
    const uploadRes = await fetch(
      `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?name=${encodedPath}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "text/plain",
        },
        body: content,
      }
    );

    const uploadBody = await uploadRes.text();
    console.log("Upload status:", uploadRes.status, "body:", uploadBody.substring(0, 500));
    if (!uploadRes.ok) {
      return Response.json({ error: "Upload failed", detail: uploadBody }, { status: 500 });
    }

    const file_url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`;
    return Response.json({ file_url });
  } catch (error) {
    console.error("uploadScript error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});