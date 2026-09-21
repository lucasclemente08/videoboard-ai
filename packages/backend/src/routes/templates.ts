import { Router } from 'express';
import { db, eq, desc } from '../config/database';
import { projects } from '../db/schema/projects';
import { scenes, sceneConnections } from '../db/schema/scenes';
import { shots } from '../db/schema/shots';
import { authMiddleware, type AuthRequest } from '../middleware/auth';
import { hasProjectAccess } from '../middleware/projectAccess';
import crypto from 'crypto';

export const templatesRouter = Router();

// Factory initial templates data
const FACTORY_TEMPLATES = [
  {
    id: 'tpl-commercial-30s',
    title: 'Spot Comercial de TV / Producto (30s)',
    description: 'Estructura publicitaria de alto impacto: gancho visual en 3s, planteo del dolor, revelación del producto, demostración y llamado a la acción.',
    template_category: 'commercial',
    clone_count: 342,
    cover_url: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=800&auto=format&fit=crop',
    scenes: [
      { title: '1. Visual Hook', objective: 'Captar atención inmediata con plano dinámico', duration: 3, tags: ['EXT', 'DÍA', 'HOOK'] },
      { title: '2. Problema / Frustración', objective: 'Mostrar al usuario con el problema cotidiano', duration: 7, tags: ['INT', 'DÍA', 'ACTOR'] },
      { title: '3. Revelación del Producto', objective: 'Plano detalle cinemático con luz dramática', duration: 8, tags: ['INT', 'MACRO', 'HERO'] },
      { title: '4. Demostración en Uso', objective: 'Montaje dinámico de satisfacción de uso', duration: 7, tags: ['INT', 'B-ROLL'] },
      { title: '5. Call to Action (CTA)', objective: 'Packshot final con logotipo, precio y oferta', duration: 5, tags: ['INT', 'CTA', 'LOGO'] },
    ],
  },
  {
    id: 'tpl-tiktok-viral-15s',
    title: 'TikTok & Reels Viral (15s)',
    description: 'Diseñado específicamente para formato vertical 9:16 con cortes rápidos al ritmo de la música y retención máxima en los primeros 2 segundos.',
    template_category: 'tiktok',
    clone_count: 518,
    cover_url: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&auto=format&fit=crop',
    scenes: [
      { title: '1. Pattern Interrupt (Hook)', objective: 'Frase intrigante o movimiento repentino a cámara', duration: 2, tags: ['9:16', 'HOOK'] },
      { title: '2. Desarrollo Rápido', objective: 'Punto 1 y 2 con texto superpuesto en pantalla', duration: 5, tags: ['9:16', 'TEXTO'] },
      { title: '3. El Giro Inesperado', objective: 'Elemento sorpresa que incita a comentar', duration: 5, tags: ['9:16', 'CLÍMAX'] },
      { title: '4. CTA a Guardar / Seguir', objective: 'Señalando abajo con llamada a la acción', duration: 3, tags: ['9:16', 'CTA'] },
    ],
  },
  {
    id: 'tpl-narrative-short',
    title: 'Cortometraje / Escena Dramática',
    description: 'Estructura clásica de puesta en escena cinematográfica: plano máster de establecimiento, campo/contracampo de diálogo y primer plano emocional.',
    template_category: 'narrative',
    clone_count: 289,
    cover_url: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&auto=format&fit=crop',
    scenes: [
      { title: '1. Master Shot (Establecimiento)', objective: 'Ubicación de personajes en el espacio escénico', duration: 8, tags: ['INT', 'NOCHE', 'MASTER'] },
      { title: '2. Plano / Contraplano (Tensión)', objective: 'Intercambio de miradas y réplica de diálogo', duration: 12, tags: ['INT', 'DIÁLOGO'] },
      { title: '3. Inserto / Detalle Simbólico', objective: 'Objeto en la mesa que revela el secreto', duration: 4, tags: ['INT', 'DETALLE'] },
      { title: '4. Primer Plano Clímax', objective: 'Reacción emocional del protagonista', duration: 6, tags: ['INT', 'PRIMER PLANO'] },
    ],
  },
  {
    id: 'tpl-youtube-creator',
    title: 'YouTube Creator (Talking Head + B-Roll)',
    description: 'Formato optimizado para canales educativos y creadores de contenido: cámara A fija con cortes de ritmo y cámara B con B-roll envolvente.',
    template_category: 'youtube',
    clone_count: 412,
    cover_url: 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=800&auto=format&fit=crop',
    scenes: [
      { title: '1. Teaser + Hook del Video', objective: 'En este video te enseñaré cómo lograr X en 3 pasos', duration: 15, tags: ['CAM A', 'INTRO'] },
      { title: '2. Título & Gráfica', objective: 'Animación de canal con música temática', duration: 5, tags: ['VFX', 'AUDIO'] },
      { title: '3. Paso 1: Fundamento Teórico', objective: 'Explicación fluida con gráficos flotantes', duration: 30, tags: ['CAM A', 'GRÁFICO'] },
      { title: '4. B-Roll Demostrativo', objective: 'Tomas de pantalla o proceso en cámara rápida', duration: 20, tags: ['B-ROLL'] },
      { title: '5. Cierre & Pantalla Final', objective: 'Invitación al próximo video con tarjetas interactivas', duration: 10, tags: ['OUTRO', 'CTA'] },
    ],
  },
  {
    id: 'tpl-music-video',
    title: 'Videoclip Musical / Rítmico',
    description: 'Guion técnico de videoclip con transiciones al compás musical, planos con lentes anamórficos y estética cyberpunk/iluminación neón.',
    template_category: 'music_video',
    clone_count: 247,
    cover_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop',
    scenes: [
      { title: '1. Intro Atmosférica', objective: 'Beats lentos y sombras largas', duration: 10, tags: ['NEÓN', 'SLOW-MO'] },
      { title: '2. Coro 1: Playback Principal', objective: 'Artista cantando a cámara con lente 24mm', duration: 20, tags: ['PERFORMANCE'] },
      { title: '3. Verso: Historia Paralela', objective: 'Narrativa visual de los personajes en la ciudad', duration: 25, tags: ['NARRATIVA', 'EXT'] },
      { title: '4. Clímax: Coreografía / Luces Estroboscópicas', objective: 'Montaje frenético con destellos de color', duration: 25, tags: ['VFX', 'LUCES'] },
    ],
  },
];

