import { Router } from 'express';
import { eq, desc } from '../config/database';
import { db } from '../config/database';
import { assets } from '../db/schema/assets';
import { authMiddleware, type AuthRequest } from '../middleware/auth';

export const assetsRouter = Router();
assetsRouter.use(authMiddleware);

// GET /api/assets?project_id=...
assetsRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const projectId = req.query.project_id as string;
    if (!projectId) {
      res.status(400).json({ data: null, error: { code: 'BAD_REQUEST', message: 'project_id es requerido' } });
      return;
    }
    const rows = await db.select().from(assets)
      .where(eq(assets.project_id, projectId))
      .orderBy(desc(assets.created_at));
    res.json({ data: rows, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// POST /api/assets
assetsRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const [asset] = await db.insert(assets).values({
      project_id: req.body.project_id,
      scene_id: req.body.scene_id || null,
      shot_id: req.body.shot_id || null,
      name: req.body.name,
      type: req.body.type,
      url: req.body.url,
      thumbnail_url: req.body.thumbnail_url || null,
      size_bytes: req.body.size_bytes || null,
      duration_secs: req.body.duration_secs || null,
      notes: req.body.notes || null,
      tags: req.body.tags || [],
    }).returning();
    res.status(201).json({ data: asset, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// DELETE /api/assets/:id
assetsRouter.delete('/:id', async (req: AuthRequest, res) => {
  try {
    await db.delete(assets).where(eq(assets.id, req.params.id));
    res.json({ data: { deleted: true }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});
