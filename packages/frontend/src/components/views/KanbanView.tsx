import { useState } from 'react';
import { motion } from 'framer-motion';
import { GripVertical, Plus, Clock, User } from 'lucide-react';
import { clsx } from 'clsx';
import { useSceneStore } from '../../stores/useSceneStore';
import { useUpdateScene } from '../../api/hooks';
import type { Scene } from '@videoboard/shared';

const COLUMNS = [
  { id: 'draft', label: 'Ideas', color: '#71717A', emoji: '💡' },
  { id: 'writing', label: 'Escribiendo', color: '#3B82F6', emoji: '✍️' },
  { id: 'ready', label: 'Listo', color: '#F59E0B', emoji: '✅' },
  { id: 'shooting', label: 'Grabando', color: '#EF4444', emoji: '🎬' },
  { id: 'done', label: 'Completado', color: '#10B981', emoji: '🏁' },
];

export function KanbanView() {
  const { scenes } = useSceneStore();
  const updateScene = useUpdateScene();
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const handleDrop = async (sceneId: string, newStatus: string) => {
    await updateScene.mutateAsync({ id: sceneId, status: newStatus } as any);
    setDragOverCol(null);
  };

  return (
    <div className="h-full overflow-x-auto bg-surface p-6">
      <div className="flex gap-4 h-full min-w-max">
        {COLUMNS.map((col) => {
          const colScenes = scenes.filter((s) => (s.status || 'draft') === col.id);
          return (
            <div key={col.id} className="w-64 flex flex-col shrink-0">
              {/* Column header */}
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className="text-lg">{col.emoji}</span>
                <h3 className="text-sm font-semibold text-text-primary">{col.label}</h3>
                <span className="ml-auto px-2 py-0.5 rounded-full bg-surface-edge text-2xs text-text-muted">{colScenes.length}</span>
              </div>

              {/* Cards */}
              <div
                className={clsx(
                  'flex-1 rounded-2xl p-2 space-y-2 transition-all min-h-[200px]',
                  dragOverCol === col.id ? 'bg-accent-blue/5 border-2 border-dashed border-accent-blue/30' : 'bg-surface-raised border border-surface-edge'
                )}
                onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.id); }}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData('sceneId'); if (id) handleDrop(id, col.id); }}
              >
                {colScenes.map((scene, i) => (
                  <motion.div
                    key={scene.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    draggable
                    onDragStart={(e: any) => { e.dataTransfer.setData('sceneId', scene.id); e.dataTransfer.effectAllowed = 'move'; }}
                    className="bg-surface border border-surface-edge rounded-xl p-3 cursor-grab active:cursor-grabbing hover:border-surface-hover transition-all group shadow-sm"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <GripVertical className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100" />
                      <span className="text-xs font-medium text-text-primary truncate flex-1">{scene.title}</span>
                    </div>
                    {scene.description && <p className="text-2xs text-text-muted line-clamp-2 mb-2">{scene.description}</p>}
                    <div className="flex items-center gap-2 text-2xs text-text-muted">
                      <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{scene.estimated_duration_secs}s</span>
                      {scene.assigned_to && <span className="flex items-center gap-1"><User className="w-2.5 h-2.5" />Asignado</span>}
                    </div>
                    <div className="mt-2 flex items-center gap-1">
                      <div className="w-full h-1 rounded-full bg-surface-edge overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{
                          width: `${Math.min((scene.estimated_duration_secs / 120) * 100, 100)}%`,
                          backgroundColor: col.color,
                        }} />
                      </div>
                    </div>
                  </motion.div>
                ))}

                {colScenes.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-20 text-text-muted">
                    <p className="text-2xs">Sin escenas</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
