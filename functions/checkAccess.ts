import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Admin always has access
    if (user.role === 'admin') {
      return Response.json({ success: true, has_access: true, plan_type: 'admin' });
    }

    // Lifetime never expires
    if (user.has_access && user.plan_type === 'lifetime') {
      return Response.json({ success: true, has_access: true, plan_type: 'lifetime' });
    }

    // Check expiry for trial/monthly
    if (user.has_access && user.access_expires) {
      const expired = new Date() > new Date(user.access_expires);
      if (expired) {
        // Revoke access
        await base44.asServiceRole.entities.User.update(user.id, { has_access: false });
        return Response.json({ success: true, has_access: false, expired: true, plan_type: user.plan_type });
      }
      const daysLeft = Math.ceil((new Date(user.access_expires) - new Date()) / (1000 * 60 * 60 * 24));
      return Response.json({ success: true, has_access: true, plan_type: user.plan_type, days_left: daysLeft, expires: user.access_expires });
    }

    return Response.json({ success: true, has_access: user.has_access || false, plan_type: user.plan_type || null, trial_used: user.trial_used || false });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});