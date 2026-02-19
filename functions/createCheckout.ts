import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@14.18.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

const PRICES = {
  monthly: 'price_1T2MDjRmcVJm9IhUpnYWveAp',
  lifetime: 'price_1T2MDjRmcVJm9IhUATip8pyK',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { plan_type, success_url, cancel_url } = body;

    if (!PRICES[plan_type]) {
      return Response.json({ error: 'Invalid plan type' }, { status: 400 });
    }

    const isSubscription = plan_type === 'monthly';

    const sessionParams = {
      mode: isSubscription ? 'subscription' : 'payment',
      customer_email: user.email,
      line_items: [{ price: PRICES[plan_type], quantity: 1 }],
      success_url: success_url || `${req.headers.get('origin')}/`,
      cancel_url: cancel_url || `${req.headers.get('origin')}/`,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        user_id: user.id,
        user_email: user.email,
        plan_type,
      },
    };

    if (isSubscription) {
      sessionParams.subscription_data = { metadata: { user_id: user.id, user_email: user.email, plan_type } };
    } else {
      sessionParams.payment_intent_data = { metadata: { user_id: user.id, user_email: user.email, plan_type } };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});