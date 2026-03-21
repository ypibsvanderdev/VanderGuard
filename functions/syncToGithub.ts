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
        content = `-- rtdb script: ${content}`;
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