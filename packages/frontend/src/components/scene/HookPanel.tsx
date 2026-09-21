import { clsx } from 'clsx';
import type { Scene, HookType } from '@videoboard/shared';

interface Props {
  scene: Scene;
  onUpdate: (data: Partial<Scene>) => void;
}

const hookTypes: { value: HookType; label: string; emoji: string; desc: string }[] = [
  { value: 'question', label: 'Pregunta', emoji: '❓', desc: 'Plantea una pregunta intrigante' },
  { value: 'fact', label: 'Dato', emoji: '📊', desc: 'Un dato sorprendente o poco conocido' },
  { value: 'shock', label: 'Shock', emoji: '⚡', desc: 'Algo impactante o inesperado' },
  { value: 'story', label: 'Historia', emoji: '📖', desc: 'Empieza contando una historia' },
  { value: 'curiosity', label: 'Curiosidad', emoji: '🔍', desc: 'Despierta la curiosidad' },
  { value: 'cta', label: 'CTA', emoji: '🎯', desc: 'Llamado a la acción directo' },
];

export function HookPanel({ scene, onUpdate }: Props) {
  return (
    <div className="p-4 space-y-4">
      <div>
        <label className="block text-2xs font-medium text-text-muted mb-2">Tipo de Hook</label>
        <div className="space-y-1.5">
          {hookTypes.map((hook) => (
            <button
              key={hook.value}
              onClick={() => onUpdate({ hook_type: scene.hook_type === hook.value ? null : hook.value })}
              className={clsx(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all',
                scene.hook_type === hook.value
                  ? 'bg-accent-blue/10 border border-accent-blue/20'
                  : 'bg-surface border border-surface-edge hover:border-surface-hover'
              )}
            >
              <span className="text-lg">{hook.emoji}</span>
              <div>
                <p className={clsx(
                  'text-xs font-medium',
                  scene.hook_type === hook.value ? 'text-accent-blue' : 'text-text-primary'
                )}>
                  {hook.label}
                </p>
                <p className="text-2xs text-text-muted">{hook.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-2xs font-medium text-text-muted mb-1">Texto del Hook</label>
        <textarea
          value={scene.hook_text || ''}
          onChange={(e) => onUpdate({ hook_text: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 bg-surface border border-surface-edge rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-all resize-none"
          placeholder="Escribe el hook que atrapará a tu audiencia..."
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-2xs font-medium text-text-muted mb-1">Ubicación</label>
          <select
            value={scene.hook_location || 'start'}
            onChange={(e) => onUpdate({ hook_location: e.target.value as any })}
            className="w-full px-3 py-2 bg-surface border border-surface-edge rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-all"
          >
            <option value="start">Inicio</option>
            <option value="middle">Medio</option>
            <option value="end">Final</option>
          </select>
        </div>
        <div>
          <label className="block text-2xs font-medium text-text-muted mb-1">Duración (seg)</label>
          <input
            type="number"
            value={scene.hook_duration_secs || ''}
            onChange={(e) => onUpdate({ hook_duration_secs: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 bg-surface border border-surface-edge rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-all"
          />
        </div>
      </div>
    </div>
  );
}
