import { Router } from 'express';
import { eq, asc } from '../config/database';
import { db } from '../config/database';
import { scenes, sceneConnections } from '../db/schema/scenes';
import { authMiddleware, type AuthRequest } from '../middleware/auth';

export const scenesRouter = Router();
scenesRouter.use(authMiddleware);

// GET /api/scenes?project_id=...
scenesRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const projectId = req.query.project_id as string;
    if (!projectId) {
      res.status(400).json({ data: null, error: { code: 'BAD_REQUEST', message: 'project_id es requerido' } });
      return;
    }
    const rows = await db.select().from(scenes)
      .where(eq(scenes.project_id, projectId))
      .orderBy(asc(scenes.sort_order));
    res.json({ data: rows, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// GET /api/scenes/:id
scenesRouter.get('/:id', async (req: AuthRequest, res) => {
  try {
    const rows = await db.select().from(scenes).where(eq(scenes.id, req.params.id));
    if (rows.length === 0) {
      res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Escena no encontrada' } });
      return;
    }
    res.json({ data: rows[0], error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// POST /api/scenes
scenesRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const [scene] = await db.insert(scenes).values({
      project_id: req.body.project_id,
      title: req.body.title || 'Nueva escena',
      description: req.body.description || null,
      scene_type: req.body.scene_type || null,
      position_x: req.body.position_x ?? Math.random() * 500,
      position_y: req.body.position_y ?? Math.random() * 500,
      color: req.body.color || '#3B82F6',
    }).returning();
    res.status(201).json({ data: scene, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// PATCH /api/scenes/:id
scenesRouter.patch('/:id', async (req: AuthRequest, res) => {
  try {
    const updated = await db.update(scenes)
      .set({ ...req.body, updated_at: new Date() })
      .where(eq(scenes.id, req.params.id))
      .returning();
    if (updated.length === 0) {
      res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Escena no encontrada' } });
      return;
    }
    res.json({ data: updated[0], error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// DELETE /api/scenes/:id
scenesRouter.delete('/:id', async (req: AuthRequest, res) => {
  try {
    await db.delete(scenes).where(eq(scenes.id, req.params.id));
    res.json({ data: { deleted: true }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// POST /api/scenes/:id/duplicate
scenesRouter.post('/:id/duplicate', async (req: AuthRequest, res) => {
  try {
    const rows = await db.select().from(scenes).where(eq(scenes.id, req.params.id));
    if (rows.length === 0) {
      res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Escena no encontrada' } });
      return;
    }
    const original = rows[0];
    const { id, created_at, updated_at, ...rest } = original as any;
    const [duplicate] = await db.insert(scenes).values({
      ...rest,
      title: `${rest.title} (copia)`,
      position_x: (rest.position_x || 0) + 50,
      position_y: (rest.position_y || 0) + 50,
    }).returning();
    res.status(201).json({ data: duplicate, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// ---- Connections ----
scenesRouter.get('/connections', async (req: AuthRequest, res) => {
  try {
    const projectId = req.query.project_id as string;
    if (!projectId) {
      res.status(400).json({ data: null, error: { code: 'BAD_REQUEST', message: 'project_id es requerido' } });
      return;
    }
    const rows = await db.select().from(sceneConnections).where(eq(sceneConnections.project_id, projectId));
    res.json({ data: rows, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

scenesRouter.post('/connections', async (req: AuthRequest, res) => {
  try {
    const [conn] = await db.insert(sceneConnections).values({
      project_id: req.body.project_id,
      source_scene_id: req.body.source_scene_id,
      target_scene_id: req.body.target_scene_id,
      connection_type: req.body.connection_type || 'sequence',
      label: req.body.label || null,
      transition_type: req.body.transition_type || null,
    }).returning();
    res.status(201).json({ data: conn, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

scenesRouter.delete('/connections/:id', async (req: AuthRequest, res) => {
  try {
    await db.delete(sceneConnections).where(eq(sceneConnections.id, req.params.id));
    res.json({ data: { deleted: true }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});
