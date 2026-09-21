import { Router } from 'express';
import { eq, desc, asc } from '../config/database';
import { db } from '../config/database';
import { projects, projectMembers } from '../db/schema/projects';
import { scenes, sceneConnections } from '../db/schema/scenes';
import { shots } from '../db/schema/shots';
import { budgetItems } from '../db/schema/comments';
import { authMiddleware, type AuthRequest } from '../middleware/auth';
import { hasProjectAccess } from '../middleware/projectAccess';
import { projectToMarkdown, markdownToProject } from '../services/projectSerializer';
import crypto from 'crypto';

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

// GET /api/projects/:id/raw — Fetch project in editable JSON and Markdown formats
projectsRouter.get('/:id/raw', async (req: AuthRequest, res) => {
  try {
    const projectId = req.params.id;
    const hasAccess = await hasProjectAccess(projectId, req.userId);
    if (!hasAccess) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No tienes permiso para ver este proyecto' } });
      return;
    }

    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) {
      res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Proyecto no encontrado' } });
      return;
    }

    const pScenes = await db.select().from(scenes).where(eq(scenes.project_id, projectId)).orderBy(asc(scenes.sort_order));
    const scenesWithShots = [];

    for (const sc of pScenes) {
      const scShots = await db.select().from(shots).where(eq(shots.scene_id, sc.id)).orderBy(asc(shots.sort_order));
      scenesWithShots.push({
        ...sc,
        shots: scShots,
      });
    }

    const bundle = {
      project: {
        id: project.id,
        title: project.title,
        description: project.description,
        estimated_duration_secs: project.estimated_duration_secs,
        status: project.status,
      },
      scenes: scenesWithShots,
    };

    const markdown = projectToMarkdown(bundle as any);

    res.json({
      data: {
        project,
        scenes: scenesWithShots,
        json: bundle,
        markdown,
      },
      error: null,
    });
  } catch (err: any) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// PUT /api/projects/:id/raw — Modify project directly via JSON or Markdown (.md)
projectsRouter.put('/:id/raw', async (req: AuthRequest, res) => {
  try {
    const projectId = req.params.id;
    const hasAccess = await hasProjectAccess(projectId, req.userId);
    if (!hasAccess) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No tienes permiso para modificar este proyecto' } });
      return;
    }

    const { format = 'json', content } = req.body;
    if (!content) {
      res.status(400).json({ data: null, error: { code: 'BAD_REQUEST', message: 'El contenido es requerido' } });
      return;
    }

    let bundle: any;
    if (format === 'markdown' || format === 'md') {
      bundle = markdownToProject(typeof content === 'string' ? content : String(content));
    } else {
      bundle = typeof content === 'string' ? JSON.parse(content) : content;
    }

    if (!bundle || !bundle.project || !bundle.project.title) {
      res.status(400).json({ data: null, error: { code: 'INVALID_FORMAT', message: 'Estructura no válida: se requiere project.title' } });
      return;
    }

    const inputScenes = Array.isArray(bundle.scenes) ? bundle.scenes : [];
    const totalDuration = inputScenes.reduce((acc: number, s: any) => acc + (s.estimated_duration_secs || 5), 0);

    // 1. Update project title and description
    const [updatedProject] = await db
      .update(projects)
      .set({
        title: bundle.project.title,
        description: bundle.project.description ?? undefined,
        status: bundle.project.status || 'planning',
        estimated_duration_secs: totalDuration,
        updated_at: new Date(),
      })
      .where(eq(projects.id, projectId))
      .returning();

    // 2. Clear old scenes and connections to cleanly re-populate from the raw modified state
    await db.delete(scenes).where(eq(scenes.project_id, projectId));
    await db.delete(sceneConnections).where(eq(sceneConnections.project_id, projectId));

    // 3. Insert new scenes and shots
    const createdSceneIds: string[] = [];
    const savedScenesWithShots = [];

    for (let i = 0; i < inputScenes.length; i++) {
      const sc = inputScenes[i];
      const newSceneId = crypto.randomUUID();
      createdSceneIds.push(newSceneId);

      const [createdScene] = await db
        .insert(scenes)
        .values({
          id: newSceneId,
          project_id: projectId,
          title: sc.title || `Escena ${i + 1}`,
          objective: sc.objective || null,
          description: sc.description || null,
          estimated_duration_secs: sc.estimated_duration_secs || 5,
          color: sc.color || '#3B82F6',
          tags: Array.isArray(sc.tags) ? sc.tags : [],
          scene_type: sc.scene_type || 'standard',
          emotion: sc.emotion || 'neutral',
          position_x: sc.position_x ?? (i * 360 + 50),
          position_y: sc.position_y ?? 120,
          width: 320,
          height: 220,
          sort_order: i,
        })
        .returning();

      const savedShots = [];
      const inputShots = Array.isArray(sc.shots) ? sc.shots : [];

      for (let j = 0; j < inputShots.length; j++) {
        const sh = inputShots[j];
        const [createdShot] = await db
          .insert(shots)
          .values({
            id: crypto.randomUUID(),
            scene_id: newSceneId,
            name: sh.name || `Plano ${j + 1}`,
            description: sh.description || null,
            shot_type: sh.shot_type || 'medium',
            movement: sh.movement || 'static',
            lens: sh.lens || '35mm',
            fps: sh.fps || 24,
            resolution: sh.resolution || '1920x1080',
            estimated_duration_secs: sh.estimated_duration_secs || 5,
            camera_letter: sh.camera_letter || 'A',
            camera_setup: sh.camera_setup || null,
            lighting_setup: sh.lighting_setup || null,
            sort_order: j,
          })
          .returning();
        savedShots.push(createdShot);
      }

      savedScenesWithShots.push({
        ...createdScene,
        shots: savedShots,
      });
    }

    // 4. Create sequential sequence connections
    for (let i = 0; i < createdSceneIds.length - 1; i++) {
      await db.insert(sceneConnections).values({
        id: crypto.randomUUID(),
        project_id: projectId,
        source_scene_id: createdSceneIds[i],
        target_scene_id: createdSceneIds[i + 1],
        connection_type: 'sequence',
        transition_type: 'cut',
      });
    }

    const updatedBundle = {
      project: updatedProject,
      scenes: savedScenesWithShots,
    };
    const updatedMarkdown = projectToMarkdown(updatedBundle as any);

    res.json({
      data: {
        project: updatedProject,
        scenes: savedScenesWithShots,
        json: updatedBundle,
        markdown: updatedMarkdown,
        message: '¡Proyecto actualizado exitosamente desde código!',
      },
      error: null,
    });
  } catch (err: any) {
    res.status(500).json({ data: null, error: { code: 'RAW_UPDATE_ERROR', message: err.message } });
  }
});

