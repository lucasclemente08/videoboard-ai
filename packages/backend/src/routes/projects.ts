import { Router } from 'express';
import { eq, desc } from '../config/database';
import { db } from '../config/database';
import { projects, projectMembers } from '../db/schema/projects';
import { scenes } from '../db/schema/scenes';
import { shots } from '../db/schema/shots';
import { authMiddleware, type AuthRequest } from '../middleware/auth';

export const projectsRouter = Router();
projectsRouter.use(authMiddleware);

const MAX_FREE_PROJECTS = 1;

// GET /api/projects
projectsRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const allProjects = await db.select().from(projects).orderBy(desc(projects.updated_at));
    res.json({
      data: allProjects.map(p => ({ ...p, scene_count: 0, shot_count: 0, members: [] })),
      error: null,
    });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// POST /api/projects
projectsRouter.post('/', async (req: AuthRequest, res) => {
  try {
    // Free tier limit: check project count
    const existing = await db.select().from(projects).orderBy(desc(projects.updated_at));
    const userProjectCount = existing.filter((p: any) => p.owner_id === req.userId).length;
    if (!req.isPremium && userProjectCount >= MAX_FREE_PROJECTS) {
      res.status(403).json({
        data: null,
        error: {
          code: 'FREE_LIMIT_REACHED',
          message: `Has alcanzado el límite de ${MAX_FREE_PROJECTS} proyecto${MAX_FREE_PROJECTS > 1 ? 's' : ''} en el plan Free. Actualizá a Premium para crear proyectos ilimitados.`,
          upgradeRequired: true,
        },
      });
      return;
    }

    const [project] = await db.insert(projects).values({
      title: req.body.title,
      description: req.body.description,
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
    res.json({ data: rows[0], error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// PATCH /api/projects/:id
projectsRouter.patch('/:id', async (req: AuthRequest, res) => {
  try {
    const updated = await db.update(projects).set({ ...req.body, updated_at: new Date() }).where(eq(projects.id, req.params.id)).returning();
    res.json({ data: updated[0], error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

import { budgetItems } from '../db/schema/comments';

// GET /api/projects/:id/budget
projectsRouter.get('/:id/budget', async (req: AuthRequest, res) => {
  try {
    const rows = await db.select().from(budgetItems).where(eq(budgetItems.project_id, req.params.id));
    res.json({ data: rows, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// POST /api/projects/:id/budget
projectsRouter.post('/:id/budget', async (req: AuthRequest, res) => {
  try {
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
