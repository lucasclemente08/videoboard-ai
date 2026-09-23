import { Router } from 'express';
import { db, eq, asc } from '../config/database';
import { projects } from '../db/schema/projects';
import { scenes, sceneConnections } from '../db/schema/scenes';
import { shots } from '../db/schema/shots';
import { characters, locations } from '../db/schema/characters';
import { budgetItems } from '../db/schema/comments';
import { authMiddleware, type AuthRequest } from '../middleware/auth';
import { hasProjectAccess } from '../middleware/projectAccess';

export const exportRouter = Router();
exportRouter.use(authMiddleware);

// GET /api/export/json?project_id=...
exportRouter.get('/json', async (req: AuthRequest, res) => {
  try {
    const projectId = req.query.project_id as string;
    if (!projectId) {
      res.status(400).json({ data: null, error: { code: 'BAD_REQUEST', message: 'project_id es requerido' } });
      return;
    }

    const hasAccess = await hasProjectAccess(projectId, req.userId);
    if (!hasAccess) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No tienes permiso para exportar este proyecto' } });
      return;
    }

    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) {
      res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Proyecto no encontrado' } });
      return;
    }

    const projectScenes = await db.select().from(scenes).where(eq(scenes.project_id, projectId)).orderBy(asc(scenes.sort_order));
    const scenesWithShots = [];
    for (const sc of projectScenes) {
      const scShots = await db.select().from(shots).where(eq(shots.scene_id, sc.id)).orderBy(asc(shots.sort_order));
      scenesWithShots.push({
        ...sc,
        shots: scShots,
      });
    }

    const connections = await db.select().from(sceneConnections).where(eq(sceneConnections.project_id, projectId));
    const projectCharacters = await db.select().from(characters).where(eq(characters.project_id, projectId));
    const projectLocations = await db.select().from(locations).where(eq(locations.project_id, projectId));
    const budget = await db.select().from(budgetItems).where(eq(budgetItems.project_id, projectId));

    const exportBundle = {
      project,
      exported_at: new Date().toISOString(),
      scenes: scenesWithShots,
      connections,
      characters: projectCharacters,
      locations: projectLocations,
      budget,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${project.title.replace(/[^a-zA-Z0-9]/g, '_')}_export.json"`);
    res.send(JSON.stringify(exportBundle, null, 2));
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// GET /api/export/md?project_id=... or GET /api/export/markdown?project_id=...
exportRouter.get(['/md', '/markdown'], async (req: AuthRequest, res) => {
  try {
    const projectId = req.query.project_id as string;
    if (!projectId) {
      res.status(400).json({ data: null, error: { code: 'BAD_REQUEST', message: 'project_id es requerido' } });
      return;
    }

    const hasAccess = await hasProjectAccess(projectId, req.userId);
    if (!hasAccess) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No tienes permiso para exportar este proyecto' } });
      return;
    }

    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) {
      res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Proyecto no encontrado' } });
      return;
    }

    const projectScenes = await db.select().from(scenes).where(eq(scenes.project_id, projectId)).orderBy(asc(scenes.sort_order));
    const scenesWithShots = [];
    for (const sc of projectScenes) {
      const scShots = await db.select().from(shots).where(eq(shots.scene_id, sc.id)).orderBy(asc(shots.sort_order));
      scenesWithShots.push({
        ...sc,
        shots: scShots,
      });
    }

    const { projectToMarkdown } = await import('../services/projectSerializer');
    const mdContent = projectToMarkdown({
      project: project as any,
      scenes: scenesWithShots as any,
    });

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${project.title.replace(/[^a-zA-Z0-9]/g, '_')}.md"`);
    res.send(mdContent);
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// GET /api/export/csv?project_id=...
exportRouter.get('/csv', async (req: AuthRequest, res) => {
  try {
    const projectId = req.query.project_id as string;
    if (!projectId) {
      res.status(400).json({ data: null, error: { code: 'BAD_REQUEST', message: 'project_id es requerido' } });
      return;
    }

    const hasAccess = await hasProjectAccess(projectId, req.userId);
    if (!hasAccess) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No tienes permiso para exportar este proyecto' } });
      return;
    }

    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    const projectScenes = await db.select().from(scenes).where(eq(scenes.project_id, projectId)).orderBy(asc(scenes.sort_order));

    const header = ['Orden', 'Título', 'Estado', 'Duración (seg)', 'Tipo', 'Emoción', 'Descripción', 'Fecha Límite'];
    const rows = projectScenes.map((s, idx) => [
      idx + 1,
      `"${(s.title || '').replace(/"/g, '""')}"`,
      `"${s.status || 'draft'}"`,
      s.estimated_duration_secs || 5,
      `"${s.scene_type || 'standard'}"`,
      `"${s.emotion || 'neutral'}"`,
      `"${(s.description || '').replace(/"/g, '""')}"`,
      `"${s.due_date ? new Date(s.due_date).toLocaleDateString() : ''}"`,
    ]);

    const csvContent = [header.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${(project?.title || 'storyboard').replace(/[^a-zA-Z0-9]/g, '_')}.csv"`);
    res.send('\uFEFF' + csvContent); // Add UTF-8 BOM for Excel compatibility
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// GET /api/export/pdf?project_id=... or GET /api/export/html?project_id=...
exportRouter.get(['/pdf', '/html', '/print'], async (req: AuthRequest, res) => {
  try {
    const projectId = req.query.project_id as string;
    if (!projectId) {
      res.status(400).send('<h1>Error: project_id es requerido</h1>');
      return;
    }

    const hasAccess = await hasProjectAccess(projectId, req.userId);
    if (!hasAccess) {
      res.status(403).send('<h1>403 Forbidden: No tienes permiso para exportar este proyecto</h1>');
      return;
    }

    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) {
      res.status(404).send('<h1>Proyecto no encontrado</h1>');
      return;
    }

    const projectScenes = await db.select().from(scenes).where(eq(scenes.project_id, projectId)).orderBy(asc(scenes.sort_order));
    const projectCharacters = await db.select().from(characters).where(eq(characters.project_id, projectId));
    const projectLocations = await db.select().from(locations).where(eq(locations.project_id, projectId));

    let allShots: any[] = [];
    for (const sc of projectScenes) {
      try {
        const scShots = await db.select().from(shots).where(eq(shots.scene_id, sc.id)).orderBy(asc(shots.sort_order));
        allShots = [...allShots, ...scShots.map((sh: any) => ({ ...sh, sceneTitle: sc.title }))];
      } catch {}
    }

    const totalSeconds = projectScenes.reduce((acc, s) => acc + (s.estimated_duration_secs || 5), 0);

    const watermarkHtml = !req.isPremium ? `
      <div class="watermark" style="margin-top: 3rem; padding: 1.25rem; border-top: 1px dashed #cbd5e1; text-align: center; color: #64748b; font-size: 0.85rem; page-break-inside: avoid;">
        ✨ Creado con <strong>VideoBoard AI</strong> (Plan Gratuito) &bull; Para exportar sin marcas de agua y en máxima resolución, actualiza a <strong style="color: #2563eb;">Creador Pro ($4.99/mes)</strong>.
      </div>
    ` : '';

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Dossier de Producción: ${escapeHtml(project.title)}</title>
  <style>
    @page { size: A4; margin: 1.5cm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111; line-height: 1.5; padding: 2rem; background: #fff; }
    .header { border-bottom: 3px solid #3b82f6; padding-bottom: 1.5rem; margin-bottom: 2rem; }
    h1 { margin: 0 0 0.5rem 0; font-size: 2rem; color: #1e3a8a; }
    .meta { display: flex; gap: 2rem; font-size: 0.9rem; color: #4b5563; margin-top: 0.5rem; }
    .meta-item strong { color: #111; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; background: #e0e7ff; color: #3730a3; }
    .scene-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 1.25rem; margin-bottom: 1.5rem; page-break-inside: avoid; }
    .scene-header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #f3f4f6; padding-bottom: 0.5rem; margin-bottom: 0.75rem; }
    .scene-title { font-size: 1.15rem; font-weight: 700; margin: 0; }
    .scene-time { font-family: monospace; font-size: 0.9rem; color: #6b7280; }
    .scene-body { font-size: 0.95rem; color: #374151; }
    .section-title { font-size: 1.25rem; font-weight: 700; margin: 2rem 0 1rem 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.25rem; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
    .grid-item { border: 1px solid #e5e7eb; border-radius: 6px; padding: 0.75rem; font-size: 0.9rem; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 1.5rem; display: flex; gap: 1rem;">
    <button onclick="window.print()" style="padding: 0.6rem 1.2rem; background: #2563eb; color: #fff; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
      🖨️ Imprimir / Guardar en PDF
    </button>
  </div>

  <div class="header">
    <h1>🎬 ${escapeHtml(project.title)}</h1>
    <p style="margin: 0; color: #4b5563;">${escapeHtml(project.description || 'Dossier y Guion Técnico de Preproducción')}</p>
    <div class="meta">
      <div class="meta-item"><strong>Escenas:</strong> ${projectScenes.length}</div>
      <div class="meta-item"><strong>Duración Estimada:</strong> ${Math.round(totalSeconds / 60)} min (${totalSeconds}s)</div>
      <div class="meta-item"><strong>Fecha de Exportación:</strong> ${new Date().toLocaleDateString()}</div>
    </div>
  </div>

  <div class="section-title">Desglose de Escenas (${projectScenes.length})</div>
  ${projectScenes.map((s, idx) => `
    <div class="scene-card">
      <div class="scene-header">
        <h3 class="scene-title">#${idx + 1}. ${escapeHtml(s.title)}</h3>
        <span class="scene-time">${s.estimated_duration_secs || 5} seg &bull; <span class="badge">${escapeHtml(s.status || 'Borrador')}</span></span>
      </div>
      <div class="scene-body">
        <p><strong>Descripción / Acción:</strong> ${escapeHtml(s.description || 'Sin descripción')}</p>
        ${s.script_content ? `<p style="margin-top: 0.5rem; background: #f9fafb; padding: 0.75rem; border-radius: 4px; font-style: italic;">${escapeHtml(s.script_content)}</p>` : ''}
      </div>
    </div>
  `).join('')}

  ${projectCharacters.length > 0 ? `
    <div class="section-title">Elenco y Personajes (${projectCharacters.length})</div>
    <div class="grid">
      ${projectCharacters.map(c => `
        <div class="grid-item">
          <strong>${escapeHtml(c.name)}</strong><br>
          <span style="color: #6b7280;">Actor: ${escapeHtml(c.actor_name || 'Sin asignar')}</span>
          ${c.wardrobe ? `<br><span style="color: #6b7280;">Vestuario: ${escapeHtml(c.wardrobe)}</span>` : ''}
        </div>
      `).join('')}
    </div>
  ` : ''}

  ${projectLocations.length > 0 ? `
    <div class="section-title">Locaciones de Rodaje (${projectLocations.length})</div>
    <div class="grid">
      ${projectLocations.map(l => `
        <div class="grid-item">
          <strong>${escapeHtml(l.name)}</strong><br>
          <span style="color: #6b7280;">Dirección: ${escapeHtml(l.address || 'Por definir')}</span>
        </div>
      `).join('')}
    </div>
  ` : ''}

  ${allShots.length > 0 ? `
    <div class="section-title">Plan Técnico de Cámara & Esquemas de Iluminación (${allShots.length} Tomas)</div>
    <div class="grid">
      ${allShots.map(sh => `
        <div class="grid-item" style="border-left: 3px solid #3b82f6;">
          <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <strong>${escapeHtml(sh.name)} ${sh.camera_letter ? `<span class="badge">CÁM ${escapeHtml(sh.camera_letter)}</span>` : ''}</strong>
            <span style="font-size:0.75rem; color:#6b7280;">${escapeHtml(sh.sceneTitle || '')} &bull; ${sh.estimated_duration_secs || 5}s</span>
          </div>
          <div style="font-size: 0.85rem; color: #374151; line-height: 1.4;">
            <span style="color: #2563eb; font-weight:600;">Cámara & Óptica:</span> ${escapeHtml(sh.camera_setup?.camera_model || 'Cámara Principal')} | Lente ${escapeHtml(sh.camera_setup?.lens || sh.lens || '35mm')} (${escapeHtml(sh.camera_setup?.aperture || 'f/2.0')}) | ${sh.fps || 24}fps | ISO ${sh.camera_setup?.iso || 800}<br>
            <span style="color: #4b5563;">Perfil / Shutter:</span> ${escapeHtml(sh.camera_setup?.color_profile || 'Rec.709')} &bull; ${escapeHtml(sh.camera_setup?.shutter_speed || '1/48')} ${sh.camera_setup?.nd_filter ? `&bull; ${escapeHtml(sh.camera_setup.nd_filter)}` : ''}<br>
            ${sh.lighting_setup?.key_light?.type ? `
              <div style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed #e5e7eb;">
                <span style="color: #d97706; font-weight:600;">Iluminación:</span> Key: ${escapeHtml(sh.lighting_setup.key_light.type)} (${escapeHtml(sh.lighting_setup.key_light.color_temp || '5600K')}) &bull; Fill: ${escapeHtml(sh.lighting_setup.fill_light?.type || 'Rebote')} &bull; Rim: ${escapeHtml(sh.lighting_setup.back_light?.type || 'Luz de contra')}
              </div>
            ` : ''}
            ${sh.notes ? `<div style="margin-top: 4px; font-style: italic; color: #6b7280;">Nota: ${escapeHtml(sh.notes)}</div>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  ` : ''}

  ${watermarkHtml}
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    res.status(500).send(`<h1>Error al generar reporte: ${(err as Error).message}</h1>`);
  }
});
