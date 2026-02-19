import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@14.18.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

function generateKey() {
  const seg = () => Math.random().toString(36).substring(2, 8).toUpperCase();
  return `VH-${seg()}-${seg()}-${seg()}`;
}

Deno.serve(async (req) => {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const base44 = createClientFromRequest(req);

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { user_id, user_email, plan_type } = session.metadata || {};

      if (!user_id || !plan_type) {
        console.error('Missing metadata in session:', session.id);
        return Response.json({ received: true });
      }

      // Generate a unique key
      let keyValue;
      let attempts = 0;
      do {
        keyValue = generateKey();
        const existing = await base44.asServiceRole.entities.AccessKey.filter({ key_value: keyValue });
        if (existing.length === 0) break;
        attempts++;
      } while (attempts < 5);

      const expiresAt = plan_type === 'monthly'
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : null;

      // Create the key in DB (unused — user will redeem it)
      await base44.asServiceRole.entities.AccessKey.create({
        key_value: keyValue,
        key_type: plan_type,
        is_used: false,
        is_active: true,
        notes: `Auto-generated for ${user_email} via Stripe. Session: ${session.id}`,
        expires_at: expiresAt || '',
      });

      console.log(`Key generated for ${user_email}: ${keyValue} (${plan_type})`);
    }
  } catch (err) {
    console.error('Webhook handler error:', err.message);
  }

  return Response.json({ received: true });
});