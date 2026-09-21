import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Film, CheckCircle2, AlertCircle, Lock, Play, Clock,
  Eye, MessageSquare, Send, Check, Sparkles, User, Camera,
  Share2, ShieldCheck, ChevronRight
} from 'lucide-react';
import { clsx } from 'clsx';
import { AnimaticModal } from '../components/animatic/AnimaticModal';

export function ClientShareView() {
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requirePassword, setRequirePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [submittingPassword, setSubmittingPassword] = useState(false);

  // Project Data
  const [data, setData] = useState<any>(null);

  // Approval Form State
  const [clientName, setClientName] = useState('');
  const [feedback, setFeedback] = useState('');
  const [submittingApproval, setSubmittingApproval] = useState(false);
  const [approvalSuccess, setApprovalSuccess] = useState('');

  // Animatic Player
  const [animaticOpen, setAnimaticOpen] = useState(false);

  // Fetch shared project data
  const fetchData = (pwd?: string) => {
    setLoading(true);
    setError('');

    const headers: Record<string, string> = {};
    if (pwd) headers['x-share-password'] = pwd;

    fetch(`/api/share/view/${token}`, { headers })
      .then(async (r) => {
        const json = await r.json();
        if (r.status === 401 && json.data?.requirePassword) {
          setRequirePassword(true);
          setData({ project: { title: json.data.projectTitle } });
          return;
        }
        if (json.error) throw new Error(json.error.message);
        setData(json.data);
        setRequirePassword(false);
      })
      .catch((err) => {
        setError(err.message || 'Error al cargar el proyecto compartido');
      })
      .finally(() => {
        setLoading(false);
        setSubmittingPassword(false);
      });
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  // Handle password unlock
  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setSubmittingPassword(true);
    fetchData(password.trim());
  };

  // Handle Client Approval / Feedback submission
  const handleApproval = async (approved: boolean) => {
    if (!clientName.trim()) {
      alert('Por favor introduce tu nombre o el de tu empresa para registrar la decisión.');
      return;
    }
    setSubmittingApproval(true);
    try {
      const res = await fetch(`/api/share/view/${token}/approval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(password ? { 'x-share-password': password } : {}),
        },
        body: JSON.stringify({
          client_name: clientName.trim(),
          approved,
          feedback: feedback.trim(),
          password,
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);

      setApprovalSuccess(json.data.message);
      // Refresh project view
      fetchData(password);
    } catch (err: any) {
      alert(err.message || 'Error al registrar la aprobación');
    } finally {
      setSubmittingApproval(false);
    }
  };

  if (loading && !requirePassword) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center text-white">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-accent-blue/20 text-accent-blue mx-auto flex items-center justify-center animate-pulse">
            <Film className="w-6 h-6" />
          </div>
          <p className="text-xs text-neutral-400">Cargando presentación del proyecto...</p>
        </div>
      </div>
    );
  }

  // Password Lock Screen
  if (requirePassword) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-4 text-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full p-8 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl text-center space-y-6"
        >
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-400 mx-auto flex items-center justify-center shadow-inner">
            <Lock className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <span className="text-3xs uppercase font-bold text-neutral-500 tracking-widest">
              ACCESO PRIVADO PARA CLIENTES
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {data?.project?.title || 'Storyboard Protegido'}
            </h2>
            <p className="text-xs text-neutral-400">
              Introduce la clave de acceso proporcionada por el director o la agencia.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña de revisión..."
              autoFocus
              className="w-full px-4 py-3 bg-black border border-neutral-700 rounded-2xl text-sm text-center text-white placeholder:text-neutral-600 focus:outline-none focus:border-amber-400 tracking-widest"
            />

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={submittingPassword || !password.trim()}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-2xl transition-all disabled:opacity-50"
            >
              {submittingPassword ? 'Verificando...' : 'Desbloquear Presentación'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const project = data?.project;
  const scenes = data?.scenes || [];

  return (
    <div className="min-h-screen bg-[#08090c] text-white flex flex-col font-sans selection:bg-accent-blue selection:text-white">
      {/* Client Top Header */}
      <header className="h-16 bg-[#0f1117] border-b border-neutral-800/80 px-6 md:px-12 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-blue to-accent-violet flex items-center justify-center shrink-0">
            <Film className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm md:text-base font-bold text-white truncate max-w-md">
                {project?.title}
              </h1>
              {project?.client_approved && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-3xs font-bold flex items-center gap-1">
                  <Check className="w-2.5 h-2.5" /> Aprobado
                </span>
              )}
            </div>
            <p className="text-3xs text-neutral-400">
              Producción a cargo de: <strong className="text-neutral-300">{project?.creatorName}</strong>
            </p>
          </div>
        </div>

        {/* Action button: Play Animatic */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAnimaticOpen(true)}
            className="px-4 py-2 rounded-xl bg-accent-blue hover:bg-accent-blue-hover text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-accent-blue/20"
          >
            <Play className="w-4 h-4 fill-current" />
            <span className="hidden sm:inline">Reproducir Animatic en Tiempo Real</span>
            <span className="sm:hidden">Animatic</span>
          </button>
        </div>
      </header>

      {/* Main Review Presentation */}
      <main className="flex-1 p-6 md:p-12 max-w-6xl mx-auto w-full space-y-8">
        {/* Client Decision / Approval Banner */}
        <div className="p-6 md:p-8 rounded-3xl border border-neutral-800 bg-gradient-to-br from-neutral-900/90 via-[#0e1017] to-neutral-900 shadow-2xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
            <div>
              <span className="text-3xs uppercase tracking-widest font-bold text-neutral-500 block mb-1">
                PORTAL DE REVISIÓN Y APROBACIÓN
              </span>
              <h2 className="text-xl md:text-2xl font-black text-white">
                Visto Bueno del Storyboard
              </h2>
            </div>

            {project?.client_approved ? (
              <div className="p-3 px-5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-2.5">
                <CheckCircle2 className="w-6 h-6 shrink-0" />
                <div className="text-left">
                  <span className="text-xs font-bold block">Proyecto Aprobado Formalmente</span>
                  <span className="text-3xs opacity-80 whitespace-pre-line">{project.client_feedback}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-2xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
                <Clock className="w-4 h-4" />
                <span>Pendiente de tu aprobación final</span>
              </div>
            )}
          </div>

          {/* Interactive approval actions (when not yet approved or updating) */}
          {!project?.client_approved && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-2xs font-bold text-neutral-400 block mb-1.5">
                    Tu nombre o Empresa:
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ej: Laura Méndez (Directora de Marketing)"
                    className="w-full px-4 py-2.5 rounded-xl bg-black border border-neutral-700 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-accent-blue"
                  />
                </div>

                <div>
                  <label className="text-2xs font-bold text-neutral-400 block mb-1.5">
                    Observaciones o comentarios (opcional):
                  </label>
                  <input
                    type="text"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Ej: Aprobado el guion, nos encanta la escena 2..."
                    className="w-full px-4 py-2.5 rounded-xl bg-black border border-neutral-700 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-accent-blue"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleApproval(true)}
                  disabled={submittingApproval}
                  className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Aprobar Storyboard y Dar Luz Verde</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleApproval(false)}
                  disabled={submittingApproval}
                  className="px-5 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Solicitar Cambios / Dejar Notas</span>
                </button>
              </div>

              {approvalSuccess && (
                <p className="text-xs text-emerald-400 font-semibold pt-1">{approvalSuccess}</p>
              )}
            </div>
          )}
        </div>

        {/* Storyboard Scenes & Shots Breakdown */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Film className="w-5 h-5 text-accent-blue" />
              <span>Desglose de Escenas y Planos ({scenes.length})</span>
            </h3>
            <span className="text-xs text-neutral-400">
              Duración estimada: <strong>{scenes.reduce((acc: number, s: any) => acc + (s.estimated_duration_secs || 5), 0)}s</strong>
            </span>
          </div>

          <div className="space-y-6">
            {scenes.map((scene: any, idx: number) => (
              <div
                key={scene.id}
                className="p-6 rounded-3xl bg-neutral-900/60 border border-neutral-800 space-y-4"
              >
                {/* Scene Header */}
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-3 h-8 rounded-full"
                      style={{ backgroundColor: scene.color || '#3B82F6' }}
                    />
                    <div>
                      <h4 className="text-base font-bold text-white">
                        Escena {idx + 1}: {scene.title}
                      </h4>
                      {scene.objective && (
                        <p className="text-xs text-neutral-400 mt-0.5">{scene.objective}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-mono text-neutral-500">
                    {scene.estimated_duration_secs || 5}s
                  </span>
                </div>

                {/* Shots Grid */}
                {scene.shots && scene.shots.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                    {scene.shots.map((sh: any, shIdx: number) => (
                      <div
                        key={sh.id}
                        className="p-4 rounded-2xl bg-black/60 border border-neutral-800 space-y-3"
                      >
                        <div className="aspect-video w-full rounded-xl bg-neutral-800 overflow-hidden relative flex items-center justify-center">
                          {sh.storyboard_image_url ? (
                            <img
                              src={sh.storyboard_image_url}
                              alt={sh.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Camera className="w-8 h-8 text-neutral-600" />
                          )}
                          <div className="absolute top-2 left-2 bg-black/70 px-2 py-0.5 rounded text-3xs font-bold text-white">
                            Plano {shIdx + 1}
                          </div>
                          <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-0.5 rounded text-3xs font-mono text-neutral-300">
                            {sh.estimated_duration_secs || 4}s
                          </div>
                        </div>

                        <div>
                          <h5 className="text-xs font-bold text-white truncate">{sh.name}</h5>
                          {sh.description && (
                            <p className="text-3xs text-neutral-400 line-clamp-2 mt-1">
                              {sh.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-4xs text-neutral-500 pt-1 border-t border-neutral-800/80">
                          <span>{sh.shot_type || 'Plano Medio'}</span>
                          <span>•</span>
                          <span>{sh.lens || '35mm'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500 italic py-2">
                    Esta escena no cuenta con tomas detalladas individuales.
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-neutral-800 text-center text-3xs text-neutral-500">
        Presentado con <strong>VideoBoard AI</strong> • Plataforma de Preproducción Audiovisual Profesional
      </footer>

      {/* Animatic Modal in Client View */}
      {project && (
        <AnimaticModal
          open={animaticOpen}
          onClose={() => setAnimaticOpen(false)}
          projectId={project.id}
          projectTitle={project.title}
          scenes={scenes}
        />
      )}
    </div>
  );
}
