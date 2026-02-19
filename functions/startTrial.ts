import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (user.trial_used) {
      return Response.json({ success: false, error: 'You have already used your free trial.' });
    }

    if (user.has_access) {
      return Response.json({ success: false, error: 'You already have an active subscription.' });
    }

    const trialExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await base44.asServiceRole.entities.User.update(user.id, {
      has_access: true,
      plan_type: 'trial',
      trial_used: true,
      access_expires: trialExpires,
    });

    return Response.json({
      success: true,
      message: 'Free trial activated! You have 30 days of full access.',
      expires: trialExpires,
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});