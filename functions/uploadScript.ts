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

    const { content, filename } = await req.json();
    if (!content) return Response.json({ error: 'No content provided' }, { status: 400 });

    const accessToken = await getFirebaseStorageToken();

    const safeFilename = (filename || Date.now()).toString().replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectPath = `scripts/${safeFilename}.lua`;
    const encodedPath = encodeURIComponent(objectPath);

    // Use the bucket from secrets (e.g. "vander--hub.firebasestorage.app")
    const bucket = Deno.env.get("FIREBASE_STORAGE_BUCKET").replace(/^gs:\/\//, '');
    console.log("Using bucket:", bucket);

    // New Firebase Storage buckets (*.firebasestorage.app) use the Firebase Storage REST API
    const uploadRes = await fetch(
      `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?uploadType=media&name=${encodedPath}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "text/plain",
        },
        body: content,
      }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      console.error("Firebase upload error:", err);
      return Response.json({ error: "Upload failed", detail: err }, { status: 500 });
    }

    // Make the object publicly readable
    await fetch(
      `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodedPath}/iam`,
      {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bindings: [{ role: "roles/storage.objectViewer", members: ["allUsers"] }]
        }),
      }
    ).catch(() => {});

    // Public URL via Firebase Storage REST API
    const file_url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`;
    return Response.json({ file_url });
  } catch (error) {
    console.error("uploadScript error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});