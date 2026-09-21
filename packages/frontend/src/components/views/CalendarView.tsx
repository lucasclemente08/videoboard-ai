import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Plus, 
  Clock, 
  User, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  CalendarRange
} from 'lucide-react';
import { clsx } from 'clsx';
import { useSceneStore } from '../../stores/useSceneStore';
import { useUpdateScene } from '../../api/hooks';
import type { Scene } from '@videoboard/shared';

// Month & Day Names
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEKDAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function CalendarView() {
  const { scenes } = useSceneStore();
  const updateScene = useUpdateScene();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [schedulingScene, setSchedulingScene] = useState<Scene | null>(null);

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Helper to format date as YYYY-MM-DD (local timezone safe)
  const formatDateString = (year: number, month: number, day: number) => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  // Navigate Months
  const prevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const setToday = () => {
    setCurrentDate(new Date());
  };

  // Generate Calendar Days (Monday starting grid)
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonthIndex = (year: number, month: number) => {
    // getDay() is 0 for Sunday, 1 for Monday...
    // Let's adjust so 0 is Monday, 6 is Sunday
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayIndex = getFirstDayOfMonthIndex(currentYear, currentMonth);

  // Unscheduled scenes list
  const unscheduledScenes = scenes.filter((s) => !s.due_date);

  // Assign date to a scene
  const handleAssignDate = async (sceneId: string, dateStr: string | null) => {
    await updateScene.mutateAsync({ id: sceneId, due_date: dateStr });
    if (schedulingScene?.id === sceneId) {
      setSchedulingScene(null);
    }
    if (selectedScene?.id === sceneId) {
      setSelectedScene(prev => prev ? { ...prev, due_date: dateStr } : null);
    }
  };

  // Click on a calendar day
  const handleDayClick = (dateStr: string) => {
    if (schedulingScene) {
      handleAssignDate(schedulingScene.id, dateStr);
    }
  };

  // Render Calendar Grid Cells
  const renderCells = () => {
    const cells = [];
    const prevMonthDays = getDaysInMonth(currentYear, currentMonth - 1);

    // Empty cells/days from the previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      cells.push(
        <div 
          key={`prev-${dayNum}`} 
          className="h-28 bg-surface-raised/30 border border-surface-edge/40 p-2 opacity-30 select-none cursor-not-allowed"
        >
          <span className="text-2xs font-semibold text-text-muted">{dayNum}</span>
        </div>
      );
    }

    // Days in current month
    const todayStr = formatDateString(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateString(currentYear, currentMonth, day);
      const isToday = dateStr === todayStr;
      
      // Filter scenes due on this day
      const dayScenes = scenes.filter((s) => s.due_date === dateStr);

      cells.push(
        <div
          key={`day-${day}`}
          onClick={() => handleDayClick(dateStr)}
          className={clsx(
            'h-28 border border-surface-edge p-2 flex flex-col transition-all cursor-pointer relative group/cell',
            isToday ? 'bg-accent-blue/5' : 'bg-surface-raised hover:bg-surface-hover/50',
            schedulingScene ? 'hover:border-accent-blue hover:ring-2 hover:ring-accent-blue/10' : ''
          )}
        >
          {/* Day number header */}
          <div className="flex items-center justify-between mb-1.5">
            <span 
              className={clsx(
                'text-2xs font-bold w-5 h-5 rounded-full flex items-center justify-center',
                isToday ? 'bg-accent-blue text-white' : 'text-text-secondary'
              )}
            >
              {day}
            </span>

            {/* Quick Add scene icon (only visible on hover or if we are active scheduling) */}
            {!schedulingScene && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Find the first unscheduled scene if any and assign it, or open sidebar
                  if (unscheduledScenes.length > 0) {
                    setSchedulingScene(unscheduledScenes[0]);
                  }
                }}
                className="w-4 h-4 rounded bg-surface border border-surface-edge hover:bg-accent-blue hover:text-white hover:border-accent-blue text-text-muted flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-all"
                title="Agendar primera escena libre"
              >
                <Plus className="w-2.5 h-2.5" />
              </button>
            )}
          </div>

          {/* Day scenes list */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 custom-scrollbar">
            {dayScenes.map((scene) => (
              <motion.div
                key={scene.id}
                layoutId={`scene-${scene.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedScene(scene);
                }}
                className="px-2 py-1 rounded-md text-3xs font-medium border text-left truncate transition-all flex items-center gap-1 hover:brightness-110 shadow-sm"
                style={{
                  backgroundColor: scene.color + '15',
                  borderColor: scene.color + '30',
                  borderLeft: `2.5px solid ${scene.color}`,
                  color: 'rgb(var(--color-text-primary))'
                }}
              >
                <span className="truncate flex-1">{scene.title}</span>
                <span className="text-4xs text-text-muted shrink-0">{scene.estimated_duration_secs}s</span>
              </motion.div>
            ))}
          </div>

          {/* Quick Schedule feedback */}
          {schedulingScene && (
            <div className="absolute inset-0 bg-accent-blue/10 backdrop-blur-3xs flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <span className="text-3xs font-semibold bg-accent-blue text-white px-2 py-1 rounded shadow-md">
                Programar aquí
              </span>
            </div>
          )}
        </div>
      );
    }

    // Fill remaining grid cells to complete a 7-day row alignment if needed
    const totalCells = cells.length;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remainingCells; i++) {
      cells.push(
        <div 
          key={`next-${i}`} 
          className="h-28 bg-surface-raised/30 border border-surface-edge/40 p-2 opacity-30 select-none cursor-not-allowed"
        >
          <span className="text-2xs font-semibold text-text-muted">{i}</span>
        </div>
      );
    }

    return cells;
  };

  return (
    <div className="h-full flex bg-surface text-text-primary overflow-hidden">
      {/* Main Calendar Body */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Controls */}
        <div className="h-14 flex items-center justify-between px-6 border-b border-surface-edge bg-surface-raised/50 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent-blue/15 flex items-center justify-center">
                <CalendarIcon className="w-4 h-4 text-accent-blue" />
              </div>
              <h2 className="text-sm font-semibold tracking-tight text-text-primary">
                Calendario de Producción
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-surface-edge text-3xs font-semibold text-text-secondary">
              {scenes.filter(s => s.due_date).length} programadas
            </span>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg border border-surface-edge hover:bg-surface-hover text-text-secondary transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-text-primary min-w-[100px] text-center">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg border border-surface-edge hover:bg-surface-hover text-text-secondary transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-surface-edge mx-1" />
            <button
              onClick={setToday}
              className="px-2.5 py-1 rounded-lg border border-surface-edge hover:bg-surface-hover text-xs font-semibold text-text-secondary transition-all"
            >
              Hoy
            </button>
          </div>
        </div>

        {/* Calendar Grid Header */}
        <div className="grid grid-cols-7 border-b border-surface-edge bg-surface-raised select-none">
          {WEEKDAY_NAMES.map((name) => (
            <div key={name} className="py-2 text-center text-3xs font-bold text-text-muted uppercase tracking-wider">
              {name}
            </div>
          ))}
        </div>

        {/* Calendar Grid Days */}
        <div className="flex-1 overflow-y-auto grid grid-cols-7 bg-surface-edge/20">
          {renderCells()}
        </div>
      </div>

      {/* Sidebar - Scenes Organizer */}
      <div className="w-72 border-l border-surface-edge bg-surface-raised flex flex-col shrink-0">
        <div className="p-4 border-b border-surface-edge flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <CalendarRange className="w-4 h-4 text-text-secondary" />
            <span className="text-xs font-bold text-text-primary">Planificador</span>
          </div>
          {schedulingScene && (
            <button
              onClick={() => setSchedulingScene(null)}
              className="px-1.5 py-0.5 rounded bg-accent-amber/15 text-accent-amber border border-accent-amber/25 text-4xs font-semibold flex items-center gap-0.5"
            >
              Cancelar prog.
            </button>
          )}
        </div>

        {/* Drag/Drop instruction or active selection status */}
        {schedulingScene ? (
          <div className="p-3 bg-accent-blue/10 border-b border-accent-blue/20 text-3xs text-accent-blue flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <p className="font-semibold">Modo Asignación Activo</p>
              <p className="text-text-secondary mt-0.5">
                Haz clic en cualquier día del calendario para programar: <strong>{schedulingScene.title}</strong>.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3 border-b border-surface-edge text-4xs text-text-muted bg-surface/50">
            Haz clic en "Agendar" en una escena y luego selecciona un día en el calendario.
          </div>
        )}

        {/* Unscheduled scenes list container */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <span className="text-4xs font-bold text-text-muted uppercase tracking-wider block mb-1">
            Escenas sin programar ({unscheduledScenes.length})
          </span>

          <AnimatePresence>
            {unscheduledScenes.map((scene) => (
              <motion.div
                key={scene.id}
                layoutId={`scene-unscheduled-${scene.id}`}
                className={clsx(
                  'p-3 rounded-xl border bg-surface transition-all text-left flex flex-col gap-1.5 relative group',
                  schedulingScene?.id === scene.id ? 'border-accent-blue ring-2 ring-accent-blue/10' : 'border-surface-edge hover:border-surface-hover'
                )}
              >
                <div className="flex items-start gap-1.5">
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: scene.color }} />
                  <span className="text-2xs font-semibold text-text-primary line-clamp-2 flex-1">
                    {scene.title}
                  </span>
                </div>
                {scene.description && (
                  <p className="text-3xs text-text-muted line-clamp-2 leading-relaxed">
                    {scene.description}
                  </p>
                )}
                <div className="flex items-center justify-between mt-1 text-3xs text-text-muted">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-text-muted" />
                    {scene.estimated_duration_secs}s
                  </span>
                  <button
                    onClick={() => setSchedulingScene(scene)}
                    className="px-2 py-0.5 rounded bg-accent-blue text-white text-4xs font-bold hover:bg-accent-blue/90 transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                  >
                    Agendar
                  </button>
                </div>
              </motion.div>
            ))}

            {unscheduledScenes.length === 0 && (
              <div className="py-8 flex flex-col items-center justify-center text-center">
                <CheckCircle2 className="w-8 h-8 text-accent-green opacity-55 mb-2" />
                <span className="text-3xs font-medium text-text-muted">Todas las escenas programadas</span>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Modal - Scene Details Overlay */}
      <AnimatePresence>
        {selectedScene && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedScene(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 pointer-events-auto"
            />
            
            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
            >
              <div className="pointer-events-auto w-full max-w-md bg-surface border border-surface-edge rounded-2xl shadow-2xl overflow-hidden">
                {/* Header banner */}
                <div className="h-2.5" style={{ backgroundColor: selectedScene.color }} />
                
                <div className="p-6">
                  {/* Title & Close */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-text-primary">
                        {selectedScene.title}
                      </h3>
                      <p className="text-3xs text-text-muted mt-0.5">
                        Detalles de Planificación
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedScene(null)}
                      className="p-1 rounded-lg hover:bg-surface-hover text-text-muted transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Body Info */}
                  <div className="space-y-4">
                    {selectedScene.description && (
                      <div className="bg-surface-raised/60 border border-surface-edge rounded-xl p-3">
                        <span className="text-4xs font-bold text-text-muted uppercase tracking-wider block mb-1">Descripción</span>
                        <p className="text-2xs text-text-secondary leading-relaxed">{selectedScene.description}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 text-2xs">
                      <div className="bg-surface-raised/40 p-2.5 rounded-xl border border-surface-edge flex items-center gap-2">
                        <Clock className="w-4 h-4 text-text-muted" />
                        <div>
                          <span className="text-4xs text-text-muted block">Duración</span>
                          <span className="font-semibold text-text-primary">{selectedScene.estimated_duration_secs}s</span>
                        </div>
                      </div>

                      <div className="bg-surface-raised/40 p-2.5 rounded-xl border border-surface-edge flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-text-muted" />
                        <div>
                          <span className="text-4xs text-text-muted block">Fecha Límite</span>
                          <span className="font-semibold text-text-primary">{selectedScene.due_date || 'Sin programar'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick change buttons */}
                    <div className="flex justify-end gap-2 pt-2 border-t border-surface-edge">
                      {selectedScene.due_date && (
                        <button
                          onClick={() => handleAssignDate(selectedScene.id, null)}
                          className="px-3 py-1.5 rounded-xl border border-accent-red/20 text-accent-red hover:bg-accent-red/5 text-xs font-semibold transition-all mr-auto"
                        >
                          Desprogramar
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedScene(null)}
                        className="px-4 py-1.5 rounded-xl bg-surface-hover hover:bg-surface-edge text-xs font-semibold text-text-primary transition-all"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
