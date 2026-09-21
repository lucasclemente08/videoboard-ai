import { Router } from 'express';
import { eq, desc } from '../config/database';
import { db } from '../config/database';
import { projects, projectMembers } from '../db/schema/projects';
import { scenes, sceneConnections } from '../db/schema/scenes';
import { shots } from '../db/schema/shots';
import { budgetItems } from '../db/schema/comments';
import { authMiddleware, type AuthRequest } from '../middleware/auth';
import { hasProjectAccess } from '../middleware/projectAccess';

export const projectsRouter = Router();
projectsRouter.use(authMiddleware);

const MAX_FREE_PROJECTS = 3; // Free tier allows up to 3 projects

// GET /api/projects
projectsRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const allProjects = await db.select().from(projects).orderBy(desc(projects.updated_at));
    const userProjects = req.userId
      ? allProjects.filter((p: any) => !p.owner_id || p.owner_id === req.userId)
      : allProjects;

    // Enrich with scene count
    const enriched = await Promise.all(
      userProjects.map(async (p: any) => {
        try {
          const pScenes = await db.select().from(scenes).where(eq(scenes.project_id, p.id));
          return {
            ...p,
            scene_count: pScenes.length,
            shot_count: 0,
            members: [],
          };
        } catch {
          return { ...p, scene_count: 0, shot_count: 0, members: [] };
        }
      })
    );

    res.json({
      data: enriched,
      error: null,
    });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// POST /api/projects
projectsRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const existing = await db.select().from(projects).orderBy(desc(projects.updated_at));
    const userProjectCount = existing.filter((p: any) => p.owner_id === req.userId).length;

    if (!req.isPremium && userProjectCount >= MAX_FREE_PROJECTS) {
      res.status(403).json({
        data: null,
        error: {
          code: 'FREE_LIMIT_REACHED',
          message: `Has alcanzado el límite de ${MAX_FREE_PROJECTS} proyectos en el plan Free. Actualizá a Creador Pro ($4.99/mes) para crear proyectos ilimitados.`,
          upgradeRequired: true,
        },
      });
      return;
    }

    const [project] = await db.insert(projects).values({
      title: req.body.title || 'Nuevo proyecto',
      description: req.body.description || null,
      owner_id: req.userId!,
    }).returning();

    await db.insert(projectMembers).values({
      project_id: project.id,
      user_id: req.userId!,
      role: 'owner',
    });

    res.status(201).json({ data: project, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// GET /api/projects/:id
projectsRouter.get('/:id', async (req: AuthRequest, res) => {
  try {
    const rows = await db.select().from(projects).where(eq(projects.id, req.params.id));
    if (rows.length === 0) {
      res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Proyecto no encontrado' } });
      return;
    }

    const hasAccess = await hasProjectAccess(req.params.id, req.userId);
    if (!hasAccess) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No tienes permiso para acceder a este proyecto' } });
      return;
    }

    res.json({ data: rows[0], error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// PATCH /api/projects/:id
projectsRouter.patch('/:id', async (req: AuthRequest, res) => {
  try {
    const hasAccess = await hasProjectAccess(req.params.id, req.userId);
    if (!hasAccess) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No tienes permiso para modificar este proyecto' } });
      return;
    }

    const updated = await db.update(projects).set({ ...req.body, updated_at: new Date() }).where(eq(projects.id, req.params.id)).returning();
    if (updated.length === 0) {
      res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Proyecto no encontrado' } });
      return;
    }
    res.json({ data: updated[0], error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// DELETE /api/projects/:id
projectsRouter.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const rows = await db.select().from(projects).where(eq(projects.id, req.params.id));
    if (rows.length === 0) {
      res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Proyecto no encontrado' } });
      return;
    }

    const hasAccess = await hasProjectAccess(req.params.id, req.userId);
    if (!hasAccess) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No tienes permiso para eliminar este proyecto' } });
      return;
    }

    // Clean up connections, scenes, budget
    try {
      await db.delete(sceneConnections).where(eq(sceneConnections.project_id, req.params.id));
      await db.delete(scenes).where(eq(scenes.project_id, req.params.id));
      await db.delete(budgetItems).where(eq(budgetItems.project_id, req.params.id));
      await db.delete(projectMembers).where(eq(projectMembers.project_id, req.params.id));
    } catch { /* cascade or manual */ }

    await db.delete(projects).where(eq(projects.id, req.params.id));
    res.json({ data: { deleted: true }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// GET /api/projects/:id/budget
projectsRouter.get('/:id/budget', async (req: AuthRequest, res) => {
  try {
    const hasAccess = await hasProjectAccess(req.params.id, req.userId);
    if (!hasAccess) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No tienes permiso para ver el presupuesto de este proyecto' } });
      return;
    }
    const rows = await db.select().from(budgetItems).where(eq(budgetItems.project_id, req.params.id));
    res.json({ data: rows, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// POST /api/projects/:id/budget
projectsRouter.post('/:id/budget', async (req: AuthRequest, res) => {
  try {
    const hasAccess = await hasProjectAccess(req.params.id, req.userId);
    if (!hasAccess) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No tienes permiso para agregar ítems a este presupuesto' } });
      return;
    }
    const [item] = await db.insert(budgetItems).values({
      project_id: req.params.id,
      category: req.body.category || 'General',
      description: req.body.description || 'Ítem de presupuesto',
      estimated_cost: req.body.estimated_cost || 0,
      actual_cost: req.body.actual_cost || 0,
      notes: req.body.notes || null,
    }).returning();
    res.status(201).json({ data: item, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// PATCH /api/projects/:id/budget/:itemId
projectsRouter.patch('/:id/budget/:itemId', async (req: AuthRequest, res) => {
  try {
    const hasAccess = await hasProjectAccess(req.params.id, req.userId);
    if (!hasAccess) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No tienes permiso para modificar este ítem' } });
      return;
    }
    const updated = await db.update(budgetItems)
      .set(req.body)
      .where(eq(budgetItems.id, req.params.itemId))
      .returning();
    res.json({ data: updated[0] || null, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// DELETE /api/projects/:id/budget/:itemId
projectsRouter.delete('/:id/budget/:itemId', async (req: AuthRequest, res) => {
  try {
    const hasAccess = await hasProjectAccess(req.params.id, req.userId);
    if (!hasAccess) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No tienes permiso para eliminar este ítem' } });
      return;
    }
    await db.delete(budgetItems).where(eq(budgetItems.id, req.params.itemId));
    res.json({ data: { deleted: true }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});
