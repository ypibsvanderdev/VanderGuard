import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ═══════════════════════════════════════════════════════════════
// VANDER GATE UNLOCK v5.0 — LUARMOR-MATCHED KEY VALIDATION
// ═══════════════════════════════════════════════════════════════
// Called by Lua executors: POST { key, hwid }
// Matches Luarmor's key check flow:
//   1. Validate key exists & is active
//   2. Check expiry (monthly/trial)
//   3. HWID first-use binding (one-time lock)
//   4. HWID mismatch rejection
//   5. Return session token on success
// ═══════════════════════════════════════════════════════════════

// Rate limiter for brute-force prevention
const gateAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const COOLDOWN_MS = 60_000;

function isGateRateLimited(hwid: string): boolean {
  const now = Date.now();
  const entry = gateAttempts.get(hwid);
  if (!entry) {
    gateAttempts.set(hwid, { count: 1, lastAttempt: now });
    return false;
  }
  if (now - entry.lastAttempt > COOLDOWN_MS) {
    gateAttempts.set(hwid, { count: 1, lastAttempt: now });
    return false;
  }
  entry.count++;
  entry.lastAttempt = now;
  return entry.count > MAX_ATTEMPTS;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { key: keyValue, hwid } = body;

  if (!keyValue || !hwid) {
    return Response.json({ error: 'INVALID REQUEST: key and hwid required' }, { status: 400 });
  }

  // Brute-force protection
  if (isGateRateLimited(hwid)) {
    console.warn(`[GATE] Rate limited HWID: ${hwid}`);
    await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000));
    return Response.json({ error: 'TOO MANY ATTEMPTS — Try again later' }, { status: 429 });
  }

  try {
    // ── STEP 1: Find the key ──
    const keys = await base44.asServiceRole.entities.AccessKey.filter({
      key_value: keyValue.trim().toUpperCase(),
    });

    if (!keys || keys.length === 0) {
      console.log(`[GATE] INVALID KEY attempt: ${keyValue} HWID: ${hwid}`);
      // Anti-timing: add delay to prevent key enumeration
      await new Promise(r => setTimeout(r, 300 + Math.random() * 500));
      return Response.json({ error: 'INVALID KEY - ACCESS DENIED' }, { status: 401 });
    }

    const keyData = keys[0];

    // ── STEP 2: Check key is active ──
    if (!keyData.is_active) {
      return Response.json({ error: 'KEY DEACTIVATED' }, { status: 403 });
    }

    // ── STEP 3: Check expiry for monthly/trial keys ──
    if ((keyData.key_type === 'monthly' || keyData.key_type === 'trial') && keyData.expires_at) {
      if (new Date() > new Date(keyData.expires_at)) {
        // Auto-deactivate expired key
        await base44.asServiceRole.entities.AccessKey.update(keyData.id, { is_active: false });
        return Response.json({ error: 'KEY EXPIRED' }, { status: 403 });
      }
    }

    // ── STEP 4: Check global HWID ban ──
    try {
      const bans = await base44.asServiceRole.entities.BannedHwid?.filter({ hwid });
      if (bans && bans.length > 0) {
        console.warn(`[GATE] BANNED HWID tried to unlock: ${hwid}`);
        return Response.json({ error: 'HARDWARE BANNED FROM NETWORK' }, { status: 403 });
      }
    } catch (_e) {}

    // ── STEP 5: HWID Lock Check (Luarmor's core feature) ──
    if (keyData.hwid && keyData.hwid !== hwid) {
      console.log(`[GATE] HWID MISMATCH: key=${keyValue} expected=${keyData.hwid} got=${hwid}`);
      return Response.json({ error: 'HARDWARE MISMATCH — Key locked to another device' }, { status: 403 });
    }

    // ── STEP 6: Bind HWID on first use (one-time lock) ──
    if (!keyData.hwid) {
      await base44.asServiceRole.entities.AccessKey.update(keyData.id, {
        hwid: hwid,
        is_used: true,
        used_by_email: keyData.used_by_email || 'hwid-bound',
      });
      console.log(`[GATE] Key ${keyValue} bound to HWID: ${hwid}`);
    }

    // ── STEP 7: Build session token ──
    const tokenPayload = `${keyData.id}:${hwid}:${Date.now()}`;
    const token = btoa(tokenPayload);

    // Calculate days remaining for monthly/trial
    let daysLeft = null;
    if (keyData.expires_at) {
      daysLeft = Math.ceil((new Date(keyData.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    }

    // Reset rate limiter on success
    gateAttempts.delete(hwid);

    console.log(`[GATE] SUCCESS: key=${keyValue} hwid=${hwid} type=${keyData.key_type}`);
    return Response.json({
      success: true,
      token,
      key_type: keyData.key_type,
      days_left: daysLeft,
    });

  } catch (error) {
    console.error('[GATE] Error:', error.message);
    return Response.json({ error: 'SERVER ERROR' }, { status: 500 });
  }
});