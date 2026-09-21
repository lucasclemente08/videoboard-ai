import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { eq, desc } from '../config/database';
import { db } from '../config/database';
import { assets } from '../db/schema/assets';
import { authMiddleware, type AuthRequest } from '../middleware/auth';
import { hasProjectAccess } from '../middleware/projectAccess';

export const assetsRouter = Router();
assetsRouter.use(authMiddleware);

const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.gif',
  '.mp4', '.webm', '.mov',
  '.mp3', '.wav', '.ogg',
  '.pdf', '.txt', '.csv', '.json',
]);

// POST /api/assets/upload
assetsRouter.post('/upload', async (req: AuthRequest, res) => {
  try {
    const { fileName, fileData, mimeType, projectId, shotId, sceneId } = req.body;
    if (!fileName || !fileData) {
      res.status(400).json({ data: null, error: { code: 'BAD_REQUEST', message: 'fileName y fileData son requeridos' } });
      return;
    }

    if (projectId) {
      const hasAccess = await hasProjectAccess(projectId, req.userId);
      if (!hasAccess) {
        res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No tienes permiso para subir archivos a este proyecto' } });
        return;
      }
    }

    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Extract base64 payload if it includes data: prefix
    let base64Payload = fileData;
    let detectedMime = mimeType || 'application/octet-stream';
    if (typeof fileData === 'string' && fileData.startsWith('data:')) {
      const parts = fileData.split(',');
      const meta = parts[0];
      base64Payload = parts[1];
      const match = meta.match(/data:(.*?);base64/);
      if (match) detectedMime = match[1];
    }

    // File extension verification
    const ext = path.extname(fileName).toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
      res.status(400).json({
        data: null,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: 'Tipo de archivo no permitido. Formatos aceptados: fotos (JPG, PNG, WebP), videos (MP4, WebM, MOV), audios (MP3, WAV) y documentos (PDF, CSV, TXT).',
        },
      });
      return;
    }

    const buffer = Buffer.from(base64Payload, 'base64');
    const MAX_FILE_SIZE = req.isPremium ? 50 * 1024 * 1024 : 25 * 1024 * 1024;
    if (buffer.length > MAX_FILE_SIZE) {
      res.status(400).json({
        data: null,
        error: {
          code: 'FILE_TOO_LARGE',
          message: `El archivo supera el tamaño máximo permitido (${req.isPremium ? '50MB' : '25MB'}).`,
        },
      });
      return;
    }

    const safeBaseName = path.basename(fileName, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueFileName = `${Date.now()}_${uuidv4().slice(0, 8)}_${safeBaseName}${ext}`;
    const filePath = path.join(uploadsDir, uniqueFileName);

    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${uniqueFileName}`;
    const fileType = detectedMime.startsWith('image/') ? 'image' : detectedMime.startsWith('video/') ? 'video' : detectedMime.startsWith('audio/') ? 'audio' : 'document';

    let assetId = uuidv4();
    if (projectId) {
      try {
        const [asset] = await db.insert(assets).values({
          project_id: projectId,
          scene_id: sceneId || null,
          shot_id: shotId || null,
          name: fileName,
          type: fileType,
          url: publicUrl,
          thumbnail_url: fileType === 'image' ? publicUrl : null,
          size_bytes: buffer.length,
          notes: null,
          tags: [],
        }).returning();
        if (asset) assetId = asset.id;
      } catch (err) {
        console.warn('Could not insert asset row in DB, returning file info:', err);
      }
    }

    res.status(201).json({
      data: {
        id: assetId,
        name: fileName,
        url: publicUrl,
        type: fileType,
        size: buffer.length,
        mimeType: detectedMime,
      },
      error: null,
    });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// GET /api/assets/pexels?query=...&type=photo|video
assetsRouter.get('/pexels', async (req: AuthRequest, res) => {
  try {
    const query = (req.query.query as string) || '';
    const type = (req.query.type as string) || 'photo';
    const apiKey = process.env.PEXELS_API_KEY || 'OC6zUhgrSOxHW2dM9TlHNp9wpQkusqQMoifWBXeZZSlYPdwe8g9Nr7ZM';

    const endpoint = type === 'photo'
      ? `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=20&orientation=landscape`
      : `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=20&orientation=landscape`;

    const resp = await fetch(endpoint, {
      headers: { Authorization: apiKey },
    });
    if (!resp.ok) {
      res.status(resp.status).json({ data: null, error: { code: 'PEXELS_ERROR', message: 'Error consultando Pexels' } });
      return;
    }
    const data = await resp.json();
    res.json({ data, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// GET /api/assets?project_id=...
assetsRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const projectId = req.query.project_id as string;
    if (!projectId) {
      res.status(400).json({ data: null, error: { code: 'BAD_REQUEST', message: 'project_id es requerido' } });
      return;
    }

    const hasAccess = await hasProjectAccess(projectId, req.userId);
    if (!hasAccess) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No tienes permiso para ver los archivos de este proyecto' } });
      return;
    }

    const rows = await db.select().from(assets)
      .where(eq(assets.project_id, projectId))
      .orderBy(desc(assets.created_at));
    res.json({ data: rows, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// POST /api/assets
assetsRouter.post('/', async (req: AuthRequest, res) => {
  try {
    if (req.body.project_id) {
      const hasAccess = await hasProjectAccess(req.body.project_id, req.userId);
      if (!hasAccess) {
        res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No tienes permiso para agregar archivos a este proyecto' } });
        return;
      }
    }

    const [asset] = await db.insert(assets).values({
      project_id: req.body.project_id,
      scene_id: req.body.scene_id || null,
      shot_id: req.body.shot_id || null,
      name: req.body.name,
      type: req.body.type,
      url: req.body.url,
      thumbnail_url: req.body.thumbnail_url || null,
      size_bytes: req.body.size_bytes || null,
      duration_secs: req.body.duration_secs || null,
      notes: req.body.notes || null,
      tags: req.body.tags || [],
    }).returning();
    res.status(201).json({ data: asset, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// DELETE /api/assets/:id
assetsRouter.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const rows = await db.select().from(assets).where(eq(assets.id, req.params.id));
    if (rows.length > 0 && rows[0].project_id) {
      const hasAccess = await hasProjectAccess(rows[0].project_id, req.userId);
      if (!hasAccess) {
        res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No tienes permiso para eliminar este archivo' } });
        return;
      }
    }

    await db.delete(assets).where(eq(assets.id, req.params.id));
    res.json({ data: { deleted: true }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});
