import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Film, Clock, Trash2, FolderGit2, Compass, Sparkles } from 'lucide-react';
import { useProjects, useCreateProject, useDeleteProject } from '../api/hooks';
import { useProjectStore } from '../stores/useProjectStore';
import { useAuthStore } from '../stores/useAuthStore';
import type { Project } from '@videoboard/shared';
import { clsx } from 'clsx';

export function Home() {
  const navigate = useNavigate();
  const { data: projects, isLoading } = useProjects();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();
  const { setCurrentProject } = useProjectStore();
  const { user } = useAuthStore();
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      const project = await createProject.mutateAsync({ title: newTitle.trim() });
      setCurrentProject(project);
      setShowNewModal(false);
      setNewTitle('');
      navigate(`/project/${project.id}`);
    } catch {
      // Handled by react-query
    }
  };

  const handleDelete = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (window.confirm('¿Seguro que deseas eliminar este proyecto y todo su contenido?')) {
      await deleteProject.mutateAsync(projectId);
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-surface p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold text-text-primary">
              Bienvenido, {user?.full_name?.split(' ')[0] || 'Creador'}
            </h1>
            <p className="text-xs text-text-muted mt-0.5">Tus proyectos audiovisuales</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/templates')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-surface-raised border border-surface-edge text-text-primary rounded-xl text-xs font-semibold hover:border-accent-blue/50 hover:bg-surface-hover transition-all shadow-xs"
            >
              <Compass className="w-4 h-4 text-accent-blue" />
              Explorar Plantillas
            </button>
            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-accent-blue text-white rounded-xl text-xs font-semibold hover:bg-accent-blue/90 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Nuevo proyecto
            </button>
          </div>
        </div>

        {/* Skeletons while loading */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] rounded-2xl bg-surface-raised animate-pulse border border-surface-edge" />
            ))}
          </div>
        )}

        {/* Project Grid when projects exist */}
        {!isLoading && projects && projects.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* New Project Card */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowNewModal(true)}
              className="aspect-[4/3] rounded-2xl border-2 border-dashed border-surface-edge hover:border-accent-blue/50 flex flex-col items-center justify-center gap-2 group transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-surface-raised group-hover:bg-accent-blue/10 flex items-center justify-center transition-colors">
                <Plus className="w-5 h-5 text-text-muted group-hover:text-accent-blue transition-colors" />
              </div>
              <span className="text-xs font-medium text-text-muted group-hover:text-accent-blue transition-colors">
                Nuevo proyecto
              </span>
            </motion.button>

            {/* Project Cards */}
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => navigate(`/project/${project.id}`)}
                onDelete={(e) => handleDelete(e, project.id)}
              />
            ))}
          </div>
        )}

        {/* Empty State when 0 projects and not loading */}
        {!isLoading && (!projects || projects.length === 0) && (
          <div className="py-16 text-center border-2 border-dashed border-surface-edge rounded-3xl max-w-lg mx-auto p-8 bg-surface-raised/40 backdrop-blur-sm">
            <div className="w-14 h-14 rounded-2xl bg-accent-blue/10 text-accent-blue flex items-center justify-center mx-auto mb-4">
              <FolderGit2 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-text-primary">Comienza tu primer guion y storyboard</h3>
            <p className="text-xs text-text-muted mt-1.5 mb-6 max-w-sm mx-auto leading-relaxed">
              Crea un proyecto para estructurar escenas, tomas de cámara, elenco y sincronizar en tiempo real con tu equipo.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowNewModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent-blue text-white text-xs font-semibold rounded-xl hover:bg-accent-blue-hover transition-all shadow-md"
              >
                <Plus className="w-4 h-4" /> Crear desde cero
              </button>
              <button
                onClick={() => navigate('/templates')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-surface border border-surface-edge text-text-primary text-xs font-semibold rounded-xl hover:border-accent-blue/50 transition-all"
              >
                <Sparkles className="w-4 h-4 text-accent-blue" /> Usar Plantilla
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Project Modal */}
      <AnimatePresence>
        {showNewModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setShowNewModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
            >
              <div className="pointer-events-auto w-full max-w-md bg-surface-raised border border-surface-edge rounded-2xl p-6 shadow-2xl">
                <h2 className="text-base font-bold text-text-primary mb-4">Nuevo proyecto</h2>
                <input
                  autoFocus
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  placeholder="Título del proyecto (ej: Cortometraje Eclipse)"
                  className="w-full px-4 py-2.5 bg-surface border border-surface-edge rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue transition-all mb-5"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowNewModal(false)}
                    className="px-4 py-2 text-xs font-medium text-text-muted hover:text-text-primary transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!newTitle.trim()}
                    className="px-4 py-2 bg-accent-blue text-white rounded-xl text-xs font-semibold hover:bg-accent-blue/90 transition-all disabled:opacity-50 shadow-sm"
                  >
                    Crear proyecto
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProjectCard({
  project,
  onClick,
  onDelete,
}: {
  project: Project & { scene_count?: number; shot_count?: number };
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const statusLabels: Record<string, string> = {
    draft: 'Borrador',
    planning: 'Planificación',
    shooting: 'Grabando',
    editing: 'Editando',
    review: 'Revisión',
    published: 'Publicado',
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-text-muted',
    planning: 'bg-accent-blue',
    shooting: 'bg-accent-amber',
    editing: 'bg-accent-violet',
    review: 'bg-accent-pink',
    published: 'bg-accent-green',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="aspect-[4/3] rounded-2xl bg-surface-raised border border-surface-edge hover:border-surface-hover overflow-hidden transition-all text-left group relative cursor-pointer shadow-xs"
    >
      {/* Cover */}
      <div className="absolute inset-0 bg-gradient-to-br from-surface-hover to-surface opacity-50" />
      {project.cover_url && (
        <img src={project.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
      )}

      {/* Content */}
      <div className="relative h-full flex flex-col justify-between p-4">
        <div className="flex items-start justify-between">
          <div className="w-8 h-8 rounded-lg bg-accent-blue/20 flex items-center justify-center">
            <Film className="w-4 h-4 text-accent-blue" />
          </div>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-surface-hover opacity-0 group-hover:opacity-100 transition-all text-text-muted hover:text-accent-red"
            title="Eliminar proyecto"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-1 line-clamp-1">
            {project.title}
          </h3>
          <div className="flex items-center gap-3 text-2xs text-text-muted">
            <span className="flex items-center gap-1">
              <Film className="w-3 h-3" />
              {(project as any).scene_count || 0} escenas
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {Math.round((project.estimated_duration_secs || 0) / 60)} min
            </span>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <span className={clsx('w-1.5 h-1.5 rounded-full', statusColors[project.status || 'draft'])} />
            <span className="text-2xs text-text-secondary">{statusLabels[project.status || 'draft']}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default Home;
