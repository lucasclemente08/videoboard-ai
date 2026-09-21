/**
 * Smart context builder for AI.
 * Builds minimal, relevant context from the project state.
 * Never sends the entire database — only what's needed.
 */
import { getProvider, type AIMessage } from './ai-providers';

export interface ProjectContext {
  project: any;
  scenes: any[];
  connections: any[];
  selectedScene?: any;
  selectedShots?: any[];
}

export interface AIRequest {
  userMessage: string;
  context?: Partial<ProjectContext>;
  conversationHistory?: AIMessage[];
  provider?: string;
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  };
}

export function buildSystemPrompt(context?: Partial<ProjectContext>): string {
  const ctx = context || {};
  const lines: string[] = [
    'Eres VideoBoard AI, un asistente de preproducción audiovisual.',
    'Tu trabajo es ayudar a planificar videos, no editarlos.',
    '',
    `Proyecto actual: "${ctx.project?.title || 'Sin título'}"`,
    `Total de escenas: ${ctx.scenes?.length || 0}`,
    `Duración total estimada: ${ctx.scenes?.reduce((s, c) => s + (c.estimated_duration_secs || 0), 0) || 0}s`,
    '',
    'Puedes crear, modificar, eliminar y analizar escenas, tomas, guiones, y planificar la producción.',
    'Responde en español, con tono profesional y directo.',
    '',
  ];

  if (ctx.selectedScene) {
    const s = ctx.selectedScene;
    lines.push('── ESCENA SELECCIONADA ──');
    lines.push(`Título: "${s.title}"`);
    lines.push(`Tipo: ${s.scene_type || 'no definido'}`);
    lines.push(`Estado: ${s.status || 'draft'}`);
    lines.push(`Duración: ${s.estimated_duration_secs || 0}s`);
    lines.push(`Prioridad: ${s.priority || 'media'}`);
    if (s.description) lines.push(`Descripción: ${s.description.substring(0, 200)}`);
    if (s.objective) lines.push(`Objetivo: ${s.objective}`);
    if (s.climax_point) lines.push(`Nota clima: ${s.climax_point}`);
    if (s.visual_references) lines.push(`Referencias visuales: ${s.visual_references}`);
    if (s.sound_design) lines.push(`Diseño sonoro/música: ${s.sound_design}`);
    lines.push('');
  }

  if (ctx.selectedShots && ctx.selectedShots.length > 0) {
    lines.push('── SHOT LIST DE ESCENA SELECCIONADA ──');
    ctx.selectedShots.forEach((sh: any, idx: number) => {
      lines.push(`${idx + 1}. Plano: ${sh.shot_type || 'General'} | Ángulo: ${sh.angle || 'Normal'} | Movimiento: ${sh.movement || 'Fijo'}`);
      if (sh.script_text) lines.push(`   Guión: "${sh.script_text}"`);
    });
    lines.push('');
  }

  if (ctx.scenes && ctx.scenes.length > 0) {
    lines.push('── TODAS LAS ESCENAS ──');
    ctx.scenes.forEach((s: any) => {
      lines.push(`- [${s.id.substring(0, 8)}] "${s.title}" (${s.estimated_duration_secs || 0}s) - ${s.status || 'draft'}`);
    });
    lines.push('');
  }

  return lines.join('\n');
}

export async function chatWithAI(req: AIRequest): Promise<AsyncGenerator<string>> {
  const providerName = req.provider || 'openai';
  const provider = getProvider(providerName);
  
  if (!provider) {
    throw new Error(`AI Provider ${providerName} is not registered or misconfigured.`);
  }

  const prompt = buildSystemPrompt(req.context);
  const messages = [
    { role: 'system' as const, content: prompt },
    ...(req.conversationHistory || []),
    { role: 'user' as const, content: req.userMessage }
  ];

  return provider.streamChat(messages, req.options);
}

export async function chatWithAISync(req: AIRequest): Promise<string> {
  const providerName = req.provider || 'openai';
  const provider = getProvider(providerName);
  
  if (!provider) {
    throw new Error(`AI Provider ${providerName} is not registered or misconfigured.`);
  }

  const prompt = buildSystemPrompt(req.context);
  const messages = [
    { role: 'system' as const, content: prompt },
    ...(req.conversationHistory || []),
    { role: 'user' as const, content: req.userMessage }
  ];

  return provider.chat(messages, req.options);
}
