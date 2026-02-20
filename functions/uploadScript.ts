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
    throw new Error(`Failed to get Firebase access token: ${JSON.stringify(tokenData)}`);
  }
  return tokenData.access_token;
}

async function uploadToFirebase(content, filename) {
  const accessToken = await getFirebaseStorageToken();
  let bucket = Deno.env.get("FIREBASE_STORAGE_BUCKET").replace(/^gs:\/\//, '');
  const safeFilename = filename.toString().replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `scripts/${safeFilename}.lua`;
  const encodedPath = encodeURIComponent(path);

  // Use Google Cloud Storage JSON API (works with service account token)
  const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o?uploadType=media&name=${encodedPath}`;

  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "text/plain",
    },
    body: content,
  });

  const responseText = await uploadRes.text();
  if (!uploadRes.ok) {
    throw new Error(`GCS upload failed (${uploadRes.status}): ${responseText}`);
  }

  // Return public Firebase Storage download URL
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { content, filename } = await req.json();
    if (!content) return Response.json({ error: 'No content provided' }, { status: 400 });

    const file_url = await uploadToFirebase(content, filename || Date.now().toString());
    return Response.json({ file_url });
  } catch (error) {
    console.error("uploadScript error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});