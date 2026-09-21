import { Router } from 'express';
import { authMiddleware, premiumMiddleware, type AuthRequest } from '../middleware/auth';
import { db, eq } from '../config/database';
import { signToken } from '../services/jwt';

export const premiumRouter = Router();
premiumRouter.use(authMiddleware);

// GET /api/premium/status — Ver estado de suscripción
premiumRouter.get('/status', async (req: AuthRequest, res) => {
  try {
    let subscription = null;
    try {
      const rows = await db.select().from('premium_subscriptions').where(eq('user_id' as any, req.userId));
      subscription = rows[0] || null;
    } catch {
      // Table might not exist yet
    }

    res.json({
      data: {
        isPremium: !!subscription && (subscription as any).status === 'active',
        subscription,
        features: subscription && (subscription as any).status === 'active' ? {
          aiGenerations: true,
          unlimitedExports: true,
          advancedCollaboration: true,
          versionHistory: true,
          aiMessagesPerDay: -1, // unlimited
        } : {
          aiGenerations: false,
          unlimitedExports: false,
          advancedCollaboration: false,
          versionHistory: false,
          aiMessagesPerDay: 10, // free limit
        },
      },
      error: null,
    });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// POST /api/premium/activate — Activar premium (simulado, sin pasarela de pago real)
premiumRouter.post('/activate', async (req: AuthRequest, res) => {
  try {
    const subscription = {
      id: crypto.randomUUID(),
      user_id: req.userId,
      plan: 'premium',
      status: 'active',
      started_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 365 * 86400 * 1000).toISOString(), // 1 year
      payment_method: req.body.payment_method || 'simulated',
      amount: req.body.amount || 999, // $9.99
      currency: 'USD',
    };

    // Store in the in-memory DB
    const table = (global as any).__videoboard_tables?.premium_subscriptions || [];
    table.push(subscription);
    if (!(global as any).__videoboard_tables) (global as any).__videoboard_tables = {};
    (global as any).__videoboard_tables.premium_subscriptions = table;

    // Also try the memdb
    try {
      await db.insert('premium_subscriptions' as any).values(subscription);
    } catch { /* memdb insert */ }

    // Generate a new token with premium claim
    const newToken = signToken({
      sub: req.userId,
      email: req.userEmail,
      isPremium: true,
    });

    res.json({
      data: {
        subscription,
        token: newToken,
        message: '¡Bienvenido a VideoBoard Premium! Todas las funciones IA están desbloqueadas.',
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
    // Try to update in memdb
    try {
      await db.update('premium_subscriptions' as any)
        .set({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .where(eq('user_id' as any, req.userId));
    } catch { /* ignore */ }

    // Generate new token without premium
    const newToken = signToken({
      sub: req.userId,
      email: req.userEmail,
    });

    res.json({
      data: {
        token: newToken,
        message: 'Suscripción cancelada. Seguirás teniendo acceso Premium hasta el fin del período de facturación.',
      },
      error: null,
    });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// POST /api/premium/protected-test — Endpoint de prueba para verificar premium
premiumRouter.post('/protected-test', premiumMiddleware, (_req: AuthRequest, res) => {
  res.json({ data: { message: '✅ Tienes acceso Premium. Esta función solo está disponible para suscriptores.' }, error: null });
});
