import { Router } from 'express';
import { db, eq } from '../config/database';
import { users } from '../db/schema/users';
import { authMiddleware, type AuthRequest } from '../middleware/auth';
import { signToken } from '../services/jwt';
import crypto from 'crypto';

export const authRouter = Router();

// POST /api/auth/login — Iniciar sesión (modo dev: email + demo-token)
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email) {
      res.status(400).json({ data: null, error: { code: 'BAD_REQUEST', message: 'Email requerido' } });
      return;
    }

    // Buscar o crear usuario
    let rows = await db.select().from(users).where(eq(users.email as any, email));
    let user = rows[0];

    if (!user) {
      // Crear usuario nuevo
      const [newUser] = await db.insert(users).values({
        id: crypto.randomUUID(),
        email,
        full_name: req.body.name || email.split('@')[0],
        role: 'creator',
      }).returning();
      user = newUser;
    }

    // Generar JWT
    const token = signToken({
      sub: user.id,
      email: user.email,
      name: user.full_name,
      isPremium: false,
    });

    res.json({
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          avatar_url: user.avatar_url,
          isPremium: false,
        },
      },
      error: null,
    });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// GET /api/auth/me — Perfil del usuario autenticado
authRouter.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id as any, req.userId!));
    if (!user) {
      res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Usuario no encontrado' } });
      return;
    }

    // Check premium status
    let isPremium = false;
    try {
      const subs = await db.select().from('premium_subscriptions').where(eq('user_id' as any, req.userId));
      if (subs.length > 0 && subs[0].status === 'active') isPremium = true;
    } catch { /* no subscriptions table */ }

    res.json({
      data: { ...user, isPremium },
      error: null,
    });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// GET /api/auth/refresh — Refrescar token (conserva premium)
authRouter.get('/refresh', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const token = signToken({
      sub: req.userId,
      email: req.userEmail,
      isPremium: req.isPremium || false,
    });
    res.json({ data: { token }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});
