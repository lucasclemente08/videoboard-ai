import { Router } from 'express';
import { eq, desc } from '../config/database';
import { db } from '../config/database';
import { comments, versions, templates, productionChecklist } from '../db/schema/comments';
import { authMiddleware, premiumMiddleware, type AuthRequest } from '../middleware/auth';
import { hasProjectAccess } from '../middleware/projectAccess';

export const commentsRouter = Router();
commentsRouter.use(authMiddleware);

// GET /api/comments?project_id=...
commentsRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const projectId = req.query.project_id as string;
    if (!projectId) {
      res.status(400).json({ data: null, error: { code: 'BAD_REQUEST', message: 'project_id requerido' } });
      return;
    }

    const hasAccess = await hasProjectAccess(projectId, req.userId);
    if (!hasAccess) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No tienes permiso para ver los comentarios de este proyecto' } });
      return;
    }

    const rows = await db.select().from(comments)
      .where(eq(comments.project_id, projectId))
      .orderBy(desc(comments.created_at));
    res.json({ data: rows, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// POST /api/comments
commentsRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const projectId = req.body.project_id;
    if (!projectId) {
      res.status(400).json({ data: null, error: { code: 'BAD_REQUEST', message: 'project_id requerido' } });
      return;
    }

    const hasAccess = await hasProjectAccess(projectId, req.userId);
    if (!hasAccess) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No tienes permiso para comentar en este proyecto' } });
      return;
    }

    const [comment] = await db.insert(comments).values({
      project_id: projectId,
      scene_id: req.body.scene_id || null,
      shot_id: req.body.shot_id || null,
      user_id: req.userId!,
      content: req.body.content,
      parent_id: req.body.parent_id || null,
      position_x: req.body.position_x || null,
      position_y: req.body.position_y || null,
    }).returning();
    res.status(201).json({ data: comment, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// PATCH /api/comments/:id/resolve
commentsRouter.post('/:id/resolve', async (req: AuthRequest, res) => {
  try {
    const commentRows = await db.select().from(comments).where(eq(comments.id, req.params.id));
    if (commentRows.length === 0) {
      res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Comentario no encontrado' } });
      return;
    }

    const hasAccess = await hasProjectAccess(commentRows[0].project_id, req.userId);
    if (!hasAccess) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No tienes permiso para modificar este comentario' } });
      return;
    }

    const [comment] = await db.update(comments)
      .set({ resolved: true, updated_at: new Date() })
      .where(eq(comments.id, req.params.id))
      .returning();
    res.json({ data: comment, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// DELETE /api/comments/:id
commentsRouter.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const commentRows = await db.select().from(comments).where(eq(comments.id, req.params.id));
    if (commentRows.length === 0) {
      res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Comentario no encontrado' } });
      return;
    }

    const isAuthor = commentRows[0].user_id === req.userId;
    const hasAccess = await hasProjectAccess(commentRows[0].project_id, req.userId);
    if (!isAuthor && !hasAccess) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No tienes permiso para eliminar este comentario' } });
      return;
    }

    await db.delete(comments).where(eq(comments.id, req.params.id));
    res.json({ data: { deleted: true }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// ---- Versions ----
commentsRouter.get('/versions', async (req: AuthRequest, res) => {
  try {
    const projectId = req.query.project_id as string;
    if (!projectId) {
      res.status(400).json({ data: null, error: { code: 'BAD_REQUEST', message: 'project_id requerido' } });
      return;
    }
    const rows = await db.select().from(versions)
      .where(eq(versions.project_id, projectId))
      .orderBy(desc(versions.created_at));
    res.json({ data: rows, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

commentsRouter.post('/versions', premiumMiddleware, async (req: AuthRequest, res) => {
  try {
    const [version] = await db.insert(versions).values({
      project_id: req.body.project_id,
      user_id: req.userId!,
      label: req.body.label || null,
      snapshot: req.body.snapshot,
    }).returning();
    res.status(201).json({ data: version, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// ---- Templates ----
commentsRouter.get('/templates', async (req: AuthRequest, res) => {
  try {
    const rows = await db.select().from(templates)
      .where(eq(templates.user_id, req.userId!))
      .orderBy(desc(templates.created_at));
    res.json({ data: rows, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

commentsRouter.post('/templates', async (req: AuthRequest, res) => {
  try {
    const [template] = await db.insert(templates).values({
      user_id: req.userId!,
      name: req.body.name,
      category: req.body.category,
      content: req.body.content,
      is_public: req.body.is_public || false,
    }).returning();
    res.status(201).json({ data: template, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// ---- Production Checklist ----
commentsRouter.get('/checklist', async (req: AuthRequest, res) => {
  try {
    const projectId = req.query.project_id as string;
    if (!projectId) {
      res.status(400).json({ data: null, error: { code: 'BAD_REQUEST', message: 'project_id requerido' } });
      return;
    }

    const hasAccess = await hasProjectAccess(projectId, req.userId);
    if (!hasAccess) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No tienes permiso para ver el checklist de este proyecto' } });
      return;
    }

    const rows = await db.select().from(productionChecklist)
      .where(eq(productionChecklist.project_id, projectId))
      .orderBy(productionChecklist.sort_order);
    res.json({ data: rows, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

commentsRouter.post('/checklist', async (req: AuthRequest, res) => {
  try {
    const projectId = req.body.project_id;
    if (!projectId) {
      res.status(400).json({ data: null, error: { code: 'BAD_REQUEST', message: 'project_id requerido' } });
      return;
    }

    const hasAccess = await hasProjectAccess(projectId, req.userId);
    if (!hasAccess) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No tienes permiso para modificar el checklist de este proyecto' } });
      return;
    }

    const [item] = await db.insert(productionChecklist).values({
      project_id: projectId,
      item: req.body.item,
      category: req.body.category || 'General',
      checked: req.body.checked || false,
      notes: req.body.notes || null,
      sort_order: req.body.sort_order || 0,
    }).returning();
    res.status(201).json({ data: item, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

commentsRouter.patch('/checklist/:id', async (req: AuthRequest, res) => {
  try {
    const itemRows = await db.select().from(productionChecklist).where(eq(productionChecklist.id, req.params.id));
    if (itemRows.length === 0) {
      res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Ítem no encontrado' } });
      return;
    }

    const hasAccess = await hasProjectAccess(itemRows[0].project_id, req.userId);
    if (!hasAccess) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No tienes permiso para modificar este checklist' } });
      return;
    }

    const [updated] = await db.update(productionChecklist)
      .set(req.body)
      .where(eq(productionChecklist.id, req.params.id))
      .returning();
    res.json({ data: updated, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

commentsRouter.delete('/checklist/:id', async (req: AuthRequest, res) => {
  try {
    const itemRows = await db.select().from(productionChecklist).where(eq(productionChecklist.id, req.params.id));
    if (itemRows.length === 0) {
      res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Ítem no encontrado' } });
      return;
    }

    const hasAccess = await hasProjectAccess(itemRows[0].project_id, req.userId);
    if (!hasAccess) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No tienes permiso para eliminar este ítem del checklist' } });
      return;
    }

    await db.delete(productionChecklist).where(eq(productionChecklist.id, req.params.id));
    res.json({ data: { deleted: true }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

