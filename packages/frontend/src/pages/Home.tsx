import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Film, Plus, Search, Clock, Users, MoreHorizontal, Play } from 'lucide-react';
import { clsx } from 'clsx';
import { useProjects, useCreateProject } from '../api/hooks';
import { useProjectStore } from '../stores/useProjectStore';
import type { Project } from '@videoboard/shared';

export default function Home() {
  const navigate = useNavigate();
  const { data: projects, isLoading } = useProjects();
  const createProject = useCreateProject();
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    const project = await createProject.mutateAsync({ title: newTitle });
    setShowNewModal(false);
    setNewTitle('');
    navigate(`/project/${project.id}`);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Mis Proyectos
          </h1>
          <p className="text-text-secondary text-sm">
            Organiza toda tu preproducción audiovisual en un solo lugar.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* New Project Card */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowNewModal(true)}
            className="aspect-[4/3] rounded-2xl border-2 border-dashed border-surface-edge hover:border-accent-blue/50 hover:bg-surface-hover/30 transition-all flex flex-col items-center justify-center gap-3 group"
          >
            <div className="w-12 h-12 rounded-xl bg-accent-blue/10 flex items-center justify-center group-hover:bg-accent-blue/20 transition-colors">
              <Plus className="w-6 h-6 text-accent-blue" />
            </div>
            <span className="text-sm font-medium text-text-muted group-hover:text-accent-blue transition-colors">
              Nuevo proyecto
            </span>
          </motion.button>

          {/* Project Cards */}
          {projects?.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => navigate(`/project/${project.id}`)}
            />
          ))}
        </div>

        {/* Loading skeletons */}
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="aspect-[4/3] rounded-2xl bg-surface-raised animate-pulse" />
          ))}
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
                <h2 className="text-lg font-semibold mb-4">Nuevo proyecto</h2>
                <input
                  autoFocus
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  placeholder="Título del proyecto"
                  className="w-full px-4 py-2.5 bg-surface border border-surface-edge rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/20 transition-all mb-4"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowNewModal(false)}
                    className="px-4 py-2 rounded-xl text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!newTitle.trim() || createProject.isPending}
                    className="px-4 py-2 rounded-xl bg-accent-blue text-white text-sm font-medium hover:bg-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {createProject.isPending ? 'Creando...' : 'Crear'}
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

function ProjectCard({ project, onClick }: { project: Project & { scene_count?: number; shot_count?: number }; onClick: () => void }) {
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
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="aspect-[4/3] rounded-2xl bg-surface-raised border border-surface-edge hover:border-surface-hover overflow-hidden transition-all text-left group relative"
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
          <span
            onClick={(e) => { e.stopPropagation(); }}
            className="p-1 rounded-lg hover:bg-surface-hover opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
          >
            <MoreHorizontal className="w-4 h-4 text-text-muted" />
          </span>
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
              {Math.round(project.estimated_duration_secs / 60)} min
            </span>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <span className={clsx('w-1.5 h-1.5 rounded-full', statusColors[project.status])} />
            <span className="text-2xs text-text-secondary">{statusLabels[project.status]}</span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}
