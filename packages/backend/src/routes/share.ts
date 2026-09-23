import { Router } from 'express';
import { db, eq, asc } from '../config/database';
import { projects } from '../db/schema/projects';
import { scenes } from '../db/schema/scenes';
import { shots } from '../db/schema/shots';
import { users } from '../db/schema/users';
import { authMiddleware, type AuthRequest } from '../middleware/auth';
import { hasProjectAccess } from '../middleware/projectAccess';
import { hashPassword, verifyPassword } from '../services/password';
import { env } from '../config/env';
import crypto from 'crypto';

export const shareRouter = Router();

function checkSharePassword(provided: string, stored: string): boolean {
  if (!provided || !stored) return false;
  if (stored.includes(':')) {
    if (verifyPassword(provided, stored)) return true;
  }
  try {
    const provBuf = Buffer.from(provided);
    const storeBuf = Buffer.from(stored);
    if (provBuf.length === storeBuf.length && crypto.timingSafeEqual(provBuf, storeBuf)) {
      return true;
    }
  } catch {}
  return false;
}

// 1. POST /api/share/link/:projectId — Generate or update client share link
shareRouter.post('/link/:projectId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const projectId = req.params.projectId;
    const hasAccess = await hasProjectAccess(projectId, req.userId);
    if (!hasAccess) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'Sin acceso a este proyecto' } });
      return;
    }

    const pRows = await db.select().from(projects).where(eq(projects.id, projectId));
    if (pRows.length === 0) {
      res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Proyecto no encontrado' } });
      return;
    }

    let token = pRows[0].share_token;
    if (!token) {
      token = crypto.randomUUID();
    }

    const { password, removePassword } = req.body;
    let newPassword = pRows[0].share_password;

    if (removePassword) {
      newPassword = null;
    } else if (password && password.trim()) {
      newPassword = hashPassword(password.trim());
    }

    const [updated] = await db
      .update(projects)
      .set({
        share_token: token,
        share_password: newPassword,
        updated_at: new Date(),
      })
      .where(eq(projects.id, projectId))
      .returning();

    const clientShareUrl = `${env.CLIENT_URL}/share/${token}`;

    res.json({
      data: {
        share_token: token,
        share_url: clientShareUrl,
        has_password: !!newPassword,
        client_approved: updated.client_approved,
        client_feedback: updated.client_feedback,
      },
      error: null,
    });
  } catch (err: any) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// 1.1 GET /api/share/link/:projectId — Retrieve existing share link status
shareRouter.get('/link/:projectId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const projectId = req.params.projectId;
    const hasAccess = await hasProjectAccess(projectId, req.userId);
    if (!hasAccess) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'Sin acceso a este proyecto' } });
      return;
    }

    const pRows = await db.select().from(projects).where(eq(projects.id, projectId));
    if (pRows.length === 0) {
      res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Proyecto no encontrado' } });
      return;
    }

    const project = pRows[0];
    const clientShareUrl = project.share_token ? `${env.CLIENT_URL}/share/${project.share_token}` : null;

    res.json({
      data: {
        share_token: project.share_token,
        share_url: clientShareUrl,
        has_password: !!project.share_password,
        is_template: project.is_template,
        template_category: project.template_category,
        client_approved: project.client_approved,
        client_feedback: project.client_feedback,
      },
      error: null,
    });
  } catch (err: any) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// 2. GET /api/share/view/:token — Public read-only client storyboard viewer
shareRouter.get('/view/:token', async (req, res) => {
  try {
    const token = req.params.token;
    const pRows = await db.select().from(projects).where(eq(projects.share_token, token));
    if (pRows.length === 0) {
      res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Enlace de revisión no válido o expirado' } });
      return;
    }

    const project = pRows[0];

    // Password verification if protected
    if (project.share_password) {
      const provided = (req.headers['x-share-password'] as string) || '';
      if (!checkSharePassword(provided, project.share_password)) {
        res.status(401).json({
          data: {
            requirePassword: true,
            projectTitle: project.title,
          },
          error: { code: 'PASSWORD_REQUIRED', message: 'Este storyboard requiere contraseña de acceso del cliente' },
        });
        return;
      }
    }

    // Get owner details
    let creatorName = 'Director / Agencia';
    if (project.owner_id) {
      const uRows = await db.select().from(users).where(eq(users.id, project.owner_id));
      if (uRows.length > 0) {
        creatorName = uRows[0].full_name || uRows[0].email.split('@')[0];
      }
    }

    // Fetch all scenes and shots
    const pScenes = await db
      .select()
      .from(scenes)
      .where(eq(scenes.project_id, project.id))
      .orderBy(asc(scenes.sort_order));

    const scenesWithShots = [];
    for (const sc of pScenes) {
      const scShots = await db
        .select()
        .from(shots)
        .where(eq(shots.scene_id, sc.id))
        .orderBy(asc(shots.sort_order));
      scenesWithShots.push({
        ...sc,
        shots: scShots,
      });
    }

    res.json({
      data: {
        project: {
          id: project.id,
          title: project.title,
          description: project.description,
          cover_url: project.cover_url,
          estimated_duration_secs: project.estimated_duration_secs,
          client_approved: project.client_approved,
          client_feedback: project.client_feedback,
          creatorName,
          created_at: project.created_at,
        },
        scenes: scenesWithShots,
      },
      error: null,
    });
  } catch (err: any) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// 3. POST /api/share/view/:token/approval — Client registers approval or feedback
shareRouter.post('/view/:token/approval', async (req, res) => {
  try {
    const token = req.params.token;
    const pRows = await db.select().from(projects).where(eq(projects.share_token, token));
    if (pRows.length === 0) {
      res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Enlace no válido' } });
      return;
    }

    const project = pRows[0];

    // Password verification if protected
    if (project.share_password) {
      const provided = (req.headers['x-share-password'] as string) || req.body.password;
      if (!checkSharePassword(provided, project.share_password)) {
        res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Contraseña incorrecta' } });
        return;
      }
    }

    const { client_name = 'Cliente', approved, feedback = '' } = req.body;

    const formattedFeedback = `[${approved ? 'APROBADO' : 'REVISIÓN SOLICITADA'}] por ${client_name} el ${new Date().toLocaleString()}:\n${feedback}`;

    const [updated] = await db
      .update(projects)
      .set({
        client_approved: !!approved,
        client_feedback: formattedFeedback,
        updated_at: new Date(),
      })
      .where(eq(projects.id, project.id))
      .returning();

    res.json({
      data: {
        client_approved: updated.client_approved,
        client_feedback: updated.client_feedback,
        message: approved
          ? '¡Storyboard aprobado formalmente! Se ha notificado al equipo de producción.'
          : 'Comentarios y solicitud de revisión registrados.',
      },
      error: null,
    });
  } catch (err: any) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});
