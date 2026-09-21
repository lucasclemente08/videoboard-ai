import type { Scene } from '@videoboard/shared';

interface Props {
  scene: Scene;
  onUpdate: (data: Partial<Scene>) => void;
}

const languages = ['es', 'en', 'pt', 'fr', 'de', 'it', 'ja', 'ko'];

export function NarrationPanel({ scene, onUpdate }: Props) {
  return (
    <div className="p-4 space-y-4">
      <div>
        <label className="block text-2xs font-medium text-text-muted mb-1">Texto de narración</label>
        <textarea
          value={scene.narration_text || ''}
          onChange={(e) => onUpdate({ narration_text: e.target.value })}
          rows={5}
          className="w-full px-3 py-2 bg-surface border border-surface-edge rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-all resize-none"
          placeholder="Texto que leerá el narrador..."
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-2xs font-medium text-text-muted mb-1">Duración estimada (seg)</label>
          <input
            type="number"
            value={scene.narration_duration_secs || ''}
            onChange={(e) => onUpdate({ narration_duration_secs: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 bg-surface border border-surface-edge rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-all"
          />
        </div>
        <div>
          <label className="block text-2xs font-medium text-text-muted mb-1">Velocidad</label>
          <select
            value={scene.narration_speed || 1.0}
            onChange={(e) => onUpdate({ narration_speed: parseFloat(e.target.value) })}
            className="w-full px-3 py-2 bg-surface border border-surface-edge rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-all"
          >
            <option value="0.75">0.75x (Lento)</option>
            <option value="0.9">0.9x</option>
            <option value="1.0">1.0x (Normal)</option>
            <option value="1.1">1.1x</option>
            <option value="1.25">1.25x (Rápido)</option>
            <option value="1.5">1.5x</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-2xs font-medium text-text-muted mb-1">Idioma</label>
          <select
            value={scene.narration_language || 'es'}
            onChange={(e) => onUpdate({ narration_language: e.target.value })}
            className="w-full px-3 py-2 bg-surface border border-surface-edge rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-all"
          >
            {languages.map((lang) => (
              <option key={lang} value={lang}>{lang.toUpperCase()}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-2xs font-medium text-text-muted mb-1">Locutor</label>
          <input
            type="text"
            value={scene.narrator || ''}
            onChange={(e) => onUpdate({ narrator: e.target.value })}
            className="w-full px-3 py-2 bg-surface border border-surface-edge rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-all"
            placeholder="Nombre del locutor"
          />
        </div>
      </div>
    </div>
  );
}
