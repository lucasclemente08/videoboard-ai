import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Search, Copy, Clock, Layers, Film, ArrowRight,
  CheckCircle2, Compass, TrendingUp, Users, Plus, ChevronLeft,
  Loader2, Filter, Eye, Camera, Clapperboard, X, Video, Sliders
} from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';
import { useProjectStore } from '../stores/useProjectStore';
import { clsx } from 'clsx';

interface TemplateShot {
  id: string;
  name: string;
  shot_type?: string;
  lens?: string;
  movement?: string;
  duration: number;
}

interface TemplateScene {
  id: string;
  title: string;
  objective?: string;
  description?: string;
  duration: number;
  color: string;
  tags?: string[];
  shot_count: number;
  shots?: TemplateShot[];
}

interface TemplateItem {
  id: string;
  title: string;
  description: string;
  cover_url: string;
  template_category: string;
  clone_count: number;
  scene_count: number;
  shot_count: number;
  total_duration_secs: number;
  preview_scenes: TemplateScene[];
}

const CATEGORIES = [
  { id: 'all', label: 'Todas las Plantillas' },
  { id: 'commercial', label: 'Comerciales & TV' },
  { id: 'tiktok', label: 'TikTok & Reels' },
  { id: 'narrative', label: 'Ficción & Cine' },
  { id: 'youtube', label: 'YouTube Creator' },
  { id: 'music_video', label: 'Videoclips' },
];

