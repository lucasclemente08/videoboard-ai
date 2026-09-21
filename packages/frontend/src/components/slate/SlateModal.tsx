import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Maximize2, Minimize2, Volume2, VolumeX, Check, AlertCircle,
  Play, Square, ChevronLeft, ChevronRight, Plus, Minus, RotateCcw,
  Download, Copy, Trash2, Star, Clock, FileSpreadsheet, Film,
  Sun, Moon, Shield, Sparkles, Sliders
} from 'lucide-react';
import { clsx } from 'clsx';
import type { Scene, Shot, ShotTake, TakeStatus } from '@videoboard/shared';
import { useAuthStore } from '../../stores/useAuthStore';

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle?: string;
  scenes: Scene[];
  initialSceneId?: string | null;
  initialShotId?: string | null;
}

export function SlateModal({
  open,
  onClose,
  projectId,
  projectTitle = 'VideoBoard Production',
  scenes,
  initialSceneId,
  initialShotId,
}: Props) {
  const { token } = useAuthStore();

  // Selected Scene and Shot
  const sortedScenes = useMemo(() => [...scenes].sort((a, b) => a.sort_order - b.sort_order), [scenes]);
  const [selectedSceneId, setSelectedSceneId] = useState<string>('');
  const [shots, setShots] = useState<Shot[]>([]);
  const [loadingShots, setLoadingShots] = useState(false);
  const [selectedShotId, setSelectedShotId] = useState<string>('');

  // Slate Slate State
  const [roll, setRoll] = useState('A01');
  const [takeNumber, setTakeNumber] = useState(1);
  const [director, setDirector] = useState('Director');
  const [dop, setDop] = useState('Director de Fotografía');
  const [fps, setFps] = useState<number>(24);
  const [isDay, setIsDay] = useState(true);
  const [isInt, setIsInt] = useState(true);
  const [isSync, setIsSync] = useState(true); // Sync vs MOS
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Clapper physical animation & visual flash
  const [isClapping, setIsClapping] = useState(false);
  const [showFlash, setShowFlash] = useState(false);

  // Recording State (Rolling)
  const [isRolling, setIsRolling] = useState(false);
  const [rollStartTime, setRollStartTime] = useState<number | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [timecodeStr, setTimecodeStr] = useState('00:00:00:00');
  const timerIntervalRef = useRef<any>(null);

  // Take Logging Verdict Modal/Form
  const [showVerdictModal, setShowVerdictModal] = useState(false);
  const [lastTakeDuration, setLastTakeDuration] = useState(0);
  const [takeVerdict, setTakeVerdict] = useState<TakeStatus>('good');
  const [takeReason, setTakeReason] = useState<string>('');
  const [takeNotes, setTakeNotes] = useState('');
  const [savingTake, setSavingTake] = useState(false);

  // Current Takes List for Selected Shot
  const [takesList, setTakesList] = useState<ShotTake[]>([]);
  const [activeTab, setActiveTab] = useState<'slate' | 'log'>('slate');
  const [copiedLog, setCopiedLog] = useState(false);

  // Live Clock
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [currentDateStr, setCurrentDateStr] = useState('');

  // Container Ref for Fullscreen
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize selected scene and shot
  useEffect(() => {
    if (!open) return;
    if (initialSceneId && scenes.some((s) => s.id === initialSceneId)) {
      setSelectedSceneId(initialSceneId);
    } else if (sortedScenes.length > 0) {
      setSelectedSceneId(sortedScenes[0].id);
    }

    // Load saved director and dop from localStorage
    try {
      const savedDirector = localStorage.getItem(`vb_director_${projectId}`);
      if (savedDirector) setDirector(savedDirector);
      const savedDop = localStorage.getItem(`vb_dop_${projectId}`);
      if (savedDop) setDop(savedDop);
      const savedRoll = localStorage.getItem(`vb_roll_${projectId}`);
      if (savedRoll) setRoll(savedRoll);
    } catch {}
  }, [open, initialSceneId, scenes, sortedScenes, projectId]);

  // Fetch shots when scene changes
  useEffect(() => {
    if (!open || !selectedSceneId) return;
    setLoadingShots(true);
    fetch(`/api/shots?scene_id=${selectedSceneId}`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          const sorted = (json.data as Shot[]).sort((a, b) => a.sort_order - b.sort_order);
          setShots(sorted);
          if (initialShotId && sorted.some((s) => s.id === initialShotId)) {
            setSelectedShotId(initialShotId);
          } else if (sorted.length > 0) {
            setSelectedShotId(sorted[0].id);
          } else {
            setSelectedShotId('');
          }
        }
      })
      .catch((err) => console.error('Error cargando tomas:', err))
      .finally(() => setLoadingShots(false));
  }, [open, selectedSceneId, initialShotId, token]);

  // Update takes list when selected shot changes
  const activeShot = useMemo(() => shots.find((s) => s.id === selectedShotId), [shots, selectedShotId]);
  useEffect(() => {
    if (activeShot) {
      const existing = (activeShot as any).takes || [];
      setTakesList(existing);
      setTakeNumber(existing.length + 1);
    } else {
      setTakesList([]);
      setTakeNumber(1);
    }
  }, [activeShot]);

  // Live real clock updates
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setCurrentTimeStr(d.toTimeString().split(' ')[0]);
      setCurrentDateStr(d.toLocaleDateString());
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Web Audio 1000Hz Sync Tone
  const playSyncTone = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000, ctx.currentTime); // Standard 1kHz calibration tone

      gain.gain.setValueAtTime(1.0, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05); // 50ms sharp clap beep

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {
      console.warn('Audio tone error:', e);
    }
  }, [soundEnabled]);

  // Execute Clap
  const triggerClap = useCallback(() => {
    if (isClapping) return;
    setIsClapping(true);
    setShowFlash(true);
    playSyncTone();

    setTimeout(() => {
      setShowFlash(false);
    }, 70);

    setTimeout(() => {
      setIsClapping(false);
    }, 280);
  }, [isClapping, playSyncTone]);

  // Format seconds to SMPTE Timecode
  const formatTimecode = useCallback((seconds: number, rate = 24) => {
    const totalFrames = Math.floor(seconds * rate);
    const ff = totalFrames % rate;
    const totalSeconds = Math.floor(seconds);
    const ss = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const mm = totalMinutes % 60;
    const hh = Math.floor(totalMinutes / 60);

    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(hh)}:${pad(mm)}:${pad(ss)}:${pad(ff)}`;
  }, []);

  // Ensure at least one scene and shot exist for the project
  const ensureSceneAndShot = async (): Promise<{ sceneId: string; shotId: string } | null> => {
    let scId = selectedSceneId;
    let shId = selectedShotId;

    if (!scId) {
      try {
        const scRes = await fetch('/api/scenes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            project_id: projectId,
            title: 'Escena 1',
            sort_order: 0,
          }),
        });
        const scJson = await scRes.json();
        if (scJson.data) {
          scId = scJson.data.id;
          setSelectedSceneId(scId);
        }
      } catch (err) {
        console.error('Error auto-creando escena:', err);
      }
    }

    if (scId && !shId) {
      try {
        const shRes = await fetch('/api/shots', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            scene_id: scId,
            name: 'Plano 1',
            sort_order: 0,
          }),
        });
        const shJson = await shRes.json();
        if (shJson.data) {
          shId = shJson.data.id;
          setSelectedShotId(shId);
          setShots([shJson.data]);
        }
      } catch (err) {
        console.error('Error auto-creando plano:', err);
      }
    }

    return scId && shId ? { sceneId: scId, shotId: shId } : null;
  };

  // Toggle Recording (Roll / Cut)
  const toggleRecording = async () => {
    if (!isRolling) {
      // Ensure we have an active scene and shot to record to
      let currentShot = selectedShotId;
      if (!currentShot) {
        const created = await ensureSceneAndShot();
        if (created) {
          currentShot = created.shotId;
        }
      }

      // START ROLLING
      setIsRolling(true);
      const start = Date.now();
      setRollStartTime(start);
      setRecordedDuration(0);

      // Trigger automatic sync clap at roll start
      triggerClap();

      timerIntervalRef.current = setInterval(() => {
        const elapsedSecs = (Date.now() - start) / 1000;
        setRecordedDuration(elapsedSecs);
        setTimecodeStr(formatTimecode(elapsedSecs, fps));
      }, 1000 / fps);
    } else {
      // CUT!
      setIsRolling(false);
      clearInterval(timerIntervalRef.current);
      const finalDur = Math.max(Math.round(recordedDuration * 10) / 10, 0.5);
      setLastTakeDuration(finalDur);
      setShowVerdictModal(true);
    }
  };

  // Clean up interval
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // Save Take to Backend
  const handleSaveTake = async () => {
    if (!selectedShotId) {
      setShowVerdictModal(false);
      return;
    }
    setSavingTake(true);
    try {
      const payload = {
        take_number: takeNumber,
        status: takeVerdict,
        duration_seconds: lastTakeDuration,
        timecode: timecodeStr,
        notes: takeNotes || null,
        reason: takeReason || null,
      };

      const res = await fetch(`/api/shots/${selectedShotId}/takes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.data && json.data.take) {
        const newTake = json.data.take;
        setTakesList((prev) => [...prev, newTake]);

        // Update local shot object in shots list
        setShots((prev) =>
          prev.map((sh) => (sh.id === selectedShotId ? { ...sh, takes: [...(sh.takes || []), newTake] } : sh))
        );

        // Advance take number for next recording
        setTakeNumber((prev) => prev + 1);
      }
    } catch (err) {
      console.error('Error guardando toma:', err);
    } finally {
      setSavingTake(false);
      setShowVerdictModal(false);
      setTakeNotes('');
      setTakeReason('');
      setRecordedDuration(0);
      setTimecodeStr('00:00:00:00');
    }
  };

  // Delete Take
  const handleDeleteTake = async (takeId: string) => {
    if (!selectedShotId) return;
    try {
      await fetch(`/api/shots/${selectedShotId}/takes/${takeId}`, {
        method: 'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      setTakesList((prev) => prev.filter((t) => t.id !== takeId));
      setShots((prev) =>
        prev.map((sh) =>
          sh.id === selectedShotId
            ? { ...sh, takes: (sh.takes || []).filter((t) => t.id !== takeId) }
            : sh
        )
      );
    } catch (e) {
      console.error('Error eliminando toma:', e);
    }
  };

  // Keyboard Spacebar Trigger (Clap or Roll/Cut)
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (isRolling) {
          toggleRecording();
        } else {
          triggerClap();
        }
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        toggleRecording();
      } else if (e.key === 'Escape') {
        if (showVerdictModal) {
          setShowVerdictModal(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, isRolling, showVerdictModal, onClose, triggerClap]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Export Script Supervisor Log to CSV
  const handleExportCSV = () => {
    const activeScene = sortedScenes.find((s) => s.id === selectedSceneId);
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Proyecto,Escena,Plano,Toma Nro,Estado,Duracion (s),Timecode,Motivo,Notas,Fecha\n';

    shots.forEach((sh) => {
      const shTakes: ShotTake[] = (sh as any).takes || [];
      shTakes.forEach((tk) => {
        const row = [
          `"${projectTitle}"`,
          `"${activeScene?.title || ''}"`,
          `"${sh.name}"`,
          tk.take_number,
          tk.status === 'good' ? 'BUENA (Circled)' : tk.status === 'hold' ? 'RESPALDO (Hold)' : 'NO GOOD (NG)',
          tk.duration_seconds,
          `"${tk.timecode}"`,
          `"${tk.reason || ''}"`,
          `"${(tk.notes || '').replace(/"/g, '""')}"`,
          `"${tk.created_at}"`,
        ].join(',');
        csvContent += row + '\n';
      });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reporte_rodaje_${projectTitle.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeSceneObj = sortedScenes.find((s) => s.id === selectedSceneId);

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      <div
        ref={containerRef}
        className="fixed inset-0 z-[99999] bg-black flex flex-col font-mono select-none overflow-hidden"
      >
        {/* White Optical Sync Flash */}
        <AnimatePresence>
          {showFlash && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.04 }}
              className="absolute inset-0 bg-white z-[999] pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* Top Control Bar */}
        <div className="h-12 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between px-4 text-xs shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-white font-bold tracking-wider">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
              <span>SMART SLATE & SCRIPT SUPERVISOR</span>
            </div>
            <span className="text-neutral-500">|</span>
            <span className="text-neutral-400 truncate max-w-xs">{projectTitle}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* View Selector (Slate / Take Log) */}
            <div className="bg-neutral-800 p-0.5 rounded-lg flex items-center text-2xs mr-2">
              <button
                onClick={() => setActiveTab('slate')}
                className={clsx(
                  'px-3 py-1 rounded font-semibold transition-all',
                  activeTab === 'slate' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
                )}
              >
                Claqueta
              </button>
              <button
                onClick={() => setActiveTab('log')}
                className={clsx(
                  'px-3 py-1 rounded font-semibold transition-all flex items-center gap-1.5',
                  activeTab === 'log' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
                )}
              >
                <span>Reporte de Tomas</span>
                {takesList.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-3xs font-bold">
                    {takesList.length}
                  </span>
                )}
              </button>
            </div>

            {/* Audio Tone Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={clsx(
                'p-2 rounded-lg transition-colors',
                soundEnabled ? 'text-amber-400 hover:bg-neutral-800' : 'text-neutral-500 hover:bg-neutral-800'
              )}
              title={soundEnabled ? 'Beep 1kHz Activado' : 'Beep Muteado'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              title="Pantalla Completa"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors ml-1"
              title="Cerrar Claqueta"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MAIN BODY */}
        {activeTab === 'slate' ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 max-w-5xl mx-auto w-full">
            {/* PHYSICAL CLAPPERBOARD CONTAINER */}
            <div className="w-full max-w-4xl bg-black border-4 border-white rounded-2xl shadow-2xl overflow-hidden flex flex-col relative">
              
              {/* 1. CLAPPER HINGED TOP CHEVRON ARM */}
              <div className="relative w-full h-20 md:h-24 bg-neutral-900 border-b-4 border-white flex items-center overflow-hidden cursor-pointer select-none" onClick={triggerClap}>
                {/* Visual Hazard Chevron Striping */}
                <div
                  className="absolute inset-0 opacity-90"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(45deg, #000, #000 24px, #fff 24px, #fff 48px)',
                  }}
                />

                {/* Animated Top Clapper Arm Pivot */}
                <motion.div
                  initial={false}
                  animate={isClapping ? { rotate: 0, y: 0 } : { rotate: -18, y: -14 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 18 }}
                  style={{ originX: 0, originY: 1 }}
                  className="absolute inset-0 border-b-4 border-white shadow-2xl flex items-center"
                >
                  <div
                    className="w-full h-full"
                    style={{
                      backgroundImage:
                        'repeating-linear-gradient(-45deg, #000, #000 24px, #fff 24px, #fff 48px)',
                    }}
                  />
                </motion.div>

                {/* Tap to Clap Overlay Indicator */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="bg-black/80 px-4 py-1 rounded text-white text-xs font-bold tracking-widest uppercase border border-white/30 backdrop-blur-sm">
                    {isClapping ? '¡CLAP!' : 'TOCA AQUÍ O ESPACIO PARA GOLPEAR'}
                  </span>
                </div>
              </div>

              {/* 2. SLATE INFORMATION BOARD */}
              <div className="bg-black p-4 md:p-6 text-white grid grid-cols-12 gap-3 md:gap-4 divide-y md:divide-y-0 md:divide-x divide-neutral-800">
                
                {/* LEFT COL: Production & Technical Headers */}
                <div className="col-span-12 md:col-span-8 flex flex-col gap-4">
                  {/* Production & Director row */}
                  <div className="grid grid-cols-2 gap-3 pb-3 border-b border-neutral-800">
                    <div>
                      <span className="text-3xs text-neutral-400 font-bold uppercase tracking-wider block">PRODUCCIÓN</span>
                      <input
                        type="text"
                        value={projectTitle}
                        readOnly
                        className="bg-transparent text-sm md:text-base font-bold text-white tracking-wide w-full focus:outline-none border-b border-transparent focus:border-white"
                      />
                    </div>
                    <div>
                      <span className="text-3xs text-neutral-400 font-bold uppercase tracking-wider block">DIRECTOR</span>
                      <input
                        type="text"
                        value={director}
                        onChange={(e) => {
                          setDirector(e.target.value);
                          localStorage.setItem(`vb_director_${projectId}`, e.target.value);
                        }}
                        className="bg-transparent text-sm md:text-base font-bold text-amber-400 tracking-wide w-full focus:outline-none border-b border-transparent focus:border-amber-400"
                        placeholder="Nombre Director"
                      />
                    </div>
                  </div>

                  {/* Camera / DoP & Roll */}
                  <div className="grid grid-cols-2 gap-3 pb-3 border-b border-neutral-800">
                    <div>
                      <span className="text-3xs text-neutral-400 font-bold uppercase tracking-wider block">CÁMARA / DOP</span>
                      <input
                        type="text"
                        value={dop}
                        onChange={(e) => {
                          setDop(e.target.value);
                          localStorage.setItem(`vb_dop_${projectId}`, e.target.value);
                        }}
                        className="bg-transparent text-sm md:text-base font-bold text-amber-400 tracking-wide w-full focus:outline-none border-b border-transparent focus:border-amber-400"
                        placeholder="Nombre DoP"
                      />
                    </div>
                    <div>
                      <span className="text-3xs text-neutral-400 font-bold uppercase tracking-wider block">ROLL / TARJETA</span>
                      <input
                        type="text"
                        value={roll}
                        onChange={(e) => {
                          setRoll(e.target.value);
                          localStorage.setItem(`vb_roll_${projectId}`, e.target.value);
                        }}
                        className="bg-transparent text-sm md:text-base font-bold text-emerald-400 tracking-wide w-full focus:outline-none border-b border-transparent focus:border-emerald-400 uppercase"
                        placeholder="A01"
                      />
                    </div>
                  </div>

                  {/* Scene & Shot Selectors */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Scene Selection */}
                    <div className="bg-neutral-900/80 p-3 rounded-xl border border-neutral-800">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-3xs text-neutral-400 font-bold uppercase tracking-wider">ESCENA</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              const currIdx = sortedScenes.findIndex((s) => s.id === selectedSceneId);
                              if (currIdx > 0) setSelectedSceneId(sortedScenes[currIdx - 1].id);
                            }}
                            className="p-1 hover:bg-neutral-800 rounded text-neutral-300"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              const currIdx = sortedScenes.findIndex((s) => s.id === selectedSceneId);
                              if (currIdx < sortedScenes.length - 1) setSelectedSceneId(sortedScenes[currIdx + 1].id);
                            }}
                            className="p-1 hover:bg-neutral-800 rounded text-neutral-300"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <select
                        value={selectedSceneId}
                        onChange={(e) => setSelectedSceneId(e.target.value)}
                        className="w-full bg-black border border-neutral-700 text-white font-bold text-base rounded p-1.5 focus:outline-none focus:border-white"
                      >
                        {sortedScenes.length === 0 ? (
                          <option value="">(Sin escenas creadas)</option>
                        ) : (
                          sortedScenes.map((sc, i) => (
                            <option key={sc.id} value={sc.id}>
                              {i + 1}. {sc.title}
                            </option>
                          ))
                        )}
                      </select>
                      {sortedScenes.length === 0 && (
                        <button
                          type="button"
                          onClick={ensureSceneAndShot}
                          className="mt-1.5 w-full py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-amber-400 text-3xs font-bold transition-colors"
                        >
                          + Crear Escena 1
                        </button>
                      )}
                    </div>

                    {/* Shot Selection */}
                    <div className="bg-neutral-900/80 p-3 rounded-xl border border-neutral-800">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-3xs text-neutral-400 font-bold uppercase tracking-wider">PLANO / TOMA</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              const currIdx = shots.findIndex((s) => s.id === selectedShotId);
                              if (currIdx > 0) setSelectedShotId(shots[currIdx - 1].id);
                            }}
                            className="p-1 hover:bg-neutral-800 rounded text-neutral-300"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              const currIdx = shots.findIndex((s) => s.id === selectedShotId);
                              if (currIdx < shots.length - 1) setSelectedShotId(shots[currIdx + 1].id);
                            }}
                            className="p-1 hover:bg-neutral-800 rounded text-neutral-300"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <select
                        value={selectedShotId}
                        onChange={(e) => setSelectedShotId(e.target.value)}
                        disabled={shots.length === 0}
                        className="w-full bg-black border border-neutral-700 text-white font-bold text-base rounded p-1.5 focus:outline-none focus:border-white disabled:opacity-50"
                      >
                        {shots.length === 0 ? (
                          <option value="">(Sin tomas creadas)</option>
                        ) : (
                          shots.map((sh, i) => (
                            <option key={sh.id} value={sh.id}>
                              Plano {i + 1}: {sh.name} ({sh.lens})
                            </option>
                          ))
                        )}
                      </select>
                      {shots.length === 0 && (
                        <button
                          type="button"
                          onClick={ensureSceneAndShot}
                          className="mt-1.5 w-full py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-emerald-400 text-3xs font-bold transition-colors"
                        >
                          + Crear Plano 1
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Technical Flags (INT/EXT, DAY/NIGHT, SYNC/MOS, FPS) */}
                  <div className="grid grid-cols-4 gap-2 pt-2">
                    <button
                      onClick={() => setIsInt(!isInt)}
                      className={clsx(
                        'py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center',
                        isInt ? 'bg-white text-black border-white' : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                      )}
                    >
                      {isInt ? 'INT' : 'EXT'}
                    </button>
                    <button
                      onClick={() => setIsDay(!isDay)}
                      className={clsx(
                        'py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1',
                        isDay ? 'bg-amber-400 text-black border-amber-400' : 'bg-blue-950 text-blue-300 border-blue-800'
                      )}
                    >
                      {isDay ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                      <span>{isDay ? 'DÍA' : 'NOCHE'}</span>
                    </button>
                    <button
                      onClick={() => setIsSync(!isSync)}
                      className={clsx(
                        'py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center',
                        isSync ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-red-950 text-red-300 border-red-800'
                      )}
                    >
                      {isSync ? 'SYNC' : 'MOS'}
                    </button>
                    <select
                      value={fps}
                      onChange={(e) => setFps(Number(e.target.value))}
                      className="bg-neutral-900 text-white font-bold text-xs rounded-lg px-2 border border-neutral-800 focus:outline-none"
                    >
                      <option value={24}>24 FPS</option>
                      <option value={25}>25 FPS</option>
                      <option value={30}>30 FPS</option>
                      <option value={60}>60 FPS</option>
                      <option value={120}>120 FPS</option>
                    </select>
                  </div>
                </div>

                {/* RIGHT COL: BIG TAKE COUNTER & ROLLING CONTROLS */}
                <div className="col-span-12 md:col-span-4 md:pl-4 flex flex-col justify-between pt-4 md:pt-0">
                  {/* BIG TAKE NUMBER DISPLAY */}
                  <div className="bg-neutral-950 p-4 rounded-2xl border-2 border-white/20 text-center flex flex-col items-center justify-center relative">
                    <span className="text-2xs text-neutral-400 font-bold uppercase tracking-widest mb-1">
                      TAKE / TOMA N°
                    </span>
                    <span className="text-6xl md:text-7xl font-black text-white tracking-tight my-1">
                      {String(takeNumber).padStart(2, '0')}
                    </span>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => setTakeNumber((prev) => Math.max(1, prev - 1))}
                        className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center text-sm font-bold"
                        title="Toma anterior"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setTakeNumber((prev) => prev + 1)}
                        className="px-3 h-8 rounded-lg bg-white text-black font-bold text-xs flex items-center gap-1 hover:bg-neutral-200"
                        title="Siguiente toma"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+1</span>
                      </button>
                      <button
                        onClick={() => setTakeNumber(1)}
                        className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center text-xs"
                        title="Reiniciar a Toma 1"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* TIMECODE CLOCK & DATE */}
                  <div className="my-3 text-center">
                    <div className={clsx('text-xl md:text-2xl font-black font-mono tracking-widest', isRolling ? 'text-red-500 animate-pulse' : 'text-neutral-300')}>
                      {isRolling ? timecodeStr : currentTimeStr}
                    </div>
                    <div className="text-3xs text-neutral-500 tracking-widest mt-0.5">
                      {currentDateStr} • {fps} FPS
                    </div>
                  </div>

                  {/* BIG RED ROLL / CUT BUTTON */}
                  <button
                    onClick={toggleRecording}
                    className={clsx(
                      'w-full py-4 md:py-5 rounded-2xl font-black text-base md:text-lg tracking-wider flex items-center justify-center gap-3 transition-all shadow-xl active:scale-[0.98]',
                      isRolling
                        ? 'bg-red-600 hover:bg-red-700 text-white ring-4 ring-red-600/30 animate-pulse'
                        : 'bg-white hover:bg-neutral-200 text-black'
                    )}
                  >
                    {isRolling ? (
                      <>
                        <Square className="w-6 h-6 fill-current" />
                        <span>CUT! (DETENER)</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-6 h-6 fill-current text-red-600" />
                        <span>ROLL / GRABAR TOMA</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Helper Tips */}
            <div className="mt-4 text-center text-neutral-500 text-2xs flex items-center justify-center gap-4">
              <span>⌨️ Barra espaciadora: {isRolling ? 'Detener (Cut)' : 'Golpe de Claqueta'}</span>
              <span>•</span>
              <span>⌨️ Tecla R: Roll / Grabar</span>
              <span>•</span>
              <span>🔊 Tono 1kHz acústico sincronizado con destello</span>
            </div>
          </div>
        ) : (
          /* SCRIPT SUPERVISOR LOG TABLE */
          <div className="flex-1 flex flex-col p-4 md:p-8 max-w-5xl mx-auto w-full overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Film className="w-5 h-5 text-red-500" />
                  <span>Reporte de Rodaje / Script Supervisor Log</span>
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Registro de tomas realizadas para <strong className="text-white">{activeShot?.name || 'este plano'}</strong> ({activeSceneObj?.title || ''})
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar CSV</span>
                </button>
              </div>
            </div>

            {/* Takes Table */}
            <div className="flex-1 overflow-y-auto mt-4 border border-neutral-800 rounded-xl">
              {takesList.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-neutral-500 text-xs">
                  <Clock className="w-8 h-8 mb-2 opacity-40" />
                  <p>No se han registrado tomas para este plano todavía.</p>
                  <p className="text-neutral-600 text-3xs mt-1">
                    Presiona "ROLL / GRABAR" en la claqueta para comenzar a rodar.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs text-neutral-300">
                  <thead className="bg-neutral-900 text-neutral-400 text-3xs uppercase font-bold sticky top-0 border-b border-neutral-800">
                    <tr>
                      <th className="py-2.5 px-4">Toma #</th>
                      <th className="py-2.5 px-3">Veredicto</th>
                      <th className="py-2.5 px-3">Duración</th>
                      <th className="py-2.5 px-3">Timecode</th>
                      <th className="py-2.5 px-3">Notas de Continuidad</th>
                      <th className="py-2.5 px-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900">
                    {takesList.map((tk) => (
                      <tr key={tk.id} className="hover:bg-neutral-900/50 transition-colors">
                        <td className="py-3 px-4 font-bold text-white">
                          Toma {String(tk.take_number).padStart(2, '0')}
                        </td>
                        <td className="py-3 px-3">
                          {tk.status === 'good' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-2xs border border-emerald-500/30">
                              <Star className="w-3 h-3 fill-current" />
                              <span>CIRCLED (BUENA)</span>
                            </span>
                          )}
                          {tk.status === 'hold' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 font-bold text-2xs border border-amber-500/30">
                              <span>HOLD (RESPALDO)</span>
                            </span>
                          )}
                          {tk.status === 'ng' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 font-bold text-2xs border border-red-500/30">
                              <span>NO GOOD (NG)</span>
                              {tk.reason && <span className="opacity-75">• {tk.reason}</span>}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-neutral-200">
                          {tk.duration_seconds}s
                        </td>
                        <td className="py-3 px-3 font-mono text-neutral-400 text-3xs">
                          {tk.timecode}
                        </td>
                        <td className="py-3 px-3 text-neutral-300 max-w-xs truncate">
                          {tk.notes || <span className="text-neutral-600 italic">Sin notas</span>}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteTake(tk.id)}
                            className="p-1 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                            title="Eliminar registro de toma"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* VERDICT MODAL (OPENS ON CUT!) */}
        <AnimatePresence>
          {showVerdictModal && (
            <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl text-white"
              >
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500" />
                    <h3 className="text-base font-bold">REGISTRO DE CONTINUIDAD — TOMA #{takeNumber}</h3>
                  </div>
                  <span className="text-xs font-mono bg-neutral-800 px-2 py-0.5 rounded text-neutral-300">
                    {lastTakeDuration}s rodados
                  </span>
                </div>

                {/* Verdict Choices */}
                <div className="mt-4">
                  <label className="text-2xs uppercase text-neutral-400 font-bold block mb-2">
                    Veredicto del Director / Script:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setTakeVerdict('good')}
                      className={clsx(
                        'py-3 px-2 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 border-2 transition-all',
                        takeVerdict === 'good'
                          ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300 shadow-lg'
                          : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500'
                      )}
                    >
                      <Star className="w-4 h-4 fill-current" />
                      <span>🟢 CIRCLED (BUENA)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTakeVerdict('hold')}
                      className={clsx(
                        'py-3 px-2 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 border-2 transition-all',
                        takeVerdict === 'hold'
                          ? 'bg-amber-600/30 border-amber-500 text-amber-300 shadow-lg'
                          : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500'
                      )}
                    >
                      <span>🟡 HOLD (RESPALDO)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTakeVerdict('ng')}
                      className={clsx(
                        'py-3 px-2 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 border-2 transition-all',
                        takeVerdict === 'ng'
                          ? 'bg-red-600/30 border-red-500 text-red-300 shadow-lg'
                          : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500'
                      )}
                    >
                      <span>🔴 NO GOOD (NG)</span>
                    </button>
                  </div>
                </div>

                {/* NG Reasons (only if NG selected) */}
                {takeVerdict === 'ng' && (
                  <div className="mt-3">
                    <label className="text-3xs uppercase text-neutral-400 font-bold block mb-1.5">
                      Motivo de descarte rápido:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {['Foco', 'Audio', 'Actuación', 'Encuadre', 'Luz / Sombra', 'Micrófono en cuadro', 'Ruido'].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setTakeReason(takeReason === r ? '' : r)}
                          className={clsx(
                            'px-2.5 py-1 rounded-lg text-2xs font-semibold transition-colors',
                            takeReason === r ? 'bg-red-600 text-white' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                          )}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Director's notes */}
                <div className="mt-4">
                  <label className="text-2xs uppercase text-neutral-400 font-bold block mb-1">
                    Notas para el Montador / Editor:
                  </label>
                  <textarea
                    value={takeNotes}
                    onChange={(e) => setTakeNotes(e.target.value)}
                    placeholder="Ej: Buena dicción en la primera frase, corte justo antes de que camine..."
                    rows={3}
                    className="w-full bg-black border border-neutral-700 rounded-xl p-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white"
                  />
                </div>

                {/* Submit button */}
                <div className="mt-5 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowVerdictModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
                  >
                    Descartar sin guardar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveTake}
                    disabled={savingTake}
                    className="px-5 py-2.5 bg-white text-black font-bold text-xs rounded-xl hover:bg-neutral-200 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {savingTake ? 'Guardando...' : 'Guardar y Preparar Toma Siguiente'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>,
    document.body
  );
}
