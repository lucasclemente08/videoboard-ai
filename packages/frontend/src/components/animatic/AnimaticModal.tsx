import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Maximize2, Minimize2, X, Repeat, Settings, Sliders,
  Film, Clock, Layers, Sparkles, Camera, Sun, HelpCircle,
  BookOpen, Music, Users, Clapperboard, Tag, Compass,
  ChevronRight, Volume1
} from 'lucide-react';
import type { Scene, Shot, Project } from '@videoboard/shared';
import { useAuthStore } from '../../stores/useAuthStore';

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  project?: Project | null;
  projectTitle?: string;
  scenes: Scene[];
  initialSceneId?: string | null;
}

export function AnimaticModal({ open, onClose, projectId, project, projectTitle, scenes, initialSceneId }: Props) {
  const { token } = useAuthStore();
  const [shots, setShots] = useState<Shot[]>([]);
  const [characters, setCharacters] = useState<any[]>([]);
  const [musicTracks, setMusicTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0); // in seconds
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '2.39:1' | '4:3'>('16:9');
  const [speed, setSpeed] = useState<number>(1.0);
  const [loop, setLoop] = useState(false);
  const [voiceoverEnabled, setVoiceoverEnabled] = useState(true);
  const [showTechnicalHUD, setShowTechnicalHUD] = useState(true);
  const [showContextDrawer, setShowContextDrawer] = useState(false);
  const [showIntroSlate, setShowIntroSlate] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.35);
  const [kenBurns, setKenBurns] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const currentNarratedShotId = useRef<string | null>(null);
  const lastNarratedSceneId = useRef<string | null>(null);

  // 1. Fetch all shots, characters, and music for the project
  useEffect(() => {
    if (!open || !projectId) return;
    setLoading(true);

    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    // 1. Fetch shots
    fetch(`/api/shots?project_id=${projectId}`, { headers })
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setShots(json.data);
        }
      })
      .catch((err) => console.error('Error cargando tomas para animatic:', err))
      .finally(() => setLoading(false));

    // 2. Fetch characters for narrative context
    fetch(`/api/characters?project_id=${projectId}`, { headers })
      .then((r) => r.json())
      .then((json) => {
        if (json.data && Array.isArray(json.data)) setCharacters(json.data);
      })
      .catch(() => {});

    // 3. Fetch music tracks for atmospheric audio
    fetch(`/api/music?project_id=${projectId}`, { headers })
      .then((r) => r.json())
      .then((json) => {
        if (json.data && Array.isArray(json.data)) setMusicTracks(json.data);
      })
      .catch(() => {});
  }, [open, projectId, token]);

  // 2. Build flattened timeline items with rich project & scene context
  const timelineItems = useMemo(() => {
    if (!scenes || scenes.length === 0) return [];
    const sortedScenes = [...scenes].sort((a, b) => a.sort_order - b.sort_order);

    const items: Array<{
      id: string;
      sceneId: string;
      sceneTitle: string;
      sceneColor: string;
      sceneObjective?: string | null;
      sceneEmotion?: string | null;
      sceneType?: string | null;
      sceneTags?: string[];
      sceneDescription?: string | null;
      shotName: string;
      description: string;
      duration: number; // in seconds
      startTime: number;
      endTime: number;
      mediaUrl: string | null;
      mediaType: string;
      lens?: string;
      shotType?: string;
      movement?: string;
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
        const dur = Math.max(sc.estimated_duration_secs || 5, 2);
        items.push({
          id: `sc-dummy-${sc.id}`,
          sceneId: sc.id,
          sceneTitle: sc.title,
          sceneColor: sc.color || '#3B82F6',
          sceneObjective: sc.objective || null,
          sceneEmotion: (sc as any).emotion || null,
          sceneType: sc.scene_type || 'standard',
          sceneTags: sc.tags || [],
          sceneDescription: sc.description || null,
          shotName: 'Escena General',
          description: sc.description || sc.objective || '',
          duration: dur,
          startTime: runningTime,
          endTime: runningTime + dur,
          mediaUrl: null,
          mediaType: 'none',
          lens: '35mm',
          shotType: sc.scene_type || 'Plano General',
          movement: 'Estático',
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
            sceneObjective: sc.objective || null,
            sceneEmotion: (sc as any).emotion || null,
            sceneType: sc.scene_type || 'standard',
            sceneTags: sc.tags || [],
            sceneDescription: sc.description || null,
            shotName: sh.name,
            description: sh.description || '',
            duration: dur,
            startTime: runningTime,
            endTime: runningTime + dur,
            mediaUrl: mUrl,
            mediaType: mType,
            lens: (sh as any).camera_setup?.lens || sh.lens,
            shotType: sh.shot_type || 'Plano Medio',
            movement: sh.movement || 'Estático',
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

  // Jump to initialSceneId if specified
  useEffect(() => {
    if (!open || !initialSceneId || timelineItems.length === 0) return;
    const target = timelineItems.find((it) => it.sceneId === initialSceneId);
    if (target) {
      setCurrentTime(target.startTime);
    }
  }, [open, initialSceneId, timelineItems]);

  // Background music audio sync
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = musicVolume;
    if (isPlaying && musicEnabled && musicTracks.length > 0 && musicTracks[0].file_url) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, musicEnabled, musicTracks, musicVolume]);

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

  // Trigger browser Speech Synthesis (TTS) when shot changes, including scene context
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

        // Check if scene changed to announce scene context
        const isNewScene = !lastNarratedSceneId.current || lastNarratedSceneId.current !== currentItem.sceneId;
        lastNarratedSceneId.current = currentItem.sceneId;

        let narration = '';
        if (isNewScene && currentItem.sceneTitle) {
          narration += `${currentItem.sceneTitle}. `;
          if (currentItem.sceneObjective) {
            narration += `Objetivo: ${currentItem.sceneObjective}. `;
          }
        }
        narration += currentItem.description || currentItem.shotName;

        if (narration && narration.length > 2) {
          const utterance = new SpeechSynthesisUtterance(narration);
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

  // Keyboard shortcuts (Space: play, Arrows/J/L: nav, F: fullscreen, C: context, I: intro, M: music)
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
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        setShowContextDrawer((v) => !v);
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        setShowIntroSlate((v) => !v);
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setMusicEnabled((m) => !m);
      } else if (e.code === 'Escape') {
        if (isFullscreen) {
          document.exitFullscreen?.();
          setIsFullscreen(false);
        } else if (showContextDrawer) {
          setShowContextDrawer(false);
        } else if (showIntroSlate) {
          setShowIntroSlate(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, isFullscreen, showContextDrawer, showIntroSlate, currentItemIndex, timelineItems]);

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
            onClick={() => setShowContextDrawer((v) => !v)}
            className={`p-2 rounded-lg border transition-all text-xs flex items-center gap-1.5 ${
              showContextDrawer
                ? 'bg-accent-blue/25 border-accent-blue/50 text-accent-blue'
                : 'bg-surface border-surface-edge text-text-muted hover:text-white'
            }`}
            title="Biblia de Producción & Contexto del Proyecto (C)"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-2xs font-semibold">Contexto</span>
          </button>

          <button
            onClick={() => setShowIntroSlate((v) => !v)}
            className={`p-2 rounded-lg border transition-all text-xs flex items-center gap-1.5 ${
              showIntroSlate
                ? 'bg-accent-amber/25 border-accent-amber/50 text-accent-amber'
                : 'bg-surface border-surface-edge text-text-muted hover:text-white'
            }`}
            title="Claqueta de Presentación Oficial del Proyecto (I)"
          >
            <Clapperboard className="w-3.5 h-3.5" />
            <span className="hidden md:inline text-2xs font-semibold">Claqueta</span>
          </button>

          {musicTracks.length > 0 && (
            <button
              onClick={() => setMusicEnabled((m) => !m)}
              className={`p-2 rounded-lg border transition-all text-xs flex items-center gap-1.5 ${
                musicEnabled
                  ? 'bg-accent-green/25 border-accent-green/50 text-accent-green'
                  : 'bg-surface border-surface-edge text-text-muted hover:text-white'
              }`}
              title={musicEnabled ? 'Pausar música ambiental (M)' : 'Activar música ambiental (M)'}
            >
              <Music className="w-3.5 h-3.5" />
              <span className="hidden md:inline text-2xs font-semibold">Música</span>
            </button>
          )}

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
            /* Modern Cinematographic Slate Placeholder with Full Project & Scene Context */
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-[#11131a] to-[#0a0b10] border border-white/5 relative">
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <div
                  className="px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase text-white shadow-sm"
                  style={{ backgroundColor: currentItem?.sceneColor || '#3b82f6' }}
                >
                  {currentItem?.sceneTitle || 'Escena'}
                </div>
                {currentItem?.sceneEmotion && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-accent-amber/20 text-accent-amber border border-accent-amber/30">
                    🎭 {currentItem.sceneEmotion}
                  </span>
                )}
              </div>

              {/* Project Title Watermark in Slate */}
              {(project?.title || projectTitle) && (
                <div className="absolute top-4 right-4 text-[10px] font-mono tracking-widest uppercase text-white/30 truncate max-w-xs">
                  {project?.title || projectTitle}
                </div>
              )}

              {/* Dramatic Objective Context Banner */}
              {currentItem?.sceneObjective && (
                <div className="max-w-md mb-3 px-3.5 py-1.5 rounded-full bg-accent-amber/15 border border-accent-amber/30 text-amber-200 text-xs shadow-sm flex items-center gap-1.5">
                  <span className="font-bold text-accent-amber">🎯 Objetivo:</span>
                  <span className="truncate">{currentItem.sceneObjective}</span>
                </div>
              )}

              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-white/40 shadow-inner">
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
                {currentItem?.movement && (
                  <span className="px-2 py-0.5 rounded bg-accent-violet/20 text-accent-violet border border-accent-violet/30 text-xs font-semibold">
                    {currentItem.movement}
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
                <p className="max-w-md text-sm text-text-muted italic bg-black/50 px-4 py-2.5 rounded-xl border border-white/10 shadow-lg">
                  &ldquo;{currentItem.description}&rdquo;
                </p>
              )}
            </div>
          )}

          {/* Director's Technical & Narrative HUD Overlay (Upper Left) */}
          <AnimatePresence>
            {showTechnicalHUD && currentItem && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="absolute top-4 left-4 z-10 bg-black/80 backdrop-blur-md border border-white/15 rounded-xl p-3 max-w-sm space-y-2 pointer-events-none shadow-2xl"
              >
                {/* Scene Header & Emotion */}
                <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: currentItem.sceneColor }}
                    />
                    <span className="text-2xs font-bold text-white uppercase tracking-wider truncate">
                      {currentItem.sceneTitle}
                    </span>
                  </div>
                  {currentItem.sceneEmotion && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-accent-amber/20 text-accent-amber border border-accent-amber/30 shrink-0">
                      🎭 {currentItem.sceneEmotion}
                    </span>
                  )}
                </div>

                {/* Scene Objective (Dramaturgical Context) */}
                {currentItem.sceneObjective && (
                  <div className="text-[11px] text-amber-200/90 leading-snug">
                    <span className="font-semibold text-amber-400">🎯 Objetivo: </span>
                    {currentItem.sceneObjective}
                  </div>
                )}

                {/* Shot Details & Camera Movement */}
                <div className="space-y-1">
                  <div className="text-xs font-bold text-accent-blue flex items-center justify-between gap-1.5">
                    <span className="truncate">{currentItem.shotName}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {currentItem.cameraLetter && (
                        <span className="px-1 rounded bg-accent-violet text-[9px] text-white font-mono font-bold">
                          CÁM {currentItem.cameraLetter}
                        </span>
                      )}
                      {currentItem.movement && (
                        <span className="px-1 rounded bg-white/10 text-[9px] text-white/80 font-mono">
                          {currentItem.movement}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Technical Specs */}
                  <div className="text-[10px] text-text-secondary font-mono flex flex-wrap items-center gap-x-2 gap-y-0.5 border-t border-white/10 pt-1">
                    {currentItem.lens && <span>🎥 {currentItem.lens}</span>}
                    {currentItem.shotType && <span>📐 {currentItem.shotType}</span>}
                    {currentItem.cameraSetup?.aperture && <span>⭕ {currentItem.cameraSetup.aperture}</span>}
                    {currentItem.cameraSetup?.iso && <span>ISO {currentItem.cameraSetup.iso}</span>}
                    {currentItem.lightingSetup?.key_light?.type && (
                      <span className="text-accent-amber w-full truncate">
                        💡 {currentItem.lightingSetup.key_light.type}
                      </span>
                    )}
                  </div>

                  {/* Scene Tags */}
                  {currentItem.sceneTags && currentItem.sceneTags.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap pt-0.5">
                      {currentItem.sceneTags.map((tag) => (
                        <span key={tag} className="text-[8px] font-bold px-1 py-0.2 rounded bg-white/5 border border-white/10 text-white/60">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Intro Slate (Cinematic Production Title Card) */}
          <AnimatePresence>
            {showIntroSlate && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="absolute inset-0 z-20 bg-black/92 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center"
              >
                <div className="max-w-xl space-y-5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-blue to-accent-violet mx-auto flex items-center justify-center shadow-xl shadow-accent-blue/25">
                    <Film className="w-7 h-7 text-white" />
                  </div>

                  <div className="space-y-2">
                    <span className="text-2xs font-mono uppercase tracking-widest text-accent-blue font-bold">
                      PRODUCCIÓN AUDIOVISUAL &bull; {project?.template_category ? project.template_category.toUpperCase() : 'STORYBOARD'}
                    </span>
                    <h1 className="text-2xl sm:text-4xl font-black text-white tracking-wide uppercase">
                      {project?.title || projectTitle}
                    </h1>
                    {project?.description && (
                      <p className="text-sm text-text-muted max-w-lg mx-auto italic leading-relaxed pt-1">
                        &ldquo;{project.description}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-center gap-3 text-xs font-mono text-text-secondary border-y border-white/10 py-3">
                    <div><strong className="text-white">{scenes.length}</strong> Escenas</div>
                    <div>&bull;</div>
                    <div><strong className="text-white">{timelineItems.length}</strong> Planos</div>
                    <div>&bull;</div>
                    <div><strong className="text-white">{Math.round(totalDuration)}s</strong> Duración</div>
                    <div>&bull;</div>
                    <div><strong className="text-white">{aspectRatio}</strong> Formato</div>
                  </div>

                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => {
                        setShowIntroSlate(false);
                        setIsPlaying(true);
                      }}
                      className="px-6 py-2.5 rounded-xl bg-accent-blue text-white font-bold text-sm hover:bg-accent-blue/90 transition-all flex items-center gap-2 shadow-lg shadow-accent-blue/30"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Comenzar Reproducción</span>
                    </button>
                    <button
                      onClick={() => setShowIntroSlate(false)}
                      className="px-4 py-2.5 rounded-xl bg-white/10 text-white/80 hover:text-white hover:bg-white/15 transition-all text-xs font-semibold"
                    >
                      Cerrar Claqueta
                    </button>
                  </div>
                </div>
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

      {/* Context Drawer & Production Bible */}
      <AnimatePresence>
        {showContextDrawer && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute right-0 top-14 bottom-28 w-80 sm:w-96 z-40 bg-[#0e1017]/95 backdrop-blur-2xl border-l border-surface-edge p-5 overflow-y-auto space-y-5 shadow-2xl"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-surface-edge pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-accent-blue" />
                <h3 className="text-sm font-bold text-white tracking-wide">Contexto del Proyecto</h3>
              </div>
              <button
                onClick={() => setShowContextDrawer(false)}
                className="p-1 rounded-lg text-text-muted hover:text-white hover:bg-surface"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Project Overview */}
            <div className="space-y-2">
              <div className="text-2xs uppercase tracking-wider text-text-muted font-bold">
                Proyecto & Sinopsis
              </div>
              <div className="p-3.5 rounded-xl bg-surface/70 border border-surface-edge space-y-2">
                <h4 className="text-sm font-bold text-white">{project?.title || projectTitle}</h4>
                {project?.description ? (
                  <p className="text-xs text-text-muted leading-relaxed italic">
                    &ldquo;{project.description}&rdquo;
                  </p>
                ) : (
                  <p className="text-xs text-text-muted italic">Sin sinopsis registrada</p>
                )}
                <div className="flex items-center gap-2 pt-1 text-[11px] text-text-secondary font-mono border-t border-white/5">
                  <span>{scenes.length} escenas</span> &bull; <span>{timelineItems.length} tomas</span> &bull; <span>{Math.round(totalDuration)}s</span>
                </div>
              </div>
            </div>

            {/* Active Scene Context */}
            {currentItem && (
              <div className="space-y-2">
                <div className="text-2xs uppercase tracking-wider text-text-muted font-bold flex items-center justify-between">
                  <span>Escena Activa</span>
                  <span className="text-accent-blue font-semibold">Toma {currentItemIndex + 1}/{timelineItems.length}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-surface/70 border border-surface-edge space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: currentItem.sceneColor }} />
                    <span className="text-sm font-bold text-white truncate">{currentItem.sceneTitle}</span>
                  </div>

                  {currentItem.sceneObjective && (
                    <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg leading-relaxed">
                      <strong className="text-amber-400 block mb-0.5 text-2xs uppercase tracking-wider">Objetivo Dramático:</strong>
                      {currentItem.sceneObjective}
                    </div>
                  )}

                  {currentItem.sceneEmotion && (
                    <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                      <span className="text-2xs uppercase tracking-wider text-text-muted">Emoción:</span>
                      <span className="font-semibold text-white">🎭 {currentItem.sceneEmotion}</span>
                    </div>
                  )}

                  {currentItem.description && (
                    <div className="text-xs text-text-muted bg-black/40 p-2.5 rounded-lg border border-white/5">
                      <strong className="text-white/70 block mb-0.5 text-2xs uppercase tracking-wider">Acción / Diálogo:</strong>
                      {currentItem.description}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Characters List */}
            {characters.length > 0 && (
              <div className="space-y-2">
                <div className="text-2xs uppercase tracking-wider text-text-muted font-bold flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-accent-violet" />
                  <span>Personajes ({characters.length})</span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {characters.map((char) => (
                    <div key={char.id} className="p-2 rounded-lg bg-surface/50 border border-surface-edge flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-accent-violet/20 text-accent-violet font-bold flex items-center justify-center text-xs shrink-0">
                        {char.avatar_url ? (
                          <img src={char.avatar_url} alt={char.name} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          char.name?.[0] || 'P'
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-white truncate">{char.name}</div>
                        <div className="text-[10px] text-text-muted truncate">{char.role || char.actor_name || 'Personaje'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Music / Atmosphere Control */}
            {musicTracks.length > 0 && (
              <div className="space-y-2">
                <div className="text-2xs uppercase tracking-wider text-text-muted font-bold flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5 text-accent-green" />
                  <span>Banda Sonora</span>
                </div>
                <div className="p-3 rounded-xl bg-surface/60 border border-surface-edge space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white truncate">{musicTracks[0].name || 'Pista de Audio'}</span>
                    <button
                      onClick={() => setMusicEnabled((m) => !m)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                        musicEnabled
                          ? 'bg-accent-green/20 text-accent-green border-accent-green/40'
                          : 'bg-surface text-text-muted border-surface-edge hover:text-white'
                      }`}
                    >
                      {musicEnabled ? 'Activa' : 'Pausada'}
                    </button>
                  </div>
                  {musicEnabled && (
                    <div className="flex items-center gap-2 text-2xs text-text-muted pt-1">
                      <Volume1 className="w-3.5 h-3.5 shrink-0" />
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={musicVolume}
                        onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                        className="w-full accent-accent-green h-1 bg-surface-raised rounded-lg cursor-pointer"
                      />
                      <span className="font-mono text-[9px] w-6">{Math.round(musicVolume * 100)}%</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Scene Index & Fast Jump */}
            <div className="space-y-2">
              <div className="text-2xs uppercase tracking-wider text-text-muted font-bold">
                Índice de Escenas
              </div>
              <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                {scenes.map((sc) => {
                  const firstItemOfScene = timelineItems.find((it) => it.sceneId === sc.id);
                  const isCurrentScene = currentItem?.sceneId === sc.id;
                  return (
                    <button
                      key={sc.id}
                      onClick={() => {
                        if (firstItemOfScene) setCurrentTime(firstItemOfScene.startTime);
                      }}
                      className={`w-full text-left p-2 rounded-lg border transition-all flex items-center justify-between text-xs ${
                        isCurrentScene
                          ? 'bg-accent-blue/15 border-accent-blue/40 text-white font-semibold'
                          : 'bg-surface/40 border-surface-edge text-text-muted hover:text-white hover:bg-surface'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sc.color || '#3b82f6' }} />
                        <span className="truncate">{sc.title}</span>
                      </div>
                      <span className="text-[10px] font-mono shrink-0 text-text-muted ml-2">
                        {sc.estimated_duration_secs || 5}s
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Audio element for project background music */}
      {musicTracks.length > 0 && musicTracks[0].file_url && (
        <audio
          ref={audioRef}
          src={musicTracks[0].file_url}
          loop
          preload="auto"
        />
      )}
    </div>,
    document.body
  );
}
