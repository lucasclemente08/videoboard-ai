import { Router } from 'express';
import { eq, asc } from '../config/database';
import { db } from '../config/database';
import { shots } from '../db/schema/shots';
import { authMiddleware, type AuthRequest } from '../middleware/auth';

export const shotsRouter = Router();
shotsRouter.use(authMiddleware);

// GET /api/shots?scene_id=...
shotsRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const sceneId = req.query.scene_id as string;
    if (!sceneId) {
      res.status(400).json({ data: null, error: { code: 'BAD_REQUEST', message: 'scene_id es requerido' } });
      return;
    }
    const rows = await db.select().from(shots)
      .where(eq(shots.scene_id, sceneId))
      .orderBy(asc(shots.sort_order));
    res.json({ data: rows, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// POST /api/shots
shotsRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const [shot] = await db.insert(shots).values({
      scene_id: req.body.scene_id,
      name: req.body.name || 'Nueva toma',
      description: req.body.description || null,
      shot_type: req.body.shot_type || null,
      movement: req.body.movement || null,
      lens: req.body.lens || '24mm',
      fps: req.body.fps ?? 24,
      resolution: req.body.resolution ?? '1920x1080',
      estimated_duration_secs: req.body.estimated_duration_secs ?? 5,
      priority: req.body.priority || 'medium',
      notes: req.body.notes || null,
      camera_letter: req.body.camera_letter || null,
    }).returning();
    res.status(201).json({ data: shot, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// PATCH /api/shots/:id
shotsRouter.patch('/:id', async (req: AuthRequest, res) => {
  try {
    const updated = await db.update(shots)
      .set({ ...req.body, updated_at: new Date() })
      .where(eq(shots.id, req.params.id))
      .returning();
    if (updated.length === 0) {
      res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Toma no encontrada' } });
      return;
    }
    res.json({ data: updated[0], error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// DELETE /api/shots/:id
shotsRouter.delete('/:id', async (req: AuthRequest, res) => {
  try {
    await db.delete(shots).where(eq(shots.id, req.params.id));
    res.json({ data: { deleted: true }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});
