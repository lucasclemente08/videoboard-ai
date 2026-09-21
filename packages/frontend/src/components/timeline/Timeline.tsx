import { useState } from 'react';
import { motion } from 'framer-motion';
import { GripHorizontal, Plus, Minus } from 'lucide-react';
import { useSceneStore } from '../../stores/useSceneStore';
import type { TimelineBlock } from '@videoboard/shared';

export function Timeline() {
  const { scenes } = useSceneStore();
  const [zoom, setZoom] = useState(1);
  const pixelsPerSecond = 10 * zoom;
  const trackHeight = 48;
  const totalDuration = Math.max(
    scenes.reduce((acc, s) => acc + s.estimated_duration_secs, 0),
    60
  );

  const timelineBlocks: TimelineBlock[] = scenes
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((scene, i) => {
      const startSecond = scenes
        .slice(0, i)
        .reduce((acc, s) => acc + s.estimated_duration_secs, 0);
      return {
        sceneId: scene.id,
        startSecond,
        durationSeconds: scene.estimated_duration_secs || 5,
        color: scene.color,
        title: scene.title,
      };
    });

  return (
    <div className="h-full flex flex-col bg-surface">
      {/* Toolbar */}
      <div className="h-10 flex items-center justify-between px-4 border-b border-surface-edge">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-text-secondary">Timeline</span>
          <span className="text-2xs text-text-muted">
            {Math.round(totalDuration)}s total
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
            className="p-1 rounded hover:bg-surface-hover"
          >
            <Minus className="w-3.5 h-3.5 text-text-muted" />
          </button>
          <span className="text-2xs text-text-muted w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(Math.min(4, zoom + 0.25))}
            className="p-1 rounded hover:bg-surface-hover"
          >
            <Plus className="w-3.5 h-3.5 text-text-muted" />
          </button>
        </div>
      </div>

      {/* Track */}
      <div className="flex-1 overflow-auto">
        <div className="relative" style={{ width: totalDuration * pixelsPerSecond + 200, height: trackHeight + 32 }}>
          {/* Ruler */}
          <div className="h-8 border-b border-surface-edge flex" style={{ width: totalDuration * pixelsPerSecond + 200 }}>
            {Array.from({ length: Math.ceil(totalDuration / 10) + 1 }).map((_, i) => (
              <div
                key={i}
                className="absolute text-2xs text-text-muted"
                style={{ left: i * 10 * pixelsPerSecond + 8, top: 4 }}
              >
                {i * 10}s
              </div>
            ))}
          </div>

          {/* Blocks */}
          <div className="relative" style={{ height: trackHeight }}>
            {timelineBlocks.map((block) => (
              <motion.div
                key={block.sceneId}
                layout
                className="absolute top-2 rounded-lg flex items-center px-2 cursor-grab active:cursor-grabbing border border-white/10 hover:brightness-110 transition-all group"
                style={{
                  left: block.startSecond * pixelsPerSecond + 8,
                  width: Math.max(block.durationSeconds * pixelsPerSecond, 40),
                  height: trackHeight - 16,
                  backgroundColor: block.color + '30',
                  borderLeft: `3px solid ${block.color}`,
                }}
              >
                <GripHorizontal className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 shrink-0 mr-1" />
                <span className="text-2xs font-medium text-text-primary truncate">
                  {block.title}
                </span>
                <span className="text-2xs text-text-muted ml-auto shrink-0">
                  {block.durationSeconds}s
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
