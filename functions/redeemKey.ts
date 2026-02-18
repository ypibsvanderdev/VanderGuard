import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { key: keyValue } = body;

    if (!keyValue || typeof keyValue !== 'string') {
      return Response.json({ success: false, error: 'No key provided' });
    }

    // Check if user already has access
    if (user.has_access === true) {
      return Response.json({ success: false, error: 'You already have an active subscription' });
    }

    // Find the key
    const keys = await base44.asServiceRole.entities.AccessKey.filter({
      key_value: keyValue.trim().toUpperCase(),
      is_used: false,
      is_active: true,
    });

    if (keys.length === 0) {
      // Add delay to slow brute force attempts
      await new Promise(r => setTimeout(r, 500 + Math.random() * 500));
      return Response.json({ success: false, error: 'Invalid or already used key' });
    }

    const key = keys[0];

    // Check expiry for monthly keys
    if (key.plan_type === 'monthly' && key.expires_at) {
      const expiry = new Date(key.expires_at);
      if (new Date() > expiry) {
        return Response.json({ success: false, error: 'This key has expired' });
      }
    }

    // Mark key as used
    await base44.asServiceRole.entities.AccessKey.update(key.id, {
      is_used: true,
      used_by_email: user.email,
    });

    // Grant access on user record
    await base44.asServiceRole.entities.User.update(user.id, {
      has_access: true,
      plan_type: key.plan_type,
    });

    return Response.json({
      success: true,
      plan_type: key.plan_type,
      message: `Access granted! ${key.plan_type === 'lifetime' ? 'Lifetime access activated.' : 'Monthly access activated.'}`,
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});