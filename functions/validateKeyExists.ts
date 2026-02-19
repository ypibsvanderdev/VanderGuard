import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { key } = await req.json();

    if (!key) {
      return Response.json({ valid: false, error: "No key provided." });
    }

    const keys = await base44.asServiceRole.entities.AccessKey.filter({ key_value: key });
    if (!keys || keys.length === 0) {
      return Response.json({ valid: false, error: "Key not found." });
    }

    const accessKey = keys[0];
    if (accessKey.is_used) {
      return Response.json({ valid: false, error: "This key has already been used." });
    }
    if (!accessKey.is_active) {
      return Response.json({ valid: false, error: "This key is inactive." });
    }

    return Response.json({ valid: true });
  } catch (error) {
    console.error("validateKeyExists error:", error.message);
    return Response.json({ valid: false, error: "Server error." }, { status: 500 });
  }
});