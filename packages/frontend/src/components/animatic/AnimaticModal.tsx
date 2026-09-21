import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Maximize2, Minimize2, X, Repeat, Settings, Sliders,
  Film, Clock, Layers, Sparkles, Camera, Sun, HelpCircle
} from 'lucide-react';
import type { Scene, Shot } from '@videoboard/shared';
import { useAuthStore } from '../../stores/useAuthStore';

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle?: string;
  scenes: Scene[];
}

export function AnimaticModal({ open, onClose, projectId, projectTitle, scenes }: Props) {
  const { token } = useAuthStore();
  const [shots, setShots] = useState<Shot[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0); // in seconds
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '2.39:1' | '4:3'>('16:9');
  const [speed, setSpeed] = useState<number>(1.0);
  const [loop, setLoop] = useState(false);
  const [voiceoverEnabled, setVoiceoverEnabled] = useState(true);
  const [showTechnicalHUD, setShowTechnicalHUD] = useState(true);
  const [kenBurns, setKenBurns] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const currentNarratedShotId = useRef<string | null>(null);

  // 1. Fetch all shots for the project
  useEffect(() => {
    if (!open || !projectId) return;
    setLoading(true);
    fetch(`/api/shots?project_id=${projectId}`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setShots(json.data);
        }
      })
      .catch((err) => console.error('Error cargando tomas para animatic:', err))
      .finally(() => setLoading(false));
  }, [open, projectId, token]);

  // 2. Build flattened timeline items
  // If a scene has no shots, create a virtual shot representing the scene itself
  const timelineItems = useMemo(() => {
    if (!scenes || scenes.length === 0) return [];
    const sortedScenes = [...scenes].sort((a, b) => a.sort_order - b.sort_order);

    const items: Array<{
      id: string;
      sceneId: string;
      sceneTitle: string;
      sceneColor: string;
      shotName: string;
      description: string;
      duration: number; // in seconds
      startTime: number;
      endTime: number;
      mediaUrl: string | null;
      mediaType: string;
      lens?: string;
      shotType?: string;
      cameraLetter?: string | null;
      cameraSetup?: any;
      lightingSetup?: any;
    }> = [];

    let runningTime = 0;

    for (const sc of sortedScenes) {
      const scShots = shots
        .filter((sh) => sh.scene_id === sc.id)
        .sort((a, b) => a.sort_order - b.sort_order);

      if (scShots.length === 0) {
        // Scene without explicit shots: treat whole scene as a 5-second or estimated_duration segment
        const dur = Math.max(sc.estimated_duration_secs || 5, 2);
        items.push({
          id: `sc-dummy-${sc.id}`,
          sceneId: sc.id,
          sceneTitle: sc.title,
          sceneColor: sc.color || '#3B82F6',
          shotName: 'Escena General',
          description: sc.description || sc.objective || '',
          duration: dur,
          startTime: runningTime,
          endTime: runningTime + dur,
          mediaUrl: null,
          mediaType: 'none',
          lens: '35mm',
          shotType: sc.scene_type || 'Plano General',
          cameraLetter: null,
        });
        runningTime += dur;
      } else {
        for (const sh of scShots) {
          const dur = Math.max(sh.estimated_duration_secs || 4, 1);

          // Extract first media url if available in storyboard_image_url
          let mUrl: string | null = null;
          let mType = 'image';
          try {
            if (sh.storyboard_image_url) {
              const parsed = JSON.parse(sh.storyboard_image_url);
              if (Array.isArray(parsed) && parsed.length > 0) {
                mUrl = parsed[0].url;
                mType = parsed[0].type || 'image';
              } else if (typeof parsed === 'string') {
                mUrl = parsed;
              }
            }
          } catch {
            mUrl = sh.storyboard_image_url;
          }

          items.push({
            id: sh.id,
            sceneId: sc.id,
            sceneTitle: sc.title,
            sceneColor: sc.color || '#3B82F6',
            shotName: sh.name,
            description: sh.description || '',
            duration: dur,
            startTime: runningTime,
            endTime: runningTime + dur,
            mediaUrl: mUrl,
            mediaType: mType,
            lens: (sh as any).camera_setup?.lens || sh.lens,
            shotType: sh.shot_type || 'Plano Medio',
            cameraLetter: sh.camera_letter,
            cameraSetup: (sh as any).camera_setup,
            lightingSetup: (sh as any).lighting_setup,
          });
          runningTime += dur;
        }
      }
    }

    return items;
  }, [scenes, shots]);

  const totalDuration = useMemo(() => {
    if (timelineItems.length === 0) return 0;
    return timelineItems[timelineItems.length - 1].endTime;
  }, [timelineItems]);

  // Current item based on currentTime
  const currentItemIndex = useMemo(() => {
    if (timelineItems.length === 0) return -1;
    const idx = timelineItems.findIndex((it) => currentTime >= it.startTime && currentTime < it.endTime);
    return idx !== -1 ? idx : timelineItems.length - 1;
  }, [timelineItems, currentTime]);

  const currentItem = timelineItems[currentItemIndex] || null;

  // Format SMPTE Timecode (HH:MM:SS:FF)
  const formatTimecode = (seconds: number, fps = 24) => {
    const totalFrames = Math.floor(seconds * fps);
    const ff = String(totalFrames % fps).padStart(2, '0');
    const totalSecs = Math.floor(seconds);
    const ss = String(totalSecs % 60).padStart(2, '0');
    const mm = String(Math.floor(totalSecs / 60) % 60).padStart(2, '0');
    const hh = String(Math.floor(totalSecs / 3600)).padStart(2, '0');
    return `${hh}:${mm}:${ss}:${ff}`;
  };

  // Playback tick loop
  const tick = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const delta = (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;

    setCurrentTime((prev) => {
      const next = prev + delta * speed;
      if (next >= totalDuration) {
        if (loop) {
          return 0;
        } else {
          setIsPlaying(false);
          return totalDuration;
        }
      }
      return next;
    });

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(tick);
    }
  }, [isPlaying, speed, totalDuration, loop]);

  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = null;
      animationFrameRef.current = requestAnimationFrame(tick);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, tick]);

  // Trigger browser Speech Synthesis (TTS) when shot changes
  useEffect(() => {
    if (!voiceoverEnabled || !isPlaying || !currentItem) {
      if (!voiceoverEnabled && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      return;
    }

    if (currentItem.id !== currentNarratedShotId.current) {
      currentNarratedShotId.current = currentItem.id;
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const textToRead = currentItem.description || currentItem.shotName;
        if (textToRead && textToRead.length > 2) {
          const utterance = new SpeechSynthesisUtterance(textToRead);
          utterance.lang = 'es-ES';
          utterance.rate = 1.05;
          window.speechSynthesis.speak(utterance);
        }
      }
    }
  }, [currentItem, voiceoverEnabled, isPlaying]);

  // Stop speech when closing or pausing
  useEffect(() => {
    if (!isPlaying && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, [isPlaying]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === 'ArrowRight' || e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        handleNextShot();
      } else if (e.code === 'ArrowLeft' || e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        handlePrevShot();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.code === 'Escape') {
        if (isFullscreen) {
          document.exitFullscreen?.();
          setIsFullscreen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, isFullscreen, currentItemIndex, timelineItems]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false));
    }
  };

  const handleNextShot = () => {
    if (currentItemIndex < timelineItems.length - 1) {
      const next = timelineItems[currentItemIndex + 1];
      setCurrentTime(next.startTime);
    }
  };

  const handlePrevShot = () => {
    if (currentItemIndex > 0) {
      const prev = timelineItems[currentItemIndex - 1];
      setCurrentTime(prev.startTime);
    } else {
      setCurrentTime(0);
    }
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || totalDuration === 0) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    setCurrentTime(ratio * totalDuration);
  };

  if (!open) return null;

  return createPortal(
    <div
      ref={containerRef}
      className="fixed inset-0 z-[99999] bg-[#08090c] text-white flex flex-col select-none overflow-hidden"
    >
      {/* Top Bar Navigation */}
      <div className="h-14 px-4 bg-[#0e1017] border-b border-surface-edge flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-blue to-accent-violet flex items-center justify-center shadow-lg shadow-accent-blue/20">
            <Film className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-wide truncate max-w-sm">
                {projectTitle || 'Reproductor Animatic'}
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent-blue/20 text-accent-blue border border-accent-blue/30">
                PRODUCCIÓN
              </span>
            </div>
            <p className="text-[11px] text-text-muted">
              {scenes.length} escenas &bull; {timelineItems.length} tomas &bull; Duración: {Math.round(totalDuration)}s ({Math.round(totalDuration / 60)} min)
            </p>
          </div>
        </div>

        {/* Aspect Ratio & Display Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-surface border border-surface-edge rounded-lg p-0.5 text-xs">
            {(['16:9', '9:16', '2.39:1', '4:3'] as const).map((ar) => (
              <button
                key={ar}
                onClick={() => setAspectRatio(ar)}
                className={`px-2 py-1 rounded text-2xs font-semibold transition-all ${
                  aspectRatio === ar
                    ? 'bg-accent-blue text-white shadow-sm'
                    : 'text-text-muted hover:text-white'
                }`}
              >
                {ar}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowTechnicalHUD((v) => !v)}
            className={`p-2 rounded-lg border transition-all text-xs flex items-center gap-1.5 ${
              showTechnicalHUD
                ? 'bg-accent-violet/20 border-accent-violet/40 text-accent-violet'
                : 'bg-surface border-surface-edge text-text-muted hover:text-white'
            }`}
            title="Mostrar datos de Cámara e Iluminación"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-2xs">Datos Técnicos</span>
          </button>

          <button
            onClick={() => setVoiceoverEnabled((v) => !v)}
            className={`p-2 rounded-lg border transition-all text-xs flex items-center gap-1.5 ${
              voiceoverEnabled
                ? 'bg-accent-green/20 border-accent-green/40 text-accent-green'
                : 'bg-surface border-surface-edge text-text-muted hover:text-white'
            }`}
            title="Locución automática del guion por voz (TTS)"
          >
            {voiceoverEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline text-2xs">Locución</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-surface border border-surface-edge text-text-muted hover:text-white transition-all"
            title="Pantalla Completa (F)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-surface border border-surface-edge text-text-muted hover:text-accent-red transition-all ml-2"
            title="Cerrar Animatic (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Cinema Screen View */}
      <div className="flex-1 relative flex items-center justify-center p-6 bg-black overflow-hidden">
        {/* Letterboxed Canvas Frame */}
        <div
          className="relative max-w-full max-h-full transition-all duration-300 rounded-xl overflow-hidden shadow-2xl border border-white/10 flex items-center justify-center bg-[#0d0f14]"
          style={{
            aspectRatio: aspectRatio === '16:9' ? '16/9' : aspectRatio === '9:16' ? '9/16' : aspectRatio === '2.39:1' ? '2.39/1' : '4/3',
            width: aspectRatio === '9:16' ? 'auto' : '100%',
            height: aspectRatio === '9:16' ? '100%' : 'auto',
            maxHeight: 'calc(100vh - 210px)',
          }}
        >
          {/* Current Shot Visual */}
          {currentItem?.mediaUrl ? (
            currentItem.mediaType === 'video' ? (
              <video
                src={currentItem.mediaUrl}
                autoPlay
                loop
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <motion.img
                key={currentItem.id}
                initial={kenBurns ? { scale: 1 } : undefined}
                animate={kenBurns ? { scale: 1.05 } : undefined}
                transition={{ duration: currentItem.duration, ease: 'easeInOut' }}
                src={currentItem.mediaUrl}
                alt={currentItem.shotName}
                className="w-full h-full object-cover"
              />
            )
          ) : (
            /* Modern Cinematographic Slate Placeholder */
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-[#11131a] to-[#0a0b10] border border-white/5 relative">
              <div
                className="absolute top-4 left-4 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase text-white shadow-sm"
                style={{ backgroundColor: currentItem?.sceneColor || '#3b82f6' }}
              >
                {currentItem?.sceneTitle || 'Escena'}
              </div>

              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-white/40">
                <Camera className="w-8 h-8" />
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-white tracking-wide mb-2">
                {currentItem?.shotName || 'Toma'}
              </h3>

              <div className="flex items-center gap-2 mb-4 flex-wrap justify-center">
                {currentItem?.shotType && (
                  <span className="px-2 py-0.5 rounded bg-accent-blue/20 text-accent-blue border border-accent-blue/30 text-xs font-semibold">
                    {currentItem.shotType}
                  </span>
                )}
                {currentItem?.lens && (
                  <span className="px-2 py-0.5 rounded bg-white/10 text-white/80 border border-white/20 text-xs font-mono">
                    Lente: {currentItem.lens}
                  </span>
                )}
                {currentItem?.cameraLetter && (
                  <span className="px-2 py-0.5 rounded bg-accent-violet/20 text-accent-violet border border-accent-violet/30 text-xs font-bold">
                    CÁM {currentItem.cameraLetter}
                  </span>
                )}
              </div>

              {currentItem?.description && (
                <p className="max-w-md text-sm text-text-muted italic bg-black/40 px-4 py-2 rounded-lg border border-white/5">
                  &ldquo;{currentItem.description}&rdquo;
                </p>
              )}
            </div>
          )}

          {/* Director's Technical HUD Overlay (Upper Left) */}
          <AnimatePresence>
            {showTechnicalHUD && currentItem && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="absolute top-4 left-4 z-10 bg-black/75 backdrop-blur-md border border-white/15 rounded-xl p-3 max-w-xs space-y-1.5 pointer-events-none shadow-xl"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: currentItem.sceneColor }}
                  />
                  <span className="text-2xs font-bold text-white uppercase tracking-wider truncate">
                    {currentItem.sceneTitle}
                  </span>
                </div>

                <div className="text-xs font-bold text-accent-blue flex items-center gap-1.5">
                  <span>{currentItem.shotName}</span>
                  {currentItem.cameraLetter && (
                    <span className="px-1 rounded bg-accent-violet text-[9px] text-white">
                      CÁM {currentItem.cameraLetter}
                    </span>
                  )}
                </div>

                {currentItem.cameraSetup && (
                  <div className="text-[10px] text-text-secondary font-mono border-t border-white/10 pt-1 flex flex-col gap-0.5">
                    <span className="text-white/90">
                      🎥 {currentItem.cameraSetup.camera_model || 'Cámara'} ({currentItem.cameraSetup.lens || currentItem.lens}) &bull; {currentItem.cameraSetup.aperture || 'f/2.8'}
                    </span>
                    <span>
                      ISO {currentItem.cameraSetup.iso || 800} &bull; {currentItem.cameraSetup.color_profile?.split(' ')[0] || 'Log'}
                    </span>
                  </div>
                )}

                {currentItem.lightingSetup?.key_light && (
                  <div className="text-[10px] text-accent-amber font-mono border-t border-white/10 pt-1">
                    💡 Key: {currentItem.lightingSetup.key_light.type || 'Luz Principal'} ({currentItem.lightingSetup.key_light.color_temp || '5600K'})
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* SMPTE Live Timecode Display (Upper Right) */}
          <div className="absolute top-4 right-4 z-10 bg-black/80 backdrop-blur-md border border-white/15 rounded-xl px-3 py-1.5 font-mono text-right shadow-xl">
            <div className="text-sm font-black text-accent-green tracking-widest">
              {formatTimecode(currentTime)}
            </div>
            <div className="text-[10px] text-text-muted">
              {Math.round(currentTime)}s / {Math.round(totalDuration)}s ({Math.round((currentTime / (totalDuration || 1)) * 100)}%)
            </div>
          </div>

          {/* Current Action / Script Subtitle Banner (Bottom) */}
          {currentItem?.description && (
            <div className="absolute bottom-4 left-6 right-6 z-10 text-center pointer-events-none">
              <span className="inline-block bg-black/85 backdrop-blur-md border border-white/15 text-white font-medium text-xs sm:text-sm px-4 py-2 rounded-xl shadow-2xl max-w-xl">
                {currentItem.description}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Transport Control & Visual Timeline */}
      <div className="h-28 bg-[#0e1017] border-t border-surface-edge flex flex-col justify-between p-3 shrink-0">
        {/* Visual Timeline Scrubber */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-2xs text-text-muted font-mono px-1">
            <span>00:00:00:00</span>
            <span className="text-white font-semibold">
              Toma {currentItemIndex + 1} de {timelineItems.length}
            </span>
            <span>{formatTimecode(totalDuration)}</span>
          </div>

          {/* Interactive Multi-Scene Timeline Blocks */}
          <div
            ref={timelineRef}
            onClick={handleTimelineClick}
            className="relative w-full h-7 bg-surface-raised rounded-lg border border-surface-edge cursor-pointer overflow-hidden flex items-stretch p-0.5 group"
          >
            {timelineItems.map((item, idx) => {
              const widthPct = totalDuration > 0 ? (item.duration / totalDuration) * 100 : 0;
              const isCurrent = idx === currentItemIndex;

              return (
                <div
                  key={item.id}
                  style={{ width: `${widthPct}%` }}
                  className={`relative border-r border-black/40 transition-colors flex items-center justify-center px-1 overflow-hidden ${
                    isCurrent ? 'opacity-100 ring-2 ring-white z-10' : 'opacity-70 hover:opacity-90'
                  }`}
                  title={`${item.sceneTitle} - ${item.shotName} (${item.duration}s)`}
                >
                  <div
                    className="absolute inset-0"
                    style={{ backgroundColor: item.sceneColor || '#3b82f6', opacity: 0.35 }}
                  />
                  <span className="relative text-[9px] font-bold text-white truncate pointer-events-none">
                    {item.shotName}
                  </span>
                </div>
              );
            })}

            {/* Playhead Marker */}
            {totalDuration > 0 && (
              <div
                className="absolute top-0 bottom-0 w-1 bg-accent-amber shadow-lg z-20 pointer-events-none transition-all"
                style={{ left: `${(currentTime / totalDuration) * 100}%` }}
              >
                <div className="w-2.5 h-2.5 bg-accent-amber rounded-full -ml-[3px] -mt-1 shadow" />
              </div>
            )}
          </div>
        </div>

        {/* Playback Controls Toolbar */}
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLoop((l) => !l)}
              className={`p-1.5 rounded-lg border text-xs transition-all ${
                loop
                  ? 'bg-accent-blue/20 border-accent-blue/40 text-accent-blue'
                  : 'bg-surface border-surface-edge text-text-muted hover:text-white'
              }`}
              title="Bucle continuo (Loop)"
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setKenBurns((k) => !k)}
              className={`p-1.5 rounded-lg border text-xs transition-all ${
                kenBurns
                  ? 'bg-accent-amber/20 border-accent-amber/40 text-accent-amber'
                  : 'bg-surface border-surface-edge text-text-muted hover:text-white'
              }`}
              title="Efecto Ken Burns (Zoom Cinematográfico)"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Central Transport Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrevShot}
              className="p-2 rounded-xl bg-surface border border-surface-edge text-text-muted hover:text-white hover:bg-surface-hover transition-all"
              title="Toma Anterior (← / J)"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsPlaying((p) => !p)}
              className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-accent-blue to-accent-violet hover:opacity-95 text-white flex items-center justify-center shadow-lg shadow-accent-blue/25 transition-all transform active:scale-95"
              title="Reproducir / Pausar (Espacio)"
            >
              {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
            </button>

            <button
              onClick={handleNextShot}
              className="p-2 rounded-xl bg-surface border border-surface-edge text-text-muted hover:text-white hover:bg-surface-hover transition-all"
              title="Toma Siguiente (→ / L)"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-2xs text-text-muted font-mono">Velocidad:</span>
            <div className="flex items-center bg-surface border border-surface-edge rounded-lg p-0.5 text-xs">
              {[0.75, 1.0, 1.25, 1.5].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-1.5 py-0.5 rounded text-2xs font-mono font-semibold transition-all ${
                    speed === s
                      ? 'bg-accent-blue text-white shadow-sm'
                      : 'text-text-muted hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
