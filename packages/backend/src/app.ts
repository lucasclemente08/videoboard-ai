import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { errorHandler, notFound } from './middleware/errorHandler';
import { authRouter } from './routes/auth';
import { projectsRouter } from './routes/projects';
import { scenesRouter } from './routes/scenes';
import { shotsRouter } from './routes/shots';
import { assetsRouter } from './routes/assets';
import { charactersRouter } from './routes/characters';
import { musicRouter } from './routes/music';
import { commentsRouter } from './routes/comments';
import { aiRouter } from './routes/ai';
import { exportRouter } from './routes/export';
import { premiumRouter } from './routes/premium';
import { presetsRouter } from './routes/presets';
import { templatesRouter } from './routes/templates';
import { shareRouter } from './routes/share';
import { apiDocsRoute } from './routes/docs';

export function createApp() {
  const app = express();

  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  }));
  app.use(express.json({ limit: '50mb' }));
  app.use('/uploads', express.static(uploadsDir));

  // Health
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API Docs
  app.get('/api/docs', (_req, res) => {
    res.send(apiDocsRoute('/api'));
  });

  // Routes
  app.use('/api/auth', authRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api/scenes', scenesRouter);
  app.use('/api/shots', shotsRouter);
  app.use('/api/assets', assetsRouter);
  app.use('/api/characters', charactersRouter);
  app.use('/api/music', musicRouter);
  app.use('/api/comments', commentsRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/export', exportRouter);
  app.use('/api/premium', premiumRouter);
  app.use('/api/presets', presetsRouter);
  app.use('/api/templates', templatesRouter);
  app.use('/api/share', shareRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
