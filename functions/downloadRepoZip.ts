import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import JSZip from 'npm:jszip@3.10.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { repoId } = await req.json();
    if (!repoId) return Response.json({ error: 'repoId required' }, { status: 400 });

    const scripts = await base44.asServiceRole.entities.Script.filter({ repo_id: repoId });

    const zip = new JSZip();

    for (const script of scripts) {
      let content = script.content || '';

      if (content.startsWith('rtdb://')) {
        // skip rtdb scripts for now — just add placeholder
        content = `-- rtdb:// script (${script.name}) — fetch from Firebase`;
      } else if (content.startsWith('http://') || content.startsWith('https://')) {
        try {
          const res = await fetch(content);
          content = await res.text();
        } catch {
          content = `-- Failed to fetch: ${content}`;
        }
      }

      zip.file(script.name || `script_${script.id}.lua`, content);
    }

    const zipBuffer = await zip.generateAsync({ type: 'uint8array' });

    return new Response(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="repo_${repoId}.zip"`,
      },
    });
  } catch (error) {
    console.error('downloadRepoZip error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});