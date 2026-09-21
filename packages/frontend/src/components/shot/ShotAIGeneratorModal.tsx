import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, X, Camera, Sun, Check, Loader2,
  RefreshCw, Wand2
} from 'lucide-react';
import type { Shot } from '@videoboard/shared';
import { api } from '../../api/client';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  open: boolean;
  onClose: () => void;
  shot: Shot;
  sceneId: string;
  projectId?: string;
  onGenerated?: (shot: any) => void;
}

type StyleOption = 'cinematic' | 'sketch' | 'anime' | 'noir' | '3d';

const STYLES: { id: StyleOption; title: string; desc: string; icon: string; badge: string }[] = [
  {
    id: 'cinematic',
    title: 'Cinemático 35mm',
    desc: 'Fotograma de película f/2.0 anamórfico, color Kodak 5219 y grano sutil.',
    icon: '🎬',
    badge: 'Realista',
  },
  {
    id: 'sketch',
    title: 'Boceto Storyboard',
    desc: 'Ilustración a lápiz/tinta de director, trazos limpios de preproducción.',
    icon: '✏️',
    badge: 'Boceto',
  },
  {
    id: 'anime',
    title: 'Anime Concept',
    desc: 'Acuarela digital de atmósfera cinematográfica estilo Makoto Shinkai.',
    icon: '🎨',
    badge: 'Concept Art',
  },
  {
    id: 'noir',
    title: 'Film Noir B&N',
    desc: 'Alto contraste blanco y negro, sombras duras e iluminación veneciana.',
    icon: '🕶️',
    badge: 'Clásico',
  },
  {
    id: '3d',
    title: 'Render 3D Unreal',
    desc: 'Previsualización volumétrica Octane / Unreal Engine 5 con ray tracing.',
    icon: '🧊',
    badge: '3D CGI',
  },
];