// Helper to seed factory templates if missing
async function ensureFactoryTemplates() {
  for (const tpl of FACTORY_TEMPLATES) {
    try {
      const existing = await db.select().from(projects).where(eq(projects.id, tpl.id));
      if (existing.length === 0) {
        await db.insert(projects).values({
          id: tpl.id,
          title: tpl.title,
          description: tpl.description,
          cover_url: tpl.cover_url,
          status: 'ready',
          is_template: true,
          template_category: tpl.template_category,
          clone_count: tpl.clone_count,
        });

        // Insert scenes for this template
        for (let i = 0; i < tpl.scenes.length; i++) {
          const sc = tpl.scenes[i];
          const [createdScene] = await db.insert(scenes).values({
            id: crypto.randomUUID(),
            project_id: tpl.id,
            title: sc.title,
            objective: sc.objective,
            estimated_duration_secs: sc.duration,
            tags: sc.tags,
            sort_order: i,
          }).returning();

          // Create an example shot for the scene
          await db.insert(shots).values({
            scene_id: createdScene.id,
            name: `${sc.title} - Plano 1`,
            description: sc.objective,
            estimated_duration_secs: sc.duration,
            lens: '35mm',
            fps: 24,
            sort_order: 0,
          });
        }
      }
    } catch (e) {
      // Ignore conflict / already exists
    }
  }
}

