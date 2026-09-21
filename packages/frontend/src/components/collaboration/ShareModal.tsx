import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Share2, Lock, Unlock, Copy, Check, ExternalLink, Globe,
  Shield, CheckCircle2, AlertCircle, Sparkles, X, Loader2,
  Users, Layers, ArrowRight
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuthStore } from '../../stores/useAuthStore';

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle?: string;
}

const TEMPLATE_CATEGORIES = [
  { id: 'commercial', label: 'Comerciales & TV' },
  { id: 'tiktok', label: 'TikTok & Reels' },
  { id: 'narrative', label: 'Ficción & Cine' },
  { id: 'youtube', label: 'YouTube Creator' },
  { id: 'music_video', label: 'Videoclips' },
];

export function ShareModal({ open, onClose, projectId, projectTitle }: ShareModalProps) {
  const { token } = useAuthStore();
  const [tab, setTab] = useState<'client' | 'template'>('client');
  const [loading, setLoading] = useState(true);

  // Client Share State
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [hasPassword, setHasPassword] = useState(false);
  const [clientApproved, setClientApproved] = useState<boolean | null>(null);
  const [clientFeedback, setClientFeedback] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Password edit state
  const [enablePassword, setEnablePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Community Template State
  const [isTemplate, setIsTemplate] = useState(false);
  const [category, setCategory] = useState('commercial');
  const [templateDescription, setTemplateDescription] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState('');

  useEffect(() => {
    if (!open || !projectId) return;

    setLoading(true);
    setPasswordSuccess('');
    setPublishSuccess('');

    // Fetch existing share & template settings
    fetch(`/api/share/link/${projectId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.data) {
          setShareToken(res.data.share_token);
          setHasPassword(res.data.has_password);
          setEnablePassword(res.data.has_password);
          setIsTemplate(!!res.data.is_template);
          if (res.data.template_category) setCategory(res.data.template_category);
          setClientApproved(res.data.client_approved);
          setClientFeedback(res.data.client_feedback);
        }
      })
      .catch((err) => console.error('Error fetching share status:', err))
      .finally(() => setLoading(false));
  }, [open, projectId, token]);

  // Generate or update client share link
  const handleGenerateOrUpdateLink = async (removePwd = false) => {
    setSavingPassword(true);
    setPasswordSuccess('');

    try {
      const res = await fetch(`/api/share/link/${projectId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          password: removePwd ? undefined : (newPassword.trim() || undefined),
          removePassword: removePwd,
        }),
      });

      const json = await res.json();
      if (json.data) {
        setShareToken(json.data.share_token);
        setHasPassword(json.data.has_password);
        setEnablePassword(json.data.has_password);
        setNewPassword('');
        setPasswordSuccess(removePwd ? 'Contraseña eliminada. Enlace público.' : 'Configuración de seguridad guardada con éxito.');
        setTimeout(() => setPasswordSuccess(''), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingPassword(false);
    }
  };

  // Publish to community templates
  const handlePublishTemplate = async () => {
    setPublishing(true);
    setPublishSuccess('');

    try {
      const res = await fetch(`/api/templates/publish/${projectId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category,
          description: templateDescription.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (json.data) {
        setIsTemplate(true);
        setPublishSuccess('¡Plantilla publicada en la comunidad con éxito!');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPublishing(false);
    }
  };

  const shareUrl = shareToken
    ? `${window.location.origin}/share/${shareToken}`
    : `${window.location.origin}/share/...`;

  const handleCopy = () => {
    if (!shareToken) {
      // If no token yet, generate one first
      handleGenerateOrUpdateLink().then(() => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/75 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="relative w-full max-w-xl bg-surface-raised border border-surface-edge rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-edge bg-surface/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-accent-blue/15 text-accent-blue flex items-center justify-center">
                <Share2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-primary">
                  Compartir & Colaborar
                </h3>
                <p className="text-2xs text-text-muted truncate max-w-xs">
                  {projectTitle || 'Proyecto sin título'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-surface-edge bg-surface/30 px-6">
            <button
              onClick={() => setTab('client')}
              className={clsx(
                'flex items-center gap-2 py-3 text-xs font-semibold border-b-2 transition-all mr-6',
                tab === 'client'
                  ? 'border-accent-blue text-accent-blue'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              )}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Enlace para Cliente & Aprobación</span>
            </button>
            <button
              onClick={() => setTab('template')}
              className={clsx(
                'flex items-center gap-2 py-3 text-xs font-semibold border-b-2 transition-all',
                tab === 'template'
                  ? 'border-accent-blue text-accent-blue'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              )}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Plantilla Comunitaria (PLG)</span>
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-text-muted">
                <Loader2 className="w-6 h-6 animate-spin text-accent-blue" />
                <span className="text-xs">Cargando enlaces y permisos...</span>
              </div>
            ) : tab === 'client' ? (
              /* TAB 1: CLIENT REVIEW & APPROVAL */
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-accent-blue/5 border border-accent-blue/20">
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Envía este enlace interactivo a tu cliente o productor para que revise el storyboard, reproduzca el <strong className="text-text-primary">Animatic en tiempo real</strong> y dé su <strong className="text-text-primary">Aprobación formal con 1 clic</strong> sin necesidad de registrarse.
                  </p>
                </div>

                {/* Status Badge */}
                {clientApproved === true && (
                  <div className="p-3 rounded-xl bg-accent-green/10 border border-accent-green/30 flex items-start gap-3 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-accent-green shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-accent-green">¡Storyboard Aprobado Formalmente por el Cliente!</p>
                      {clientFeedback && (
                        <p className="text-text-muted mt-1 text-2xs whitespace-pre-line font-mono bg-black/20 p-2 rounded-lg">
                          {clientFeedback}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {clientApproved === false && clientFeedback && (
                  <div className="p-3 rounded-xl bg-accent-amber/10 border border-accent-amber/30 flex items-start gap-3 text-xs">
                    <AlertCircle className="w-4 h-4 text-accent-amber shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-accent-amber">Revisión o Ajustes Solicitados:</p>
                      <p className="text-text-muted mt-1 text-2xs whitespace-pre-line font-mono bg-black/20 p-2 rounded-lg">
                        {clientFeedback}
                      </p>
                    </div>
                  </div>
                )}

                {/* Share Link Box */}
                <div>
                  <label className="block text-2xs uppercase tracking-wider font-semibold text-text-muted mb-1.5">
                    Enlace de Revisión de Solo Lectura
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2 bg-surface border border-surface-edge rounded-xl text-xs font-mono text-text-primary truncate">
                      {shareToken ? shareUrl : 'Se generará al pulsar copiar'}
                    </div>
                    <button
                      onClick={handleCopy}
                      className={clsx(
                        'px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 shadow-sm',
                        copied
                          ? 'bg-accent-green text-white'
                          : 'bg-accent-blue text-white hover:bg-accent-blue/90'
                      )}
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copiar Enlace
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Password Protection */}
                <div className="p-4 rounded-xl bg-surface border border-surface-edge space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-medium text-text-primary">
                      {hasPassword ? <Lock className="w-4 h-4 text-accent-amber" /> : <Unlock className="w-4 h-4 text-text-muted" />}
                      <span>Proteger acceso con Contraseña</span>
                    </div>
                    <button
                      onClick={() => setEnablePassword(!enablePassword)}
                      className={clsx(
                        'w-9 h-5 rounded-full transition-colors relative',
                        enablePassword ? 'bg-accent-blue' : 'bg-surface-edge'
                      )}
                    >
                      <motion.div
                        animate={{ x: enablePassword ? 18 : 2 }}
                        className="w-4 h-4 rounded-full bg-white absolute top-0.5"
                      />
                    </button>
                  </div>

                  {enablePassword && (
                    <div className="space-y-2 pt-2 border-t border-surface-edge/60">
                      <p className="text-2xs text-text-muted">
                        {hasPassword
                          ? 'Este enlace actualmente requiere contraseña. Puedes cambiarla o eliminarla.'
                          : 'Define una contraseña que tu cliente deberá ingresar antes de ver el proyecto.'}
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder={hasPassword ? 'Nueva contraseña (o deja vacío para mantener)' : 'Escribe una contraseña...'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-surface-raised border border-surface-edge rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
                        />
                        <button
                          onClick={() => handleGenerateOrUpdateLink(false)}
                          disabled={savingPassword || (!newPassword.trim() && !hasPassword)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-raised border border-surface-edge hover:border-accent-blue text-text-primary transition-all disabled:opacity-50"
                        >
                          {savingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Guardar'}
                        </button>
                        {hasPassword && (
                          <button
                            onClick={() => handleGenerateOrUpdateLink(true)}
                            disabled={savingPassword}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-accent-red hover:bg-accent-red/10 transition-colors"
                          >
                            Quitar
                          </button>
                        )}
                      </div>
                      {passwordSuccess && (
                        <p className="text-2xs text-accent-green flex items-center gap-1">
                          <Check className="w-3 h-3" /> {passwordSuccess}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Quick actions */}
                {shareToken && (
                  <div className="flex justify-end pt-1">
                    <a
                      href={shareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-accent-blue hover:underline font-medium"
                    >
                      <span>Abrir vista previa del cliente</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            ) : (
              /* TAB 2: COMMUNITY TEMPLATES */
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-accent-amber/5 border border-accent-amber/20">
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Comparte tu estructura narrativa, cámaras e iluminación en el <strong className="text-text-primary">Hub Público de Plantillas</strong>. Otros creadores podrán clonar tu proyecto como punto de partida.
                  </p>
                </div>

                {isTemplate ? (
                  <div className="p-4 rounded-xl bg-accent-green/10 border border-accent-green/30 space-y-3">
                    <div className="flex items-center gap-2 text-accent-green">
                      <Sparkles className="w-4 h-4 shrink-0" />
                      <span className="text-xs font-semibold">¡Este proyecto está publicado como Plantilla!</span>
                    </div>
                    <p className="text-2xs text-text-secondary">
                      Tu plantilla está disponible para toda la comunidad en la galería de plantillas públicas.
                    </p>
                    <a
                      href="/templates"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-blue hover:underline"
                    >
                      <span>Ver en la Galería de Plantillas</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ) : null}

                <div className="space-y-3">
                  <div>
                    <label className="block text-2xs uppercase tracking-wider font-semibold text-text-muted mb-1">
                      Categoría de Plantilla
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-surface-edge rounded-xl text-xs text-text-primary focus:outline-none focus:border-accent-blue"
                    >
                      {TEMPLATE_CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-2xs uppercase tracking-wider font-semibold text-text-muted mb-1">
                      Descripción para la comunidad (Opcional)
                    </label>
                    <textarea
                      rows={3}
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                      placeholder="Describe el formato, tono o intención de este storyboard (ej: Comercial 30s con estructura AIDA y planos dinámicos)..."
                      className="w-full px-3 py-2 bg-surface border border-surface-edge rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue resize-none"
                    />
                  </div>

                  {publishSuccess && (
                    <div className="p-2.5 rounded-lg bg-accent-green/10 text-accent-green text-xs flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      {publishSuccess}
                    </div>
                  )}

                  <button
                    onClick={handlePublishTemplate}
                    disabled={publishing}
                    className="w-full py-2.5 bg-accent-blue text-white rounded-xl text-xs font-semibold hover:bg-accent-blue/90 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {publishing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Publicando...
                      </>
                    ) : isTemplate ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Actualizar Plantilla Comunitaria
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" /> Publicar en el Hub de Plantillas
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 bg-surface/50 border-t border-surface-edge flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
            >
              Cerrar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
