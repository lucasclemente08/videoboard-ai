import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, GripVertical, Camera, Clock, ChevronDown, ChevronRight, Trash2, Image, Upload, Music, Video } from 'lucide-react';
import { useShots, useCreateShot, useUpdateShot, useDeleteShot } from '../../api/hooks';
import { clsx } from 'clsx';
import type { Shot } from '@videoboard/shared';
import { mediaDragState } from '../../services/eventBus';

const shotTypeLabels: Record<string, string> = {
  close_up: 'Primer plano', medium_shot: 'Plano medio', american_shot: 'Plano americano',
  wide_shot: 'Plano general', detail_shot: 'Plano detalle', pov: 'POV',
  drone: 'Drone', overhead: 'Cenital', low_angle: 'Contrapicado',
  high_angle: 'Picado', macro: 'Macro',
};
const movementLabels: Record<string, string> = {
  pan: 'Pan', tilt: 'Tilt', zoom: 'Zoom', handheld: 'Handheld',
  steadicam: 'Steadicam', dolly: 'Dolly', crane: 'Crane', slider: 'Slider', static: 'Fijo',
};

function isImageUrl(url: string) { return /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url) || url.includes('pexels.com'); }
function isVideoUrl(url: string) { return /\.(mp4|webm|mov)(\?|$)/i.test(url) || url.includes('pexels.com/video'); }

function ShotDropZone({ shot, updateShot }: { shot: Shot; updateShot: any }) {
  const [dragOver, setDragOver] = useState(false);

  // Parse existing media array from storyboard_image_url (JSON array)
  const getMedia = (): { url: string; type: string; name: string }[] => {
    try {
      const raw = shot.storyboard_image_url;
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  };

  const mediaItems = getMedia();

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }, []);
  const onDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); }, []);
  const onDrop = useCallback((e: React.DragEvent) => {
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

    const newItem = {
      url: media.url || media.thumb || '',
      type: media.type || 'image',
      name: media.alt || media.name || '',
    };
    const updated = [...mediaItems, newItem];
    updateShot.mutate({
      id: shot.id,
      storyboard_image_url: JSON.stringify(updated),
      name: shot.name === 'Nueva toma' || shot.name.startsWith('Toma') ? (media.alt || media.name || shot.name) : shot.name,
    } as any);
  }, [shot.id, updateShot, mediaItems]);

  const removeMedia = useCallback((index: number) => {
    const updated = mediaItems.filter((_, i) => i !== index);
    updateShot.mutate({ id: shot.id, storyboard_image_url: updated.length > 0 ? JSON.stringify(updated) : null } as any);
  }, [shot.id, updateShot, mediaItems]);

  return (
    <div
      onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
      className={clsx(
        'rounded-xl border-2 border-dashed transition-all p-2',
        dragOver ? 'border-accent-green bg-accent-green/5' : mediaItems.length > 0 ? 'border-surface-edge' : 'border-surface-edge hover:border-accent-blue/30',
      )}
    >
      {/* Gallery grid */}
      {mediaItems.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-2">
          {mediaItems.map((item, i) => (
            <div key={i} className="relative rounded-lg overflow-hidden bg-surface-raised group/item">
              {item.type === 'video' ? (
                <div className="aspect-video flex items-center justify-center bg-accent-violet/10">
                  <Video className="w-6 h-6 text-accent-violet" />
                </div>
              ) : item.type === 'music' ? (
                <div className="aspect-video flex items-center justify-center bg-accent-pink/10">
                  <Music className="w-6 h-6 text-accent-pink" />
                </div>
              ) : (
                <img src={item.url} alt={item.name} className="w-full aspect-video object-cover" loading="lazy" />
              )}
              <button
                onClick={() => removeMedia(i)}
                className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white/80 hover:bg-red-600 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-all text-[9px] leading-none"
              >✕</button>
              {item.name && (
                <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 bg-gradient-to-t from-black/60 to-transparent">
                  <p className="text-[8px] text-white/80 truncate">{item.name}</p>
                </div>
              )}
            </div>
          ))}
          {/* Drop hint card */}
          <div className="aspect-video rounded-lg border-2 border-dashed border-surface-edge hover:border-accent-blue/40 flex items-center justify-center transition-colors cursor-pointer">
            <Plus className="w-5 h-5 text-text-muted" />
          </div>
        </div>
      )}

      {/* Empty state or drop overlay */}
      {mediaItems.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-4">
          {dragOver ? (
            <>
              <Upload className="w-6 h-6 text-accent-green animate-bounce" />
              <p className="text-xs font-medium text-accent-green">Soltar aquí</p>
            </>
          ) : (
            <>
              <div className="flex gap-1">
                <Image className="w-4 h-4 text-text-muted" />
                <Video className="w-4 h-4 text-text-muted" />
                <Music className="w-4 h-4 text-text-muted" />
              </div>
              <p className="text-2xs text-text-muted">Arrastra imágenes, videos o música</p>
            </>
          )}
        </div>
      )}

      {/* Counter */}
      {mediaItems.length > 0 && (
        <p className="text-2xs text-text-muted text-center">{mediaItems.length} archivo{mediaItems.length !== 1 ? 's' : ''} · arrastra más</p>
      )}
    </div>
  );
}

