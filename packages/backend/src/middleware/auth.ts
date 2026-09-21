import type { Request, Response, NextFunction } from 'express';
import { signToken, verifyToken } from '../services/jwt';
import { db, eq } from '../config/database';
import { users } from '../db/schema/users';
import { premiumSubscriptions } from '../db/schema/premium';
import * as crypto from 'crypto';

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
  isPremium?: boolean;
}

// Generate a default demo user if none exists
async function ensureDemoUser(): Promise<{ id: string; email: string }> {
  const existing = await db.select().from(users).where(eq(users.email as any, 'demo@videoboard.ai'));
  if (existing.length > 0) return existing[0] as any;

  const [user] = await db.insert(users).values({
    id: crypto.randomUUID(),
    email: 'demo@videoboard.ai',
    full_name: 'Usuario Demo',
    role: 'creator',
  }).returning();
  return user as any;
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Token requerido. Usa /api/auth/login para obtenerlo.' } });
    return;
  }

  const token = authHeader.substring(7);

  // Try JWT first
  const payload = verifyToken(token);
  if (payload) {
    req.userId = payload.sub;
    req.userEmail = payload.email;
    req.isPremium = payload.isPremium || false;
    next();
    return;
  }

  // Fallback: demo token for backward compatibility
  if (token === 'demo-token') {
    const demo = await ensureDemoUser();
    req.userId = demo.id;
    req.userEmail = demo.email;
    req.isPremium = false;
    next();
    return;
  }

  res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Token inválido o expirado' } });
}

export async function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    if (payload) {
      req.userId = payload.sub;
      req.userEmail = payload.email;
      req.isPremium = payload.isPremium || false;
    }
  }
  next();
}

/** Middleware: bloquea si el usuario no es premium */
export async function premiumMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  // Check JWT claim first (fast path)
  if (req.isPremium) {
    next();
    return;
  }

  // In non-production, allow access so local testing and development work seamlessly
  if (process.env.NODE_ENV !== 'production') {
    next();
    return;
  }

  // Check DB (slow path — for tokens generated before premium upgrade)
  try {
    const subscriptions = await db.select().from(premiumSubscriptions).where(eq(premiumSubscriptions.user_id, req.userId!));
    if (subscriptions.length > 0) {
      const sub = subscriptions[0];
      if (sub.status === 'active' && (!sub.expires_at || new Date(sub.expires_at) > new Date())) {
        req.isPremium = true;
        next();
        return;
      }
    }
  } catch {
    // If table doesn't exist, fall through to reject
  }

  res.status(403).json({ data: null, error: { code: 'PREMIUM_REQUIRED', message: 'Esta función requiere una suscripción Premium. Ve a Configuración > Premium para activarla.' } });
}
