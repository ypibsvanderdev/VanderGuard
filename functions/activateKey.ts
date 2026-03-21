import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { key } = body;

  if (!key) {
    return Response.json({ success: false, error: "No key provided" }, { status: 400 });
  }

  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const keys = await base44.asServiceRole.entities.AccessKey.filter({ key_value: key });

  if (!keys || keys.length === 0) {
    return Response.json({ success: false, error: "Invalid key" }, { status: 404 });
  }

  const accessKey = keys[0];

  if (accessKey.is_used) {
    return Response.json({ success: false, error: "Key already used" }, { status: 403 });
  }

  if (!accessKey.is_active) {
    return Response.json({ success: false, error: "Key inactive" }, { status: 403 });
  }

  // Mark key as used and tie to this user
  await base44.asServiceRole.entities.AccessKey.update(accessKey.id, {
    is_used: true,
    used_by_email: user.email
  });

  return Response.json({ success: true, key_type: accessKey.key_type });
});