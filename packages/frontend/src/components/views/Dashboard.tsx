import { motion } from 'framer-motion';
import { Film, Camera, MapPin, User, DollarSign, Clock, AlertTriangle, CheckCircle, Image, Music } from 'lucide-react';
import { useSceneStore } from '../../stores/useSceneStore';
import { useProjectStore } from '../../stores/useProjectStore';
import { useProject, useCharacters, useLocations, useBudgetItems } from '../../api/hooks';
import { useParams } from 'react-router-dom';

const stats = [
  { icon: Film, label: 'Escenas', key: 'scenes', color: '#3B82F6' },
  { icon: Camera, label: 'Tomas', key: 'shots', color: '#8B5CF6' },
  { icon: MapPin, label: 'Locaciones', key: 'locations', color: '#10B981' },
  { icon: User, label: 'Actores', key: 'actors', color: '#EC4899' },
  { icon: DollarSign, label: 'Presupuesto', key: 'budget', color: '#F97316' },
  { icon: Clock, label: 'Duración total', key: 'duration', color: '#06B6D4' },
  { icon: CheckCircle, label: 'Completado', key: 'done', color: '#10B981' },
  { icon: AlertTriangle, label: 'Riesgos', key: 'risks', color: '#EF4444' },
];

export function Dashboard() {
  const { id } = useParams<{ id: string }>();
  const { data: project } = useProject(id!);
  const { data: characters = [] } = useCharacters(id!);
  const { data: locations = [] } = useLocations(id!);
  const { data: budgetItems = [] } = useBudgetItems(id!);
  const { scenes } = useSceneStore();

  const totalDuration = scenes.reduce((s, c) => s + c.estimated_duration_secs, 0);
  const done = scenes.filter(s => s.status === 'done').length;
  const pct = scenes.length > 0 ? Math.round((done / scenes.length) * 100) : 0;
  const totalBudget = budgetItems.reduce((acc, item) => acc + (item.actual_cost || item.estimated_cost || 0), 0);

  return (
    <div className="h-full overflow-y-auto bg-surface p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-text-primary mb-1">{project?.title || 'Dashboard'}</h1>
        <p className="text-sm text-text-muted mb-8">Resumen del proyecto</p>

        {/* Progress */}
        <div className="bg-surface-raised rounded-2xl border border-surface-edge p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-text-primary">Progreso general</span>
            <span className="text-2xl font-bold text-accent-blue">{pct}%</span>
          </div>
          <div className="h-3 rounded-full bg-surface-edge overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-accent-blue to-accent-violet" />
          </div>
          <div className="flex justify-between mt-2 text-2xs text-text-muted">
            <span>{done} completadas de {scenes.length}</span>
            <span>{totalDuration}s total</span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { icon: Film, label: 'Escenas', value: scenes.length, color: '#3B82F6' },
            { icon: Clock, label: 'Duración', value: `${Math.round(totalDuration / 60)} min`, color: '#06B6D4' },
            { icon: Camera, label: 'Tomas est.', value: scenes.length * 3 || '0', color: '#8B5CF6' },
            { icon: CheckCircle, label: 'Completado', value: `${pct}%`, color: '#10B981' },
            { icon: User, label: 'Personajes', value: characters.length, color: '#EC4899' },
            { icon: MapPin, label: 'Locaciones', value: locations.length, color: '#10B981' },
            { icon: DollarSign, label: 'Presupuesto', value: `$${totalBudget.toLocaleString()}`, color: '#F97316' },
            { icon: AlertTriangle, label: 'Riesgos', value: '0', color: '#EF4444' },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-surface-raised rounded-xl border border-surface-edge p-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ backgroundColor: stat.color + '15' }}>
                <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
              </div>
              <p className="text-xs text-text-muted">{stat.label}</p>
              <p className="text-lg font-bold text-text-primary">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Status breakdown */}
        <div className="bg-surface-raised rounded-2xl border border-surface-edge p-6 mb-6">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Por estado</h3>
          <div className="space-y-3">
            {['draft', 'writing', 'ready', 'shooting', 'done'].map((status) => {
              const count = scenes.filter(s => (s.status || 'draft') === status).length;
              const colors: Record<string, string> = { draft: '#71717A', writing: '#3B82F6', ready: '#F59E0B', shooting: '#EF4444', done: '#10B981' };
              const labels: Record<string, string> = { draft: 'Ideas', writing: 'Escribiendo', ready: 'Listo', shooting: 'Grabando', done: 'Completado' };
              return (
                <div key={status} className="flex items-center gap-3">
                  <span className="text-xs text-text-secondary w-20">{labels[status]}</span>
                  <div className="flex-1 h-2 rounded-full bg-surface-edge overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${scenes.length > 0 ? (count / scenes.length) * 100 : 0}%`, backgroundColor: colors[status] }} />
                  </div>
                  <span className="text-xs text-text-muted w-6 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent scenes */}
        <div className="bg-surface-raised rounded-2xl border border-surface-edge p-6">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Escenas</h3>
          <div className="space-y-2">
            {scenes.slice(0, 10).map((scene, i) => (
              <div key={scene.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-hover transition-colors">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: scene.color }} />
                <span className="text-xs text-text-primary flex-1 truncate">{scene.title}</span>
                <span className="text-2xs text-text-muted">{scene.estimated_duration_secs}s</span>
                <span className="px-1.5 py-0.5 rounded text-2xs bg-surface-edge text-text-muted capitalize">{scene.status || 'draft'}</span>
              </div>
            ))}
            {scenes.length === 0 && <p className="text-xs text-text-muted text-center py-4">Sin escenas aún</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
