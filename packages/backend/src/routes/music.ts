import { Router } from 'express';
import { eq } from '../config/database';
import { db } from '../config/database';
import { music } from '../db/schema/music';
import { authMiddleware, type AuthRequest } from '../middleware/auth';

export const musicRouter = Router();
musicRouter.use(authMiddleware);

// GET /api/music?project_id=...
musicRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const projectId = req.query.project_id as string;
    if (!projectId) {
      res.status(400).json({ data: null, error: { code: 'BAD_REQUEST', message: 'project_id es requerido' } });
      return;
    }
    const rows = await db.select().from(music).where(eq(music.project_id, projectId));
    res.json({ data: rows, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// POST /api/music
musicRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const [track] = await db.insert(music).values(req.body).returning();
    res.status(201).json({ data: track, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// DELETE /api/music/:id
musicRouter.delete('/:id', async (req: AuthRequest, res) => {
  try {
    await db.delete(music).where(eq(music.id, req.params.id));
    res.json({ data: { deleted: true }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});
