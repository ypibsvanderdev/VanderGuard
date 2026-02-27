import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Replicates /api/gate/unlock from old server.js
// Called by Lua executors: gateUnlock({ key, hwid })
// Returns { success, token } or { error }

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { key: keyValue, hwid } = body;

  if (!keyValue || !hwid) {
    return Response.json({ error: 'INVALID REQUEST' }, { status: 400 });
  }

  try {
    // Find the key
    const keys = await base44.asServiceRole.entities.AccessKey.filter({
      key_value: keyValue.trim().toUpperCase(),
    });

    if (!keys || keys.length === 0) {
      console.log(`[GATE] INVALID KEY attempt: ${keyValue} HWID: ${hwid}`);
      return Response.json({ error: 'INVALID KEY - ACCESS DENIED' }, { status: 401 });
    }

    const keyData = keys[0];

    if (!keyData.is_active) {
      return Response.json({ error: 'KEY INACTIVE' }, { status: 403 });
    }

    // Check expiry for monthly keys
    if (keyData.key_type === 'monthly' && keyData.expires_at) {
      if (new Date() > new Date(keyData.expires_at)) {
        return Response.json({ error: 'KEY EXPIRED' }, { status: 403 });
      }
    }

    // HWID lock check
    if (keyData.hwid && keyData.hwid !== hwid) {
      console.log(`[GATE] HWID MISMATCH: key=${keyValue} expected=${keyData.hwid} got=${hwid}`);
      return Response.json({ error: 'HARDWARE MISMATCH' }, { status: 403 });
    }

    // Bind HWID if not bound yet (first use)
    if (!keyData.hwid) {
      await base44.asServiceRole.entities.AccessKey.update(keyData.id, {
        hwid: hwid,
        is_used: true,
        used_by_email: keyData.used_by_email || 'hwid-bound',
      });
      console.log(`[GATE] Key bound to HWID: ${hwid}`);
    }

    // Build a session token: base64(key_id:hwid:timestamp)
    const tokenPayload = `${keyData.id}:${hwid}:${Date.now()}`;
    const token = btoa(tokenPayload);

    console.log(`[GATE] SUCCESS: key=${keyValue} hwid=${hwid} type=${keyData.key_type}`);
    return Response.json({
      success: true,
      token,
      key_type: keyData.key_type,
    });

  } catch (error) {
    console.error('[GATE] Error:', error.message);
    return Response.json({ error: 'SERVER ERROR' }, { status: 500 });
  }
});