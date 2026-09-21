import Stripe from 'stripe';
import { env } from '../config/env';

export const isStripeConfigured = !!env.STRIPE_SECRET_KEY;

export const stripe = isStripeConfigured
  ? new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20' as any,
    })
  : null;

export const PRICING_PLANS = {
  monthly: {
    id: 'plan_monthly',
    name: 'Creador Pro Mensual',
    amount: 499, // $4.99 in cents
    currency: 'usd',
    interval: 'month' as const,
    interval_count: 1,
    description: 'Acceso total mensual a todas las funciones IA y exportaciones ilimitadas',
  },
  yearly: {
    id: 'plan_yearly',
    name: 'Creador Pro Anual (20% OFF)',
    amount: 4788, // $47.88/year = $3.99/mo in cents
    currency: 'usd',
    interval: 'year' as const,
    interval_count: 1,
    description: 'Acceso total anual con 20% de ahorro ($3.99/mes)',
  },
};

/**
 * Creates a Stripe Checkout Session or returns a simulation session
 */
export async function createCheckoutSession({
  userId,
  userEmail,
  interval = 'month',
}: {
  userId: string;
  userEmail: string;
  interval?: 'month' | 'year';
}) {
  const plan = interval === 'year' ? PRICING_PLANS.yearly : PRICING_PLANS.monthly;

  if (stripe && isStripeConfigured) {
    // 1. Find or create Stripe Customer
    const existingCustomers = await stripe.customers.list({ email: userEmail, limit: 1 });
    let customerId: string;
    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    } else {
      const newCustomer = await stripe.customers.create({
        email: userEmail,
        metadata: { userId },
      });
      customerId = newCustomer.id;
    }

    // 2. Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: plan.currency,
            product_data: {
              name: `VideoBoard AI — ${plan.name}`,
              description: plan.description,
            },
            unit_amount: plan.amount,
            recurring: {
              interval: plan.interval,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${env.CLIENT_URL}/?payment_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.CLIENT_URL}/?payment_cancelled=true`,
      client_reference_id: userId,
      metadata: {
        userId,
        interval,
        planName: plan.name,
      },
    });

    return {
      provider: 'stripe' as const,
      url: session.url,
      sessionId: session.id,
      simulated: false,
    };
  }

  // Realistic Simulation Mode (when STRIPE_SECRET_KEY is not yet populated by user)
  return {
    provider: 'simulation' as const,
    url: null,
    sessionId: `sim_${Date.now()}_${userId.slice(0, 8)}`,
    simulated: true,
    plan,
  };
}

/**
 * Create Stripe Customer Portal session for billing management
 */
export async function createCustomerPortalSession(customerId: string) {
  if (!stripe || !isStripeConfigured) {
    return { url: null, simulated: true };
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${env.CLIENT_URL}/`,
  });

  return { url: portalSession.url, simulated: false };
}
