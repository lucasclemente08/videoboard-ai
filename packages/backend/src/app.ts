import express from 'express';
import cors from 'cors';
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

export function createApp() {
  const app = express();

  app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  }));
  app.use(express.json({ limit: '50mb' }));

  // Health
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API Docs
  app.get('/api/docs', (_req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>VideoBoard AI API Docs</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;background:#0a0a0b;color:#e8e8ed;min-height:100vh}
  .container{max-width:1100px;margin:0 auto;padding:2rem 1.5rem}
  header{background:linear-gradient(135deg,#1a1a2e,#16213e 50%,#0f3460);border-radius:16px;padding:2.5rem 2rem;margin-bottom:2.5rem;border:1px solid rgba(255,255,255,0.06);position:relative;overflow:hidden}
  header::before{content:"";position:absolute;top:-50%;right:-20%;width:400px;height:400px;background:radial-gradient(circle,rgba(99,102,241,0.08),transparent 70%);pointer-events:none}
  header h1{font-size:1.8rem;font-weight:700;color:#fff;margin-bottom:.5rem}
  header h1 span{background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
  header p{color:#a0a0b0;font-size:.9rem}
  .badge{display:inline-block;padding:.25rem .75rem;border-radius:999px;font-size:.75rem;font-weight:600;margin-top:1rem;background:rgba(99,102,241,0.15);color:#a5b4fc}
  .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:1rem;margin-bottom:2.5rem}
  .stat-card{background:#121214;border:1px solid #1e1e22;border-radius:12px;padding:1.25rem;text-align:center}
  .stat-card .num{font-size:1.8rem;font-weight:700;color:#fff}
  .stat-card .label{font-size:.75rem;color:#6b6b7a;margin-top:.25rem;text-transform:uppercase;letter-spacing:.05em}
  .resource{margin-bottom:1.5rem}
  .resource-header{display:flex;align-items:center;padding:1rem 1.25rem;background:#121214;border:1px solid #1e1e22;border-radius:12px;cursor:pointer;transition:all .15s;user-select:none}
  .resource-header:hover{border-color:#2e2e35;background:#161618}
  .resource-header .icon{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:.9rem;margin-right:.75rem;flex-shrink:0}
  .resource-header h2{font-size:1rem;font-weight:600}
  .resource-header .count{margin-left:auto;font-size:.75rem;color:#6b6b7a;background:#1a1a1e;padding:.2rem .6rem;border-radius:999px}
  .resource-header .arrow{margin-left:.75rem;color:#6b6b7a;font-size:.8rem;transition:transform .2s}
  .resource-header.open .arrow{transform:rotate(180deg)}
  .resource-body{display:none}
  .resource-body.open{display:block}
  .endpoint{padding:1rem 1.25rem;margin-left:1rem;border-left:2px solid #1e1e22;transition:border-color .15s}
  .endpoint:hover{border-left-color:#6366f1}
  .endpoint-row{display:flex;align-items:flex-start;gap:1rem;flex-wrap:wrap}
  .method{display:inline-flex;align-items:center;justify-content:center;padding:.2rem .55rem;border-radius:6px;font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;min-width:52px;height:22px}
  .method.get{background:rgba(59,130,246,0.15);color:#60a5fa}
  .method.post{background:rgba(34,197,94,0.15);color:#4ade80}
  .method.patch{background:rgba(234,179,8,0.15);color:#facc15}
  .method.delete{background:rgba(239,68,68,0.15);color:#f87171}
  .path{font-family:"SF Mono","Fira Code",monospace;font-size:.82rem;color:#d4d4e0;word-break:break-all;flex:1;padding-top:.1rem}
  .auth-badge{font-size:.65rem;color:#6b6b7a;background:#1a1a1e;padding:.15rem .45rem;border-radius:4px}
  .description{font-size:.82rem;color:#8888a0;margin-top:.4rem}
  .params{margin-top:.5rem}
  .params summary{cursor:pointer;font-size:.75rem;color:#6b6b7a}
  .params summary:hover{color:#a0a0b0}
  .params table{width:100%;border-collapse:collapse;margin-top:.5rem;font-size:.78rem}
  .params th{text-align:left;color:#6b6b7a;padding:.3rem .5rem;border-bottom:1px solid #1e1e22;font-weight:500;text-transform:uppercase;letter-spacing:.03em;font-size:.7rem}
  .params td{padding:.3rem .5rem;border-bottom:1px solid #1a1a1e;color:#b0b0c0}
  .params td:first-child{font-family:"SF Mono",monospace;color:#e0e0f0}
  .param-required{color:#f87171;font-size:.7rem}
  .param-type{color:#60a5fa;font-size:.7rem}
  pre{background:#0d0d0f;border:1px solid #1a1a1e;border-radius:8px;padding:.75rem 1rem;font-size:.78rem;overflow-x:auto;margin-top:.5rem;color:#c0c0d0}
  @media(max-width:640px){.container{padding:1rem}header{padding:1.5rem}header h1{font-size:1.3rem}.endpoint{margin-left:.5rem;padding:.75rem}.endpoint-row{gap:.5rem}}
</style>
</head>
<body>
<div class="container">
  <header>
    <h1><span>VideoBoard</span> AI</h1>
    <p>API REST para preproducci&oacute;n audiovisual colaborativa</p>
    <div class="badge">v1.0.0</div>
  </header>
  <div class="stats">
    <div class="stat-card"><div class="num" id="t-ep">-</div><div class="label">Endpoints</div></div>
    <div class="stat-card"><div class="num" id="t-res">-</div><div class="label">Recursos</div></div>
    <div class="stat-card"><div class="num" id="t-auth">-</div><div class="label">Con Auth</div></div>
    <div class="stat-card"><div class="num">OK</div><div class="label">Estado</div></div>
  </div>
  <div id="rbx"></div>
</div>
<script>
const R=[
  {i:"\\u{1F49A}",c:"#22c55e",n:"Health",e:[{m:"GET",p:"/api/health",a:0,d:"Verificar que el servidor est&aacute; vivo",r:'{status:"ok",timestamp:"ISO"}'}]},
  {i:"\\u{1F510}",c:"#6366f1",n:"Auth",e:[{m:"GET",p:"/api/auth/me",a:1,d:"Perfil del usuario autenticado",r:"{ data: User, error: null }"},{m:"POST",p:"/api/auth/register",a:1,d:"Registrar usuario",r:"{ data: User, error: null }",pp:[{n:"full_name",t:"string",r:0,de:"Nombre completo"}]}]},
  {i:"\\u{1F4C1}",c:"#f59e0b",n:"Proyectos",e:[{m:"GET",p:"/api/projects",a:1,d:"Listar proyectos",r:"{ data: Project[], error: null }"},{m:"POST",p:"/api/projects",a:1,d:"Crear proyecto",r:"{ data: Project, error: null }",pp:[{n:"title",t:"string",r:1,de:"T&iacute;tulo"},{n:"description",t:"string",r:0}]},{m:"GET",p:"/api/projects/:id",a:1,d:"Obtener proyecto",r:"{ data: Project, error: null }"},{m:"PATCH",p:"/api/projects/:id",a:1,d:"Actualizar proyecto",r:"{ data: Project, error: null }"},{m:"DELETE",p:"/api/projects/:id",a:1,d:"Eliminar proyecto",r:'{ data: { deleted: true }, error: null }'}]},
  {i:"\\u{1F3AC}",c:"#3b82f6",n:"Escenas",e:[{m:"GET",p:"/api/scenes?project_id=",a:1,d:"Listar escenas",r:"{ data: Scene[], error: null }"},{m:"GET",p:"/api/scenes/:id",a:1,d:"Obtener escena",r:"{ data: Scene, error: null }"},{m:"POST",p:"/api/scenes",a:1,d:"Crear escena",r:"{ data: Scene, error: null }",pp:[{n:"project_id",t:"uuid",r:1},{n:"title",t:"string",r:0,de:"Default: Nueva escena"},{n:"position_x",t:"number",r:0},{n:"position_y",t:"number",r:0}]},{m:"PATCH",p:"/api/scenes/:id",a:1,d:"Actualizar escena",r:"{ data: Scene, error: null }"},{m:"DELETE",p:"/api/scenes/:id",a:1,d:"Eliminar escena",r:'{ data: { deleted: true }, error: null }'},{m:"POST",p:"/api/scenes/reorder",a:1,d:"Reordenar escenas",r:'{ data: { reordered: true }, error: null }',pp:[{n:"scene_ids",t:"string[]",r:1,de:"IDs en nuevo orden"}]}]},
  {i:"\\u{1F4FD}",c:"#8b5cf6",n:"Shots",e:[{m:"GET",p:"/api/shots?scene_id=",a:1,d:"Listar shots",r:"{ data: Shot[], error: null }"},{m:"POST",p:"/api/shots",a:1,d:"Crear shot",r:"{ data: Shot, error: null }",pp:[{n:"scene_id",t:"uuid",r:1},{n:"shot_type",t:"string",r:0,de:"Primer plano, General..."},{n:"angle",t:"string",r:0},{n:"movement",t:"string",r:0}]},{m:"PATCH",p:"/api/shots/:id",a:1,d:"Actualizar shot",r:"{ data: Shot, error: null }"},{m:"DELETE",p:"/api/shots/:id",a:1,d:"Eliminar shot",r:'{ data: { deleted: true }, error: null }'}]},
  {i:"\\u{1F464}",c:"#ec4899",n:"Personajes",e:[{m:"GET",p:"/api/characters?project_id=",a:1,d:"Listar personajes",r:"{ data: Character[], error: null }"},{m:"POST",p:"/api/characters",a:1,d:"Crear personaje",r:"{ data: Character, error: null }",pp:[{n:"project_id",t:"uuid",r:1},{n:"name",t:"string",r:1}]},{m:"PATCH",p:"/api/characters/:id",a:1,d:"Actualizar personaje",r:"{ data: Character, error: null }"},{m:"DELETE",p:"/api/characters/:id",a:1,d:"Eliminar personaje",r:'{ data: { deleted: true }, error: null }'}]},
  {i:"\\u{1F3B5}",c:"#22d3ee",n:"M&uacute;sica",e:[{m:"GET",p:"/api/music?project_id=",a:1,d:"Listar pistas",r:"{ data: MusicTrack[], error: null }"},{m:"POST",p:"/api/music",a:1,d:"Agregar pista",r:"{ data: MusicTrack, error: null }"},{m:"DELETE",p:"/api/music/:id",a:1,d:"Eliminar pista",r:'{ data: { deleted: true }, error: null }'}]},
  {i:"\\u{1F4AC}",c:"#a78bfa",n:"Comentarios",e:[{m:"GET",p:"/api/comments?scene_id=",a:1,d:"Listar comentarios",r:"{ data: Comment[], error: null }"},{m:"POST",p:"/api/comments",a:1,d:"Crear comentario",r:"{ data: Comment, error: null }"},{m:"DELETE",p:"/api/comments/:id",a:1,d:"Eliminar comentario",r:'{ data: { deleted: true }, error: null }'}]},
  {i:"\\u{1F916}",c:"#22c55e",n:"IA Premium",e:[{m:"GET",p:"/api/ai/providers",a:0,d:"Listar proveedores IA",r:"{ data: [{ type, hasKey }] }"},{m:"POST",p:"/api/ai/chat",a:1,d:"Chat streaming SSE",r:"text/plain chunked (SSE)",pp:[{n:"message",t:"string",r:1},{n:"projectId",t:"uuid",r:1},{n:"provider",t:"string",r:0,de:"openai/anthropic/gemini/ollama"}]},{m:"POST",p:"/api/ai/generate-project",a:1,d:"Generar proyecto desde idea",r:"{ data: string }"},{m:"POST",p:"/api/ai/analyze-scene",a:1,d:"Analizar ritmo y emoci&oacute;n",r:"{ data: string }"},{m:"POST",p:"/api/ai/optimize-for-platform",a:1,d:"Adaptar a plataforma",r:"{ data: string }"}]},
  {i:"\\u{1F4E6}",c:"#f97316",n:"Exportaci&oacute;n",e:[{m:"POST",p:"/api/export/pdf?project_id=",a:1,d:"Exportar PDF",r:"application/pdf"},{m:"POST",p:"/api/export/csv?project_id=",a:1,d:"Exportar CSV",r:"text/csv"}]}
];
var c=document.getElementById('rbx'),te=0,ta=0;
R.forEach(function(g){
  te+=g.e.length;g.e.forEach(function(e){if(e.a)ta++;});
  var d=document.createElement('div');d.className='resource';
  var h=document.createElement('div');h.className='resource-header';
  h.innerHTML='<div class="icon" style="background:'+g.c+'20;color:'+g.c+'">'+g.i+'</div><h2>'+g.n+'</h2><span class="count">'+g.e.length+'</span><span class="arrow">\\u25BC</span>';
  var b=document.createElement('div');b.className='resource-body';
  var x='';
  g.e.forEach(function(e){
    var py='';
    if(e.pp&&e.pp.length){
      py='<details class="params"><summary>Par&aacute;metros</summary><table><thead><tr><th>Campo</th><th>Tipo</th><th>Req</th><th>Desc</th></tr></thead><tbody>';
      e.pp.forEach(function(p){py+='<tr><td>'+p.n+'</td><td><span class="param-type">'+p.t+'</span></td><td>'+(p.r?'<span class="param-required">Si</span>':'No')+'</td><td>'+(p.de||'')+'</td></tr>';});
      py+='</tbody></table></details>';
    }
    var ab=e.a?'<span class="auth-badge">Auth</span>':'<span class="auth-badge">P&uacute;blico</span>';
    x+='<div class="endpoint"><div class="endpoint-row"><span class="method '+e.m.toLowerCase()+'">'+e.m+'</span><span class="path">'+e.p+'</span>'+ab+'</div><div class="description">'+e.d+'</div>'+py+'<pre><code>'+e.r+'</code></pre></div>';
  });
  b.innerHTML=x;
  h.addEventListener('click',function(){b.classList.toggle('open');h.classList.toggle('open');});
  d.appendChild(h);d.appendChild(b);c.appendChild(d);
});
document.getElementById('t-ep').textContent=te;
document.getElementById('t-res').textContent=R.length;
document.getElementById('t-auth').textContent=ta;
</script>
</body>
</html>`);
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

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
