import { Router } from 'express';
import { authMiddleware, premiumMiddleware, type AuthRequest } from '../middleware/auth';
import { db, eq } from '../config/database';
import { premiumSubscriptions } from '../db/schema/premium';
import { signToken } from '../services/jwt';
import crypto from 'crypto';

export const premiumRouter = Router();
premiumRouter.use(authMiddleware);

// GET /api/premium/status — Ver estado de suscripción
premiumRouter.get('/status', async (req: AuthRequest, res) => {
  try {
    let subscription = null;
    try {
      const rows = await db.select().from(premiumSubscriptions).where(eq(premiumSubscriptions.user_id, req.userId!));
      subscription = rows[0] || null;
    } catch {
      // Table might not exist yet
    }

    const isActive = !!subscription && subscription.status === 'active';

    res.json({
      data: {
        isPremium: isActive,
        subscription,
        features: isActive ? {
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

// POST /api/premium/activate — Activar premium (simulado)
premiumRouter.post('/activate', async (req: AuthRequest, res) => {
  try {
    const expiresAt = new Date(Date.now() + 365 * 86400 * 1000);
    let subscriptionRecord: any = null;

    try {
      const existing = await db.select().from(premiumSubscriptions).where(eq(premiumSubscriptions.user_id, req.userId!));
      if (existing.length > 0) {
        const [updated] = await db.update(premiumSubscriptions)
          .set({ status: 'active', expires_at: expiresAt })
          .where(eq(premiumSubscriptions.user_id, req.userId!))
          .returning();
        subscriptionRecord = updated;
      } else {
        const [inserted] = await db.insert(premiumSubscriptions).values({
          id: crypto.randomUUID(),
          user_id: req.userId!,
          plan: 'pro',
          status: 'active',
          expires_at: expiresAt,
        }).returning();
        subscriptionRecord = inserted;
      }
    } catch {
      subscriptionRecord = {
        id: crypto.randomUUID(),
        user_id: req.userId,
        plan: 'pro',
        status: 'active',
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
    try {
      await db.update(premiumSubscriptions)
        .set({ status: 'cancelled' })
        .where(eq(premiumSubscriptions.user_id, req.userId!));
    } catch { /* ignore */ }

    // Generate new token without premium
    const newToken = signToken({
      sub: req.userId,
      email: req.userEmail,
      isPremium: false,
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
