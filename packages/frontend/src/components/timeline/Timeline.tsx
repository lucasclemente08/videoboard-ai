import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { GripHorizontal, Plus, Minus, Play, Pause, RotateCcw } from 'lucide-react';
import { useSceneStore } from '../../stores/useSceneStore';
import { useUIStore } from '../../stores/useUIStore';
import { useReorderScenes } from '../../api/hooks';
import type { TimelineBlock } from '@videoboard/shared';

export function Timeline() {
  const { scenes, selectedSceneId, selectScene } = useSceneStore();
  const { setRightPanelTab } = useUIStore();
  const reorderScenes = useReorderScenes();
  const [zoom, setZoom] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef<any>(null);

  const pixelsPerSecond = 14 * zoom;
  const trackHeight = 56;

  // Accurately sorted scenes copy
  const sortedScenes = [...scenes].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const totalDuration = Math.max(
    sortedScenes.reduce((acc, s) => acc + (s.estimated_duration_secs || 5), 0),
    60
  );

  let accumulatedTime = 0;
  const timelineBlocks: (TimelineBlock & { scene: any })[] = sortedScenes.map((scene) => {
    const startSecond = accumulatedTime;
    const duration = scene.estimated_duration_secs || 5;
    accumulatedTime += duration;
    return {
      sceneId: scene.id,
      startSecond,
      durationSeconds: duration,
      color: scene.color || '#3B82F6',
      title: scene.title,
      scene,
    };
  });

  // Play / Pause playback simulation
  const togglePlay = () => {
    if (isPlaying) {
      clearInterval(playIntervalRef.current);
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      playIntervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= totalDuration) {
            clearInterval(playIntervalRef.current);
            setIsPlaying(false);
            return 0;
          }
          return prev + 0.1;
        });
      }, 100);
    }
  };

  const resetPlayhead = () => {
    clearInterval(playIntervalRef.current);
    setIsPlaying(false);
    setCurrentTime(0);
  };

  // Drag reordering
  const [draggedSceneId, setDraggedSceneId] = useState<string | null>(null);

  const handleDragStart = (sceneId: string) => {
    setDraggedSceneId(sceneId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnBlock = async (targetSceneId: string) => {
    if (!draggedSceneId || draggedSceneId === targetSceneId) {
      setDraggedSceneId(null);
      return;
    }
    const currentIds = sortedScenes.map((s) => s.id);
    const sourceIdx = currentIds.indexOf(draggedSceneId);
    const targetIdx = currentIds.indexOf(targetSceneId);
    if (sourceIdx < 0 || targetIdx < 0) return;

    currentIds.splice(sourceIdx, 1);
    currentIds.splice(targetIdx, 0, draggedSceneId);

    setDraggedSceneId(null);
    await reorderScenes.mutateAsync(currentIds);
  };

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left - 8;
    const clickedSeconds = Math.max(0, Math.min(totalDuration, clickX / pixelsPerSecond));
    setCurrentTime(clickedSeconds);
  };

  return (
    <div className="h-full flex flex-col bg-surface select-none">
      {/* Toolbar */}
      <div className="h-11 flex items-center justify-between px-4 border-b border-surface-edge bg-surface-raised/40">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <button
              onClick={togglePlay}
              className="p-1.5 rounded-lg bg-surface hover:bg-surface-hover text-text-primary transition-all border border-surface-edge"
              title={isPlaying ? 'Pausa' : 'Reproducir'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 text-accent-amber" /> : <Play className="w-3.5 h-3.5 text-accent-green" />}
            </button>
            <button
              onClick={resetPlayhead}
              className="p-1.5 rounded-lg bg-surface hover:bg-surface-hover text-text-muted hover:text-text-primary transition-all border border-surface-edge"
              title="Reiniciar cabezal"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-xs font-mono font-medium text-text-primary">
            {currentTime.toFixed(1)}s <span className="text-text-muted">/ {Math.round(totalDuration)}s</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
            className="p-1 rounded-lg hover:bg-surface-hover transition-colors"
          >
            <Minus className="w-3.5 h-3.5 text-text-muted" />
          </button>
          <span className="text-2xs text-text-muted w-10 text-center font-medium">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(Math.min(3, zoom + 0.25))}
            className="p-1 rounded-lg hover:bg-surface-hover transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-text-muted" />
          </button>
        </div>
      </div>

      {/* Main Track View */}
      <div className="flex-1 overflow-auto p-4">
        <div
          onClick={handleTrackClick}
          className="relative rounded-2xl border border-surface-edge bg-surface-raised/20 overflow-hidden cursor-pointer"
          style={{ width: totalDuration * pixelsPerSecond + 100, minHeight: trackHeight + 40 }}
        >
          {/* Ruler */}
          <div className="h-7 border-b border-surface-edge/70 bg-surface-raised/50 relative">
            {Array.from({ length: Math.ceil(totalDuration / 5) + 1 }).map((_, i) => (
              <div
                key={i}
                className="absolute text-4xs text-text-muted/80 font-mono top-1"
                style={{ left: i * 5 * pixelsPerSecond + 8 }}
              >
                {i * 5}s
              </div>
            ))}
          </div>

          {/* Interactive Playhead Line */}
          <div
            className="absolute top-0 bottom-0 z-30 pointer-events-none transition-all duration-75"
            style={{ left: currentTime * pixelsPerSecond + 8 }}
          >
            <div className="w-0.5 h-full bg-accent-red relative">
              <div className="absolute -top-1 -left-1.5 w-3.5 h-3.5 bg-accent-red rotate-45 rounded-xs" />
            </div>
          </div>

          {/* Blocks Container */}
          <div className="relative py-2.5 px-2" style={{ height: trackHeight }}>
            {timelineBlocks.map((block) => {
              const isSelected = selectedSceneId === block.sceneId;
              return (
                <motion.div
                  key={block.sceneId}
                  layout
                  draggable
                  onDragStart={(e) => {
                    e.stopPropagation();
                    handleDragStart(block.sceneId);
                  }}
                  onDragOver={handleDragOver}
                  onDrop={(e) => {
                    e.stopPropagation();
                    handleDropOnBlock(block.sceneId);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectScene(block.sceneId);
                    setRightPanelTab('info');
                  }}
                  className={`absolute top-2.5 rounded-xl flex items-center px-3 cursor-grab active:cursor-grabbing border transition-all duration-150 group shadow-xs ${
                    isSelected ? 'ring-2 ring-accent-blue border-accent-blue shadow-md' : 'border-white/10 hover:border-white/20'
                  }`}
                  style={{
                    left: block.startSecond * pixelsPerSecond + 8,
                    width: Math.max(block.durationSeconds * pixelsPerSecond, 48),
                    height: trackHeight - 16,
                    backgroundColor: block.color + '25',
                    borderLeft: `4px solid ${block.color}`,
                  }}
                >
                  <GripHorizontal className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 shrink-0 mr-1.5" />
                  <span className="text-xs font-semibold text-text-primary truncate">
                    {block.title}
                  </span>
                  <span className="text-3xs text-text-muted font-mono ml-auto shrink-0 pl-1">
                    {block.durationSeconds}s
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
