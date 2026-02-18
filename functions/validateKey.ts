import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { key } = body;

  if (!key) {
    return Response.json({ valid: false, error: "No key provided" }, { status: 400 });
  }

  const keys = await base44.asServiceRole.entities.AccessKey.filter({ key_value: key });

  if (!keys || keys.length === 0) {
    return Response.json({ valid: false, error: "Invalid key" }, { status: 404 });
  }

  const accessKey = keys[0];

  if (accessKey.is_used) {
    return Response.json({ valid: false, error: "Key already used" }, { status: 403 });
  }

  if (!accessKey.is_active) {
    return Response.json({ valid: false, error: "Key inactive" }, { status: 403 });
  }

  // Check expiry for monthly keys
  if (accessKey.key_type === "monthly" && accessKey.expires_at) {
    if (new Date(accessKey.expires_at) < new Date()) {
      return Response.json({ valid: false, error: "Key expired" }, { status: 403 });
    }
  }

  return Response.json({
    valid: true,
    key_type: accessKey.key_type,
    key_id: accessKey.id
  });
});