export function ShotListPanel({ sceneId }: { sceneId: string }) {
  const { data: shots, isLoading } = useShots(sceneId);
  const createShot = useCreateShot();
  const updateShot = useUpdateShot();
  const deleteShot = useDeleteShot();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleAdd = async () => {
    await createShot.mutateAsync({ scene_id: sceneId, name: `Toma ${(shots?.length || 0) + 1}` });
  };

  return (
    <div className="p-4 space-y-2">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-text-secondary">{shots?.length || 0} tomas</span>
        <button onClick={handleAdd}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-accent-blue/10 text-accent-blue text-xs font-medium hover:bg-accent-blue/20 transition-colors">
          <Plus className="w-3 h-3" /> Añadir toma
        </button>
      </div>

      {shots?.map((shot, index) => (
        <motion.div key={shot.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.03 }}
          className="rounded-xl bg-surface border border-surface-edge overflow-hidden group">
          {/* Header */}
          <button onClick={() => setExpandedId(expandedId === shot.id ? null : shot.id)}
            className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-surface-hover/50 transition-colors text-left">
            <GripVertical className="w-3 h-3 text-text-muted shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-text-primary truncate">{shot.name}</span>
                {shot.camera_letter && <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-accent-violet/10 text-accent-violet">{shot.camera_letter}</span>}
              </div>
              <div className="flex items-center gap-2 text-2xs text-text-muted mt-0.5">
                {shot.shot_type && <span>{shotTypeLabels[shot.shot_type] || shot.shot_type}</span>}
                {shot.movement && <span>· {movementLabels[shot.movement] || shot.movement}</span>}
                <span>· {shot.estimated_duration_secs}s</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={(e) => { e.stopPropagation(); deleteShot.mutate(shot.id); }}
                className="p-1 rounded hover:bg-surface-hover opacity-0 group-hover:opacity-100 transition-all">
                <Trash2 className="w-3 h-3 text-text-muted hover:text-accent-red" />
              </button>
              {expandedId === shot.id ? <ChevronDown className="w-3.5 h-3.5 text-text-muted" /> : <ChevronRight className="w-3.5 h-3.5 text-text-muted" />}
            </div>
          </button>

          {/* Expanded */}
          {expandedId === shot.id && (
            <div className="px-3 pb-3 space-y-3 border-t border-surface-edge pt-3">
              {/* DROP ZONE for storyboard */}
              <ShotDropZone shot={shot} updateShot={updateShot} />

              <div>
                <label className="block text-2xs font-medium text-text-muted mb-1">Descripción</label>
                <input type="text" value={shot.description || ''}
                  onChange={(e) => updateShot.mutate({ id: shot.id, description: e.target.value } as any)}
                  className="w-full px-3 py-2 bg-surface border border-surface-edge rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-2xs font-medium text-text-muted mb-1">Tipo de plano</label>
                  <select value={shot.shot_type || ''}
                    onChange={(e) => updateShot.mutate({ id: shot.id, shot_type: e.target.value || null } as any)}
                    className="w-full px-2.5 py-1.5 bg-surface border border-surface-edge rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue transition-all">
                    <option value="">Seleccionar</option>
                    {Object.entries(shotTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-2xs font-medium text-text-muted mb-1">Movimiento</label>
                  <select value={shot.movement || ''}
                    onChange={(e) => updateShot.mutate({ id: shot.id, movement: e.target.value || null } as any)}
                    className="w-full px-2.5 py-1.5 bg-surface border border-surface-edge rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue transition-all">
                    <option value="">Seleccionar</option>
                    {Object.entries(movementLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-2xs font-medium text-text-muted mb-1">Lente</label>
                  <input type="text" value={shot.lens}
                    onChange={(e) => updateShot.mutate({ id: shot.id, lens: e.target.value } as any)}
                    className="w-full px-2.5 py-1.5 bg-surface border border-surface-edge rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue transition-all" />
                </div>
                <div>
                  <label className="block text-2xs font-medium text-text-muted mb-1">FPS</label>
                  <input type="number" value={shot.fps}
                    onChange={(e) => updateShot.mutate({ id: shot.id, fps: parseInt(e.target.value) || 24 } as any)}
                    className="w-full px-2.5 py-1.5 bg-surface border border-surface-edge rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue transition-all" />
                </div>
                <div>
                  <label className="block text-2xs font-medium text-text-muted mb-1">Duración (s)</label>
                  <input type="number" value={shot.estimated_duration_secs}
                    onChange={(e) => updateShot.mutate({ id: shot.id, estimated_duration_secs: parseInt(e.target.value) || 5 } as any)}
                    className="w-full px-2.5 py-1.5 bg-surface border border-surface-edge rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-2xs font-medium text-text-muted mb-1">Cámara</label>
                <div className="flex gap-2">
                  {['A', 'B', 'C'].map((letter) => (
                    <button key={letter}
                      onClick={() => updateShot.mutate({ id: shot.id, camera_letter: shot.camera_letter === letter ? null : letter } as any)}
                      className={clsx('w-10 h-8 rounded-lg text-xs font-bold transition-all',
                        shot.camera_letter === letter ? 'bg-accent-violet/20 text-accent-violet border border-accent-violet/30' : 'bg-surface text-text-muted border border-surface-edge hover:border-surface-hover')}>
                      {letter}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-2xs font-medium text-text-muted mb-1">Notas</label>
                <textarea value={shot.notes || ''}
                  onChange={(e) => updateShot.mutate({ id: shot.id, notes: e.target.value } as any)}
                  rows={2} className="w-full px-3 py-2 bg-surface border border-surface-edge rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue transition-all resize-none" />
              </div>
            </div>
          )}
        </motion.div>
      ))}

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-xl bg-surface animate-pulse" />)}
        </div>
      )}
    </div>
  );
}
