import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from 'reactflow';

export function ConnectionLine({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  style = {}, markerEnd, label, data, selected,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
    borderRadius: 10,
  });

  const transitionLabel = label || '';
  const connStyle = {
    ...style,
    strokeWidth: selected ? 3.5 : (style.strokeWidth || 2.5),
  };

  return (
    <>
      {/* Glow effect when selected */}
      {selected && (
        <path
          d={edgePath}
          fill="none"
          stroke={(style.stroke as string) || '#3B82F6'}
          strokeWidth={8}
          strokeLinecap="round"
          opacity={0.15}
        />
      )}
      <BaseEdge id={id} path={edgePath} style={connStyle} markerEnd={markerEnd} />
      {transitionLabel && (
        <EdgeLabelRenderer>
          <div
            className="absolute pointer-events-none select-none"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            <div
              className="px-2 py-0.5 rounded-full text-[9px] font-medium shadow-lg"
              style={{
                background: selected ? 'rgba(59,130,246,0.2)' : '#141416',
                color: selected ? '#60A5FA' : '#A1A1AA',
                border: selected ? '1px solid rgba(59,130,246,0.3)' : '1px solid #1F1F23',
                whiteSpace: 'nowrap',
                backdropFilter: 'blur(8px)',
              }}
            >
              {transitionLabel}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
