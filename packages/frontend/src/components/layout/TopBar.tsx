import { useLocation, useNavigate } from 'react-router-dom';
import { Film, ChevronLeft, Share2, MoreHorizontal, Users, History, Download, Check, Copy, Sparkles, Crown, LogOut, ChevronDown, Play, Clapperboard } from 'lucide-react';
import { useUIStore } from '../../stores/useUIStore';
import { useProjectStore } from '../../stores/useProjectStore';
import { useSceneStore } from '../../stores/useSceneStore';
import { useAIStore } from '../../stores/useAIStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { PremiumModal } from '../premium/PremiumModal';
import { AnimaticModal } from '../animatic/AnimaticModal';
import { SlateModal } from '../slate/SlateModal';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

export function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toggleSidebar, sidebarOpen, viewMode } = useUIStore();
  const { currentProject } = useProjectStore();
  const { scenes } = useSceneStore();
  const { toggleAIPanel } = useAIStore();
  const { token, user, logout } = useAuthStore();
  const isInProject = location.pathname.startsWith('/project/');
  const projectId = isInProject ? location.pathname.split('/')[2] : '';
  const [copied, setCopied] = useState(false);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [animaticOpen, setAnimaticOpen] = useState(false);
  const [slateOpen, setSlateOpen] = useState(false);
  const premiumActive = user?.isPremium || false;
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on click outside
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const viewLabels: Record<string, string> = {
    canvas: 'Canvas', timeline: 'Timeline', calendar: 'Calendario', production: 'Producción', checklist: 'Checklist',
    kanban: 'Kanban', narrative: 'Narrativa', emotion: 'Emoción', attention: 'Atención', dashboard: 'Dashboard',
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleExport = (format: 'pdf' | 'csv' | 'json' = 'pdf') => {
    const projectId = location.pathname.split('/')[2];
    if (projectId) {
      setExportMenuOpen(false);
      window.open(`/api/export/${format}?project_id=${projectId}`, '_blank');
    }
  };

  return (
    <header className="h-12 bg-surface-raised border-b border-surface-edge flex items-center justify-between px-3 shrink-0 z-10">
      <div className="flex items-center gap-2 min-w-0">
        {isInProject && !sidebarOpen && (
          <button onClick={toggleSidebar} className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors">
            <Film className="w-4 h-4 text-text-muted" />
          </button>
        )}
        {isInProject && (
          <>
            <button onClick={() => navigate('/')} className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors">
              <ChevronLeft className="w-4 h-4 text-text-muted" />
            </button>
            <div className="h-5 w-px bg-surface-edge mx-1" />
            <span className="text-sm font-medium text-text-primary truncate">
              {currentProject?.title || 'Proyecto'}
            </span>
            {viewMode !== 'canvas' && (
              <span className="px-1.5 py-0.5 rounded text-2xs font-medium bg-accent-blue/10 text-accent-blue">
                {viewLabels[viewMode] || viewMode}
              </span>
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-1">
        {isInProject && (
          <>
            <button
              onClick={() => setAnimaticOpen(true)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-accent-blue/15 text-accent-blue hover:bg-accent-blue/25 border border-accent-blue/30 transition-all flex items-center gap-1.5 shadow-sm mr-1"
              title="Reproducir Storyboard Animatic en tiempo real"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Animatic</span>
            </button>
            <button
              onClick={() => setSlateOpen(true)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30 transition-all flex items-center gap-1.5 shadow-sm mr-1"
              title="Abrir Claqueta Digital y Modo Rodaje en Set"
            >
              <Clapperboard className="w-3.5 h-3.5" />
              <span>Claqueta</span>
            </button>
            <button className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors" title="Colaboradores">
              <Users className="w-4 h-4 text-text-muted" />
            </button>
            <button className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors" title="Historial">
              <History className="w-4 h-4 text-text-muted" />
            </button>
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setExportMenuOpen(!exportMenuOpen)}
                className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors"
                title="Exportar proyecto"
              >
                <Download className="w-4 h-4 text-text-muted" />
              </button>
              {exportMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-surface-raised border border-surface-edge rounded-xl shadow-xl py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <button
                    onClick={() => handleExport('pdf')}
                    className="w-full text-left px-3.5 py-2 hover:bg-surface-hover transition-colors flex items-center gap-2 text-text-primary"
                  >
                    <span>📄</span> Dossier PDF / Imprimir
                  </button>
                  <button
                    onClick={() => handleExport('csv')}
                    className="w-full text-left px-3.5 py-2 hover:bg-surface-hover transition-colors flex items-center gap-2 text-text-primary"
                  >
                    <span>📊</span> Planilla CSV (Excel)
                  </button>
                  <button
                    onClick={() => handleExport('json')}
                    className="w-full text-left px-3.5 py-2 hover:bg-surface-hover transition-colors flex items-center gap-2 text-text-primary"
                  >
                    <span>📦</span> Copia JSON
                  </button>
                </div>
              )}
            </div>
            <div className="h-5 w-px bg-surface-edge mx-1" />
            <button
              onClick={handleShare}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5',
                copied ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-blue text-white hover:bg-accent-blue/90'
              )}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Copiado
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" /> Compartir
                </>
              )}
            </button>
          </>
        )}
        <div className="h-5 w-px bg-surface-edge mx-1" />
        <button
          onClick={toggleAIPanel}
          className="p-1.5 rounded-lg hover:bg-accent-blue/10 transition-colors"
          title="VideoBoard AI"
        >
          <Sparkles className="w-4 h-4 text-accent-blue" />
        </button>
        <button
          onClick={() => setPremiumOpen(true)}
          className="p-1.5 rounded-lg hover:bg-accent-amber/10 transition-colors relative"
          title="Premium"
        >
          <Crown className={clsx('w-4 h-4', premiumActive ? 'text-accent-amber' : 'text-text-muted')} />
          {premiumActive && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent-amber" />}
        </button>
        <ThemeToggle />

        {/* User avatar dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-7 h-7 rounded-full bg-gradient-to-br from-accent-blue to-accent-amber flex items-center justify-center text-xs font-bold text-white hover:opacity-80 transition-opacity ml-1"
            title={user?.email || 'Usuario'}
          >
            {user?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || '?'}
          </button>
          <AnimatePresence>
            {userMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.95 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-full mt-2 w-56 bg-surface-raised border border-surface-edge rounded-xl shadow-2xl overflow-hidden z-50"
              >
                <div className="px-4 py-3 border-b border-surface-edge">
                  <p className="text-sm font-medium text-text-primary truncate">{user?.full_name || 'Usuario'}</p>
                  <p className="text-xs text-text-muted truncate mt-0.5">{user?.email || ''}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    {premiumActive ? (
                      <span className="text-2xs px-2 py-0.5 rounded-full bg-accent-amber/10 text-accent-amber font-medium flex items-center gap-1">
                        <Crown className="w-2.5 h-2.5" /> Premium
                      </span>
                    ) : (
                      <span className="text-2xs px-2 py-0.5 rounded-full bg-surface-edge text-text-muted font-medium">Free</span>
                    )}
                  </div>
                </div>
                <div className="p-1">
                  <button
                    onClick={() => { setUserMenuOpen(false); logout(); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-accent-red/70 hover:text-accent-red hover:bg-accent-red/5 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Cerrar sesión
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
      <PremiumModal open={premiumOpen} onClose={() => setPremiumOpen(false)} currentToken={token} />
      {isInProject && (
        <>
          <AnimaticModal
            open={animaticOpen}
            onClose={() => setAnimaticOpen(false)}
            projectId={projectId}
            projectTitle={currentProject?.title}
            scenes={scenes || []}
          />
          <SlateModal
            open={slateOpen}
            onClose={() => setSlateOpen(false)}
            projectId={projectId}
            projectTitle={currentProject?.title}
            scenes={scenes || []}
          />
        </>
      )}
    </header>
  );
}
