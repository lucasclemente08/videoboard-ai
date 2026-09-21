import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, Square, Plus, Trash2, CheckCircle2, ListChecks } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useChecklist, useCreateChecklistItem, useUpdateChecklistItem, useDeleteChecklistItem } from '../../api/hooks';

const DEFAULT_CATEGORIES = ['Pre-producción', 'Guion y Storyboard', 'Elenco y Locaciones', 'Rodaje', 'Post-producción'];

export function ChecklistView() {
  const { id: projectId } = useParams<{ id: string }>();
  const { data: items = [] } = useChecklist(projectId!);
  const createItem = useCreateChecklistItem();
  const updateItem = useUpdateChecklistItem();
  const deleteItem = useDeleteChecklistItem();

  const [newItemText, setNewItemText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Pre-producción');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim() || !projectId) return;
    await createItem.mutateAsync({
      project_id: projectId,
      item: newItemText.trim(),
      category: selectedCategory,
      checked: false,
    });
    setNewItemText('');
  };

  const completedCount = items.filter(i => i.checked).length;
  const progressPercent = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <div className="h-full flex flex-col bg-surface text-text-primary overflow-hidden">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-6 border-b border-surface-edge bg-surface-raised/40 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-green/15 flex items-center justify-center">
            <ListChecks className="w-4 h-4 text-accent-green" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-text-primary">Checklist de Producción</h2>
            <p className="text-4xs text-text-muted">Control de hitos y tareas para el rodaje</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-36 h-2 bg-surface rounded-full overflow-hidden border border-surface-edge">
            <div
              className="h-full bg-accent-green transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs font-mono font-bold text-accent-green">{completedCount}/{items.length} ({progressPercent}%)</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full space-y-6">
        {/* Quick Add Form */}
        <form onSubmit={handleAdd} className="p-4 rounded-2xl border border-surface-edge bg-surface-raised flex gap-3">
          <input
            type="text"
            placeholder="Añadir nuevo ítem al checklist..."
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            className="flex-1 px-4 py-2 bg-surface rounded-xl border border-surface-edge text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-green"
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-surface rounded-xl border border-surface-edge text-xs text-text-primary focus:outline-none"
          >
            {DEFAULT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!newItemText.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-accent-green text-white rounded-xl text-xs font-semibold hover:bg-accent-green/90 transition-all disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Añadir
          </button>
        </form>

        {/* Categories Breakdown */}
        {DEFAULT_CATEGORIES.map((cat) => {
          const catItems = items.filter(i => (i.category || 'Pre-producción') === cat);
          if (catItems.length === 0) return null;
          return (
            <div key={cat} className="space-y-2">
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">{cat}</h3>
              <div className="space-y-1.5">
                {catItems.map((it) => (
                  <motion.div
                    key={it.id}
                    layout
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all group ${
                      it.checked ? 'bg-surface-raised/30 border-surface-edge/50 opacity-60' : 'bg-surface-raised border-surface-edge'
                    }`}
                  >
                    <button
                      onClick={() => updateItem.mutate({ id: it.id, checked: !it.checked })}
                      className="flex items-center gap-3 text-left flex-1"
                    >
                      {it.checked ? (
                        <CheckCircle2 className="w-4 h-4 text-accent-green shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-text-muted shrink-0 group-hover:text-accent-blue transition-colors" />
                      )}
                      <span className={`text-xs ${it.checked ? 'line-through text-text-muted' : 'text-text-primary font-medium'}`}>
                        {it.item}
                      </span>
                    </button>
                    <button
                      onClick={() => deleteItem.mutate(it.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-surface-hover text-text-muted hover:text-accent-red transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="py-16 text-center border-2 border-dashed border-surface-edge rounded-2xl">
            <CheckSquare className="w-10 h-10 text-text-muted mx-auto mb-3 opacity-40" />
            <h4 className="text-sm font-semibold text-text-primary">Tu checklist está vacío</h4>
            <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
              Añade tareas clave de rodaje, contratos o alquileres de equipo para no olvidar ningún detalle.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
