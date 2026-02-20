import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { content } = await req.json();

    // Store content via the integrations service
    const result = await base44.asServiceRole.integrations.Core.UploadFile({
      file: new Blob([content ?? ""], { type: "text/plain" })
    });

    return Response.json({ file_url: result.file_url });
  } catch (error) {
    console.error("uploadScript error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});