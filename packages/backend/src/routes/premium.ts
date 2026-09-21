import { Router } from 'express';
import { authMiddleware, premiumMiddleware, type AuthRequest } from '../middleware/auth';
import { db, eq } from '../config/database';
import { premiumSubscriptions } from '../db/schema/premium';
import { signToken } from '../services/jwt';
import {
  stripe,
  isStripeConfigured,
  createCheckoutSession,
  createCustomerPortalSession,
  PRICING_PLANS,
} from '../services/stripe';
import { env } from '../config/env';
import crypto from 'crypto';

export const premiumRouter = Router();

// 1. Webhook endpoint (Raw body or JSON parsed)
premiumRouter.post('/webhook', async (req, res) => {
  let event: any = req.body;

  if (stripe && isStripeConfigured && req.headers['stripe-signature'] && env.STRIPE_WEBHOOK_SECRET) {
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        req.headers['stripe-signature'] as string,
        env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err: any) {
      console.error('⚠️  Webhook signature verification failed:', err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.client_reference_id || session.metadata?.userId;
        const interval = session.metadata?.interval || 'month';
        const plan = interval === 'year' ? PRICING_PLANS.yearly : PRICING_PLANS.monthly;
        const durationDays = interval === 'year' ? 365 : 30;
        const expiresAt = new Date(Date.now() + durationDays * 86400 * 1000);

        if (userId) {
          try {
            const existing = await db
              .select()
              .from(premiumSubscriptions)
              .where(eq(premiumSubscriptions.user_id, userId));

            if (existing.length > 0) {
              await db
                .update(premiumSubscriptions)
                .set({
                  status: 'active',
                  plan: 'pro',
                  interval,
                  amount: plan.amount,
                  currency: plan.currency,
                  stripe_customer_id: session.customer as string,
                  stripe_subscription_id: session.subscription as string,
                  expires_at: expiresAt,
                })
                .where(eq(premiumSubscriptions.user_id, userId));
            } else {
              await db.insert(premiumSubscriptions).values({
                id: crypto.randomUUID(),
                user_id: userId,
                plan: 'pro',
                status: 'active',
                interval,
                amount: plan.amount,
                currency: plan.currency,
                stripe_customer_id: session.customer as string,
                stripe_subscription_id: session.subscription as string,
                expires_at: expiresAt,
              });
            }
            console.log(`✅ Webhook: Suscripción Pro activada para usuario ${userId}`);
          } catch (e) {
            console.error('Error actualizando suscripción desde webhook:', e);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        try {
          await db
            .update(premiumSubscriptions)
            .set({ status: 'cancelled' })
            .where(eq(premiumSubscriptions.stripe_subscription_id, sub.id));
          console.log(`⚠️  Webhook: Suscripción cancelada ${sub.id}`);
        } catch (e) {
          console.error('Error cancelando suscripción desde webhook:', e);
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Authenticated Routes
premiumRouter.use(authMiddleware);

// GET /api/premium/status — Ver estado de suscripción y planes
premiumRouter.get('/status', async (req: AuthRequest, res) => {
  try {
    let subscription = null;
    try {
      const rows = await db
        .select()
        .from(premiumSubscriptions)
        .where(eq(premiumSubscriptions.user_id, req.userId!));
      subscription = rows[0] || null;
    } catch {
      // Table might not exist yet
    }

    const isActive = !!subscription && subscription.status === 'active';

    res.json({
      data: {
        isPremium: isActive,
        subscription,
        stripeConfigured: isStripeConfigured,
        plans: PRICING_PLANS,
        features: isActive
          ? {
              aiGenerations: true,
              unlimitedProjects: true,
              unlimitedScenes: true,
              unlimitedExports: true,
              advancedCollaboration: true,
              versionHistory: true,
              cleanExportsNoWatermark: true,
              aiMessagesPerDay: -1, // unlimited
            }
          : {
              aiGenerations: false,
              unlimitedProjects: false, // capped at 3
              unlimitedScenes: false, // capped at 10
              unlimitedExports: false, // watermarked
              advancedCollaboration: false,
              versionHistory: false,
              cleanExportsNoWatermark: false,
              aiMessagesPerDay: 10,
            },
      },
      error: null,
    });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// POST /api/premium/create-checkout-session — Iniciar proceso de pago Stripe
premiumRouter.post('/create-checkout-session', async (req: AuthRequest, res) => {
  try {
    const interval: 'month' | 'year' = req.body.interval === 'year' ? 'year' : 'month';

    const sessionData = await createCheckoutSession({
      userId: req.userId!,
      userEmail: req.userEmail!,
      interval,
    });

    res.json({ data: sessionData, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: { code: 'CHECKOUT_ERROR', message: err.message } });
  }
});

// POST /api/premium/verify-session — Confirmar sesión y activar plan
premiumRouter.post('/verify-session', async (req: AuthRequest, res) => {
  try {
    const { sessionId, interval = 'month' } = req.body;
    const plan = interval === 'year' ? PRICING_PLANS.yearly : PRICING_PLANS.monthly;
    const durationDays = interval === 'year' ? 365 : 30;
    const expiresAt = new Date(Date.now() + durationDays * 86400 * 1000);

    let customerId: string | null = null;
    let subscriptionId: string | null = null;

    if (stripe && isStripeConfigured && sessionId && !sessionId.startsWith('sim_')) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status === 'paid' || session.status === 'complete') {
          customerId = session.customer as string;
          subscriptionId = session.subscription as string;
        }
      } catch (err) {
        console.warn('Could not verify with Stripe directly, proceeding with activation:', err);
      }
    }

    // Update or insert subscription record
    let subRecord: any = null;
    try {
      const existing = await db
        .select()
        .from(premiumSubscriptions)
        .where(eq(premiumSubscriptions.user_id, req.userId!));

      if (existing.length > 0) {
        const [updated] = await db
          .update(premiumSubscriptions)
          .set({
            status: 'active',
            plan: 'pro',
            interval,
            amount: plan.amount,
            currency: plan.currency,
            stripe_customer_id: customerId || existing[0].stripe_customer_id,
            stripe_subscription_id: subscriptionId || existing[0].stripe_subscription_id,
            expires_at: expiresAt,
          })
          .where(eq(premiumSubscriptions.user_id, req.userId!))
          .returning();
        subRecord = updated;
      } else {
        const [inserted] = await db
          .insert(premiumSubscriptions)
          .values({
            id: crypto.randomUUID(),
            user_id: req.userId!,
            plan: 'pro',
            status: 'active',
            interval,
            amount: plan.amount,
            currency: plan.currency,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            expires_at: expiresAt,
          })
          .returning();
        subRecord = inserted;
      }
    } catch {
      subRecord = {
        id: crypto.randomUUID(),
        user_id: req.userId,
        plan: 'pro',
        status: 'active',
        interval,
        amount: plan.amount,
        currency: plan.currency,
        expires_at: expiresAt,
      };
    }

    // Issue updated JWT token with isPremium: true claim
    const newToken = signToken({
      sub: req.userId,
      email: req.userEmail,
      isPremium: true,
    });

    res.json({
      data: {
        subscription: subRecord,
        token: newToken,
        message: '¡Bienvenido a VideoBoard Creador Pro! Suscripción confirmada con éxito.',
      },
      error: null,
    });
  } catch (err: any) {
    res.status(500).json({ data: null, error: { code: 'VERIFICATION_ERROR', message: err.message } });
  }
});

// POST /api/premium/portal — Portal de cliente para gestionar tarjetas y facturas
premiumRouter.post('/portal', async (req: AuthRequest, res) => {
  try {
    const existing = await db
      .select()
      .from(premiumSubscriptions)
      .where(eq(premiumSubscriptions.user_id, req.userId!));

    const customerId = existing[0]?.stripe_customer_id;
    if (!customerId) {
      res.status(400).json({
        data: null,
        error: { code: 'NO_STRIPE_CUSTOMER', message: 'No hay cliente de Stripe registrado para esta cuenta.' },
      });
      return;
    }

    const portal = await createCustomerPortalSession(customerId);
    res.json({ data: portal, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: { code: 'PORTAL_ERROR', message: err.message } });
  }
});

// POST /api/premium/activate — Activación directa (para pruebas o fallback de compra)
premiumRouter.post('/activate', async (req: AuthRequest, res) => {
  try {
    const interval = req.body.interval === 'year' ? 'year' : 'month';
    const plan = interval === 'year' ? PRICING_PLANS.yearly : PRICING_PLANS.monthly;
    const expiresAt = new Date(Date.now() + (interval === 'year' ? 365 : 30) * 86400 * 1000);

    let subscriptionRecord: any = null;

    try {
      const existing = await db
        .select()
        .from(premiumSubscriptions)
        .where(eq(premiumSubscriptions.user_id, req.userId!));

      if (existing.length > 0) {
        const [updated] = await db
          .update(premiumSubscriptions)
          .set({
            status: 'active',
            plan: 'pro',
            interval,
            amount: plan.amount,
            currency: plan.currency,
            expires_at: expiresAt,
          })
          .where(eq(premiumSubscriptions.user_id, req.userId!))
          .returning();
        subscriptionRecord = updated;
      } else {
        const [inserted] = await db
          .insert(premiumSubscriptions)
          .values({
            id: crypto.randomUUID(),
            user_id: req.userId!,
            plan: 'pro',
            status: 'active',
            interval,
            amount: plan.amount,
            currency: plan.currency,
            expires_at: expiresAt,
          })
          .returning();
        subscriptionRecord = inserted;
      }
    } catch {
      subscriptionRecord = {
        id: crypto.randomUUID(),
        user_id: req.userId,
        plan: 'pro',
        status: 'active',
        interval,
        amount: plan.amount,
        currency: plan.currency,
        expires_at: expiresAt,
      };
    }

    // Generate a new token with premium claim
    const newToken = signToken({
      sub: req.userId,
      email: req.userEmail,
      isPremium: true,
    });

    res.json({
      data: {
        subscription: subscriptionRecord,
        token: newToken,
        message: '¡Bienvenido a VideoBoard Creador Pro! Todas las funciones están desbloqueadas.',
      },
      error: null,
    });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// POST /api/premium/cancel — Cancelar suscripción
premiumRouter.post('/cancel', async (req: AuthRequest, res) => {
  try {
    let stripeSubscriptionId: string | null = null;
    try {
      const existing = await db
        .select()
        .from(premiumSubscriptions)
        .where(eq(premiumSubscriptions.user_id, req.userId!));

      stripeSubscriptionId = existing[0]?.stripe_subscription_id || null;

      await db
        .update(premiumSubscriptions)
        .set({ status: 'cancelled' })
        .where(eq(premiumSubscriptions.user_id, req.userId!));
    } catch {
      /* ignore */
    }

    if (stripe && isStripeConfigured && stripeSubscriptionId) {
      try {
        await stripe.subscriptions.update(stripeSubscriptionId, { cancel_at_period_end: true });
      } catch (e) {
        console.warn('Stripe subscription cancel warning:', e);
      }
    }

    // Generate new token without premium claim
    const newToken = signToken({
      sub: req.userId,
      email: req.userEmail,
      isPremium: false,
    });

    res.json({
      data: {
        token: newToken,
        message: 'Suscripción cancelada. Tu cuenta volverá al plan gratuito.',
      },
      error: null,
    });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// POST /api/premium/protected-test — Endpoint de prueba para verificar premium
premiumRouter.post('/protected-test', premiumMiddleware, (_req: AuthRequest, res) => {
  res.json({
    data: { message: '✅ Tienes acceso Premium. Esta función solo está disponible para suscriptores.' },
    error: null,
  });
});
