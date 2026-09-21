import { Router } from 'express';
import { chatWithAI, chatWithAISync, type AIRequest, type ProjectContext } from '../services/ai-context';
import { getProvider, autoRegisterProviders } from '../services/ai-providers';
import { authMiddleware, premiumMiddleware, type AuthRequest } from '../middleware/auth';
import { db, eq } from '../config/database';
import { scenes, sceneConnections } from '../db/schema/scenes';
import { projects } from '../db/schema/projects';
import { shots } from '../db/schema/shots';
import { characters } from '../db/schema/characters';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const aiRouter = Router();

// All AI routes require auth
aiRouter.use(authMiddleware);

// Auto-register providers on first request
autoRegisterProviders();

// GET /api/ai/providers — List available providers (no premium needed)
aiRouter.get('/providers', (_req, res) => {
  const list: { type: string; hasKey: boolean; defaultModel: string }[] = [];
  if (process.env.OPENAI_API_KEY) list.push({ type: 'openai', hasKey: true, defaultModel: process.env.OPENAI_MODEL || 'gpt-4o' });
  if (process.env.ANTHROPIC_API_KEY) list.push({ type: 'anthropic', hasKey: true, defaultModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514' });
  if (process.env.GEMINI_API_KEY) list.push({ type: 'gemini', hasKey: true, defaultModel: process.env.GEMINI_MODEL || 'gemini-2.5-pro' });
  if (process.env.OPENROUTER_API_KEY) list.push({ type: 'openrouter', hasKey: true, defaultModel: process.env.OPENROUTER_MODEL || 'openai/gpt-4o' });
  if (process.env.OLLAMA_ENABLED === 'true') list.push({ type: 'ollama', hasKey: true, defaultModel: process.env.OLLAMA_MODEL || 'llama3.2' });

  res.json({ data: list });
});

// All AI generation routes require Premium
aiRouter.use(premiumMiddleware);

// POST /api/ai/chat — Streaming chat endpoint
aiRouter.post('/chat', async (req: AuthRequest, res) => {
  try {
    const { message, projectId, sceneId, history, provider, options } = req.body;

    if (!message || !projectId) {
      res.status(400).json({ error: { message: 'message and projectId are required' } });
      return;
    }

    // Build project context safely
    const projectRows = await db.select().from(projects).where(eq(projects.id, projectId));
    const project = projectRows?.[0];

    const scenesRows = await db.select().from(scenes).where(eq(scenes.project_id, projectId));
    const connectionsRows = await db.select().from(sceneConnections).where(eq(sceneConnections.project_id, projectId));

    const selectedScene = sceneId ? (scenesRows || []).find((s: any) => s.id === sceneId) : undefined;
    let selectedShots: any[] = [];
    if (sceneId) {
      try {
        selectedShots = await db.select().from(shots).where(eq(shots.scene_id, sceneId)) || [];
      } catch {
        selectedShots = [];
      }
    }

    const context: ProjectContext = {
      project,
      scenes: (scenesRows || []).map((s: any) => ({ ...s, estimated_duration_secs: s.estimated_duration_secs || 0 })),
      connections: connectionsRows || [],
      selectedScene: selectedScene ? { ...selectedScene, estimated_duration_secs: selectedScene.estimated_duration_secs || 0 } : undefined,
      selectedShots,
    };

    const request: AIRequest = {
      userMessage: message,
      context,
      conversationHistory: history || [],
      provider: provider || 'openai',
      options: {
        model: options?.model || undefined,
        maxTokens: options?.maxTokens || 4000,
        temperature: options?.temperature ?? 0.7,
      },
    };

    // Stream response
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const stream = await chatWithAI(request);

    for await (const chunk of stream) {
      res.write(chunk);
    }
    res.end();
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: { message: (err as Error).message } });
    }
  }
});

