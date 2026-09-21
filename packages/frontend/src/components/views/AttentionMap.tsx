import { useSceneStore } from '../../stores/useSceneStore';
import { Sparkles, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import type { AttentionPoint } from '@videoboard/shared';

export function AttentionMap() {
  const { scenes } = useSceneStore();
  const sorted = [...scenes].sort((a, b) => a.sort_order - b.sort_order);

  const totalDuration = Math.max(
    sorted.reduce((acc, s) => acc + s.estimated_duration_secs, 0),
    60
  );

  // Generate simulated attention points
  const points: AttentionPoint[] = [];
  let currentSecond = 0;

  sorted.forEach((scene) => {
    // Base attention score based on scene properties
    let score = 0.65; // baseline

    if (scene.hook_type) score += 0.2;
    if (scene.emotion === 'urgent' || scene.emotion === 'epic') score += 0.1;
    if (scene.priority === 'critical' || scene.priority === 'high') score += 0.1;
    if (scene.emotion === 'serious' || scene.emotion === 'technical') score -= 0.1;
    if (scene.estimated_duration_secs > 30) score -= 0.05; // long scenes lose attention

    score = Math.max(0, Math.min(1, score));

    const risk = score < 0.4 ? 'high' as const : score < 0.6 ? 'medium' as const : 'low' as const;

    points.push({
      second: currentSecond + scene.estimated_duration_secs / 2,
      score,
      risk,
      suggestion: risk === 'high'
        ? 'Añade un hook o elemento visual para recuperar atención'
        : risk === 'medium'
        ? 'Considera acortar o añadir dinamismo'
        : undefined,
    });

    currentSecond += scene.estimated_duration_secs;
  });

  const chartWidth = 800;
  const chartHeight = 160;
  const paddingX = 60;
  const paddingY = 30;

  const scaleX = (sec: number) => paddingX + (sec / totalDuration) * (chartWidth - paddingX * 2);
  const scaleY = (val: number) => chartHeight - paddingY - val * (chartHeight - paddingY * 2);

  const getColor = (score: number) => {
    if (score >= 0.7) return '#10B981';
    if (score >= 0.4) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <div className="h-full overflow-y-auto bg-surface">
      <div className="max-w-4xl mx-auto py-12 px-8">
        <h2 className="text-lg font-bold text-text-primary mb-2">Mapa de Atención</h2>
        <p className="text-sm text-text-muted mb-8">
          La IA estima en qué segundos el espectador podría perder interés y propone mejoras.
        </p>

        <div className="bg-surface-raised rounded-2xl border border-surface-edge p-6 overflow-x-auto">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 100}`} className="w-full" style={{ minWidth: 700 }}>
            {/* Danger zone */}
            <rect
              x={paddingX}
              y={scaleY(0.4)}
              width={chartWidth - paddingX * 2}
              height={scaleY(0) - scaleY(0.4)}
              fill="#EF4444"
              opacity={0.05}
            />

            {/* Warning zone */}
            <rect
              x={paddingX}
              y={scaleY(0.7)}
              width={chartWidth - paddingX * 2}
              height={scaleY(0.4) - scaleY(0.7)}
              fill="#F59E0B"
              opacity={0.05}
            />

            {/* Bars */}
            {points.map((p, i) => {
              const barWidth = Math.max(20, (chartWidth - paddingX * 2) / points.length - 4);
              const x = scaleX(p.second) - barWidth / 2;
              return (
                <g key={i}>
                  <rect
                    x={x}
                    y={scaleY(p.score)}
                    width={barWidth}
                    height={chartHeight - paddingY - scaleY(p.score)}
                    rx={3}
                    fill={getColor(p.score)}
                    opacity={0.7}
                  />
                  {/* Risk indicator */}
                  {p.risk !== 'low' && (
                    <g transform={`translate(${x + barWidth / 2}, ${scaleY(p.score) - 18})`}>
                      {p.risk === 'high' ? (
                        <AlertTriangle className="w-3 h-3 text-accent-red" />
                      ) : (
                        <AlertCircle className="w-3 h-3 text-accent-amber" />
                      )}
                    </g>
                  )}
                </g>
              );
            })}

            <line x1={paddingX} y1={chartHeight - paddingY} x2={chartWidth - paddingX} y2={chartHeight - paddingY} stroke="#1F1F23" />
          </svg>
        </div>

        {/* Alerts */}
        <div className="mt-6 space-y-2">
          {points.filter(p => p.risk !== 'low').map((p, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 rounded-xl border"
              style={{
                backgroundColor: p.risk === 'high' ? '#EF444410' : '#F59E0B10',
                borderColor: p.risk === 'high' ? '#EF444420' : '#F59E0B20',
              }}
            >
              {p.risk === 'high' ? (
                <AlertTriangle className="w-4 h-4 text-accent-red shrink-0 mt-0.5" />
              ) : (
                <Info className="w-4 h-4 text-accent-amber shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-xs font-medium text-text-primary">
                  {p.risk === 'high' ? 'Riesgo alto de pérdida de atención' : 'Atención moderada'}
                </p>
                <p className="text-2xs text-text-muted mt-0.5">
                  En el segundo {Math.round(p.second)} · {p.suggestion}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 rounded-xl bg-accent-blue/5 border border-accent-blue/10 text-center">
          <Sparkles className="w-4 h-4 text-accent-blue inline mr-1.5 -mt-0.5" />
          <span className="text-xs text-text-secondary">
            La IA completa analizará ritmo, retención y propondrá mejoras específicas
          </span>
        </div>
      </div>
    </div>
  );
}
