import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateKeyValue() {
  const segment = (len) =>
    Array.from({ length: len }, () => CHARSET[Math.floor(Math.random() * CHARSET.length)]).join('');
  return `VH-${segment(6)}-${segment(6)}-${segment(6)}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { plan_type, count = 1 } = body;

    if (!['monthly', 'lifetime'].includes(plan_type)) {
      return Response.json({ error: 'Invalid plan_type. Must be monthly or lifetime.' }, { status: 400 });
    }

    const safeCount = Math.min(Math.max(1, parseInt(count) || 1), 50);
    const keys = [];

    for (let i = 0; i < safeCount; i++) {
      const keyValue = generateKeyValue();
      const now = new Date();

      const keyData = {
        key_value: keyValue,
        plan_type,
        is_used: false,
        is_active: true,
      };

      if (plan_type === 'monthly') {
        const expires = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
        keyData.expires_at = expires.toISOString().split('T')[0];
      }

      const key = await base44.asServiceRole.entities.AccessKey.create(keyData);
      keys.push(key);
    }

    return Response.json({ success: true, keys, count: keys.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});