export function ShotAIGeneratorModal({ open, onClose, shot, sceneId, projectId, onGenerated }: Props) {
  const queryClient = useQueryClient();
  const [selectedStyle, setSelectedStyle] = useState<StyleOption>('cinematic');
  const [promptOverride, setPromptOverride] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<{
    imageUrl: string;
    prompt: string;
    style: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const res = await api.post<{
        shot: any;
        imageUrl: string;
        prompt: string;
        style: string;
        message: string;
      }>('/ai/generate-shot-image', {
        shotId: shot.id,
        sceneId,
        projectId,
        style: selectedStyle,
        promptOverride: promptOverride.trim() || undefined,
      });

      if (res && res.imageUrl) {
        setGeneratedResult({
          imageUrl: res.imageUrl,
          prompt: res.prompt,
          style: res.style,
        });

        // Invalidate shots query so canvas, timeline and list update immediately
        queryClient.invalidateQueries({ queryKey: ['shots', sceneId] });
        queryClient.invalidateQueries({ queryKey: ['shots'] });

        if (onGenerated && res.shot) {
          onGenerated(res.shot);
        }
      }
    } catch (err: any) {
      console.error('Error generando fotograma:', err);
      setError(err.message || 'Error al conectar con el motor de generación visual.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyAndClose = () => {
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-[#0e1017] border border-surface-edge rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-edge flex items-center justify-between bg-[#11131c]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-accent-blue to-accent-violet flex items-center justify-center shadow-lg shadow-accent-blue/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Generador de Fotogramas con IA
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent-blue/20 text-accent-blue border border-accent-blue/30">
                  FASE 2
                </span>
              </div>
              <p className="text-xs text-text-muted">
                {shot.name} &bull; Lente: {shot.lens || '35mm'} &bull; {shot.shot_type || 'Plano Medio'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-surface text-text-muted hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Style Selector */}
          <div className="space-y-2">
            <label className="text-2xs font-bold text-text-muted uppercase tracking-wider block">
              1. Selecciona el Estilo Visual del Storyboard
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {STYLES.map((st) => {
                const isSelected = selectedStyle === st.id;
                return (
                  <button
                    key={st.id}
                    onClick={() => setSelectedStyle(st.id)}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between group ${
                      isSelected
                        ? 'bg-accent-blue/15 border-accent-blue ring-1 ring-accent-blue text-white shadow-md'
                        : 'bg-surface/50 border-surface-edge text-text-muted hover:text-white hover:bg-surface'
                    }`}
                  >
                    <div>
                      <div className="text-2xl mb-1.5">{st.icon}</div>
                      <div className="text-xs font-bold truncate">{st.title}</div>
                      <p className="text-[10px] text-text-muted leading-tight mt-1 line-clamp-2">
                        {st.desc}
                      </p>
                    </div>
                    <span
                      className={`text-[9px] font-bold mt-2 self-start px-1.5 py-0.2 rounded ${
                        isSelected
                          ? 'bg-accent-blue text-white'
                          : 'bg-white/5 text-white/50 group-hover:text-white'
                      }`}
                    >
                      {st.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Technical Context Auto-Synthesis Card */}
          <div className="p-3.5 rounded-2xl bg-surface/40 border border-surface-edge space-y-2">
            <div className="flex items-center justify-between text-2xs text-text-muted font-bold uppercase tracking-wider">
              <span>Parámetros Técnicos Inyectados</span>
              <span className="text-accent-blue font-mono font-normal">Resolución: 16:9 (1280x720)</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-2xs">
              <span className="px-2 py-1 rounded-lg bg-surface-raised border border-surface-edge text-white font-mono flex items-center gap-1">
                <Camera className="w-3 h-3 text-accent-blue" />
                {shot.lens || '35mm'} &bull; {shot.shot_type || 'Plano Medio'}
              </span>
              {shot.movement && (
                <span className="px-2 py-1 rounded-lg bg-surface-raised border border-surface-edge text-white font-mono">
                  Mov: {shot.movement}
                </span>
              )}
              {shot.camera_letter && (
                <span className="px-2 py-1 rounded-lg bg-accent-violet/20 border border-accent-violet/30 text-accent-violet font-bold font-mono">
                  CÁM {shot.camera_letter}
                </span>
              )}
              {(shot as any).lighting_setup?.key && (
                <span className="px-2 py-1 rounded-lg bg-surface-raised border border-surface-edge text-accent-amber font-mono flex items-center gap-1">
                  <Sun className="w-3 h-3" />
                  {(shot as any).lighting_setup.key}
                </span>
              )}
            </div>
          </div>

          {/* Prompt description / override */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-2xs font-bold text-text-muted uppercase tracking-wider">
                2. Descripción de Acción o Diálogo (Opcional)
              </label>
              <span className="text-2xs text-text-muted">Personaliza o complementa la toma</span>
            </div>
            <textarea
              value={promptOverride}
              onChange={(e) => setPromptOverride(e.target.value)}
              placeholder={shot.description || 'Describe la acción, personajes, vestuario o ambiente específico...'}
              rows={2}
              className="w-full px-3.5 py-2.5 bg-surface rounded-xl border border-surface-edge text-xs text-white placeholder:text-text-muted focus:outline-none focus:border-accent-blue transition-colors resize-none"
            />
          </div>

          {/* Error notice */}
          {error && (
            <div className="p-3 rounded-xl bg-accent-red/10 border border-accent-red/30 text-accent-red text-xs">
              {error}
            </div>
          )}

          {/* Result Preview Box */}
          {generatedResult && (
            <div className="space-y-2 pt-2 border-t border-surface-edge">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-accent-green flex items-center gap-1.5">
                  <Check className="w-4 h-4" /> ¡Fotograma generado con éxito!
                </span>
                <span className="text-2xs text-text-muted font-mono">
                  Asignado como portada del storyboard
                </span>
              </div>
              <div className="aspect-video w-full rounded-2xl overflow-hidden border-2 border-accent-green/40 shadow-2xl relative group bg-black/60">
                <img
                  src={generatedResult.imageUrl}
                  alt="Fotograma IA Generado"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                  <p className="text-2xs text-white/90 line-clamp-2 italic font-mono">
                    &ldquo;{generatedResult.prompt}&rdquo;
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-surface-edge bg-[#11131c] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-text-muted hover:text-white hover:bg-surface transition-colors"
          >
            {generatedResult ? 'Cerrar' : 'Cancelar'}
          </button>

          <div className="flex items-center gap-2">
            {generatedResult ? (
              <>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="px-4 py-2 rounded-xl border border-surface-edge hover:bg-surface text-text-primary text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                  <span>Regenerar</span>
                </button>
                <button
                  onClick={handleApplyAndClose}
                  className="px-5 py-2 rounded-xl bg-accent-green text-white text-xs font-bold hover:bg-accent-green/90 transition-all flex items-center gap-1.5 shadow-lg shadow-accent-green/20"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar y Aplicar</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-accent-blue to-accent-violet text-white text-xs font-bold hover:opacity-95 transition-all flex items-center gap-2 shadow-lg shadow-accent-blue/25 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sintetizando Fotograma IA...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>Generar Fotograma IA</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