// 1. GET /api/templates — Public endpoint to list community templates
templatesRouter.get('/', async (req, res) => {
  try {
    await ensureFactoryTemplates();

    const templateRows = await db
      .select()
      .from(projects)
      .where(eq(projects.is_template, true))
      .orderBy(desc(projects.clone_count));

    // Attach scenes count and duration preview
    const result = [];
    for (const tpl of templateRows) {
      const tplScenes = await db.select().from(scenes).where(eq(scenes.project_id, tpl.id));
      result.push({
        ...tpl,
        scene_count: tplScenes.length,
        total_duration_secs: tplScenes.reduce((acc, s) => acc + (s.estimated_duration_secs || 5), 0),
        preview_scenes: tplScenes.slice(0, 4).map((s) => ({
          id: s.id,
          title: s.title,
          duration: s.estimated_duration_secs,
          color: s.color,
        })),
      });
    }

    res.json({ data: result, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// 2. POST /api/templates/:id/clone — Clone a template to user's account
templatesRouter.post('/:id/clone', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const templateId = req.params.id;
    const tplRows = await db.select().from(projects).where(eq(projects.id, templateId));
    if (tplRows.length === 0) {
      res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Plantilla no encontrada' } });
      return;
    }

    const tpl = tplRows[0];

    // Create cloned project under user's ownership
    const newProjectId = crypto.randomUUID();
    const [newProject] = await db
      .insert(projects)
      .values({
        id: newProjectId,
        title: `${tpl.title} (Mi Proyecto)`,
        description: tpl.description,
        cover_url: tpl.cover_url,
        status: 'draft',
        owner_id: req.userId!,
        is_template: false,
        clone_count: 0,
      })
      .returning();

    // Increment clone count on original template
    await db
      .update(projects)
      .set({ clone_count: (tpl.clone_count || 0) + 1 })
      .where(eq(projects.id, templateId));

    // Clone all scenes and shots
    const tplScenes = await db.select().from(scenes).where(eq(scenes.project_id, templateId));
    const sceneIdMap = new Map<string, string>();

    for (const sc of tplScenes) {
      const newSceneId = crypto.randomUUID();
      sceneIdMap.set(sc.id, newSceneId);

      await db.insert(scenes).values({
        id: newSceneId,
        project_id: newProjectId,
        title: sc.title,
        description: sc.description,
        objective: sc.objective,
        color: sc.color,
        tags: sc.tags,
        scene_type: sc.scene_type,
        estimated_duration_secs: sc.estimated_duration_secs,
        position_x: sc.position_x,
        position_y: sc.position_y,
        width: sc.width,
        height: sc.height,
        sort_order: sc.sort_order,
      });

      // Clone shots for this scene
      const scShots = await db.select().from(shots).where(eq(shots.scene_id, sc.id));
      for (const sh of scShots) {
        await db.insert(shots).values({
          scene_id: newSceneId,
          name: sh.name,
          description: sh.description,
          shot_type: sh.shot_type,
          movement: sh.movement,
          lens: sh.lens,
          fps: sh.fps,
          resolution: sh.resolution,
          estimated_duration_secs: sh.estimated_duration_secs,
          priority: sh.priority,
          status: 'planned',
          camera_setup: sh.camera_setup,
          lighting_setup: sh.lighting_setup,
          sort_order: sh.sort_order,
        });
      }
    }

    // Clone connections
    const tplConns = await db.select().from(sceneConnections).where(eq(sceneConnections.project_id, templateId));
    for (const cn of tplConns) {
      const newSrc = sceneIdMap.get(cn.source_scene_id);
      const newTgt = sceneIdMap.get(cn.target_scene_id);
      if (newSrc && newTgt) {
        await db.insert(sceneConnections).values({
          id: crypto.randomUUID(),
          project_id: newProjectId,
          source_scene_id: newSrc,
          target_scene_id: newTgt,
          connection_type: cn.connection_type,
          label: cn.label,
          transition_type: cn.transition_type,
        });
      }
    }

    res.status(201).json({ data: newProject, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: { code: 'CLONE_ERROR', message: err.message } });
  }
});

// 3. POST /api/templates/publish/:projectId — Publish a project as a community template
templatesRouter.post('/publish/:projectId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const projectId = req.params.projectId;
    const hasAccess = await hasProjectAccess(projectId, req.userId);
    if (!hasAccess) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No tienes permiso para publicar este proyecto' } });
      return;
    }

    const { category = 'commercial', description } = req.body;

    const [updated] = await db
      .update(projects)
      .set({
        is_template: true,
        template_category: category,
        description: description || undefined,
        updated_at: new Date(),
      })
      .where(eq(projects.id, projectId))
      .returning();

    res.json({ data: updated, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: { code: 'PUBLISH_ERROR', message: err.message } });
  }
});
