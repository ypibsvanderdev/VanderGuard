import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { key: keyValue, hwid } = body;

    if (!keyValue || typeof keyValue !== 'string') {
      return Response.json({ success: false, error: 'No key provided' });
    }

    // Already has lifetime - don't allow
    if (user.has_access && user.plan_type === 'lifetime') {
      return Response.json({ success: false, error: 'You already have a lifetime subscription.' });
    }

    const keys = await base44.asServiceRole.entities.AccessKey.filter({
      key_value: keyValue.trim().toUpperCase(),
      is_used: false,
      is_active: true,
    });

    if (keys.length === 0) {
      await new Promise(r => setTimeout(r, 500 + Math.random() * 500));
      return Response.json({ success: false, error: 'Invalid or already used key.' });
    }

    const key = keys[0];

    // Check if key itself is expired
    if (key.key_type === 'monthly' && key.expires_at) {
      if (new Date() > new Date(key.expires_at)) {
        return Response.json({ success: false, error: 'This key has expired.' });
      }
    }

    // Get IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               req.headers.get('cf-connecting-ip') ||
               req.headers.get('x-real-ip') || 'unknown';

    // HWID binding check (if user already has an hwid bound)
    if (user.hwid && hwid && user.hwid !== hwid) {
      return Response.json({ success: false, error: 'HWID mismatch: key is bound to a different device.' });
    }

    // Calculate new expiry
    let accessExpires = null;
    if (key.key_type === 'monthly') {
      accessExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    // Mark key as used
    await base44.asServiceRole.entities.AccessKey.update(key.id, {
      is_used: true,
      used_by_email: user.email,
    });

    // Grant access
    const updateData = {
      has_access: true,
      plan_type: key.key_type,
      hwid: hwid || user.hwid || null,
      bound_ip: ip,
    };
    if (accessExpires) updateData.access_expires = accessExpires;

    await base44.asServiceRole.entities.User.update(user.id, updateData);

    const planLabel = key.key_type === 'lifetime' ? '$50 Lifetime' : '$5/Month';
    return Response.json({
      success: true,
      plan_type: key.key_type,
      message: `Access granted! ${planLabel} plan activated.`,
      expires: accessExpires,
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});