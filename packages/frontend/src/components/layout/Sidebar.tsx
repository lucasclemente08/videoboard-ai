import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Film, Layout, Calendar, Columns, Sparkles, Library, Settings, ChevronLeft, Plus, Home, BarChart3, Heart, Activity, LogOut, User, Crown, Clapperboard, ListChecks, Compass } from 'lucide-react';
import { clsx } from 'clsx';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUIStore } from '../../stores/useUIStore';
import { useProjectStore } from '../../stores/useProjectStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useCreateProject } from '../../api/hooks';
import { MediaLibrary } from '../library/MediaLibrary';
import { PremiumModal } from '../premium/PremiumModal';

export function Sidebar() {
  const { sidebarOpen, toggleSidebar, viewMode, setViewMode } = useUIStore();
  const location = useLocation();
  const navigate = useNavigate();
  const isInProject = location.pathname.startsWith('/project/');
  const projectId = location.pathname.split('/')[2];
  const [showLibrary, setShowLibrary] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const createProject = useCreateProject();
  const { user, token, logout } = useAuthStore();

  const handleNewProject = async () => {
    const project = await createProject.mutateAsync({ title: 'Nuevo proyecto' });
    navigate(`/project/${project.id}`);
  };

  if (!sidebarOpen) {
    return (
      <button
        onClick={toggleSidebar}
        className="w-10 h-full flex items-start justify-center pt-3 bg-surface-raised border-r border-surface-edge hover:bg-surface-hover transition-colors shrink-0"
      >
        <ChevronLeft className="w-4 h-4 text-text-muted rotate-180" />
      </button>
    );
  }

  return (
    <>
      <aside className="w-56 h-full bg-surface-raised border-r border-surface-edge flex flex-col animate-slide-right shrink-0">
        {/* Header */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-surface-edge">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-accent-blue flex items-center justify-center">
              <Film className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-text-primary">VideoBoard</span>
          </Link>
          <button onClick={toggleSidebar} className="p-1 rounded hover:bg-surface-hover transition-colors">
            <ChevronLeft className="w-3.5 h-3.5 text-text-muted" />
          </button>
        </div>

        {/* Quick actions */}
        <div className="px-3 py-2">
          <button
            onClick={handleNewProject}
            disabled={createProject.isPending}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-accent-blue text-white text-xs font-medium hover:bg-accent-blue/90 transition-colors disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            {createProject.isPending ? 'Creando...' : 'Nuevo proyecto'}
          </button>
        </div>

        {/* Project nav */}
        {isInProject && (
          <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
            <div className="px-3 py-2">
              <span className="text-2xs font-medium text-text-muted uppercase tracking-wider">Vistas</span>
            </div>
            {[
              { icon: Layout, label: 'Canvas', view: 'canvas' as const },
              { icon: Film, label: 'Timeline', view: 'timeline' as const },
              { icon: Calendar, label: 'Calendario', view: 'calendar' as const },
              { icon: Clapperboard, label: 'Producción', view: 'production' as const },
              { icon: ListChecks, label: 'Checklist', view: 'checklist' as const },
              { icon: Columns, label: 'Kanban', view: 'kanban' as const },
              { icon: Sparkles, label: 'Narrativa', view: 'narrative' as const },
              { icon: Heart, label: 'Emociones', view: 'emotion' as const },
              { icon: Activity, label: 'Atención', view: 'attention' as const },
              { icon: BarChart3, label: 'Dashboard', view: 'dashboard' as const },
            ].map((item) => (
              <button
                key={item.view}
                onClick={() => setViewMode(item.view)}
                className={clsx(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150',
                  viewMode === item.view
                    ? 'bg-accent-blue/10 text-accent-blue font-medium'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
                {item.view === viewMode && (
                  <motion.div layoutId="active-indicator" className="ml-auto w-1 h-1 rounded-full bg-accent-blue" />
                )}
              </button>
            ))}
          </nav>
        )}

        {/* Home link when in project */}
        {isInProject && (
          <div className="px-2 pb-2 border-t border-surface-edge">
            <button
              onClick={() => navigate('/')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors mt-2"
            >
              <Home className="w-4 h-4" />
              Inicio
            </button>
          </div>
        )}

        {/* Bottom actions */}
        <div className="p-2 border-t border-surface-edge space-y-0.5">
          <button
            onClick={() => navigate('/templates')}
            className={clsx(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
              location.pathname === '/templates'
                ? 'bg-accent-blue/10 text-accent-blue font-medium'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
            )}
          >
            <Compass className="w-4 h-4 text-accent-blue" />
            <span className="flex-1 text-left">Plantillas</span>
            <span className="text-2xs px-1.5 py-0.5 rounded-full bg-accent-blue/15 text-accent-blue font-semibold">Hub</span>
          </button>
          <button
            onClick={() => setShowLibrary(!showLibrary)}
            className={clsx(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
              showLibrary ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
            )}
          >
            <Library className="w-4 h-4" />
            Biblioteca
          </button>
          <button
            onClick={() => setShowPremium(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
          >
            <Crown className={clsx('w-4 h-4', user?.isPremium ? 'text-accent-amber' : '')} />
            <span className="flex-1 text-left">Premium</span>
            {user?.isPremium ? (
              <span className="text-2xs px-1.5 py-0.5 rounded-full bg-accent-amber/10 text-accent-amber font-medium">Activo</span>
            ) : (
              <span className="text-2xs px-1.5 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue font-medium">Free</span>
            )}
          </button>
          <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors">
            <Settings className="w-4 h-4" />
            Configuración
          </button>

          {/* User section */}
          <div className="pt-3 mt-2 border-t border-surface-edge">
            <div className="px-3 py-2 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent-blue to-accent-amber flex items-center justify-center text-xs font-bold text-white shrink-0">
                {user?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-text-primary truncate">{user?.full_name || 'Usuario'}</p>
                <p className="text-2xs text-text-muted truncate">{user?.email || ''}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-accent-red/70 hover:text-accent-red hover:bg-accent-red/5 transition-colors mt-1"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      <PremiumModal open={showPremium} onClose={() => setShowPremium(false)} currentToken={token} />

      {/* Library panel */}
      <AnimatePresence>
        {showLibrary && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 340, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full border-r border-surface-edge bg-surface overflow-hidden shrink-0"
          >
            <MediaLibrary
              onSelect={(url) => {
                console.log('Selected:', url);
              }}
              onClose={() => setShowLibrary(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
