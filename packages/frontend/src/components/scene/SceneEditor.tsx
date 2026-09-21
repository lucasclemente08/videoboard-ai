import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Info, FileText, Mic, Target, Heart, Camera, Sparkles,
  ChevronLeft, ChevronRight, Maximize2, Minimize2, Tag, Palette,
  Upload, Image as ImageIcon, Plus, Check, Clock, Film, SlidersHorizontal,
  Settings, Layers, Ratio, Eye, EyeOff, Trash2, Loader2
} from 'lucide-react';
import { clsx } from 'clsx';
import { useSceneStore } from '../../stores/useSceneStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useUIStore } from '../../stores/useUIStore';
import { useUpdateScene } from '../../api/hooks';
import { api } from '../../api/client';
import { ScriptEditor } from './ScriptEditor';
import { NarrationPanel } from './NarrationPanel';
import { HookPanel } from './HookPanel';
import { StorytellingPanel } from './StorytellingPanel';
import { ShotListPanel } from '../shot/ShotList';
import type { Scene } from '@videoboard/shared';

const ALL_TABS = [
  { id: 'info', icon: Info, label: 'Info' },
  { id: 'script', icon: FileText, label: 'Guion' },
  { id: 'narration', icon: Mic, label: 'Narración' },
  { id: 'hook', icon: Target, label: 'Hook' },
  { id: 'story', icon: Heart, label: 'Story' },
  { id: 'shots', icon: Camera, label: 'Tomas' },
  { id: 'ai', icon: Sparkles, label: 'IA' },
];

const SCENE_TYPES = [
  'intro', 'development', 'example', 'tutorial',
  'comparison', 'conclusion', 'cta', 'outro',
];

const EMOTIONS = ['inspiring', 'urgent', 'funny', 'epic', 'serious', 'technical'];

const EXTENDED_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
  '#6366F1', '#14B8A6', '#E11D48', '#84CC16',
  '#A855F7', '#EAB308', '#0EA5E9', '#64748B',
];