// POST /api/projects/import — Create a new project from JSON or Markdown (.md)
projectsRouter.post('/import', async (req: AuthRequest, res) => {
  try {
    const { format = 'json', content } = req.body;
    if (!content) {
      res.status(400).json({ data: null, error: { code: 'BAD_REQUEST', message: 'El contenido es requerido' } });
      return;
    }

    let bundle: any;
    if (format === 'markdown' || format === 'md') {
      bundle = markdownToProject(typeof content === 'string' ? content : String(content));
    } else {
      bundle = typeof content === 'string' ? JSON.parse(content) : content;
    }

    if (!bundle || !bundle.project || !bundle.project.title) {
      res.status(400).json({ data: null, error: { code: 'INVALID_FORMAT', message: 'Estructura no válida: se requiere project.title' } });
      return;
    }

    const newProjectId = crypto.randomUUID();
    const inputScenes = Array.isArray(bundle.scenes) ? bundle.scenes : [];
    const totalDuration = inputScenes.reduce((acc: number, s: any) => acc + (s.estimated_duration_secs || 5), 0);

    const [newProject] = await db
      .insert(projects)
      .values({
        id: newProjectId,
        title: bundle.project.title,
        description: bundle.project.description || null,
        owner_id: req.userId!,
        status: bundle.project.status || 'planning',
        estimated_duration_secs: totalDuration,
      })
      .returning();

    await db.insert(projectMembers).values({
      project_id: newProject.id,
      user_id: req.userId!,
      role: 'owner',
    });

    const createdSceneIds: string[] = [];
    for (let i = 0; i < inputScenes.length; i++) {
      const sc = inputScenes[i];
      const newSceneId = crypto.randomUUID();
      createdSceneIds.push(newSceneId);

      await db.insert(scenes).values({
        id: newSceneId,
        project_id: newProjectId,
        title: sc.title || `Escena ${i + 1}`,
        objective: sc.objective || null,
        description: sc.description || null,
        estimated_duration_secs: sc.estimated_duration_secs || 5,
        color: sc.color || '#3B82F6',
        tags: Array.isArray(sc.tags) ? sc.tags : [],
        scene_type: sc.scene_type || 'standard',
        emotion: sc.emotion || 'neutral',
        position_x: sc.position_x ?? (i * 360 + 50),
        position_y: sc.position_y ?? 120,
        width: 320,
        height: 220,
        sort_order: i,
      });

      const inputShots = Array.isArray(sc.shots) ? sc.shots : [];
      for (let j = 0; j < inputShots.length; j++) {
        const sh = inputShots[j];
        await db.insert(shots).values({
          id: crypto.randomUUID(),
          scene_id: newSceneId,
          name: sh.name || `Plano ${j + 1}`,
          description: sh.description || null,
          shot_type: sh.shot_type || 'medium',
          movement: sh.movement || 'static',
          lens: sh.lens || '35mm',
          fps: sh.fps || 24,
          resolution: sh.resolution || '1920x1080',
          estimated_duration_secs: sh.estimated_duration_secs || 5,
          camera_letter: sh.camera_letter || 'A',
          camera_setup: sh.camera_setup || null,
          lighting_setup: sh.lighting_setup || null,
          sort_order: j,
        });
      }
    }

    for (let i = 0; i < createdSceneIds.length - 1; i++) {
      await db.insert(sceneConnections).values({
        id: crypto.randomUUID(),
        project_id: newProjectId,
        source_scene_id: createdSceneIds[i],
        target_scene_id: createdSceneIds[i + 1],
        connection_type: 'sequence',
        transition_type: 'cut',
      });
    }

    res.status(201).json({ data: newProject, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: { code: 'IMPORT_ERROR', message: err.message } });
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
