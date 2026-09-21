import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Film, Clock, GripVertical, Link2, Upload, Mic, Target, Heart } from 'lucide-react';
import { clsx } from 'clsx';
import { useState, useCallback } from 'react';
import type { Scene } from '@videoboard/shared';
import { useUpdateScene } from '../../api/hooks';
import { useZoomLevel } from '../../hooks/useZoomLevel';
import { mediaDragState } from '../../services/eventBus';

const priorityColors: Record<string, string> = {
  low: 'bg-text-muted', medium: 'bg-accent-blue', high: 'bg-accent-amber', critical: 'bg-accent-red',
};
const emotionEmojis: Record<string, string> = {
  inspiring: '✨', urgent: '⚡', funny: '😂', epic: '🔥', serious: '🎯', technical: '⚙️',
};

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: 'Borrador', color: 'bg-zinc-500/20 text-zinc-400' },
  writing: { label: 'Guion', color: 'bg-accent-blue/20 text-accent-blue' },
  ready: { label: 'Aprobada', color: 'bg-accent-green/20 text-accent-green' },
  shooting: { label: 'Rodaje', color: 'bg-accent-violet/20 text-accent-violet' },
  done: { label: 'Listo', color: 'bg-emerald-500/20 text-emerald-400' },
};

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url) || url.includes('pexels.com') || url.startsWith('/uploads/');
}

