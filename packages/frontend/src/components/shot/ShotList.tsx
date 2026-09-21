import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, GripVertical, Camera, Clock, ChevronDown, ChevronRight,
  Trash2, Image, Upload, Music, Video, FileText, Loader2, Play,
  Maximize2, X, ExternalLink, Sparkles
} from 'lucide-react';
import { useShots, useCreateShot, useUpdateShot, useDeleteShot } from '../../api/hooks';
import { api } from '../../api/client';
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

interface MediaItem {
  url: string;
  type: string;
  name: string;
  size?: number;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ShotDropZone({ shot, updateShot }: { shot: Shot; updateShot: any }) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<MediaItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse existing media array from storyboard_image_url (JSON array)
  const getMedia = (): MediaItem[] => {
    try {
      const raw = shot.storyboard_image_url;
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      if (shot.storyboard_image_url) {
        return [{ url: shot.storyboard_image_url, type: 'image', name: 'Storyboard' }];
      }
      return [];
    }
  };

  const mediaItems = getMedia();

  const saveMediaList = useCallback((items: MediaItem[], autoRename = false) => {
    const updatePayload: any = {
      id: shot.id,
      storyboard_image_url: items.length > 0 ? JSON.stringify(items) : null,
    };
    if (autoRename && items.length > 0 && (shot.name === 'Nueva toma' || shot.name.startsWith('Toma '))) {
      updatePayload.name = items[items.length - 1].name || shot.name;
    }
    updateShot.mutate(updatePayload);
  }, [shot.id, shot.name, updateShot]);