export function TemplatesView() {
  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuthStore();
  const { setCurrentProject } = useProjectStore();

  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [inspectingTemplate, setInspectingTemplate] = useState<TemplateItem | null>(null);

  // Fetch templates from API
  useEffect(() => {
    setLoading(true);
    fetch('/api/templates')
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setTemplates(json.data);
      })
      .catch((e) => console.error('Error fetching templates:', e))
      .finally(() => setLoading(false));
  }, []);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      const matchCategory =
        selectedCategory === 'all' || tpl.template_category === selectedCategory;
      const matchSearch =
        tpl.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [templates, selectedCategory, searchQuery]);

  // Clone template
  const handleClone = async (tpl: TemplateItem) => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/templates`);
      return;
    }

    setCloningId(tpl.id);
    try {
      const res = await fetch(`/api/templates/${tpl.id}/clone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: `${tpl.title} (Mi Proyecto)`,
        }),
      });

      const json = await res.json();
      if (json.data) {
        setCurrentProject(json.data);
        if (inspectingTemplate) setInspectingTemplate(null);
        navigate(`/project/${json.data.id}`);
      }
    } catch (e) {
      console.error('Failed to clone template:', e);
    } finally {
      setCloningId(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-surface flex flex-col">
      {/* Top Banner / Hero */}
      <header className="border-b border-surface-edge bg-surface-raised/50 py-10 px-6 sm:px-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2.5 py-1 rounded-full text-2xs font-bold uppercase tracking-wider bg-accent-violet/10 text-accent-violet border border-accent-violet/20 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              Estructuras Audiovisuales Prehechas
            </span>
            <span className="text-xs text-text-muted">
              • Escenas, ópticas y setups listos para producción
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
            Hub de Plantillas para Guion & Storyboard
          </h1>
          <p className="text-sm text-text-secondary mt-2 max-w-2xl leading-relaxed">
            Comienza tu próximo proyecto con estructuras narrativas probadas por directores. Cada plantilla incluye <strong className="text-text-primary">múltiples escenas preconfiguradas</strong>, planos cinematográficos, iluminación y distancias focales.
          </p>

          {/* Search & Category Filter Bar */}
          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por formato, género, comercial, TikTok, ficción..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-surface-edge text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-violet transition-all shadow-xs"
              />
            </div>

            {/* Quick Category Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={clsx(
                    'px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all',
                    selectedCategory === cat.id
                      ? 'bg-accent-violet text-white shadow-sm'
                      : 'bg-surface border border-surface-edge text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-6xl mx-auto px-6 sm:px-10 py-8 flex-1 w-full">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center text-text-muted text-xs">
            <Loader2 className="w-8 h-8 animate-spin text-accent-violet mb-2" />
            <p>Cargando catálogo de plantillas con escenas prehechas...</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-text-muted text-xs">
            <Film className="w-10 h-10 mb-2 opacity-30" />
            <p className="font-semibold text-text-primary">No se encontraron plantillas</p>
            <p className="text-2xs text-text-muted mt-1">Prueba con otra búsqueda o categoría.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((tpl) => (
              <motion.div
                key={tpl.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="group rounded-3xl border border-surface-edge bg-surface-raised hover:border-accent-violet/40 transition-all duration-200 overflow-hidden shadow-sm hover:shadow-xl flex flex-col"
              >
                {/* Card Cover */}
                <div className="aspect-[16/9] w-full relative overflow-hidden bg-black/40">
                  <img
                    src={tpl.cover_url}
                    alt={tpl.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                  {/* Category badge */}
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white text-3xs font-bold uppercase tracking-wider">
                      {CATEGORIES.find((c) => c.id === tpl.template_category)?.label || tpl.template_category}
                    </span>
                  </div>

                  {/* Scene & Shot Counters */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-accent-violet/90 text-white text-3xs font-bold backdrop-blur-md shadow-sm">
                      {tpl.scene_count} Escenas
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-black/70 text-text-secondary border border-white/10 text-3xs font-medium backdrop-blur-md">
                      {tpl.shot_count || (tpl.preview_scenes?.length ? tpl.preview_scenes.reduce((acc, s) => acc + (s.shot_count || 1), 0) : 0)} Planos
                    </span>
                  </div>

                  {/* Duration and Clones stat */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-3xs font-semibold">
                    <span className="flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-sm">
                      <Clock className="w-3 h-3" />
                      {tpl.total_duration_secs}s de duración
                    </span>
                    <span className="flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-sm text-emerald-400">
                      <Copy className="w-3 h-3" />
                      {tpl.clone_count} usos
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-text-primary group-hover:text-accent-violet transition-colors line-clamp-1">
                      {tpl.title}
                    </h3>
                    <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                      {tpl.description}
                    </p>
                  </div>

                  {/* Pre-made Scenes Preview */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-3xs uppercase font-bold text-text-muted tracking-wider">
                        Estructura Prehecha ({tpl.scene_count} escenas):
                      </span>
                      <button
                        onClick={() => setInspectingTemplate(tpl)}
                        className="text-3xs text-accent-violet hover:underline font-semibold flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" /> Ver desglose
                      </button>
                    </div>

                    {/* Scene pills */}
                    <div className="space-y-1">
                      {tpl.preview_scenes.slice(0, 4).map((sc, i) => (
                        <div
                          key={sc.id || i}
                          className="flex items-center justify-between px-2 py-1 rounded bg-surface/80 border border-surface-edge text-2xs"
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: sc.color || '#8B5CF6' }}
                            />
                            <span className="font-medium text-text-primary truncate">
                              {sc.title}
                            </span>
                          </div>
                          <span className="text-text-muted text-3xs shrink-0 ml-2 font-mono">
                            {sc.duration}s
                          </span>
                        </div>
                      ))}
                      {tpl.scene_count > 4 && (
                        <button
                          onClick={() => setInspectingTemplate(tpl)}
                          className="text-4xs text-center w-full text-text-muted hover:text-accent-violet py-0.5"
                        >
                          + {tpl.scene_count - 4} escenas más prehechas...
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-surface-edge flex items-center gap-2">
                    <button
                      onClick={() => setInspectingTemplate(tpl)}
                      className="px-3 py-2.5 rounded-xl bg-surface border border-surface-edge hover:bg-surface-hover text-text-primary text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                      title="Ver todas las escenas y planos detallados"
                    >
                      <Eye className="w-3.5 h-3.5 text-text-muted" />
                      <span>Inspeccionar</span>
                    </button>
                    <button
                      onClick={() => handleClone(tpl)}
                      disabled={cloningId === tpl.id}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-accent-violet hover:bg-accent-violet/90 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 group/btn disabled:opacity-50"
                    >
                      {cloningId === tpl.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Clonando escenas...</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Usar Plantilla</span>
                          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* INSPECT TEMPLATE SCENES MODAL */}
      <AnimatePresence>
        {inspectingTemplate && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setInspectingTemplate(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="relative w-full max-w-3xl max-h-[85vh] bg-surface-raised border border-surface-edge rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-surface-edge bg-surface/50 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-accent-violet/15 text-accent-violet text-3xs font-bold uppercase tracking-wider">
                      {CATEGORIES.find((c) => c.id === inspectingTemplate.template_category)?.label || inspectingTemplate.template_category}
                    </span>
                    <span className="text-2xs text-text-muted">
                      {inspectingTemplate.scene_count} Escenas prehechas • {inspectingTemplate.total_duration_secs}s de duración
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-text-primary">
                    {inspectingTemplate.title}
                  </h2>
                  <p className="text-xs text-text-secondary mt-1 max-w-xl">
                    {inspectingTemplate.description}
                  </p>
                </div>
                <button
                  onClick={() => setInspectingTemplate(null)}
                  className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body - List of all Pre-made Scenes & Shots */}
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-accent-violet" />
                  Desglose Técnico de Escenas y Planos Incluidos
                </h3>

                <div className="space-y-3">
                  {inspectingTemplate.preview_scenes.map((scene, idx) => (
                    <div
                      key={scene.id || idx}
                      className="p-4 rounded-2xl bg-surface border border-surface-edge space-y-3"
                    >
                      {/* Scene Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                            style={{ backgroundColor: scene.color || '#8B5CF6' }}
                          />
                          <div>
                            <h4 className="text-sm font-bold text-text-primary">
                              {scene.title}
                            </h4>
                            {scene.objective && (
                              <p className="text-xs text-text-secondary mt-0.5">
                                <span className="font-semibold text-text-muted">Objetivo:</span> {scene.objective}
                              </p>
                            )}
                            {scene.description && (
                              <p className="text-2xs text-text-muted mt-0.5 italic">
                                {scene.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {scene.tags && scene.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 rounded bg-surface-raised border border-surface-edge text-3xs font-mono text-text-secondary"
                            >
                              {tag}
                            </span>
                          ))}
                          <span className="px-2.5 py-1 rounded-lg bg-surface-raised border border-surface-edge text-xs font-mono text-text-primary">
                            {scene.duration}s
                          </span>
                        </div>
                      </div>

                      {/* Scene Shots */}
                      {scene.shots && scene.shots.length > 0 && (
                        <div className="pl-4 pt-2 border-l-2 border-surface-edge space-y-2 mt-2">
                          <span className="text-4xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
                            <Camera className="w-3 h-3" />
                            {scene.shots.length} Planos Preconfigurados:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {scene.shots.map((sh, sIdx) => (
                              <div
                                key={sh.id || sIdx}
                                className="p-2.5 rounded-xl bg-surface-raised/80 border border-surface-edge text-2xs space-y-1"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-text-primary truncate">
                                    {sh.name}
                                  </span>
                                  <span className="text-3xs text-text-muted font-mono">
                                    {sh.duration}s
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1 text-3xs">
                                  {sh.shot_type && (
                                    <span className="px-1.5 py-0.5 rounded bg-accent-blue/10 text-accent-blue font-medium">
                                      {sh.shot_type}
                                    </span>
                                  )}
                                  {sh.lens && (
                                    <span className="px-1.5 py-0.5 rounded bg-surface border border-surface-edge text-text-muted">
                                      {sh.lens}
                                    </span>
                                  )}
                                  {sh.movement && (
                                    <span className="px-1.5 py-0.5 rounded bg-surface border border-surface-edge text-text-muted">
                                      {sh.movement}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 px-6 border-t border-surface-edge bg-surface/50 flex items-center justify-between">
                <span className="text-xs text-text-muted">
                  Se clonarán todas las escenas, planos y conexiones a tu espacio de trabajo.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setInspectingTemplate(null)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
                  >
                    Cerrar
                  </button>
                  <button
                    onClick={() => handleClone(inspectingTemplate)}
                    disabled={cloningId === inspectingTemplate.id}
                    className="px-5 py-2 rounded-xl bg-accent-violet hover:bg-accent-violet/90 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2"
                  >
                    {cloningId === inspectingTemplate.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Clonando...</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Clonar esta Plantilla</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
