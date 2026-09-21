import { useSceneStore } from '../../stores/useSceneStore';
import { Sparkles } from 'lucide-react';
import type { EmotionPoint } from '@videoboard/shared';

const emotionColors: Record<string, string> = {
  inspiring: '#10B981',
  urgent: '#EF4444',
  funny: '#F59E0B',
  epic: '#8B5CF6',
  serious: '#3B82F6',
  technical: '#06B6D4',
};

const emotionLabels: Record<string, string> = {
  inspiring: 'Inspirador',
  urgent: 'Urgente',
  funny: 'Divertido',
  epic: 'Épico',
  serious: 'Serio',
  technical: 'Técnico',
};

export function EmotionMap() {
  const { scenes } = useSceneStore();
  const sorted = [...scenes].sort((a, b) => a.sort_order - b.sort_order);

  const totalDuration = Math.max(
    sorted.reduce((acc, s) => acc + s.estimated_duration_secs, 0),
    60
  );

  // Generate emotion points from scenes
  const points: (EmotionPoint & { color: string; label: string })[] = [];
  let currentSecond = 0;

  sorted.forEach((scene) => {
    const intensity = scene.priority === 'critical' ? 0.9
      : scene.priority === 'high' ? 0.75
      : scene.priority === 'medium' ? 0.5
      : 0.3;

    const emotion = scene.emotion || 'serious';

    points.push({
      second: currentSecond,
      value: intensity,
      emotion,
      color: emotionColors[emotion] || '#3B82F6',
      label: scene.title,
    });

    currentSecond += scene.estimated_duration_secs;

    // Add mid-point for curve
    points.push({
      second: currentSecond - scene.estimated_duration_secs / 2,
      value: intensity + 0.1,
      emotion,
      color: emotionColors[emotion] || '#3B82F6',
      label: '',
    });
  });

  const chartWidth = 800;
  const chartHeight = 200;
  const paddingX = 60;
  const paddingY = 30;

  const scaleX = (sec: number) => paddingX + (sec / totalDuration) * (chartWidth - paddingX * 2);
  const scaleY = (val: number) => chartHeight - paddingY - val * (chartHeight - paddingY * 2);

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.second)} ${scaleY(p.value)}`)
    .join(' ');

  return (
    <div className="h-full overflow-y-auto bg-surface">
      <div className="max-w-4xl mx-auto py-12 px-8">
        <h2 className="text-lg font-bold text-text-primary mb-2">Mapa Emocional</h2>
        <p className="text-sm text-text-muted mb-8">
          Visualiza cómo fluctúa la emoción durante tu video. La IA detecta caídas de ritmo, aburrimiento y exceso de explicación.
        </p>

        {/* Chart */}
        <div className="bg-surface-raised rounded-2xl border border-surface-edge p-6 overflow-x-auto">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full" style={{ minWidth: 700 }}>
            {/* Grid lines */}
            {[0.25, 0.5, 0.75, 1.0].map((val) => (
              <line
                key={val}
                x1={paddingX}
                y1={scaleY(val)}
                x2={chartWidth - paddingX}
                y2={scaleY(val)}
                stroke="#1F1F23"
                strokeWidth={0.5}
                strokeDasharray="4,4"
              />
            ))}

            {/* Y-axis labels */}
            <text x={paddingX - 10} y={scaleY(0) + 4} textAnchor="end" className="text-2xs" fill="#71717A">0</text>
            <text x={paddingX - 10} y={scaleY(0.5) + 4} textAnchor="end" className="text-2xs" fill="#71717A">50%</text>
            <text x={paddingX - 10} y={scaleY(1) + 4} textAnchor="end" className="text-2xs" fill="#71717A">100%</text>

            {/* Emotion curve */}
            <defs>
              <linearGradient id="emotionGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Area fill */}
            <path
              d={`${linePath} L ${scaleX(totalDuration)} ${scaleY(0)} L ${scaleX(0)} ${scaleY(0)} Z`}
              fill="url(#emotionGrad)"
            />

            {/* Line */}
            <path
              d={linePath}
              fill="none"
              stroke="url(#emotionGrad)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-lg"
              style={{ filter: 'drop-shadow(0 0 6px rgba(139, 92, 246, 0.3))' }}
            />

            {/* Data points */}
            {points.filter(p => p.label).map((p, i) => (
              <g key={i}>
                <circle
                  cx={scaleX(p.second)}
                  cy={scaleY(p.value)}
                  r={4}
                  fill={p.color}
                  stroke="#0A0A0B"
                  strokeWidth={2}
                />
                {p.label && (
                  <text
                    x={scaleX(p.second)}
                    y={scaleY(p.value) - 12}
                    textAnchor="middle"
                    className="text-2xs"
                    fill="#A1A1AA"
                  >
                    {p.label}
                  </text>
                )}
              </g>
            ))}

            {/* X-axis */}
            <line
              x1={paddingX}
              y1={chartHeight - paddingY}
              x2={chartWidth - paddingX}
              y2={chartHeight - paddingY}
              stroke="#1F1F23"
              strokeWidth={1}
            />

            {/* Time markers */}
            {Array.from({ length: Math.ceil(totalDuration / 10) + 1 }).map((_, i) => (
              <text
                key={i}
                x={scaleX(i * 10)}
                y={chartHeight - 8}
                textAnchor="middle"
                className="text-2xs"
                fill="#71717A"
              >
                {i * 10}s
              </text>
            ))}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4">
          {Object.entries(emotionColors).map(([emotion, color]) => (
            <div key={emotion} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-2xs text-text-muted">{emotionLabels[emotion]}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 rounded-xl bg-accent-blue/5 border border-accent-blue/10 text-center">
          <Sparkles className="w-4 h-4 text-accent-blue inline mr-1.5 -mt-0.5" />
          <span className="text-xs text-text-secondary">
            La IA analizará el ritmo y detectará zonas de aburrimiento, caídas de ritmo y exceso de explicación
          </span>
        </div>
      </div>
    </div>
  );
}