  const handleUploadFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const newItems: MediaItem[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const res = await api.uploadFile(file, { shotId: shot.id });
          newItems.push({
            url: res.url,
            type: res.type,
            name: res.name,
            size: res.size,
          });
        } catch (err) {
          console.error('Error subiendo archivo:', err);
        }
      }

      if (newItems.length > 0) {
        saveMediaList([...mediaItems, ...newItems], true);
      }
    } finally {
      setUploading(false);
    }
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    // 1. Check if files were dropped directly from desktop/OS
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleUploadFiles(e.dataTransfer.files);
      return;
    }

    // 2. Check internal media drag state (Pexels / Media library)
    let media = mediaDragState.current;
    if (!media) {
      try {
        const raw = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
        if (raw) media = JSON.parse(raw);
      } catch { /* ignore */ }
    }
    mediaDragState.current = null;
    if (!media) return;

    const newItem: MediaItem = {
      url: media.url || media.thumb || '',
      type: media.type || 'image',
      name: media.alt || media.name || 'Media',
    };
    saveMediaList([...mediaItems, newItem], true);
  }, [mediaItems, saveMediaList]);

  const removeMedia = useCallback((index: number) => {
    const updated = mediaItems.filter((_, i) => i !== index);
    saveMediaList(updated);
  }, [mediaItems, saveMediaList]);

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleUploadFiles(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
        onChange={onFileInputChange}
        className="hidden"
      />

      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={clsx(
          'relative rounded-xl border-2 border-dashed transition-all p-3',
          dragOver ? 'border-accent-green bg-accent-green/5' : mediaItems.length > 0 ? 'border-surface-edge bg-surface/50' : 'border-surface-edge hover:border-accent-blue/40 bg-surface/20',
        )}
      >
        {/* Gallery grid */}
        {mediaItems.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-2.5">
            {mediaItems.map((item, i) => (
              <div key={i} className="relative rounded-lg overflow-hidden bg-surface-raised border border-surface-edge group/item">
                {item.type === 'video' ? (
                  <div
                    onClick={() => setPreviewMedia(item)}
                    className="aspect-video flex flex-col items-center justify-center bg-accent-violet/10 hover:bg-accent-violet/20 cursor-pointer transition-colors"
                  >
                    <Video className="w-6 h-6 text-accent-violet mb-1" />
                    <span className="text-[9px] font-medium text-accent-violet flex items-center gap-1">
                      <Play className="w-2.5 h-2.5 fill-current" /> Video
                    </span>
                  </div>
                ) : item.type === 'audio' || item.type === 'music' ? (
                  <div
                    onClick={() => setPreviewMedia(item)}
                    className="aspect-video flex flex-col items-center justify-center bg-accent-pink/10 hover:bg-accent-pink/20 cursor-pointer transition-colors"
                  >
                    <Music className="w-6 h-6 text-accent-pink mb-1" />
                    <span className="text-[9px] font-medium text-accent-pink">Audio</span>
                  </div>
                ) : item.type === 'document' ? (
                  <div
                    onClick={() => window.open(item.url, '_blank')}
                    className="aspect-video flex flex-col items-center justify-center bg-accent-blue/10 hover:bg-accent-blue/20 cursor-pointer transition-colors"
                  >
                    <FileText className="w-6 h-6 text-accent-blue mb-1" />
                    <span className="text-[9px] font-medium text-accent-blue">Doc</span>
                  </div>
                ) : (
                  <div
                    onClick={() => setPreviewMedia(item)}
                    className="aspect-video cursor-pointer overflow-hidden bg-black/40 relative group/img"
                  >
                    <img
                      src={item.url}
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                      <Maximize2 className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}

                {/* Delete button */}
                <button
                  onClick={(e) => { e.stopPropagation(); removeMedia(i); }}
                  title="Eliminar archivo"
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 hover:bg-accent-red text-white flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-all shadow-md z-10"
                >
                  <X className="w-3 h-3" />
                </button>

                {/* Info footer */}
                <div className="p-1.5 bg-surface-raised border-t border-surface-edge">
                  <p className="text-[9px] font-medium text-text-primary truncate">{item.name || 'Archivo'}</p>
                  {item.size && (
                    <p className="text-[8px] text-text-muted">{formatFileSize(item.size)}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Quick add more slot */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="aspect-video rounded-lg border-2 border-dashed border-surface-edge hover:border-accent-blue/50 flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer bg-surface-raised/30 hover:bg-accent-blue/5 group"
            >
              <Upload className="w-4 h-4 text-text-muted group-hover:text-accent-blue transition-colors" />
              <span className="text-[9px] font-medium text-text-muted group-hover:text-accent-blue">Subir más</span>
            </div>
          </div>
        )}

        {/* Empty state or upload progress */}
        {mediaItems.length === 0 && !uploading && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-2 py-4 cursor-pointer"
          >
            {dragOver ? (
              <>
                <Upload className="w-7 h-7 text-accent-green animate-bounce" />
                <p className="text-xs font-semibold text-accent-green">¡Suelta los archivos aquí!</p>
              </>
            ) : (
              <>
                <div className="flex gap-2 text-text-muted">
                  <Image className="w-5 h-5" />
                  <Video className="w-5 h-5" />
                  <Music className="w-5 h-5" />
                  <FileText className="w-5 h-5" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-text-primary">Subir archivos para esta toma</p>
                  <p className="text-2xs text-text-muted mt-0.5">Arrastra desde tu PC o haz clic para examinar</p>
                </div>
                <span className="px-3 py-1 rounded-lg bg-surface-raised border border-surface-edge text-2xs font-medium text-accent-blue hover:bg-surface-hover shadow-sm">
                  Examinar archivos
                </span>
              </>
            )}
          </div>
        )}

        {uploading && (
          <div className="flex flex-col items-center justify-center py-6 gap-2">
            <Loader2 className="w-6 h-6 text-accent-blue animate-spin" />
            <p className="text-xs font-medium text-text-primary">Subiendo archivo a la toma...</p>
          </div>
        )}

        {mediaItems.length > 0 && !uploading && (
          <div className="flex items-center justify-between pt-1 border-t border-surface-edge text-2xs text-text-muted">
            <span>{mediaItems.length} archivo{mediaItems.length !== 1 ? 's' : ''}</span>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-accent-blue hover:underline font-medium"
            >
              + Añadir archivo
            </button>
          </div>
        )}
      </div>

      {/* Media Preview Modal */}
      <AnimatePresence>
        {previewMedia && (
          <div
            onClick={() => setPreviewMedia(null)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface-raised border border-surface-edge rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-surface-edge">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-text-primary truncate">{previewMedia.name}</span>
                  {previewMedia.size && <span className="text-xs text-text-muted">({formatFileSize(previewMedia.size)})</span>}
                </div>
                <button
                  onClick={() => setPreviewMedia(null)}
                  className="p-1 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text-primary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 bg-black/40 flex items-center justify-center min-h-[260px] max-h-[500px]">
                {previewMedia.type === 'video' ? (
                  <video
                    src={previewMedia.url}
                    controls
                    autoPlay
                    className="max-h-[460px] max-w-full rounded-lg"
                  />
                ) : previewMedia.type === 'audio' || previewMedia.type === 'music' ? (
                  <div className="w-full max-w-md p-6 bg-surface-raised rounded-xl text-center space-y-4">
                    <Music className="w-12 h-12 text-accent-pink mx-auto" />
                    <p className="text-sm font-medium text-text-primary">{previewMedia.name}</p>
                    <audio src={previewMedia.url} controls className="w-full" autoPlay />
                  </div>
                ) : (
                  <img
                    src={previewMedia.url}
                    alt={previewMedia.name}
                    className="max-h-[460px] max-w-full object-contain rounded-lg shadow-lg"
                  />
                )}
              </div>

              <div className="flex items-center justify-between px-4 py-3 bg-surface-raised border-t border-surface-edge">
                <a
                  href={previewMedia.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-text-muted hover:text-accent-blue transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Abrir en nueva pestaña
                </a>
                <button
                  onClick={() => setPreviewMedia(null)}
                  className="px-4 py-1.5 rounded-lg bg-surface border border-surface-edge text-xs font-medium hover:bg-surface-hover"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
    <div className="p-4 space-y-2.5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Desglose de Tomas</h3>
          <p className="text-2xs text-text-muted">{shots?.length || 0} tomas planificadas</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-blue text-white text-xs font-semibold hover:bg-accent-blue-hover transition-all shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" /> Añadir toma
        </button>
      </div>

      {shots?.map((shot, index) => (
        <motion.div
          key={shot.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.03 }}
          className="rounded-xl bg-surface border border-surface-edge overflow-hidden group shadow-sm hover:border-surface-hover transition-colors"
        >
          {/* Header */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setExpandedId(expandedId === shot.id ? null : shot.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedId(expandedId === shot.id ? null : shot.id); } }}
            className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-surface-hover/50 transition-colors text-left cursor-pointer select-none"
          >
            <GripVertical className="w-3 h-3 text-text-muted shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-text-primary truncate">{shot.name}</span>
                {shot.camera_letter && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-accent-violet/15 text-accent-violet border border-accent-violet/20">
                    CÁM {shot.camera_letter}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-2xs text-text-muted mt-0.5">
                {shot.shot_type && <span>{shotTypeLabels[shot.shot_type] || shot.shot_type}</span>}
                {shot.movement && <span>· {movementLabels[shot.movement] || shot.movement}</span>}
                <span>· {shot.estimated_duration_secs}s</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); deleteShot.mutate(shot.id); }}
                className="p-1 rounded hover:bg-surface-hover opacity-0 group-hover:opacity-100 transition-all"
                title="Eliminar toma"
              >
                <Trash2 className="w-3.5 h-3.5 text-text-muted hover:text-accent-red" />
              </button>
              {expandedId === shot.id ? (
                <ChevronDown className="w-4 h-4 text-text-muted" />
              ) : (
                <ChevronRight className="w-4 h-4 text-text-muted" />
              )}
            </div>
          </div>

          {/* Expanded */}
          {expandedId === shot.id && (
            <div className="px-3 pb-3 space-y-3 border-t border-surface-edge pt-3">
              {/* File upload & drop zone */}
              <div>
                <label className="block text-2xs font-semibold text-text-primary mb-1.5">
                  Archivos & Storyboard de la toma
                </label>
                <ShotDropZone shot={shot} updateShot={updateShot} />
              </div>

              <div>
                <label className="block text-2xs font-medium text-text-muted mb-1">Descripción de la toma</label>
                <input
                  type="text"
                  value={shot.description || ''}
                  onChange={(e) => updateShot.mutate({ id: shot.id, description: e.target.value } as any)}
                  placeholder="Ej: Personaje entra por la izquierda mirando hacia el horizonte..."
                  className="w-full px-3 py-2 bg-surface-raised border border-surface-edge rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-2xs font-medium text-text-muted mb-1">Tipo de plano</label>
                  <select
                    value={shot.shot_type || ''}
                    onChange={(e) => updateShot.mutate({ id: shot.id, shot_type: e.target.value || null } as any)}
                    className="w-full px-2.5 py-1.5 bg-surface-raised border border-surface-edge rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue transition-all"
                  >
                    <option value="">Seleccionar</option>
                    {Object.entries(shotTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-2xs font-medium text-text-muted mb-1">Movimiento de cámara</label>
                  <select
                    value={shot.movement || ''}
                    onChange={(e) => updateShot.mutate({ id: shot.id, movement: e.target.value || null } as any)}
                    className="w-full px-2.5 py-1.5 bg-surface-raised border border-surface-edge rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue transition-all"
                  >
                    <option value="">Seleccionar</option>
                    {Object.entries(movementLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-2xs font-medium text-text-muted mb-1">Lente</label>
                  <input
                    type="text"
                    value={shot.lens}
                    placeholder="35mm / 50mm"
                    onChange={(e) => updateShot.mutate({ id: shot.id, lens: e.target.value } as any)}
                    className="w-full px-2.5 py-1.5 bg-surface-raised border border-surface-edge rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue transition-all"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-medium text-text-muted mb-1">FPS</label>
                  <input
                    type="number"
                    value={shot.fps}
                    onChange={(e) => updateShot.mutate({ id: shot.id, fps: parseInt(e.target.value) || 24 } as any)}
                    className="w-full px-2.5 py-1.5 bg-surface-raised border border-surface-edge rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue transition-all"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-medium text-text-muted mb-1">Duración (s)</label>
                  <input
                    type="number"
                    value={shot.estimated_duration_secs}
                    onChange={(e) => updateShot.mutate({ id: shot.id, estimated_duration_secs: parseInt(e.target.value) || 5 } as any)}
                    className="w-full px-2.5 py-1.5 bg-surface-raised border border-surface-edge rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-2xs font-medium text-text-muted mb-1">Cámara asignada</label>
                <div className="flex gap-2">
                  {['A', 'B', 'C'].map((letter) => (
                    <button
                      key={letter}
                      onClick={() => updateShot.mutate({ id: shot.id, camera_letter: shot.camera_letter === letter ? null : letter } as any)}
                      className={clsx(
                        'w-10 h-8 rounded-lg text-xs font-bold transition-all',
                        shot.camera_letter === letter
                          ? 'bg-accent-violet/20 text-accent-violet border border-accent-violet/40 shadow-sm'
                          : 'bg-surface-raised text-text-muted border border-surface-edge hover:border-surface-hover'
                      )}
                    >
                      {letter}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-2xs font-medium text-text-muted mb-1">Notas técnicas de rodaje</label>
                <textarea
                  value={shot.notes || ''}
                  onChange={(e) => updateShot.mutate({ id: shot.id, notes: e.target.value } as any)}
                  rows={2}
                  placeholder="Ajustes de iluminación, marcas de enfoque, audio de referencia..."
                  className="w-full px-3 py-2 bg-surface-raised border border-surface-edge rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue transition-all resize-none"
                />
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