// POST /api/ai/generate-project — Generate full storyboard
aiRouter.post('/generate-project', async (req: AuthRequest, res) => {
  try {
    const { idea, projectId, provider, options } = req.body;
    if (!idea || !projectId) {
      res.status(400).json({ error: { message: 'idea and projectId are required' } });
      return;
    }

    const prompt = `Actúa como un director de cine premiado. Genera una estructura completa de escenas estructurada en JSON.
Idea: "${idea}"

Formato del JSON esperado (debe ser un objeto JSON puro, sin markdown ni preámbulos):
{
  "scenes": [
    {
      "title": "Nombre de la escena",
      "description": "Narrativa/acción detallada",
      "pacing": "bajo/medio/alto",
      "visual_references": "Paleta de colores, iluminación cine",
      "sound_design": "Música o efectos"
    }
  ]
}`;

    const raw = await chatWithAISync({
      userMessage: prompt,
      provider: provider || 'openai',
      options,
    });

    res.json({ data: raw });
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

// POST /api/ai/analyze-scene — Quality and pacing check
aiRouter.post('/analyze-scene', async (req: AuthRequest, res) => {
  try {
    const { projectId, sceneId, provider, options } = req.body;
    if (!projectId || !sceneId) {
      res.status(400).json({ error: { message: 'projectId and sceneId are required' } });
      return;
    }

    const scenesRows = await db.select().from(scenes).where(eq(scenes.project_id, projectId));
    const scene = (scenesRows || []).find((s: any) => s.id === sceneId);

    if (!scene) {
      res.status(404).json({ error: { message: 'Scene not found' } });
      return;
    }

    const prompt = `Analiza el ritmo, tensión dramática e inconsistencias de la siguiente escena.
Título: ${scene.title}
Descripción: ${scene.description || 'Sin descripción'}

Devuelve un análisis constructivo de 3 párrafos y sugiere mejoras directas para elevar el impacto emocional.`;

    const raw = await chatWithAISync({
      userMessage: prompt,
      provider: provider || 'openai',
      options,
    });

    res.json({ data: raw });
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

// POST /api/ai/optimize-for-platform — Reshape script for platforms
aiRouter.post('/optimize-for-platform', async (req: AuthRequest, res) => {
  try {
    const { projectId, platform, provider, options } = req.body;
    if (!projectId || !platform) {
      res.status(400).json({ error: { message: 'projectId and platform are required' } });
      return;
    }

    const scenesRows = await db.select().from(scenes).where(eq(scenes.project_id, projectId));
    const scenesText = (scenesRows || []).map((s: any, idx: number) => `Escena ${idx + 1}: ${s.title}\n${s.description || ''}`).join('\n\n');

    const prompt = `Adapta de forma creativa y enérgica la estructura del proyecto para la plataforma: "${platform}".
Sugerí el gancho (hook) inicial de los primeros 3 segundos y define el ritmo y transiciones necesarias.

Proyecto actual:
${scenesText}`;

    const raw = await chatWithAISync({
      userMessage: prompt,
      provider: provider || 'openai',
      options,
    });

    res.json({ data: raw });
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

// POST /api/ai/create-scenes — AI creates scenes from a prompt
aiRouter.post('/create-scenes', async (req: AuthRequest, res) => {
  try {
    const { projectId, idea, provider, options } = req.body;
    if (!projectId || !idea) {
      res.status(400).json({ error: { message: 'projectId and idea are required' } });
      return;
    }

    // Get existing scenes to determine sort order
    const existingRows = await db.select().from(scenes).where(eq(scenes.project_id, projectId));
    const nextSortOrder = (existingRows || []).length;

    const prompt = `Genera una lista de escenas en JSON para el siguiente proyecto audiovisual:

IDEA: "${idea}"

Reglas:
- Crea entre 3 y 8 escenas.
- Cada escena debe tener: title, description, estimated_duration_secs (entre 5 y 60), scene_type (intro, development, example, tutorial, comparison, conclusion, cta, outro), priority (low, medium, high), emotion (inspiring, urgent, funny, epic, serious, technical), y color (un color hex como #3B82F6).
- Las escenas deben contar una historia coherente con principio, desarrollo y final.
- Responde SOLO con un JSON válido, sin markdown, sin explicaciones:

{
  "scenes": [
    {
      "title": "...",
      "description": "...",
      "estimated_duration_secs": 30,
      "scene_type": "intro",
      "priority": "high",
      "emotion": "inspiring",
      "color": "#3B82F6"
    }
  ]
}`;

    const raw = await chatWithAISync({
      userMessage: prompt,
      provider: provider || 'openai',
      options,
    });

    // Parse JSON from AI response
    let parsed: any;
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(raw);
    } catch {
      res.status(500).json({ error: { message: 'La IA no generó JSON válido. Intentá de nuevo.' } });
      return;
    }

    const generatedScenes = parsed.scenes || [];
    if (!Array.isArray(generatedScenes) || generatedScenes.length === 0) {
      res.status(500).json({ error: { message: 'La IA no generó escenas. Intentá de nuevo con más detalle.' } });
      return;
    }

    // Insert scenes into DB
    const created: any[] = [];
    const canvasWidth = 800;
    const cols = Math.ceil(Math.sqrt(generatedScenes.length));

    for (let i = 0; i < generatedScenes.length; i++) {
      const s = generatedScenes[i];
      const col = i % cols;
      const row = Math.floor(i / cols);

      try {
        const [scene] = await db.insert(scenes).values({
          project_id: projectId,
          title: s.title || `Escena ${i + 1}`,
          description: s.description || null,
          estimated_duration_secs: Math.max(5, Math.min(300, s.estimated_duration_secs || 30)),
          scene_type: s.scene_type || null,
          priority: s.priority || 'medium',
          emotion: s.emotion || null,
          color: s.color || '#3B82F6',
          position_x: 50 + col * 300,
          position_y: 50 + row * 220,
          sort_order: nextSortOrder + i,
        }).returning();
        created.push(scene);
      } catch (err) {
        console.error('Failed to insert scene:', err);
      }
    }

    res.status(201).json({
      data: {
        scenes: created,
        count: created.length,
        message: `Se crearon ${created.length} escenas a partir de tu idea.`,
      },
    });
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

// POST /api/ai/generate-shot-image — Generate visual storyboard frame from camera, lens, lighting & scene context
aiRouter.post('/generate-shot-image', async (req: AuthRequest, res) => {
  try {
    const { shotId, sceneId, projectId, style = 'cinematic', promptOverride } = req.body;

    if (!shotId) {
      res.status(400).json({ data: null, error: { code: 'BAD_REQUEST', message: 'shotId es requerido' } });
      return;
    }

    // 1. Fetch shot
    const shotRows = await db.select().from(shots).where(eq(shots.id, shotId));
    if (shotRows.length === 0) {
      res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Toma no encontrada' } });
      return;
    }
    const shot = shotRows[0];

    // 2. Fetch scene & project context if available
    let scene: any = null;
    const targetSceneId = shot.scene_id || sceneId;
    if (targetSceneId) {
      const sceneRows = await db.select().from(scenes).where(eq(scenes.id, targetSceneId));
      if (sceneRows.length > 0) scene = sceneRows[0];
    }

    // 3. Fetch characters for character consistency
    let projectCharacters: any[] = [];
    const targetProjectId = projectId || scene?.project_id;
    if (targetProjectId) {
      try {
        projectCharacters = await db.select().from(characters).where(eq(characters.project_id, targetProjectId));
      } catch {}
    }

    // 4. Synthesize prompt based on chosen style & camera/lens/lighting metadata
    let fullPrompt = promptOverride;
    if (!fullPrompt) {
      const shotType = shot.shot_type ? `${shot.shot_type} shot` : 'medium shot';
      const lens = shot.lens || '35mm anamorphic lens';
      const movement = shot.movement ? `, camera movement: ${shot.movement}` : '';
      const cameraModel = (shot as any).camera_setup?.camera_model || 'ARRI Alexa Mini';
      const lighting = (shot as any).lighting_setup?.key || 'cinematic chiaroscuro lighting, soft shadows';
      const sceneEmotion = scene?.emotion ? `, emotional mood: ${scene.emotion}` : '';
      const actionDescription = shot.description || shot.name || scene?.description || 'cinematic movie scene';

      // Visual Style Modifiers
      const stylePrompts: Record<string, string> = {
        cinematic: 'Cinematic film still, 35mm anamorphic photography, photorealistic, 8k resolution, Kodak 5219 color science, subtle film grain, masterpiece',
        sketch: 'Professional storyboard pencil sketch, detailed line art, dynamic shading, production concept art, black and white with subtle grayscale wash, director storyboard sketch',
        anime: 'Anime cinematic concept art, Makoto Shinkai aesthetic, Studio Ghibli lighting, vibrant atmospheric background, rich painterly textures, 4k anime still',
        noir: 'Film noir 1950s cinema style, black and white high-contrast chiaroscuro, dramatic hard shadows, venetian blind light beams, atmospheric smoke and rain',
        '3d': '3D cinematic visualization, Unreal Engine 5 render, Octane render, ray tracing, photorealistic lighting and textures, cinematic color grading',
      };

      const styleModifier = stylePrompts[style] || stylePrompts.cinematic;

      // Character names if mentioned
      const charMentions = projectCharacters.map((c: any) => c.name).filter(Boolean);
      const charContext = charMentions.length > 0 ? ` featuring ${charMentions.slice(0, 2).join(' and ')}` : '';

      fullPrompt = `${styleModifier}. ${shotType} with ${lens} on ${cameraModel}${movement}, ${lighting}${sceneEmotion}. Visual action: ${actionDescription}${charContext}. Highly detailed, widescreen 16:9 composition, no text overlays.`;
    }

    // 5. Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads', 'ai-frames');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const frameId = crypto.randomUUID();
    const localFileName = `frame-${frameId}.jpg`;
    const localFilePath = path.join(uploadsDir, localFileName);
    let imageUrl = '';

    // A. Try OpenAI DALL-E 3 first if key is present
    if (process.env.OPENAI_API_KEY) {
      try {
        const openaiRes = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'dall-e-3',
            prompt: fullPrompt,
            n: 1,
            size: '1792x1024',
            quality: 'standard',
          }),
        });
        const openAiData = await openaiRes.json();
        if (openAiData.data?.[0]?.url) {
          const downloadRes = await fetch(openAiData.data[0].url);
          const buffer = Buffer.from(await downloadRes.arrayBuffer());
          fs.writeFileSync(localFilePath, buffer);
          imageUrl = `/uploads/ai-frames/${localFileName}`;
        }
      } catch (e) {
        console.warn('OpenAI image generation fallback triggered:', e);
      }
    }

    // B. High-speed zero-config fallback via Pollinations (Flux / SDXL)
    if (!imageUrl) {
      const seed = Math.floor(Math.random() * 1000000);
      const pollUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=1280&height=720&nologo=true&seed=${seed}&model=flux`;

      try {
        const downloadRes = await fetch(pollUrl, { signal: AbortSignal.timeout(12000) });
        if (downloadRes.ok) {
          const buffer = Buffer.from(await downloadRes.arrayBuffer());
          fs.writeFileSync(localFilePath, buffer);
          imageUrl = `/uploads/ai-frames/${localFileName}`;
        } else {
          imageUrl = pollUrl;
        }
      } catch (err) {
        // Fallback to direct URL if buffer fetch times out
        imageUrl = pollUrl;
      }
    }

    // 6. Update shot storyboard_image_url in database
    let existingMedia: any[] = [];
    try {
      if (shot.storyboard_image_url) {
        const parsed = JSON.parse(shot.storyboard_image_url);
        if (Array.isArray(parsed)) existingMedia = parsed;
        else if (typeof parsed === 'string') existingMedia = [{ url: parsed, type: 'image', name: 'Original' }];
      }
    } catch {
      if (shot.storyboard_image_url) {
        existingMedia = [{ url: shot.storyboard_image_url, type: 'image', name: 'Original' }];
      }
    }

    const styleNames: Record<string, string> = {
      cinematic: 'Cinemático 35mm',
      sketch: 'Boceto Storyboard',
      anime: 'Anime Concept',
      noir: 'Film Noir',
      '3d': 'Render 3D',
    };

    const newMediaItem = {
      url: imageUrl,
      type: 'image',
      name: `Fotograma IA (${styleNames[style] || style})`,
      size: 1024 * 650,
      created_at: new Date().toISOString(),
    };

    // Prepend new image so it immediately becomes the primary storyboard thumbnail
    const updatedMedia = [newMediaItem, ...existingMedia];

    const [updatedShot] = await db
      .update(shots)
      .set({
        storyboard_image_url: JSON.stringify(updatedMedia),
        updated_at: new Date(),
      })
      .where(eq(shots.id, shotId))
      .returning();

    res.json({
      data: {
        shot: updatedShot,
        imageUrl,
        prompt: fullPrompt,
        style,
        message: '¡Fotograma cinematográfico generado exitosamente con IA!',
      },
      error: null,
    });
  } catch (err: any) {
    console.error('Error in generate-shot-image:', err);
    res.status(500).json({ data: null, error: { code: 'GENERATION_ERROR', message: err.message } });
  }
});
