import { Router } from 'express';
import { eq, asc } from '../config/database';
import { db } from '../config/database';
import { shots } from '../db/schema/shots';
import { scenes } from '../db/schema/scenes';
import { authMiddleware, type AuthRequest } from '../middleware/auth';
import { hasProjectAccess } from '../middleware/projectAccess';

export const shotsRouter = Router();
shotsRouter.use(authMiddleware);

// GET /api/shots?scene_id=... or GET /api/shots?project_id=...
shotsRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const sceneId = req.query.scene_id as string;
    const projectId = req.query.project_id as string;

    if (projectId) {
      const hasAccess = await hasProjectAccess(projectId, req.userId);
      if (!hasAccess) {
        res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No tienes permiso para ver las tomas de este proyecto' } });
        return;
      }

      const pScenes = await db.select().from(scenes).where(eq(scenes.project_id, projectId)).orderBy(asc(scenes.sort_order));
      let allShots: any[] = [];
      for (const sc of pScenes) {
        try {
          const scShots = await db.select().from(shots).where(eq(shots.scene_id, sc.id)).orderBy(asc(shots.sort_order));
          allShots = [...allShots, ...scShots.map((sh: any) => ({ ...sh, scene_title: sc.title, scene_order: sc.sort_order, scene_color: sc.color }))];
        } catch {}
      }
      res.json({ data: allShots, error: null });
      return;
    }

    if (!sceneId) {
      res.status(400).json({ data: null, error: { code: 'BAD_REQUEST', message: 'scene_id o project_id es requerido' } });
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

async function getShotProjectId(shotId: string): Promise<string | null> {
  const shotRows = await db.select().from(shots).where(eq(shots.id, shotId));
  if (shotRows.length === 0 || !shotRows[0].scene_id) return null;
  const sceneRows = await db.select().from(scenes).where(eq(scenes.id, shotRows[0].scene_id));
  if (sceneRows.length === 0 || !sceneRows[0].project_id) return null;
  return sceneRows[0].project_id;
}

// POST /api/shots
shotsRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const sceneId = req.body.scene_id;
    if (!sceneId) {
      res.status(400).json({ data: null, error: { code: 'BAD_REQUEST', message: 'scene_id es requerido' } });
      return;
    }

    const sceneRows = await db.select().from(scenes).where(eq(scenes.id, sceneId));
    if (sceneRows.length === 0) {
      res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Escena no encontrada' } });
      return;
    }

    const hasAccess = await hasProjectAccess(sceneRows[0].project_id, req.userId);
    if (!hasAccess) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No tienes permiso para agregar tomas a esta escena' } });
      return;
    }

    const [shot] = await db.insert(shots).values({
      scene_id: sceneId,
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
    const projectId = await getShotProjectId(req.params.id);
    if (!projectId) {
      res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Toma no encontrada' } });
      return;
    }

    const hasAccess = await hasProjectAccess(projectId, req.userId);
    if (!hasAccess) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No tienes permiso para modificar esta toma' } });
      return;
    }

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
    const projectId = await getShotProjectId(req.params.id);
    if (!projectId) {
      res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Toma no encontrada' } });
      return;
    }

    const hasAccess = await hasProjectAccess(projectId, req.userId);
    if (!hasAccess) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No tienes permiso para eliminar esta toma' } });
      return;
    }

    await db.delete(shots).where(eq(shots.id, req.params.id));
    res.json({ data: { deleted: true }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// POST /api/shots/:id/takes - Add a recorded take to a shot
shotsRouter.post('/:id/takes', async (req: AuthRequest, res) => {
  try {
    const shotRows = await db.select().from(shots).where(eq(shots.id, req.params.id));
    if (shotRows.length === 0) {
      res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Toma no encontrada' } });
      return;
    }
    const currentShot = shotRows[0];

    if (currentShot.scene_id) {
      const sceneRows = await db.select().from(scenes).where(eq(scenes.id, currentShot.scene_id));
      if (sceneRows.length > 0 && sceneRows[0].project_id) {
        const hasAccess = await hasProjectAccess(sceneRows[0].project_id, req.userId);
        if (!hasAccess) {
          res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No tienes permiso para agregar tomas rodadas a esta toma' } });
          return;
        }
      }
    }

    const existingTakes: any[] = Array.isArray(currentShot.takes) ? currentShot.takes : [];
    
    const newTake = {
      id: crypto.randomUUID(),
      take_number: req.body.take_number || existingTakes.length + 1,
      status: req.body.status || 'good', // 'good' | 'hold' | 'ng'
      duration_seconds: Number(req.body.duration_seconds || 0),
      timecode: req.body.timecode || '00:00:00:00',
      notes: req.body.notes || null,
      reason: req.body.reason || null,
      created_at: new Date().toISOString(),
    };

    const updatedTakes = [...existingTakes, newTake];
    const newStatus = newTake.status === 'good' ? 'filmed' : currentShot.status;

    const updated = await db.update(shots)
      .set({ takes: updatedTakes, status: newStatus, updated_at: new Date() })
      .where(eq(shots.id, req.params.id))
      .returning();

    res.status(201).json({ data: { shot: updated[0], take: newTake }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// DELETE /api/shots/:id/takes/:takeId - Remove a recorded take
shotsRouter.delete('/:id/takes/:takeId', async (req: AuthRequest, res) => {
  try {
    const shotRows = await db.select().from(shots).where(eq(shots.id, req.params.id));
    if (shotRows.length === 0) {
      res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Toma no encontrada' } });
      return;
    }
    const currentShot = shotRows[0];

    if (currentShot.scene_id) {
      const sceneRows = await db.select().from(scenes).where(eq(scenes.id, currentShot.scene_id));
      if (sceneRows.length > 0 && sceneRows[0].project_id) {
        const hasAccess = await hasProjectAccess(sceneRows[0].project_id, req.userId);
        if (!hasAccess) {
          res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No tienes permiso para eliminar tomas rodadas de esta toma' } });
          return;
        }
      }
    }

    const existingTakes: any[] = Array.isArray(currentShot.takes) ? currentShot.takes : [];
    const updatedTakes = existingTakes.filter((t: any) => t.id !== req.params.takeId);

    const updated = await db.update(shots)
      .set({ takes: updatedTakes, updated_at: new Date() })
      .where(eq(shots.id, req.params.id))
      .returning();

    res.json({ data: updated[0], error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});