const STATUS_OPTIONS = [
  { id: 'draft', label: 'Borrador', color: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30' },
  { id: 'writing', label: 'En Guion', color: 'bg-accent-blue/20 text-accent-blue border-accent-blue/30' },
  { id: 'ready', label: 'Aprobada', color: 'bg-accent-green/20 text-accent-green border-accent-green/30' },
  { id: 'shooting', label: 'En Rodaje', color: 'bg-accent-violet/20 text-accent-violet border-accent-violet/30' },
  { id: 'done', label: 'Completada', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
];

const ASPECT_RATIOS = [
  { label: '16:9', width: 320, height: 180, desc: 'Cine / YT' },
  { label: '9:16', width: 220, height: 355, desc: 'Reels / TikTok' },
  { label: '4:3', width: 320, height: 240, desc: 'TV Clásica' },
  { label: '2.39:1', width: 360, height: 155, desc: 'Anamórfico' },
];

const PRESET_TAGS = ['INT', 'EXT', 'DÍA', 'NOCHE', 'VFX', 'DRON', 'DIÁLOGO', 'ACCIÓN', 'B-ROLL'];

export function SceneEditor() {
  const { scenes, selectedSceneId, selectScene } = useSceneStore();
  const { rightPanelTab, setRightPanelTab, toggleRightPanel } = useUIStore();
  const updateScene = useUpdateScene();
  const [isWide, setIsWide] = useState(false);
  const [showTabConfig, setShowTabConfig] = useState(false);
  const [visibleTabIds, setVisibleTabIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('vb_visible_tabs');
      if (saved) return JSON.parse(saved);
    } catch {}
    return ALL_TABS.map(t => t.id);
  });

  const scene = scenes.find((s) => s.id === selectedSceneId);

  // Navigation between scenes
  const currentIndex = scene ? scenes.findIndex((s) => s.id === scene.id) : -1;
  const prevScene = currentIndex > 0 ? scenes[currentIndex - 1] : null;
  const nextScene = currentIndex < scenes.length - 1 ? scenes[currentIndex + 1] : null;

  const handleUpdate = (data: Partial<Scene>) => {
    if (!scene) return;
    updateScene.mutate({ id: scene.id, ...data });
  };

  const toggleTabVisibility = (id: string) => {
    let updated = visibleTabIds.includes(id)
      ? visibleTabIds.filter(t => t !== id)
      : [...visibleTabIds, id];
    if (updated.length === 0) updated = ['info']; // At least one tab visible
    setVisibleTabIds(updated);
    try {
      localStorage.setItem('vb_visible_tabs', JSON.stringify(updated));
    } catch {}
  };

  if (!scene) return null;

  const activeTabs = ALL_TABS.filter(tab => visibleTabIds.includes(tab.id));

  const renderTabContent = () => {
    switch (rightPanelTab) {
      case 'info':
        return <InfoTab scene={scene} onUpdate={handleUpdate} />;
      case 'script':
        return <ScriptEditor scene={scene} onUpdate={handleUpdate} />;
      case 'narration':
        return <NarrationPanel scene={scene} onUpdate={handleUpdate} />;
      case 'hook':
        return <HookPanel scene={scene} onUpdate={handleUpdate} />;
      case 'story':
        return <StorytellingPanel scene={scene} onUpdate={handleUpdate} />;
      case 'shots':
        return <ShotListPanel sceneId={scene.id} />;
      case 'ai':
        return <AITab scene={scene} />;
      default:
        return <InfoTab scene={scene} onUpdate={handleUpdate} />;
    }
  };

  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: isWide ? 540 : 390, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="h-full bg-surface-raised border-l border-surface-edge flex flex-col shrink-0 overflow-hidden shadow-2xl relative z-30"
    >
      {/* Top Header: Scene Nav + Title + Controls */}
      <div className="px-3 py-2.5 border-b border-surface-edge bg-surface/40 flex items-center justify-between gap-2">
        {/* Navigation Arrows */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => prevScene && selectScene(prevScene.id)}
            disabled={!prevScene}
            title={prevScene ? `Escena anterior: ${prevScene.title}` : 'Primera escena'}
            className="p-1 rounded-md hover:bg-surface-hover text-text-muted hover:text-text-primary disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-semibold text-text-secondary px-1 select-none">
            {currentIndex + 1} / {scenes.length}
          </span>
          <button
            onClick={() => nextScene && selectScene(nextScene.id)}
            disabled={!nextScene}
            title={nextScene ? `Siguiente escena: ${nextScene.title}` : 'Última escena'}
            className="p-1 rounded-md hover:bg-surface-hover text-text-muted hover:text-text-primary disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Scene Color pill & title */}
        <div className="flex-1 min-w-0 flex items-center gap-2 px-1">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: scene.color }} />
          <h2 className="text-xs font-bold text-text-primary truncate">{scene.title || 'Sin título'}</h2>
        </div>

        {/* Right action icons */}
        <div className="flex items-center gap-1">
          {/* Width toggle */}
          <button
            onClick={() => setIsWide(!isWide)}
            title={isWide ? 'Ancho estándar (390px)' : 'Expandir panel (540px)'}
            className="p-1 rounded-md hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors"
          >
            {isWide ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Customize tabs settings */}
          <button
            onClick={() => setShowTabConfig(!showTabConfig)}
            title="Personalizar pestañas"
            className={clsx(
              'p-1 rounded-md transition-colors',
              showTabConfig ? 'bg-accent-blue/15 text-accent-blue' : 'hover:bg-surface-hover text-text-muted hover:text-text-primary'
            )}
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          {/* Close panel */}
          <button
            onClick={toggleRightPanel}
            title="Cerrar panel"
            className="p-1 rounded-md hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tab Configuration Popover */}
      {showTabConfig && (
        <div className="px-3 py-2 bg-surface border-b border-surface-edge shadow-lg space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between text-2xs font-semibold text-text-secondary">
            <span>Personalizar secciones visibles:</span>
            <button onClick={() => setShowTabConfig(false)} className="text-text-muted hover:text-text-primary">✕</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ALL_TABS.map((tab) => {
              const isVisible = visibleTabIds.includes(tab.id);
              return (
                <button
                  key={tab.id}
                  onClick={() => toggleTabVisibility(tab.id)}
                  className={clsx(
                    'flex items-center gap-1 px-2 py-1 rounded text-2xs font-medium border transition-colors',
                    isVisible
                      ? 'bg-accent-blue/15 border-accent-blue/30 text-accent-blue'
                      : 'bg-surface-raised border-surface-edge text-text-muted hover:border-surface-hover'
                  )}
                >
                  <tab.icon className="w-3 h-3" />
                  <span>{tab.label}</span>
                  {isVisible ? <Check className="w-2.5 h-2.5 ml-0.5" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex items-center px-2 pt-1 pb-0 border-b border-surface-edge overflow-x-auto bg-surface/20 scrollbar-none">
        {activeTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setRightPanelTab(tab.id)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-xs font-semibold transition-all border-b-2 -mb-[1px] whitespace-nowrap shrink-0',
              rightPanelTab === tab.id
                ? 'text-accent-blue border-accent-blue bg-surface-raised/80'
                : 'text-text-muted border-transparent hover:text-text-secondary hover:bg-surface/50'
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {renderTabContent()}
      </div>
    </motion.aside>
  );
}

function InfoTab({ scene, onUpdate }: { scene: Scene; onUpdate: (data: Partial<Scene>) => void }) {
  const [tagInput, setTagInput] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const colorPickerRef = useRef<HTMLInputElement>(null);

  const handleAddTag = (tagToAdd: string) => {
    const trimmed = tagToAdd.trim().toUpperCase();
    if (!trimmed) return;
    const currentTags = scene.tags || [];
    if (!currentTags.includes(trimmed)) {
      onUpdate({ tags: [...currentTags, trimmed] });
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = scene.tags || [];
    onUpdate({ tags: currentTags.filter(t => t !== tagToRemove) });
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    setUploadingCover(true);
    try {
      const res = await api.uploadFile(file, { sceneId: scene.id });
      onUpdate({ description: res.url });
    } catch (err) {
      console.error('Error subiendo portada:', err);
    } finally {
      setUploadingCover(false);
      e.target.value = '';
    }
  };

  const isCoverAnImage = scene.description && (
    /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(scene.description) ||
    scene.description.includes('pexels.com') ||
    scene.description.startsWith('/uploads/')
  );

  return (
    <div className="p-4 space-y-4">
      {/* Scene Cover Banner / Uploader */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-2xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-accent-blue" />
            Portada / Visual de Escena
          </label>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            onChange={handleCoverUpload}
            className="hidden"
          />
          <button
            onClick={() => coverInputRef.current?.click()}
            disabled={uploadingCover}
            className="text-2xs font-semibold text-accent-blue hover:underline flex items-center gap-1"
          >
            {uploadingCover ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            {isCoverAnImage ? 'Cambiar imagen' : 'Subir imagen'}
          </button>
        </div>

        {isCoverAnImage ? (
          <div className="relative rounded-xl overflow-hidden border border-surface-edge group">
            <img
              src={scene.description!}
              alt={scene.title}
              className="w-full h-32 object-cover"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                onClick={() => coverInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg bg-surface-raised/90 text-text-primary text-2xs font-semibold hover:bg-surface-raised transition-all shadow-md"
              >
                Cambiar
              </button>
              <button
                onClick={() => onUpdate({ description: '' })}
                className="p-1.5 rounded-lg bg-accent-red/80 text-white hover:bg-accent-red transition-all shadow-md"
                title="Quitar imagen"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => coverInputRef.current?.click()}
            className="w-full h-20 rounded-xl border-2 border-dashed border-surface-edge hover:border-accent-blue/50 flex flex-col items-center justify-center gap-1 cursor-pointer bg-surface/30 hover:bg-surface transition-colors"
          >
            <Upload className="w-5 h-5 text-text-muted" />
            <span className="text-2xs font-medium text-text-muted">Arrastra o sube una imagen de referencia</span>
          </div>
        )}
      </div>

      {/* Title */}
      <div>
        <label className="block text-2xs font-bold text-text-primary uppercase tracking-wider mb-1">Título de la Escena</label>
        <input
          type="text"
          value={scene.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Ej: ESCENA 01 - INT. CAFETERÍA - DÍA"
          className="w-full px-3 py-2 bg-surface border border-surface-edge rounded-lg text-sm text-text-primary font-semibold focus:outline-none focus:border-accent-blue transition-all"
        />
      </div>

      {/* Production Status */}
      <div>
        <label className="block text-2xs font-bold text-text-primary uppercase tracking-wider mb-1.5">
          Estado de Producción
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {STATUS_OPTIONS.map((st) => (
            <button
              key={st.id}
              onClick={() => onUpdate({ status: st.id as any })}
              className={clsx(
                'px-2 py-1.5 rounded-lg text-xs font-semibold border transition-all truncate text-center',
                scene.status === st.id
                  ? `${st.color} shadow-sm ring-1 ring-white/20`
                  : 'bg-surface text-text-muted border-surface-edge hover:border-surface-hover'
              )}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Description / Synopsys */}
      <div>
        <label className="block text-2xs font-bold text-text-primary uppercase tracking-wider mb-1">Sinopsis / Descripción</label>
        <textarea
          value={(!isCoverAnImage ? scene.description : '') || ''}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="Describe la acción principal, tono y objetivo narrativo..."
          rows={3}
          className="w-full px-3 py-2 bg-surface border border-surface-edge rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue transition-all resize-none"
        />
      </div>

      {/* Aspect Ratio Framing (Size in Canvas) */}
      <div>
        <label className="block text-2xs font-bold text-text-primary uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <Ratio className="w-3.5 h-3.5 text-accent-blue" />
          Formato de Encuadre en Lienzo
        </label>
        <div className="grid grid-cols-2 gap-2">
          {ASPECT_RATIOS.map((ar) => {
            const isSelected = Math.abs(scene.width - ar.width) < 10 && Math.abs(scene.height - ar.height) < 15;
            return (
              <button
                key={ar.label}
                onClick={() => onUpdate({ width: ar.width, height: ar.height })}
                className={clsx(
                  'p-2 rounded-lg border text-left transition-all',
                  isSelected
                    ? 'bg-accent-blue/15 border-accent-blue text-accent-blue shadow-sm'
                    : 'bg-surface border-surface-edge text-text-secondary hover:border-surface-hover'
                )}
              >
                <span className="text-xs font-bold block">{ar.label}</span>
                <span className="text-[10px] text-text-muted block">{ar.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Duration + Priority */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-2xs font-bold text-text-primary uppercase tracking-wider mb-1 flex items-center gap-1">
            <Clock className="w-3 h-3 text-text-muted" /> Duración estimada (seg)
          </label>
          <input
            type="number"
            min={0}
            value={scene.estimated_duration_secs}
            onChange={(e) => onUpdate({ estimated_duration_secs: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 bg-surface border border-surface-edge rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue transition-all"
          />
        </div>
        <div>
          <label className="block text-2xs font-bold text-text-primary uppercase tracking-wider mb-1">Prioridad</label>
          <select
            value={scene.priority}
            onChange={(e) => onUpdate({ priority: e.target.value as any })}
            className="w-full px-3 py-2 bg-surface border border-surface-edge rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue transition-all"
          >
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
            <option value="critical">Crítica</option>
          </select>
        </div>
      </div>

      {/* Tags System */}
      <div>
        <label className="block text-2xs font-bold text-text-primary uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-accent-amber" />
          Etiquetas de Rodaje
        </label>

        {/* Active tags */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {scene.tags && scene.tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent-amber/15 border border-accent-amber/30 text-accent-amber text-[10px] font-bold"
            >
              #{t}
              <button onClick={() => handleRemoveTag(t)} className="hover:text-accent-red transition-colors">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
          {(!scene.tags || scene.tags.length === 0) && (
            <span className="text-2xs text-text-muted italic">Sin etiquetas asignadas</span>
          )}
        </div>

        {/* Custom Tag Input */}
        <div className="flex gap-1.5 mb-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(tagInput); } }}
            placeholder="Escribir etiqueta y pulsar Enter..."
            className="flex-1 px-2.5 py-1.5 bg-surface border border-surface-edge rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue transition-all"
          />
          <button
            onClick={() => handleAddTag(tagInput)}
            className="px-3 py-1.5 bg-surface-raised border border-surface-edge hover:bg-surface-hover rounded-lg text-xs font-medium text-text-secondary"
          >
            Añadir
          </button>
        </div>

        {/* Preset quick chips */}
        <div className="flex flex-wrap gap-1">
          {PRESET_TAGS.map((pt) => {
            const hasTag = scene.tags?.includes(pt);
            return (
              <button
                key={pt}
                onClick={() => hasTag ? handleRemoveTag(pt) : handleAddTag(pt)}
                className={clsx(
                  'px-2 py-0.5 rounded text-[9px] font-bold border transition-colors',
                  hasTag
                    ? 'bg-accent-amber/20 border-accent-amber/40 text-accent-amber'
                    : 'bg-surface/50 border-surface-edge text-text-muted hover:border-surface-hover hover:text-text-secondary'
                )}
              >
                +{pt}
              </button>
            );
          })}
        </div>
      </div>

      {/* Extended Color Palette + Custom Hex Picker */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-2xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-accent-blue" />
            Color de Identificación
          </label>
          <span className="text-2xs font-mono text-text-muted">{scene.color}</span>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {EXTENDED_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => onUpdate({ color: color as any })}
              className={clsx(
                'w-6 h-6 rounded-lg transition-transform shadow-sm',
                scene.color === color && 'ring-2 ring-white ring-offset-2 ring-offset-surface-raised scale-125 z-10'
              )}
              style={{ backgroundColor: color }}
            />
          ))}

          {/* Native Color Picker for unlimited custom hex */}
          <div className="relative">
            <input
              ref={colorPickerRef}
              type="color"
              value={scene.color}
              onChange={(e) => onUpdate({ color: e.target.value as any })}
              className="sr-only"
            />
            <button
              onClick={() => colorPickerRef.current?.click()}
              title="Elegir color personalizado libre"
              className="w-6 h-6 rounded-lg border-2 border-dashed border-surface-edge hover:border-accent-blue flex items-center justify-center text-xs font-bold transition-all bg-gradient-to-tr from-pink-500 via-amber-500 to-blue-500 text-white shadow-sm hover:scale-110"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Scene Type */}
      <div>
        <label className="block text-2xs font-bold text-text-primary uppercase tracking-wider mb-1.5">Tipo de Escena</label>
        <div className="flex flex-wrap gap-1.5">
          {SCENE_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => onUpdate({ scene_type: scene.scene_type === type ? null : type })}
              className={clsx(
                'px-2.5 py-1 rounded-lg text-2xs font-medium capitalize transition-all',
                scene.scene_type === type
                  ? 'bg-accent-blue/15 text-accent-blue border border-accent-blue/30 font-bold'
                  : 'bg-surface text-text-muted border border-surface-edge hover:border-surface-hover'
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Emotion */}
      <div>
        <label className="block text-2xs font-bold text-text-primary uppercase tracking-wider mb-1.5">Tono Emocional</label>
        <div className="flex flex-wrap gap-1.5">
          {EMOTIONS.map((emotion) => (
            <button
              key={emotion}
              onClick={() => onUpdate({ emotion: scene.emotion === emotion ? null : emotion as any })}
              className={clsx(
                'px-2.5 py-1 rounded-lg text-2xs font-medium capitalize transition-all',
                scene.emotion === emotion
                  ? 'bg-accent-violet/15 text-accent-violet border border-accent-violet/30 font-bold'
                  : 'bg-surface text-text-muted border border-surface-edge hover:border-surface-hover'
              )}
            >
              {emotion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function AITab({ scene }: { scene: Scene }) {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const { token } = useAuthStore();
  const { id: projectId } = useParams<{ id: string }>();

  const analyzeScene = async () => {
    setLoading(true);
    setResult('');
    try {
      const res = await fetch(`/api/ai/analyze-scene`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ projectId, sceneId: scene.id }),
      });
      const data = await res.json();
      setResult(data.data?.analysis || 'Análisis completado.');
    } catch {
      setResult('Error al analizar la escena.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Asistente IA de Escena</h3>
          <p className="text-2xs text-text-muted">Revisión de ritmo, coherencia y sugerencias</p>
        </div>
        <button
          onClick={analyzeScene}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-violet text-white text-xs font-semibold hover:bg-accent-violet/80 transition-colors shadow-sm disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          Analizar
        </button>
      </div>

      {result && (
        <div className="p-3 bg-surface rounded-xl border border-surface-edge text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">
          {result}
        </div>
      )}
    </div>
  );
}
