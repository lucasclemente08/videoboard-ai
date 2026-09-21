import type { Scene } from '@videoboard/shared';

interface Props {
  scene: Scene;
  onUpdate: (data: Partial<Scene>) => void;
}

export function StorytellingPanel({ scene, onUpdate }: Props) {
  const fields = [
    { key: 'storytelling_problem', label: 'Problema', placeholder: '¿Qué problema enfrenta el espectador?' },
    { key: 'storytelling_conflict', label: 'Conflicto', placeholder: '¿Qué tensión o conflicto existe?' },
    { key: 'storytelling_solution', label: 'Solución', placeholder: '¿Cómo se resuelve?' },
    { key: 'storytelling_benefit', label: 'Beneficio', placeholder: '¿Qué gana el espectador?' },
    { key: 'storytelling_closing', label: 'Cierre', placeholder: '¿Cómo termina esta historia?' },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="p-3 rounded-xl bg-accent-blue/5 border border-accent-blue/10">
        <p className="text-2xs text-text-muted leading-relaxed">
          Define la estructura narrativa de esta escena. Una buena historia tiene problema, conflicto y solución.
        </p>
      </div>

      {fields.map(({ key, label, placeholder }) => (
        <div key={key}>
          <label className="block text-2xs font-medium text-text-muted mb-1">{label}</label>
          <input
            type="text"
            value={(scene as any)[key] || ''}
            onChange={(e) => onUpdate({ [key]: e.target.value })}
            className="w-full px-3 py-2 bg-surface border border-surface-edge rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-all"
            placeholder={placeholder}
          />
        </div>
      ))}
    </div>
  );
}
