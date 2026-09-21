import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Search, Copy, Clock, Layers, Film, ArrowRight,
  CheckCircle2, Compass, TrendingUp, Users, Plus, ChevronLeft,
  Loader2, Filter
} from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';
import { useProjectStore } from '../stores/useProjectStore';
import { clsx } from 'clsx';

interface TemplateItem {
  id: string;
  title: string;
  description: string;
  cover_url: string;
  template_category: string;
  clone_count: number;
  scene_count: number;
  total_duration_secs: number;
  preview_scenes: Array<{ id: string; title: string; duration: number; color: string }>;
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

  // Filter templates based on category and query
  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      const matchCat = selectedCategory === 'all' || tpl.template_category === selectedCategory;
      const matchQuery =
        !searchQuery.trim() ||
        tpl.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [templates, selectedCategory, searchQuery]);

  // Clone template
  const handleClone = async (tpl: TemplateItem) => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
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
      });
      const json = await res.json();
      if (json.data) {
        setCurrentProject(json.data);
        navigate(`/project/${json.data.id}`);
      }
    } catch (err) {
      console.error('Error clonando plantilla:', err);
    } finally {
      setCloningId(null);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col text-text-primary">
      {/* Top Navbar */}
      <header className="h-14 border-b border-surface-edge bg-surface-raised/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors flex items-center gap-1 text-xs font-semibold"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>
          <div className="h-4 w-px bg-surface-edge" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-violet to-accent-blue flex items-center justify-center shadow-sm">
              <Compass className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight">Hub de Plantillas Audiovisuales</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isAuthenticated && (
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-1.5 rounded-xl bg-accent-blue text-white text-xs font-semibold hover:bg-accent-blue/90 transition-all shadow-sm"
            >
              Iniciar Sesión
            </button>
          )}
        </div>
      </header>

      {/* Hero Banner */}
      <div className="relative overflow-hidden border-b border-surface-edge bg-gradient-to-b from-accent-violet/10 via-surface-raised to-surface py-12 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-violet/15 text-accent-violet border border-accent-violet/30 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ESTRUCTURAS CINEMATOGRÁFICAS PRE-CONSTRUIDAS</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-text-primary">
            Crea tu próximo video sobre estructuras probadas
          </h1>
          <p className="text-sm text-text-secondary max-w-2xl mx-auto leading-relaxed">
            Storyboards profesionales con ritmo, planos y objetivos técnicos listos para clonar y adaptar a tu rodaje en segundos.
          </p>

          {/* Search bar */}
          <div className="max-w-xl mx-auto pt-2 relative">
            <Search className="w-4 h-4 text-text-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por formato, género o palabras clave (ej: TikTok, comercial, ficción)..."
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-surface border border-surface-edge text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-violet shadow-lg transition-all"
            />
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="border-b border-surface-edge bg-surface-raised/40 px-6 py-3 sticky top-14 z-10 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={clsx(
                'px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all',
                selectedCategory === cat.id
                  ? 'bg-accent-violet text-white shadow-sm'
                  : 'bg-surface border border-surface-edge text-text-muted hover:text-text-primary hover:border-surface-hover'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      <main className="flex-1 p-6 md:p-8 max-w-6xl mx-auto w-full">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center text-text-muted text-xs">
            <Loader2 className="w-8 h-8 animate-spin text-accent-violet mb-2" />
            <p>Cargando catálogo de plantillas...</p>
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
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Category badge */}
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white text-3xs font-bold uppercase tracking-wider">
                      {CATEGORIES.find((c) => c.id === tpl.template_category)?.label || tpl.template_category}
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
                    <h3 className="text-base font-bold text-text-primary group-hover:text-accent-violet transition-colors">
                      {tpl.title}
                    </h3>
                    <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                      {tpl.description}
                    </p>
                  </div>

                  {/* Mini Preview of Scenes */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-3xs uppercase font-bold text-text-muted tracking-wider block">
                      Estructura ({tpl.scene_count} escenas):
                    </span>
                    <div className="flex gap-1.5">
                      {tpl.preview_scenes.map((sc) => (
                        <div
                          key={sc.id}
                          className="flex-1 py-1 px-1.5 rounded bg-surface border border-surface-edge text-center"
                          title={`${sc.title} (${sc.duration}s)`}
                        >
                          <div
                            className="h-1 w-full rounded-full mb-1"
                            style={{ backgroundColor: sc.color || '#8B5CF6' }}
                          />
                          <span className="text-4xs text-text-muted truncate block">
                            {sc.title.split('.')[0] || sc.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-2 border-t border-surface-edge">
                    <button
                      onClick={() => handleClone(tpl)}
                      disabled={cloningId === tpl.id}
                      className="w-full py-2.5 px-4 rounded-xl bg-accent-violet hover:bg-accent-violet/90 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 group/btn"
                    >
                      {cloningId === tpl.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Clonando a tu cuenta...</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Clonar a mi cuenta</span>
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
    </div>
  );
}
