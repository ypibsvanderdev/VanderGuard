import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Replicates /api/keys/request-trial from old server.js
// One free trial key per HWID — no account needed.
// Called by Lua: requestTrialHwid({ hwid })

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function makeKeyValue() {
  const seg = (len) =>
    Array.from({ length: len }, () => CHARSET[Math.floor(Math.random() * CHARSET.length)]).join('');
  return `VH-${seg(6)}-${seg(6)}-${seg(6)}`;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { hwid } = body;

  if (!hwid || typeof hwid !== 'string' || hwid.length < 4) {
    return Response.json({ error: 'HWID required' }, { status: 400 });
  }

  try {
    // Check if this HWID already claimed a trial
    const existing = await base44.asServiceRole.entities.AccessKey.filter({
      hwid: hwid,
      key_type: 'trial',
    });

    if (existing && existing.length > 0) {
      console.log(`[TRIAL] HWID already has trial: ${hwid}`);
      return Response.json({ error: 'TRIAL ALREADY CLAIMED' }, { status: 400 });
    }

    const keyValue = makeKeyValue();
    const expires = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(); // 3 day trial

    await base44.asServiceRole.entities.AccessKey.create({
      key_value: keyValue,
      key_type: 'trial',
      is_active: true,
      is_used: true,          // auto-bind to this HWID immediately
      hwid: hwid,
      expires_at: expires,
      notes: `HWID trial auto-issued at ${new Date().toISOString()}`,
    });

    console.log(`[TRIAL] Issued trial key ${keyValue} to HWID ${hwid}`);
    return Response.json({
      success: true,
      key: keyValue,
      expires,
    });

  } catch (error) {
    console.error('[TRIAL] Error:', error.message);
    return Response.json({ error: 'SERVER ERROR' }, { status: 500 });
  }
});