export const SceneNode = memo(({ data, selected }: NodeProps) => {
  const scene = data.scene as Scene;
  const [dragOver, setDragOver] = useState(false);
  const updateScene = useUpdateScene();
  const zoom = useZoomLevel();
  const hasImage = scene.description && isImageUrl(scene.description);

  // Semantic zoom levels
  const showCompact = zoom < 0.4;
  const showFull = zoom > 0.7;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(true);
  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(false);
  }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(false);
    let media = mediaDragState.current;
    if (!media) {
      try {
        const raw = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
        if (raw) media = JSON.parse(raw);
      } catch { /* ignore */ }
    }
    mediaDragState.current = null;
    if (!media) return;
    // Update directly
    updateScene.mutate({ id: scene.id, description: media.url || media.thumb || '' });
  }, [scene.id, updateScene]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={clsx(
        'relative rounded-xl border-2 transition-all duration-200 bg-surface-raised border-surface-edge',
        selected && 'border-accent-blue ring-2 ring-accent-blue/30 shadow-lg',
        dragOver && 'border-accent-green ring-2 ring-accent-green/30 bg-accent-green/5',
        'hover:border-surface-hover group'
      )}
      style={{ width: scene.width || 320, minHeight: scene.height || (hasImage ? 220 : 160) }}
    >
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ backgroundColor: scene.color }} />

      {/* Handles */}
      <Handle type="source" position={Position.Right} id="right"
        className="!w-3.5 !h-3.5 !bg-accent-blue !border-2 !border-surface-raised !rounded-full opacity-0 group-hover:opacity-100 !-right-1.5 transition-all hover:!scale-125 hover:!ring-4 hover:!ring-accent-blue/30 shadow-md cursor-crosshair z-10" />
      <Handle type="target" position={Position.Left} id="left"
        className="!w-3.5 !h-3.5 !bg-accent-blue !border-2 !border-surface-raised !rounded-full opacity-0 group-hover:opacity-100 !-left-1.5 transition-all hover:!scale-125 hover:!ring-4 hover:!ring-accent-blue/30 shadow-md cursor-crosshair z-10" />
      <Handle type="target" position={Position.Top} id="top"
        className="!w-3.5 !h-3.5 !bg-accent-blue !border-2 !border-surface-raised !rounded-full opacity-0 group-hover:opacity-100 !-top-1.5 transition-all hover:!scale-125 hover:!ring-4 hover:!ring-accent-blue/30 shadow-md cursor-crosshair z-10" />
      <Handle type="source" position={Position.Bottom} id="bottom"
        className="!w-3.5 !h-3.5 !bg-accent-blue !border-2 !border-surface-raised !rounded-full opacity-0 group-hover:opacity-100 !-bottom-1.5 transition-all hover:!scale-125 hover:!ring-4 hover:!ring-accent-blue/30 shadow-md cursor-crosshair z-10" />

      {showCompact ? (
        /* COMPACT — just title and color bar */
        <div className="p-2 pt-3 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: scene.color }} />
          <h3 className="text-xs font-semibold text-text-primary truncate">{scene.title || 'Sin título'}</h3>
          {scene.estimated_duration_secs > 0 && <span className="text-2xs text-text-muted ml-auto">{scene.estimated_duration_secs}s</span>}
        </div>
      ) : (
        <>
          {/* Image preview */}
          {hasImage && (
            <div className="w-full h-24 overflow-hidden">
              <img src={scene.description!} alt={scene.title} className="w-full h-full object-cover opacity-60 hover:opacity-80 transition-opacity" loading="lazy" />
            </div>
          )}

          <div className="p-3 pt-4">
            <div className="flex items-start justify-between mb-1">
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <Film className="w-3.5 h-3.5 text-text-muted shrink-0" />
                <h3 className="text-xs font-semibold text-text-primary truncate">{scene.title || 'Sin título'}</h3>
              </div>
              <div className="flex items-center gap-1">
                <div className={clsx('w-1.5 h-1.5 rounded-full', priorityColors[scene.priority])} />
                <GripVertical className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              {scene.status && statusLabels[scene.status] && (
                <span className={clsx('px-1.5 py-0.5 rounded text-[9px] font-bold border', statusLabels[scene.status].color)}>
                  {statusLabels[scene.status].label}
                </span>
              )}
              {scene.scene_type && <span className="px-1.5 py-0.5 rounded-md bg-surface border border-surface-edge text-2xs text-text-secondary capitalize">{scene.scene_type}</span>}
              {scene.emotion && <span className="text-xs">{emotionEmojis[scene.emotion]}</span>}
            </div>

            {scene.tags && scene.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1.5">
                {scene.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-accent-amber/15 text-accent-amber border border-accent-amber/25">
                    #{tag}
                  </span>
                ))}
                {scene.tags.length > 3 && (
                  <span className="text-[8px] text-text-muted">+{scene.tags.length - 3}</span>
                )}
              </div>
            )}

            {/* FULL detail at high zoom */}
            {showFull && (
              <div className="mb-1 space-y-0.5">
                {scene.narration_text && (
                  <p className="text-2xs text-text-muted flex items-center gap-1"><Mic className="w-2.5 h-2.5" />{scene.narration_text.substring(0, 40)}...</p>
                )}
                {scene.hook_type && (
                  <p className="text-2xs text-accent-amber flex items-center gap-1"><Target className="w-2.5 h-2.5" />Hook: {scene.hook_type}</p>
                )}
                {scene.storytelling_problem && (
                  <p className="text-2xs text-accent-pink flex items-center gap-1"><Heart className="w-2.5 h-2.5" />{scene.storytelling_problem.substring(0, 40)}</p>
                )}
                {scene.objective && <p className="text-2xs text-text-secondary">{scene.objective.substring(0, 60)}</p>}
              </div>
            )}

            {!hasImage && scene.description && !showFull && (
              <p className="text-2xs text-text-muted line-clamp-2 mb-1">{scene.description}</p>
            )}

            <div className="flex items-center justify-between mt-auto pt-2 border-t border-surface-edge text-2xs text-text-muted">
              <span className="flex items-center gap-1 shrink-0 font-medium">
                <Clock className="w-3 h-3 shrink-0 text-text-muted" />
                {scene.estimated_duration_secs || 0}s
              </span>
              {dragOver && <span className="text-accent-green flex items-center gap-1 font-semibold"><Upload className="w-3 h-3 shrink-0" />Soltar</span>}
            </div>
          </div>
        </>
      )}
      {scene.hook_type && (
        <div className="absolute -top-2 right-2 px-1.5 py-0.5 rounded-full bg-accent-amber text-[10px] font-bold text-black">HOOK</div>
      )}
      {data.connectionCount > 0 && (
        <div className="absolute -bottom-2 left-2 px-1.5 py-0.5 rounded-full bg-accent-violet/20 text-[10px] font-medium text-accent-violet flex items-center gap-1">
          <Link2 className="w-2.5 h-2.5" />{data.connectionCount}
        </div>
      )}
    </div>
  );
});
SceneNode.displayName = 'SceneNode';
