import { Router } from 'express';
import { eq, asc } from '../config/database';
import { db } from '../config/database';
import { scenes, sceneConnections } from '../db/schema/scenes';
import { authMiddleware, type AuthRequest } from '../middleware/auth';
import { hasProjectAccess } from '../middleware/projectAccess';

export const scenesRouter = Router();
scenesRouter.use(authMiddleware);

const MAX_FREE_SCENES = 10; // Free tier allows up to 10 scenes per project

// GET /api/scenes?project_id=...
scenesRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const projectId = req.query.project_id as string;
    if (!projectId) {
      res.status(400).json({ data: null, error: { code: 'BAD_REQUEST', message: 'project_id es requerido' } });
      return;
    }

    const hasAccess = await hasProjectAccess(projectId, req.userId);
    if (!hasAccess) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No tienes permiso para ver las escenas de este proyecto' } });
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

// ---- Connections (MUST be declared before /:id to avoid route collision) ----
// GET /api/scenes/connections?project_id=...
scenesRouter.get('/connections', async (req: AuthRequest, res) => {
  try {
    const projectId = req.query.project_id as string;
    if (!projectId) {
      res.status(400).json({ data: null, error: { code: 'BAD_REQUEST', message: 'project_id es requerido' } });
      return;
    }

    const hasAccess = await hasProjectAccess(projectId, req.userId);
    if (!hasAccess) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No tienes permiso para ver las conexiones de este proyecto' } });
      return;
    }

    const rows = await db.select().from(sceneConnections).where(eq(sceneConnections.project_id, projectId));
    res.json({ data: rows, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// POST /api/scenes/connections
scenesRouter.post('/connections', async (req: AuthRequest, res) => {
  try {
    const hasAccess = await hasProjectAccess(req.body.project_id, req.userId);
    if (!hasAccess) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No tienes permiso para conectar escenas en este proyecto' } });
      return;
    }

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

// DELETE /api/scenes/connections/:id
scenesRouter.delete('/connections/:id', async (req: AuthRequest, res) => {
  try {
    await db.delete(sceneConnections).where(eq(sceneConnections.id, req.params.id));
    res.json({ data: { deleted: true }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// POST /api/scenes/reorder
scenesRouter.post('/reorder', async (req: AuthRequest, res) => {
  try {
    const { scene_ids } = req.body;
    if (!Array.isArray(scene_ids)) {
      res.status(400).json({ data: null, error: { code: 'BAD_REQUEST', message: 'scene_ids debe ser un array' } });
      return;
    }
    for (let i = 0; i < scene_ids.length; i++) {
      await db.update(scenes).set({ sort_order: i }).where(eq(scenes.id, scene_ids[i]));
    }
    res.json({ data: { reordered: true }, error: null });
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

    const hasAccess = await hasProjectAccess(rows[0].project_id, req.userId);
    if (!hasAccess) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No tienes permiso para ver esta escena' } });
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
    const projectId = req.body.project_id;
    if (!projectId) {
      res.status(400).json({ data: null, error: { code: 'BAD_REQUEST', message: 'project_id es requerido' } });
      return;
    }

    const hasAccess = await hasProjectAccess(projectId, req.userId);
    if (!hasAccess) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No tienes permiso para agregar escenas a este proyecto' } });
      return;
    }

    if (!req.isPremium) {
      const currentScenes = await db.select().from(scenes).where(eq(scenes.project_id, projectId));
      if (currentScenes.length >= MAX_FREE_SCENES) {
        res.status(403).json({
          data: null,
          error: {
            code: 'FREE_LIMIT_REACHED',
            message: `Has alcanzado el límite de ${MAX_FREE_SCENES} escenas por proyecto en el plan Free. Actualizá a Creador Pro ($4.99/mes) para escenas ilimitadas.`,
            upgradeRequired: true,
          },
        });
        return;
      }
    }

    const [scene] = await db.insert(scenes).values({
      project_id: projectId,
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
    const rows = await db.select().from(scenes).where(eq(scenes.id, req.params.id));
    if (rows.length === 0) {
      res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Escena no encontrada' } });
      return;
    }

    const hasAccess = await hasProjectAccess(rows[0].project_id, req.userId);
    if (!hasAccess) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No tienes permiso para modificar esta escena' } });
      return;
    }

    const updated = await db.update(scenes)
      .set({ ...req.body, updated_at: new Date() })
      .where(eq(scenes.id, req.params.id))
      .returning();
    res.json({ data: updated[0], error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// DELETE /api/scenes/:id
scenesRouter.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const rows = await db.select().from(scenes).where(eq(scenes.id, req.params.id));
    if (rows.length === 0) {
      res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Escena no encontrada' } });
      return;
    }

    const hasAccess = await hasProjectAccess(rows[0].project_id, req.userId);
    if (!hasAccess) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No tienes permiso para eliminar esta escena' } });
      return;
    }

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

    const hasAccess = await hasProjectAccess(original.project_id, req.userId);
    if (!hasAccess) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No tienes permiso para duplicar esta escena' } });
      return;
    }

    if (!req.isPremium) {
      const currentScenes = await db.select().from(scenes).where(eq(scenes.project_id, original.project_id));
      if (currentScenes.length >= MAX_FREE_SCENES) {
        res.status(403).json({
          data: null,
          error: {
            code: 'FREE_LIMIT_REACHED',
            message: `Has alcanzado el límite de ${MAX_FREE_SCENES} escenas por proyecto en el plan Free. Actualizá a Creador Pro ($4.99/mes) para escenas ilimitadas.`,
            upgradeRequired: true,
          },
        });
        return;
      }
    }

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
