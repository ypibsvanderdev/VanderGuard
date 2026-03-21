import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const GITHUB_REPO = 'ypibsvanderdev/Vander--Guard';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { repoId, repoName } = await req.json();
    if (!repoId) return Response.json({ error: 'repoId required' }, { status: 400 });

    // Get GitHub access token
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('github');

    // Fetch all scripts for this repo
    const scripts = await base44.asServiceRole.entities.Script.filter({ repo_id: repoId });

    const results = [];

    for (const script of scripts) {
      let content = script.content || '';

      // Resolve URL-based content
      if (content.startsWith('http://') || content.startsWith('https://')) {
        try {
          const res = await fetch(content);
          content = await res.text();
        } catch (e) {
          content = `-- Failed to fetch: ${script.content}`;
        }
      } else if (content.startsWith('rtdb://')) {
        try {
          const rtdbScriptId = content.replace('rtdb://', '');
          const dbUrl = "https://vander--hub-default-rtdb.firebaseio.com";
          // Use service account to get token
          const privateKey = Deno.env.get("FIREBASE_PRIVATE_KEY").replace(/\\n/g, '\n');
          const clientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL");
          const now = Math.floor(Date.now() / 1000);
          const header = { alg: "RS256", typ: "JWT" };
          const payload = { iss: clientEmail, sub: clientEmail, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600, scope: "https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email" };
          const encode = (obj) => btoa(JSON.stringify(obj)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
          const unsigned = `${encode(header)}.${encode(payload)}`;
          const keyData = privateKey.replace('-----BEGIN PRIVATE KEY-----','').replace('-----END PRIVATE KEY-----','').replace(/\s/g,'');
          const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
          const cryptoKey = await crypto.subtle.importKey("pkcs8", binaryKey, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
          const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(unsigned));
          const jwt = `${unsigned}.${btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')}`;
          const tokenRes = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}` });
          const tokenData = await tokenRes.json();
          const rtdbRes = await fetch(`${dbUrl}/scripts/${rtdbScriptId}.json?access_token=${tokenData.access_token}`);
          const rtdbData = await rtdbRes.json();
          content = rtdbData?.content || '';
        } catch (e) {
          content = `-- Failed to fetch RTDB content: ${e.message}`;
        }
      }

      const filePath = `${repoName}/${script.name}`;
      const encodedContent = btoa(unescape(encodeURIComponent(content)));

      // Check if file already exists (to get SHA for update)
      let sha;
      const checkRes = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`,
        { headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'VanderHub' } }
      );
      if (checkRes.ok) {
        const existing = await checkRes.json();
        sha = existing.sha;
      }

      // Create or update file
      const body = {
        message: `sync: update ${script.name}`,
        content: encodedContent,
        ...(sha ? { sha } : {}),
      };

      const putRes = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'VanderHub',
          },
          body: JSON.stringify(body),
        }
      );

      const putData = await putRes.json();
      if (!putRes.ok) {
        console.error(`Failed to sync ${script.name}:`, putData.message);
        results.push({ name: script.name, success: false, error: putData.message });
      } else {
        results.push({ name: script.name, success: true });
      }
    }

    const failed = results.filter(r => !r.success);
    return Response.json({
      synced: results.filter(r => r.success).length,
      failed: failed.length,
      errors: failed,
    });

  } catch (error) {
    console.error('syncToGithub error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});