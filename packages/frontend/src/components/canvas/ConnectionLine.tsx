import { useCallback, useState } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, Position, useStore, type EdgeProps } from 'reactflow';
import { X } from 'lucide-react';
import { useDeleteConnection } from '../../api/hooks';
import { useSceneStore } from '../../stores/useSceneStore';
import { useCanvasStore } from '../../stores/useCanvasStore';

function getSmartEdgeParams(sourceNode: any, targetNode: any) {
  const sx = sourceNode.positionAbsolute?.x ?? sourceNode.position?.x ?? 0;
  const sy = sourceNode.positionAbsolute?.y ?? sourceNode.position?.y ?? 0;
  const sw = sourceNode.width || sourceNode.style?.width || 320;
  const sh = sourceNode.height || sourceNode.style?.height || 180;

  const tx = targetNode.positionAbsolute?.x ?? targetNode.position?.x ?? 0;
  const ty = targetNode.positionAbsolute?.y ?? targetNode.position?.y ?? 0;
  const tw = targetNode.width || targetNode.style?.width || 320;
  const th = targetNode.height || targetNode.style?.height || 180;

  const sCenter = { x: sx + sw / 2, y: sy + sh / 2 };
  const tCenter = { x: tx + tw / 2, y: ty + th / 2 };

  const dx = tCenter.x - sCenter.x;
  const dy = tCenter.y - sCenter.y;

  // Normalized by dimensions to account for rectangular aspect ratio (320x180)
  const normX = dx / (sw / 2);
  const normY = dy / (sh / 2);

  // Check bounding box overlap
  const overlapX = Math.max(sx, tx) < Math.min(sx + sw, tx + tw);
  const overlapY = Math.max(sy, ty) < Math.min(sy + sh, ty + th);

  if (overlapX && !overlapY) {
    // Pure vertical alignment
    if (dy >= 0) {
      return {
        sourceX: sCenter.x, sourceY: sy + sh,
        targetX: tCenter.x, targetY: ty,
        sourcePosition: Position.Bottom, targetPosition: Position.Top,
      };
    } else {
      return {
        sourceX: sCenter.x, sourceY: sy,
        targetX: tCenter.x, targetY: ty + th,
        sourcePosition: Position.Top, targetPosition: Position.Bottom,
      };
    }
  }

  if (overlapY && !overlapX) {
    // Pure horizontal alignment
    if (dx >= 0) {
      return {
        sourceX: sx + sw, sourceY: sCenter.y,
        targetX: tx, targetY: tCenter.y,
        sourcePosition: Position.Right, targetPosition: Position.Left,
      };
    } else {
      return {
        sourceX: sx, sourceY: sCenter.y,
        targetX: tx + tw, targetY: tCenter.y,
        sourcePosition: Position.Left, targetPosition: Position.Right,
      };
    }
  }

  // Standard directional dominance
  if (Math.abs(normX) >= Math.abs(normY)) {
    if (dx >= 0) {
      return {
        sourceX: sx + sw, sourceY: sCenter.y,
        targetX: tx, targetY: tCenter.y,
        sourcePosition: Position.Right, targetPosition: Position.Left,
      };
    } else {
      return {
        sourceX: sx, sourceY: sCenter.y,
        targetX: tx + tw, targetY: tCenter.y,
        sourcePosition: Position.Left, targetPosition: Position.Right,
      };
    }
  } else {
    if (dy >= 0) {
      return {
        sourceX: sCenter.x, sourceY: sy + sh,
        targetX: tCenter.x, targetY: ty,
        sourcePosition: Position.Bottom, targetPosition: Position.Top,
      };
    } else {
      return {
        sourceX: sCenter.x, sourceY: sy,
        targetX: tCenter.x, targetY: ty + th,
        sourcePosition: Position.Top, targetPosition: Position.Bottom,
      };
    }
  }
}

export function ConnectionLine({
  id, source, target,
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  style = {}, markerEnd, label, selected,
}: EdgeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const deleteConnection = useDeleteConnection();
  const { connections, setConnections } = useSceneStore();

  const sourceNode = useStore(useCallback((store) => store.nodeInternals.get(source), [source]));
  const targetNode = useStore(useCallback((store) => store.nodeInternals.get(target), [target]));

  let coords = {
    sourceX, sourceY,
    targetX, targetY,
    sourcePosition, targetPosition,
  };

  if (sourceNode && targetNode) {
    coords = getSmartEdgeParams(sourceNode, targetNode);
  }

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: coords.sourceX,
    sourceY: coords.sourceY,
    sourcePosition: coords.sourcePosition,
    targetX: coords.targetX,
    targetY: coords.targetY,
    targetPosition: coords.targetPosition,
    curvature: 0.28,
  });

  const transitionLabel = label || '';
  const strokeColor = (style.stroke as string) || '#3B82F6';
  const connStyle = {
    ...style,
    stroke: isHovered || selected ? '#60A5FA' : strokeColor,
    strokeWidth: selected ? 3.5 : isHovered ? 3 : (style.strokeWidth || 2.5),
    transition: 'stroke 0.2s, stroke-width 0.2s',
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteConnection.mutate(id);
    setConnections(connections.filter(c => c.id !== id));
    useCanvasStore.getState().setSelectedEdges([]);
  };

  return (
    <g
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="cursor-pointer"
    >
      {/* Invisible wider path for effortless hovering and clicking */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={24}
        className="cursor-pointer"
      />

      {/* Glow aura on select or hover */}
      {(selected || isHovered) && (
        <path
          d={edgePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth={10}
          strokeLinecap="round"
          opacity={selected ? 0.25 : 0.15}
          className="transition-opacity duration-200"
        />
      )}

      <BaseEdge id={id} path={edgePath} style={connStyle} markerEnd={markerEnd} />

      {/* Interactive label & action pill */}
      <EdgeLabelRenderer>
        <div
          className="absolute select-none group"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold shadow-xl transition-all duration-200 ${
              selected || isHovered
                ? 'bg-surface-raised border border-accent-blue text-accent-blue shadow-accent-blue/20 scale-105'
                : 'bg-surface-raised/95 border border-surface-edge text-text-secondary hover:border-surface-hover hover:text-text-primary'
            }`}
            style={{ backdropFilter: 'blur(8px)' }}
          >
            <span>{transitionLabel || 'Corte'}</span>

            {(selected || isHovered) && (
              <button
                onClick={handleDelete}
                title="Eliminar conexión"
                className="w-3.5 h-3.5 rounded-full bg-accent-red/20 hover:bg-accent-red text-accent-red hover:text-white flex items-center justify-center transition-colors ml-0.5"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </g>
  );
}
