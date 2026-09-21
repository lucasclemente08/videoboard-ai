import { Router } from 'express';

export const apiDocsRouter = Router();

const DOCS_HTML = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>VideoBoard AI — API Docs</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    background: #0a0a0b;
    color: #e8e8ed;
    min-height: 100vh;
  }
  .container { max-width: 1100px; margin: 0 auto; padding: 2rem 1.5rem; }

  /* Header */
  header {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    border-radius: 16px;
    padding: 2.5rem 2rem;
    margin-bottom: 2.5rem;
    border: 1px solid rgba(255,255,255,0.06);
    position: relative;
    overflow: hidden;
  }
  header::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -20%;
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%);
    pointer-events: none;
  }
  header h1 { font-size: 1.8rem; font-weight: 700; color: #fff; margin-bottom: 0.5rem; }
  header h1 span { background: linear-gradient(135deg, #6366f1, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  header p { color: #a0a0b0; font-size: 0.9rem; }
  .badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; margin-top: 1rem; background: rgba(99,102,241,0.15); color: #a5b4fc; }

  /* Stats */
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 2.5rem; }
  .stat-card {
    background: #121214;
    border: 1px solid #1e1e22;
    border-radius: 12px;
    padding: 1.25rem;
    text-align: center;
  }
  .stat-card .num { font-size: 1.8rem; font-weight: 700; color: #fff; }
  .stat-card .label { font-size: 0.75rem; color: #6b6b7a; margin-top: 0.25rem; text-transform: uppercase; letter-spacing: 0.05em; }

  /* Resource Group */
  .resource { margin-bottom: 1.5rem; }
  .resource-header {
    display: flex; align-items: center;
    padding: 1rem 1.25rem;
    background: #121214;
    border: 1px solid #1e1e22;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .resource-header:hover { border-color: #2e2e35; background: #161618; }
  .resource-header .icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; margin-right: 0.75rem; }
  .resource-header h2 { font-size: 1rem; font-weight: 600; }
  .resource-header .count { margin-left: auto; font-size: 0.75rem; color: #6b6b7a; background: #1a1a1e; padding: 0.2rem 0.6rem; border-radius: 999px; }
  .resource-header .arrow { margin-left: 0.75rem; color: #6b6b7a; font-size: 0.8rem; transition: transform 0.2s; }
  .resource-header.open .arrow { transform: rotate(180deg); }
  .resource-body { display: none; }
  .resource-body.open { display: block; }
  .resource-body > .endpoint:first-child { border-top: 0; }

  /* Endpoint */
  .endpoint {
    padding: 1rem 1.25rem;
    margin-left: 1rem;
    border-left: 2px solid #1e1e22;
    transition: border-color 0.15s;
  }
  .endpoint:hover { border-left-color: #6366f1; }
  .endpoint-row { display: flex; align-items: flex-start; gap: 1rem; flex-wrap: wrap; }
  .method {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 0.2rem 0.55rem; border-radius: 6px;
    font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.04em; min-width: 52px; height: 22px;
  }
  .method.get { background: rgba(59,130,246,0.15); color: #60a5fa; }
  .method.post { background: rgba(34,197,94,0.15); color: #4ade80; }
  .method.patch { background: rgba(234,179,8,0.15); color: #facc15; }
  .method.put { background: rgba(234,179,8,0.15); color: #facc15; }
  .method.delete { background: rgba(239,68,68,0.15); color: #f87171; }
  .path { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 0.82rem; color: #d4d4e0; word-break: break-all; flex: 1; padding-top: 0.1rem; }
  .auth-badge { font-size: 0.65rem; color: #6b6b7a; background: #1a1a1e; padding: 0.15rem 0.45rem; border-radius: 4px; }
  .description { font-size: 0.82rem; color: #8888a0; margin-top: 0.4rem; margin-left: calc(52px + 1rem); }
  .params { margin-top: 0.5rem; margin-left: calc(52px + 1rem); }
  .params summary { cursor: pointer; font-size: 0.75rem; color: #6b6b7a; }
  .params summary:hover { color: #a0a0b0; }
  .params table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; font-size: 0.78rem; }
  .params th { text-align: left; color: #6b6b7a; padding: 0.3rem 0.5rem; border-bottom: 1px solid #1e1e22; font-weight: 500; text-transform: uppercase; letter-spacing: 0.03em; font-size: 0.7rem; }
  .params td { padding: 0.3rem 0.5rem; border-bottom: 1px solid #1a1a1e; color: #b0b0c0; }
  .params td:first-child { font-family: 'SF Mono', monospace; color: #e0e0f0; }
  .param-required { color: #f87171; font-size: 0.7rem; }
  .param-type { color: #60a5fa; font-size: 0.7rem; }

  pre {
    background: #0d0d0f;
    border: 1px solid #1a1a1e;
    border-radius: 8px;
    padding: 0.75rem 1rem;
    font-size: 0.78rem;
    overflow-x: auto;
    margin-top: 0.5rem;
    color: #c0c0d0;
  }
  code { font-family: 'SF Mono', 'Fira Code', monospace; }

  @media (max-width: 640px) {
    .container { padding: 1rem; }
    header { padding: 1.5rem; }
    header h1 { font-size: 1.3rem; }
    .endpoint { margin-left: 0.5rem; padding: 0.75rem; }
    .endpoint-row { gap: 0.5rem; }
    .description { margin-left: 0; }
    .params { margin-left: 0; }
  }
</style>
</head>
<body>
<div class="container">
  <header>
    <h1><span>VideoBoard</span> AI</h1>
    <p>API REST para preproducción audiovisual colaborativa</p>
    <div class="badge">📡 v1.0.0</div>
  </header>

  <div class="stats">
    <div class="stat-card"><div class="num" id="total-endpoints">—</div><div class="label">Endpoints</div></div>
    <div class="stat-card"><div class="num" id="total-resources">—</div><div class="label">Recursos</div></div>
    <div class="stat-card"><div class="num" id="total-auth">🔒</div><div class="label">Auth requerida</div></div>
    <div class="stat-card"><div class="num">🎯</div><div class="label">Pre-producción</div></div>
  </div>

  <div id="resources"></div>
</div>

<script>
const data = {
  baseUrl: '/api',
  resources: [
    {
      icon: '🔐', color: '#6366f1', name: 'Auth', base: '/api/auth',
      endpoints: [
        { method: 'GET', path: '/me', auth: true, desc: 'Obtener perfil del usuario autenticado', params: [], response: '{ data: User, error: null }' },
        { method: 'POST', path: '/register', auth: true, desc: 'Registrar usuario (después de Supabase signup)', params: [{ name: 'full_name', type: 'string', required: false, desc: 'Nombre completo' }], response: '{ data: User, error: null }' },
      ]
    },
    {
      icon: '📁', color: '#f59e0b', name: 'Proyectos', base: '/api/projects',
      endpoints: [
        { method: 'GET', path: '/', auth: true, desc: 'Listar todos los proyectos', params: [], response: '{ data: Project[], error: null }' },
        { method: 'POST', path: '/', auth: true, desc: 'Crear proyecto', params: [{ name: 'title', type: 'string', required: true, desc: 'Título' }, { name: 'description', type: 'string', required: false, desc: 'Descripción' }], response: '{ data: Project, error: null }' },
        { method: 'GET', path: '/:id', auth: true, desc: 'Obtener proyecto por ID', params: [{ name: 'id', type: 'uuid', required: true, desc: 'ID del proyecto (path param)' }], response: '{ data: Project, error: null }' },
        { method: 'PATCH', path: '/:id', auth: true, desc: 'Actualizar proyecto', params: [{ name: 'id', type: 'uuid', required: true, desc: 'ID (path)' }, { name: 'title', type: 'string', required: false }, { name: 'description', type: 'string', required: false }], response: '{ data: Project, error: null }' },
        { method: 'DELETE', path: '/:id', auth: true, desc: 'Eliminar proyecto', params: [{ name: 'id', type: 'uuid', required: true, desc: 'ID (path)' }], response: '{ data: { deleted: true }, error: null }' },
      ]
    },
    {
      icon: '🎬', color: '#3b82f6', name: 'Escenas', base: '/api/scenes',
      endpoints: [
        { method: 'GET', path: '/?project_id=UUID', auth: true, desc: 'Listar escenas de un proyecto', params: [{ name: 'project_id', type: 'uuid', required: true, desc: 'Query param' }], response: '{ data: Scene[], error: null }' },
        { method: 'GET', path: '/:id', auth: true, desc: 'Obtener escena por ID', params: [{ name: 'id', type: 'uuid', required: true, desc: 'Path param' }], response: '{ data: Scene, error: null }' },
        { method: 'POST', path: '/', auth: true, desc: 'Crear escena en proyecto', params: [{ name: 'project_id', type: 'uuid', required: true }, { name: 'title', type: 'string', required: false, desc: 'Por defecto "Nueva escena"' }, { name: 'description', type: 'string', required: false }, { name: 'position_x', type: 'number', required: false }, { name: 'position_y', type: 'number', required: false }], response: '{ data: Scene, error: null }' },
        { method: 'PATCH', path: '/:id', auth: true, desc: 'Actualizar escena (título, duración, color, guion, etc.)', params: [{ name: 'id', type: 'uuid', required: true, desc: 'Path param' }, { name: 'title', type: 'string', required: false }, { name: 'description', type: 'string', required: false }, { name: 'estimated_duration_secs', type: 'number', required: false }, { name: 'status', type: 'string', required: false }, { name: 'color', type: 'string', required: false }, { name: 'position_x', type: 'number', required: false }, { name: 'position_y', type: 'number', required: false }], response: '{ data: Scene, error: null }' },
        { method: 'DELETE', path: '/:id', auth: true, desc: 'Eliminar escena', params: [{ name: 'id', type: 'uuid', required: true, desc: 'Path param' }], response: '{ data: { deleted: true }, error: null }' },
        { method: 'POST', path: '/reorder', auth: true, desc: 'Reordenar escenas en lote', params: [{ name: 'scene_ids', type: 'string[]', required: true, desc: 'Array de IDs en nuevo orden' }], response: '{ data: { reordered: true }, error: null }' },
      ]
    },
    {
      icon: '📽️', color: '#8b5cf6', name: 'Shots / Planos', base: '/api/shots',
      endpoints: [
        { method: 'GET', path: '/?scene_id=UUID', auth: true, desc: 'Listar shots de una escena', params: [{ name: 'scene_id', type: 'uuid', required: true, desc: 'Query param' }], response: '{ data: Shot[], error: null }' },
        { method: 'GET', path: '/:id', auth: true, desc: 'Obtener shot por ID', params: [{ name: 'id', type: 'uuid', required: true, desc: 'Path param' }], response: '{ data: Shot, error: null }' },
        { method: 'POST', path: '/', auth: true, desc: 'Crear shot en escena', params: [{ name: 'scene_id', type: 'uuid', required: true }, { name: 'shot_type', type: 'string', required: false, desc: 'Ej: Primer plano, General' }, { name: 'angle', type: 'string', required: false, desc: 'Normal, Picado, Contrapicado' }, { name: 'movement', type: 'string', required: false, desc: 'Fijo, Traveling, Dolly' }, { name: 'script_text', type: 'string', required: false }], response: '{ data: Shot, error: null }' },
        { method: 'PATCH', path: '/:id', auth: true, desc: 'Actualizar shot', params: [{ name: 'id', type: 'uuid', required: true, desc: 'Path param' }, { name: 'shot_type', type: 'string' }, { name: 'angle', type: 'string' }, { name: 'movement', type: 'string' }, { name: 'lens', type: 'string' }, { name: 'framing', type: 'string' }], response: '{ data: Shot, error: null }' },
        { method: 'DELETE', path: '/:id', auth: true, desc: 'Eliminar shot', params: [{ name: 'id', type: 'uuid', required: true, desc: 'Path param' }], response: '{ data: { deleted: true }, error: null }' },
      ]
    },
    {
      icon: '🖼️', color: '#06b6d4', name: 'Assets / Referencias', base: '/api/assets',
      endpoints: [
        { method: 'GET', path: '/?project_id=UUID&type=TYPE', auth: true, desc: 'Listar assets (referencias, moodboards)', params: [{ name: 'project_id', type: 'uuid', required: true, desc: 'Query' }, { name: 'type', type: 'string', required: false, desc: 'Filtrar por tipo: image, video, link, note' }], response: '{ data: Asset[], error: null }' },
        { method: 'POST', path: '/', auth: true, desc: 'Crear asset', params: [{ name: 'project_id', type: 'uuid', required: true }, { name: 'type', type: 'string', required: true, desc: 'image | video | link | note' }, { name: 'url', type: 'string', required: false }, { name: 'title', type: 'string', required: false }, { name: 'description', type: 'string', required: false }], response: '{ data: Asset, error: null }' },
        { method: 'DELETE', path: '/:id', auth: true, desc: 'Eliminar asset', params: [{ name: 'id', type: 'uuid', required: true, desc: 'Path param' }], response: '{ data: { deleted: true }, error: null }' },
      ]
    },
    {
      icon: '👤', color: '#ec4899', name: 'Personajes', base: '/api/characters',
      endpoints: [
        { method: 'GET', path: '/?project_id=UUID', auth: true, desc: 'Listar personajes de un proyecto', params: [{ name: 'project_id', type: 'uuid', required: true, desc: 'Query param' }], response: '{ data: Character[], error: null }' },
        { method: 'POST', path: '/', auth: true, desc: 'Crear personaje', params: [{ name: 'project_id', type: 'uuid', required: true }, { name: 'name', type: 'string', required: true }, { name: 'actor', type: 'string', required: false }, { name: 'description', type: 'string', required: false }, { name: 'notes', type: 'string', required: false }], response: '{ data: Character, error: null }' },
        { method: 'PATCH', path: '/:id', auth: true, desc: 'Actualizar personaje', params: [{ name: 'id', type: 'uuid', required: true, desc: 'Path param' }, { name: 'name', type: 'string' }, { name: 'actor', type: 'string' }, { name: 'wardrobe', type: 'string' }], response: '{ data: Character, error: null }' },
        { method: 'DELETE', path: '/:id', auth: true, desc: 'Eliminar personaje', params: [{ name: 'id', type: 'uuid', required: true, desc: 'Path param' }], response: '{ data: { deleted: true }, error: null }' },
      ]
    },
    {
      icon: '🎵', color: '#22d3ee', name: 'Música / Sonido', base: '/api/music',
      endpoints: [
        { method: 'GET', path: '/?project_id=UUID', auth: true, desc: 'Listar pistas por proyecto', params: [{ name: 'project_id', type: 'uuid', required: true, desc: 'Query param' }], response: '{ data: MusicTrack[], error: null }' },
        { method: 'POST', path: '/', auth: true, desc: 'Agregar pista musical', params: [{ name: 'project_id', type: 'uuid', required: true }, { name: 'title', type: 'string', required: true }, { name: 'artist', type: 'string', required: false }, { name: 'url', type: 'string', required: false }, { name: 'duration_secs', type: 'number', required: false }, { name: 'mood', type: 'string', required: false }], response: '{ data: MusicTrack, error: null }' },
        { method: 'DELETE', path: '/:id', auth: true, desc: 'Eliminar pista', params: [{ name: 'id', type: 'uuid', required: true, desc: 'Path param' }], response: '{ data: { deleted: true }, error: null }' },
      ]
    },
    {
      icon: '💬', color: '#a78bfa', name: 'Comentarios', base: '/api/comments',
      endpoints: [
        { method: 'GET', path: '/?scene_id=UUID', auth: true, desc: 'Listar comentarios de una escena', params: [{ name: 'scene_id', type: 'uuid', required: true, desc: 'Query param' }], response: '{ data: Comment[], error: null }' },
        { method: 'POST', path: '/', auth: true, desc: 'Crear comentario', params: [{ name: 'scene_id', type: 'uuid', required: true }, { name: 'content', type: 'string', required: true }, { name: 'parent_id', type: 'uuid', required: false, desc: 'Responder a otro comentario' }], response: '{ data: Comment, error: null }' },
        { method: 'DELETE', path: '/:id', auth: true, desc: 'Eliminar comentario', params: [{ name: 'id', type: 'uuid', required: true, desc: 'Path param' }], response: '{ data: { deleted: true }, error: null }' },
      ]
    },
    {
      icon: '🤖', color: '#22c55e', name: 'IA Premium', base: '/api/ai',
      endpoints: [
        { method: 'GET', path: '/providers', auth: false, desc: 'Listar proveedores IA disponibles según env', params: [], response: '{ data: [{ type, hasKey, defaultModel }], error: null }' },
        { method: 'POST', path: '/chat', auth: true, desc: 'Chat con streaming SSE — habla con tu proyecto', params: [{ name: 'message', type: 'string', required: true }, { name: 'projectId', type: 'uuid', required: true }, { name: 'sceneId', type: 'uuid', required: false, desc: 'Escena seleccionada' }, { name: 'history', type: 'AIMessage[]', required: false }, { name: 'provider', type: 'string', required: false, desc: 'openai, anthropic, gemini, openrouter, ollama' }, { name: 'options', type: 'object', required: false }], response: 'Streaming SSE (text/plain chunked)' },
        { method: 'POST', path: '/generate-project', auth: true, desc: 'Generar proyecto completo desde una idea', params: [{ name: 'idea', type: 'string', required: true, desc: 'Descripción creativa' }, { name: 'projectId', type: 'uuid', required: true }, { name: 'provider', type: 'string', required: false }], response: '{ data: string, error: null }' },
        { method: 'POST', path: '/analyze-scene', auth: true, desc: 'Analizar ritmo, emoción e inconsistencias de una escena', params: [{ name: 'projectId', type: 'uuid', required: true }, { name: 'sceneId', type: 'uuid', required: true }], response: '{ data: string, error: null }' },
        { method: 'POST', path: '/optimize-for-platform', auth: true, desc: 'Adaptar guion al formato de plataforma', params: [{ name: 'projectId', type: 'uuid', required: true }, { name: 'platform', type: 'string', required: true, desc: 'TikTok, YouTube, Instagram, etc.' }], response: '{ data: string, error: null }' },
      ]
    },
    {
      icon: '📦', color: '#f97316', name: 'Exportación', base: '/api/export',
      endpoints: [
        { method: 'POST', path: '/pdf?project_id=UUID', auth: true, desc: 'Exportar storyboard como PDF', params: [{ name: 'project_id', type: 'uuid', required: true, desc: 'Query param' }], response: 'application/pdf binary stream' },
        { method: 'POST', path: '/csv?project_id=UUID', auth: true, desc: 'Exportar shot list como CSV', params: [{ name: 'project_id', type: 'uuid', required: true, desc: 'Query param' }], response: 'text/csv binary stream' },
      ]
    },
  ]
};

// Health endpoint is implicit
data.resources.unshift({
  icon: '💚', color: '#22c55e', name: 'Health', base: '-',
  endpoints: [
    { method: 'GET', path: '/api/health', auth: false, desc: 'Verificar que el servidor está vivo', params: [], response: '{ status: "ok", timestamp: "ISO" }' },
  ]
});

const container = document.getElementById('resources');
let totalEndpoints = 0;
let authCount = 0;

data.resources.forEach((res) => {
  totalEndpoints += res.endpoints.length;
  authCount += res.endpoints.filter(e => e.auth).length;

  const div = document.createElement('div');
  div.className = 'resource';

  const header = document.createElement('div');
  header.className = 'resource-header';
  header.innerHTML = \`
    <div class="icon" style="background: \${res.color}20; color: \${res.color}">\${res.icon}</div>
    <h2>\${res.name}</h2>
    <span class="count">\${res.endpoints.length} endpoint\${res.endpoints.length !== 1 ? 's' : ''}</span>
    <span class="arrow">▼</span>
  \`;
  header.addEventListener('click', () => {
    body.classList.toggle('open');
    header.classList.toggle('open');
  });

  const body = document.createElement('div');
  body.className = 'resource-body';
  body.innerHTML = res.endpoints.map(ep => {
    const paramsHtml = ep.params.length > 0 ? \`
      <details class="params">
        <summary>📋 Parámetros</summary>
        <table>
          <thead><tr><th>Campo</th><th>Tipo</th><th>Req</th><th>Descripción</th></tr></thead>
          <tbody>\${ep.params.map(p => \`<tr><td>\${p.name}</td><td><span class="param-type">\${p.type}</span></td><td>\${p.required ? '<span class="param-required">✓</span>' : '—'}</td><td>\${p.desc || ''}</td></tr>\`).join('')}</tbody>
        </table>
      </details>\` : '';

    return \`
      <div class="endpoint">
        <div class="endpoint-row">
          <span class="method \${ep.method.toLowerCase()}">\${ep.method}</span>
          <span class="path">/api\${ep.path}</span>
          \${ep.auth ? '<span class="auth-badge">🔒 Auth</span>' : '<span class="auth-badge">🔓 Público</span>'}
        </div>
        <div class="description">\${ep.desc}</div>
        \${paramsHtml}
        <pre><code>\${ep.response}</code></pre>
      </div>\`;
  }).join('');

  div.appendChild(header);
  div.appendChild(body);
  container.appendChild(div);

  // Open first resource by default
  if (data.resources.indexOf(res) === 0) {
    body.classList.add('open');
    header.classList.add('open');
  }
});

document.getElementById('total-endpoints').textContent = totalEndpoints;
document.getElementById('total-resources').textContent = data.resources.length;
document.getElementById('total-auth').textContent = authCount;
</script>
</body>
</html>`;

export function apiDocsRoute(_baseUrl: string) {
  return DOCS_HTML;
}
