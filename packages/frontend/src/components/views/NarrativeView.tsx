import { motion } from 'framer-motion';
import { ArrowDown, Sparkles } from 'lucide-react';
import { useSceneStore } from '../../stores/useSceneStore';
import type { Scene } from '@videoboard/shared';

const narrativeFlow = [
  { key: 'hook', label: 'HOOK', emoji: '🎣', desc: 'Atrapa la atención', color: '#F59E0B' },
  { key: 'problem', label: 'PROBLEMA', emoji: '⚠️', desc: 'Identifica el dolor', color: '#EF4444' },
  { key: 'conflict', label: 'CONFLICTO', emoji: '⚔️', desc: 'Eleva la tensión', color: '#F97316' },
  { key: 'solution', label: 'SOLUCIÓN', emoji: '💡', desc: 'Presenta la respuesta', color: '#10B981' },
  { key: 'evidence', label: 'EVIDENCIA', emoji: '📊', desc: 'Prueba que funciona', color: '#3B82F6' },
  { key: 'cta', label: 'CTA', emoji: '🎯', desc: 'Llama a la acción', color: '#8B5CF6' },
  { key: 'closing', label: 'FINAL', emoji: '🏁', desc: 'Cierre memorable', color: '#EC4899' },
];

function mapSceneToNarrative(scene: Scene): string | null {
  if (scene.hook_type) return 'hook';
  if (scene.storytelling_problem) return 'problem';
  if (scene.storytelling_conflict) return 'conflict';
  if (scene.storytelling_solution) return 'solution';
  if (scene.storytelling_benefit) return 'evidence';
  if (scene.scene_type === 'cta') return 'cta';
  if (scene.storytelling_closing || scene.scene_type === 'outro') return 'closing';
  return null;
}

export function NarrativeView() {
  const { scenes } = useSceneStore();

  // Group scenes by narrative stage
  const grouped = narrativeFlow.map((stage) => ({
    ...stage,
    scenes: scenes
      .filter((s) => mapSceneToNarrative(s) === stage.key)
      .sort((a, b) => a.sort_order - b.sort_order),
  }));

  return (
    <div className="h-full overflow-y-auto bg-surface">
      <div className="max-w-2xl mx-auto py-12 px-8">
        <h2 className="text-lg font-bold text-text-primary mb-2">Vista Narrativa</h2>
        <p className="text-sm text-text-muted mb-8">
          La estructura de tu video según el viaje emocional del espectador.
        </p>

        <div className="space-y-6">
          {grouped.map((stage, i) => (
            <div key={stage.key}>
              {/* Stage header */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                  style={{ backgroundColor: stage.color + '20', color: stage.color }}
                >
                  {stage.emoji}
                </div>
                <div>
                  <h3 className="text-sm font-bold" style={{ color: stage.color }}>
                    {stage.label}
                  </h3>
                  <p className="text-2xs text-text-muted">{stage.desc}</p>
                </div>
                <div className="flex-1 h-px ml-2" style={{ backgroundColor: stage.color + '30' }} />
              </div>

              {/* Stage scenes */}
              {stage.scenes.length > 0 ? (
                <div className="space-y-2 pl-11">
                  {stage.scenes.map((scene) => (
                    <motion.div
                      key={scene.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-3 rounded-xl border transition-all"
                      style={{
                        backgroundColor: stage.color + '08',
                        borderColor: stage.color + '20',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: scene.color }} />
                        <span className="text-xs font-medium text-text-primary">{scene.title}</span>
                        <span className="text-2xs text-text-muted ml-auto">{scene.estimated_duration_secs}s</span>
                      </div>
                      {scene.description && (
                        <p className="text-2xs text-text-muted mt-1 line-clamp-1">{scene.description}</p>
                      )}
                    </motion.div>
                  ))}

                  {/* Connector arrow */}
                  {i < narrativeFlow.length - 1 && (
                    <div className="flex justify-center py-1">
                      <ArrowDown className="w-4 h-4 text-text-muted" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="pl-11">
                  <div className="p-3 rounded-xl border border-dashed border-surface-edge text-center">
                    <span className="text-2xs text-text-muted">
                      Sin escenas asignadas
                    </span>
                  </div>
                  {i < narrativeFlow.length - 1 && (
                    <div className="flex justify-center py-1">
                      <ArrowDown className="w-4 h-4 text-text-muted" />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 rounded-xl bg-accent-blue/5 border border-accent-blue/10 text-center">
          <Sparkles className="w-4 h-4 text-accent-blue inline mr-1.5 -mt-0.5" />
          <span className="text-xs text-text-secondary">
            Usa IA para analizar y optimizar tu estructura narrativa
          </span>
        </div>
      </div>
    </div>
  );
}
