import { Router } from 'express';
import { eq } from '../config/database';
import { db } from '../config/database';
import { characters, locations, equipment } from '../db/schema/characters';
import { authMiddleware, type AuthRequest } from '../middleware/auth';

export const charactersRouter = Router();
charactersRouter.use(authMiddleware);

// Characters
charactersRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const projectId = req.query.project_id as string;
    if (!projectId) {
      res.status(400).json({ data: null, error: { code: 'BAD_REQUEST', message: 'project_id requerido' } });
      return;
    }
    const rows = await db.select().from(characters).where(eq(characters.project_id, projectId));
    res.json({ data: rows, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

charactersRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const [character] = await db.insert(characters).values(req.body).returning();
    res.status(201).json({ data: character, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

charactersRouter.patch('/:id', async (req: AuthRequest, res) => {
  try {
    const updated = await db.update(characters).set(req.body).where(eq(characters.id, req.params.id)).returning();
    res.json({ data: updated[0], error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

charactersRouter.delete('/:id', async (req: AuthRequest, res) => {
  try {
    await db.delete(characters).where(eq(characters.id, req.params.id));
    res.json({ data: { deleted: true }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// Locations
charactersRouter.get('/locations', async (req: AuthRequest, res) => {
  try {
    const projectId = req.query.project_id as string;
    if (!projectId) {
      res.status(400).json({ data: null, error: { code: 'BAD_REQUEST', message: 'project_id requerido' } });
      return;
    }
    const rows = await db.select().from(locations).where(eq(locations.project_id, projectId));
    res.json({ data: rows, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

charactersRouter.post('/locations', async (req: AuthRequest, res) => {
  const [loc] = await db.insert(locations).values(req.body).returning();
  res.status(201).json({ data: loc, error: null });
});

// Equipment
charactersRouter.get('/equipment', async (req: AuthRequest, res) => {
  try {
    const projectId = req.query.project_id as string;
    if (!projectId) {
      res.status(400).json({ data: null, error: { code: 'BAD_REQUEST', message: 'project_id requerido' } });
      return;
    }
    const rows = await db.select().from(equipment).where(eq(equipment.project_id, projectId));
    res.json({ data: rows.length > 0 ? rows[0] : null, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

charactersRouter.put('/equipment', async (req: AuthRequest, res) => {
  try {
    const existing = await db.select().from(equipment).where(eq(equipment.project_id, req.body.project_id));
    let result;
    if (existing.length > 0) {
      result = await db.update(equipment).set(req.body).where(eq(equipment.id, existing[0].id)).returning();
    } else {
      result = await db.insert(equipment).values(req.body).returning();
    }
    res.json({ data: result[0], error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});
