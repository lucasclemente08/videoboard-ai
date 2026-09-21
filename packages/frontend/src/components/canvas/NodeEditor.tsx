import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Save } from 'lucide-react';
import { clsx } from 'clsx';

interface Props {
  nodeId: string;
  nodeType: string;
  data: any;
  position: { x: number; y: number };
  onSave: (nodeId: string, data: any) => void;
  onClose: () => void;
}

export function NodeEditor({ nodeId, nodeType, data, position, onSave, onClose }: Props) {
  const [form, setForm] = useState({ ...data });

  const update = (key: string, value: any) => setForm((f: any) => ({ ...f, [key]: value }));

  const handleSave = () => {
    onSave(nodeId, form);
    onClose();
  };

  const inputClass = 'w-full px-3 py-2 bg-surface border border-surface-edge rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue';
  const labelClass = 'text-2xs font-medium text-text-muted mb-1';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed z-50 w-72 bg-surface-raised border border-surface-edge rounded-2xl shadow-2xl overflow-hidden"
      style={{ left: position.x, top: Math.min(position.y, window.innerHeight - 500) }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-edge bg-surface-overlay/50">
        <span className="text-sm font-semibold text-text-primary capitalize">
          {nodeType === 'sceneNode' ? 'Editar Escena' : nodeType === 'stickyNote' ? 'Editar Nota' : nodeType === 'checklist' ? 'Editar Checklist' : nodeType === 'character' ? 'Editar Personaje' : nodeType === 'location' ? 'Editar Locación' : nodeType === 'camera' ? 'Editar Equipo' : nodeType === 'budget' ? 'Editar Presupuesto' : nodeType === 'risk' ? 'Editar Riesgo' : nodeType === 'folder' ? 'Editar Carpeta' : `Editar ${nodeType}`}
        </span>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-hover"><X className="w-3.5 h-3.5 text-text-muted" /></button>
      </div>

      <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
        {/* Label (common) — but for scene nodes we use title */}
        {nodeType !== 'sceneNode' && (
          <div>
            <label className={labelClass}>Nombre</label>
            <input className={inputClass} value={form.label || ''} onChange={e => update('label', e.target.value)} />
          </div>
        )}

        {/* Scene Node — full editor */}
        {nodeType === 'sceneNode' && (
          <>
            <div>
              <label className={labelClass}>Título</label>
              <input className={inputClass} value={form.title || ''} onChange={e => update('title', e.target.value)} placeholder="Nombre de la escena" />
            </div>
            <div>
              <label className={labelClass}>Descripción / Notas</label>
              <textarea className={inputClass} rows={4} value={form.description || ''} onChange={e => update('description', e.target.value)} placeholder="¿Qué ocurre en esta escena?" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Duración (seg)</label>
                <input className={inputClass} type="number" min={0} value={form.estimated_duration_secs || 0} onChange={e => update('estimated_duration_secs', parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <label className={labelClass}>Estado</label>
                <select className={inputClass} value={form.status || 'draft'} onChange={e => update('status', e.target.value)}>
                  <option value="draft">Borrador</option>
                  <option value="ready">Listo</option>
                  <option value="shooting">Rodando</option>
                  <option value="done">Completado</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Tipo de plano</label>
                <input className={inputClass} value={form.scene_type || ''} onChange={e => update('scene_type', e.target.value)} placeholder="Interior / Exterior" />
              </div>
              <div>
                <label className={labelClass}>Prioridad</label>
                <select className={inputClass} value={form.priority || 'media'} onChange={e => update('priority', e.target.value)}>
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass}>Color</label>
              <div className="flex gap-2">
                {['#3B82F6', '#F59E0B', '#22C55E', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#A1A1AA'].map(c => (
                  <button key={c} onClick={() => update('color', c)}
                    className={clsx('w-6 h-6 rounded-lg border-2 transition-all', form.color === c ? 'border-white scale-110' : 'border-transparent')}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {/* Sticky Note */}
        {nodeType === 'stickyNote' && (
          <div>
            <label className={labelClass}>Contenido</label>
            <textarea className={inputClass} rows={4} value={form.content || ''} onChange={e => update('content', e.target.value)} placeholder="Escribe tu nota..." />
          </div>
        )}

        {/* Checklist */}
        {nodeType === 'checklist' && (
          <div className="space-y-2">
            <label className={labelClass}>Tareas</label>
            {(form.items || []).map((item: string, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <input type="checkbox" checked={form.checked?.[i] || false}
                  onChange={() => { const c = [...(form.checked || [])]; c[i] = !c[i]; update('checked', c); }}
                  className="w-3.5 h-3.5 rounded border-surface-edge" />
                <input className={inputClass} value={item} onChange={e => { const items = [...(form.items || [])]; items[i] = e.target.value; update('items', items); }} />
                <button onClick={() => { update('items', (form.items || []).filter((_: any, j: number) => j !== i)); }}
                  className="text-2xs text-accent-red hover:underline shrink-0">✕</button>
              </div>
            ))}
            <button onClick={() => update('items', [...(form.items || []), 'Nueva tarea'])}
              className="text-2xs text-accent-blue hover:underline">+ Añadir tarea</button>
          </div>
        )}

        {/* Character */}
        {nodeType === 'character' && (
          <>
            <div><label className={labelClass}>Actor</label><input className={inputClass} value={form.actor || ''} onChange={e => update('actor', e.target.value)} /></div>
            <div><label className={labelClass}>Vestuario</label><input className={inputClass} value={form.wardrobe || ''} onChange={e => update('wardrobe', e.target.value)} /></div>
          </>
        )}

        {/* Location */}
        {nodeType === 'location' && (
          <>
            <div><label className={labelClass}>Dirección</label><input className={inputClass} value={form.address || ''} onChange={e => update('address', e.target.value)} placeholder="Calle, número, ciudad" /></div>
            <div><label className={labelClass}>Permisos necesarios</label><input className={inputClass} value={form.permits || ''} onChange={e => update('permits', e.target.value)} placeholder="Ej: permiso municipal" /></div>
            <div><label className={labelClass}>Notas adicionales</label><textarea className={inputClass} rows={2} value={form.notes || ''} onChange={e => update('notes', e.target.value)} placeholder="Horario disponible, restricciones..." /></div>
          </>
        )}

        {/* Camera */}
        {nodeType === 'camera' && (
          <>
            <div><label className={labelClass}>Cámara</label><input className={inputClass} value={form.camera || ''} onChange={e => update('camera', e.target.value)} placeholder="Sony A7III, RED Komodo..." /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className={labelClass}>Lente</label><input className={inputClass} value={form.lens || ''} onChange={e => update('lens', e.target.value)} placeholder="24-70mm" /></div>
              <div><label className={labelClass}>FPS</label><input className={inputClass} type="number" value={form.fps || 24} onChange={e => update('fps', parseInt(e.target.value) || 24)} /></div>
            </div>
            <div><label className={labelClass}>Resolución</label><input className={inputClass} value={form.resolution || ''} onChange={e => update('resolution', e.target.value)} placeholder="4K, 1080p..." /></div>
          </>
        )}

        {/* Budget */}
        {nodeType === 'budget' && (
          <>
            <div><label className={labelClass}>Total ($)</label><input className={inputClass} type="number" value={form.total || 0} onChange={e => update('total', parseInt(e.target.value) || 0)} /></div>
            <div><label className={labelClass}>Gastado ($)</label><input className={inputClass} type="number" value={form.spent || 0} onChange={e => update('spent', parseInt(e.target.value) || 0)} /></div>
            <div className="h-2 rounded-full bg-surface-edge"><div className="h-full rounded-full bg-accent-amber" style={{ width: `${form.total > 0 ? Math.min((form.spent / form.total) * 100, 100) : 0}%` }} /></div>
          </>
        )}

        {/* Risk */}
        {nodeType === 'risk' && (
          <>
            <div>
              <label className={labelClass}>Severidad</label>
              <select className={inputClass} value={form.severity || 'medio'} onChange={e => update('severity', e.target.value)}>
                <option value="bajo">Bajo</option>
                <option value="medio">Medio</option>
                <option value="alto">Alto</option>
              </select>
            </div>
            <div><label className={labelClass}>Descripción</label><textarea className={inputClass} rows={3} value={form.description || ''} onChange={e => update('description', e.target.value)} /></div>
          </>
        )}

        {/* Folder */}
        {nodeType === 'folder' && (
          <div>
            <label className={labelClass}>Nombre de carpeta</label>
            <input className={inputClass} value={form.label || ''} onChange={e => update('label', e.target.value)} />
            <p className="text-2xs text-text-muted mt-2">Arrastra nodos dentro de esta carpeta para agruparlos.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 px-4 py-3 border-t border-surface-edge bg-surface-overlay/30">
        <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs text-text-muted hover:bg-surface-hover transition-colors">Cancelar</button>
        <button onClick={handleSave} className="px-4 py-2 rounded-xl text-xs font-medium bg-accent-blue text-white hover:bg-accent-blue/90 transition-all flex items-center gap-1.5">
          <Save className="w-3 h-3" /> Guardar
        </button>
      </div>
    </motion.div>
  );
}
