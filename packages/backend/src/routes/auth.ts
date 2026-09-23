import { Router } from 'express';
import { db, eq } from '../config/database';
import { users } from '../db/schema/users';
import { premiumSubscriptions } from '../db/schema/premium';
import { authMiddleware, type AuthRequest } from '../middleware/auth';
import { signToken } from '../services/jwt';
import { hashPassword, verifyPassword } from '../services/password';
import crypto from 'crypto';

export const authRouter = Router();

// POST /api/auth/register — Registro de usuario
authRouter.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email) {
      res.status(400).json({ data: null, error: { code: 'BAD_REQUEST', message: 'Email requerido' } });
      return;
    }

    const existing = await db.select().from(users).where(eq(users.email, email));
    if (existing.length > 0) {
      res.status(409).json({ data: null, error: { code: 'CONFLICT', message: 'El usuario ya está registrado' } });
      return;
    }

    const password_hash = password ? hashPassword(password) : null;
    const [newUser] = await db.insert(users).values({
      id: crypto.randomUUID(),
      email,
      full_name: name || email.split('@')[0],
      password_hash,
      role: 'creator',
    }).returning();

    const token = signToken({
      sub: newUser.id,
      email: newUser.email,
      name: newUser.full_name,
      isPremium: false,
    });

    res.status(201).json({
      data: {
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          full_name: newUser.full_name,
          role: newUser.role,
          avatar_url: newUser.avatar_url,
          isPremium: false,
        },
      },
      error: null,
    });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// POST /api/auth/login — Iniciar sesión
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email) {
      res.status(400).json({ data: null, error: { code: 'BAD_REQUEST', message: 'Email requerido' } });
      return;
    }

    // Buscar usuario
    let rows = await db.select().from(users).where(eq(users.email, email));
    let user = rows[0];

    if (!user) {
      // Auto-crear si no existe
      const password_hash = password ? hashPassword(password) : null;
      const [newUser] = await db.insert(users).values({
        id: crypto.randomUUID(),
        email,
        full_name: req.body.name || email.split('@')[0],
        password_hash,
        role: 'creator',
      }).returning();
      user = newUser;
    } else if (user.password_hash) {
      if (!password) {
        res.status(401).json({ data: null, error: { code: 'INVALID_CREDENTIALS', message: 'Contraseña requerida' } });
        return;
      }
      const isValid = verifyPassword(password, user.password_hash);
      if (!isValid) {
        res.status(401).json({ data: null, error: { code: 'INVALID_CREDENTIALS', message: 'Contraseña incorrecta' } });
        return;
      }
    } else {
      // User exists but has no password set yet
      if (password && password.trim()) {
        const password_hash = hashPassword(password);
        await db.update(users).set({ password_hash, updated_at: new Date() }).where(eq(users.id, user.id));
      } else {
        res.status(401).json({
          data: null,
          error: { code: 'PASSWORD_REQUIRED', message: 'Esta cuenta requiere ingresar una contraseña para iniciar sesión.' },
        });
        return;
      }
    }

    // Comprobar suscripción premium
    let isPremium = false;
    try {
      const subs = await db.select().from(premiumSubscriptions).where(eq(premiumSubscriptions.user_id, user.id));
      if (subs.length > 0 && subs[0].status === 'active') isPremium = true;
    } catch { /* ignored */ }

    // Generar JWT
    const token = signToken({
      sub: user.id,
      email: user.email,
      name: user.full_name,
      isPremium,
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
          isPremium,
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
    const [user] = await db.select().from(users).where(eq(users.id, req.userId!));
    if (!user) {
      res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Usuario no encontrado' } });
      return;
    }

    // Check premium status
    let isPremium = false;
    try {
      const subs = await db.select().from(premiumSubscriptions).where(eq(premiumSubscriptions.user_id, req.userId!));
      if (subs.length > 0 && subs[0].status === 'active') isPremium = true;
    } catch { /* no subscriptions table */ }

    // Security: never return password_hash
    const { password_hash: _removed, ...safeUser } = user;

    res.json({
      data: { ...safeUser, isPremium },
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
