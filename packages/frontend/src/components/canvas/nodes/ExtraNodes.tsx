import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { StickyNote, CheckSquare, User, MapPin, Camera, DollarSign, AlertTriangle, Folder } from 'lucide-react';
import { clsx } from 'clsx';

const handleStyle = '!w-2.5 !h-2.5 !border-2 !border-surface-raised !rounded-full opacity-0 group-hover:opacity-100 transition-all hover:!scale-125 shadow-md';

// ---- Sticky Note ----
export const StickyNode = memo(({ data, selected }: NodeProps) => (
  <div className={clsx('relative group rounded-lg p-3 shadow-md min-w-[160px] transition-all', selected && 'ring-2 ring-accent-blue/50')}
    style={{ backgroundColor: data.color || '#FEF3C7' }}>
    <Handle type="source" position={Position.Right} id="right" className={clsx(handleStyle, '!bg-amber-500 !-right-1.5')} />
    <Handle type="target" position={Position.Left} id="left" className={clsx(handleStyle, '!bg-amber-500 !-left-1.5')} />
    <Handle type="target" position={Position.Top} id="top" className={clsx(handleStyle, '!bg-amber-500 !-top-1.5')} />
    <Handle type="source" position={Position.Bottom} id="bottom" className={clsx(handleStyle, '!bg-amber-500 !-bottom-1.5')} />
    <div className="flex items-center gap-2 mb-1"><StickyNote className="w-3.5 h-3.5 text-amber-700" />
      <h4 className="text-xs font-semibold text-amber-900 truncate">{data.label || 'Nota'}</h4>
    </div>
    {data.content && <p className="text-2xs text-amber-800 line-clamp-4 whitespace-pre-wrap">{data.content}</p>}
  </div>
));
StickyNode.displayName = 'StickyNode';

// ---- Checklist Node ----
export const ChecklistNode = memo(({ data, selected }: NodeProps) => {
  const items: string[] = data.items || [];
  const checked: boolean[] = data.checked || [];
  const done = checked.filter(Boolean).length;
  return (
    <div className={clsx('relative group rounded-xl p-3 bg-surface-raised border min-w-[200px]', selected && 'border-accent-green ring-2 ring-accent-green/30')}>
      <Handle type="source" position={Position.Right} id="right" className={clsx(handleStyle, '!bg-accent-green !-right-1.5')} />
      <Handle type="target" position={Position.Left} id="left" className={clsx(handleStyle, '!bg-accent-green !-left-1.5')} />
      <Handle type="target" position={Position.Top} id="top" className={clsx(handleStyle, '!bg-accent-green !-top-1.5')} />
      <Handle type="source" position={Position.Bottom} id="bottom" className={clsx(handleStyle, '!bg-accent-green !-bottom-1.5')} />
      <div className="flex items-center gap-2 mb-2"><CheckSquare className="w-3.5 h-3.5 text-accent-green" />
        <span className="text-xs font-semibold text-text-primary">{data.label || 'Checklist'}</span>
        <span className="ml-auto text-2xs text-text-muted">{done}/{items.length}</span>
      </div>
      <div className="space-y-1">
        {items.map((item: string, i: number) => (
          <div key={i} className="flex items-center gap-1.5 text-2xs">
            <div className={clsx('w-3 h-3 rounded border flex items-center justify-center shrink-0', checked[i] ? 'bg-accent-green border-accent-green' : 'border-surface-edge')}>
              {checked[i] && <span className="text-[8px] text-white">✓</span>}
            </div>
            <span className={clsx('text-text-secondary', checked[i] && 'line-through text-text-muted')}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
});
ChecklistNode.displayName = 'ChecklistNode';

// ---- Character Node ----
export const CharacterNode = memo(({ data, selected }: NodeProps) => (
  <div className={clsx('relative group rounded-xl p-3 bg-surface-raised border min-w-[180px]', selected && 'border-accent-pink ring-2 ring-accent-pink/30')}>
    <Handle type="source" position={Position.Right} id="right" className={clsx(handleStyle, '!bg-accent-pink !-right-1.5')} />
    <Handle type="target" position={Position.Left} id="left" className={clsx(handleStyle, '!bg-accent-pink !-left-1.5')} />
    <Handle type="target" position={Position.Top} id="top" className={clsx(handleStyle, '!bg-accent-pink !-top-1.5')} />
    <Handle type="source" position={Position.Bottom} id="bottom" className={clsx(handleStyle, '!bg-accent-pink !-bottom-1.5')} />
    <div className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-accent-pink" />
      <span className="text-xs font-semibold text-text-primary">{data.label || 'Personaje'}</span>
    </div>
    <div className="mt-2 space-y-0.5 text-2xs text-text-muted">
      {data.actor && <p>🎭 {data.actor}</p>}
      {data.wardrobe && <p>👔 {data.wardrobe}</p>}
      {!data.actor && !data.wardrobe && <p className="text-text-muted/50 italic">Sin datos</p>}
    </div>
  </div>
));
CharacterNode.displayName = 'CharacterNode';

// ---- Location Node ----
export const LocationNode = memo(({ data, selected }: NodeProps) => (
  <div className={clsx('relative group rounded-xl p-3 bg-surface-raised border min-w-[200px]', selected && 'border-accent-green ring-2 ring-accent-green/30')}>
    <Handle type="source" position={Position.Right} id="right" className={clsx(handleStyle, '!bg-accent-green !-right-1.5')} />
    <Handle type="target" position={Position.Left} id="left" className={clsx(handleStyle, '!bg-accent-green !-left-1.5')} />
    <Handle type="target" position={Position.Top} id="top" className={clsx(handleStyle, '!bg-accent-green !-top-1.5')} />
    <Handle type="source" position={Position.Bottom} id="bottom" className={clsx(handleStyle, '!bg-accent-green !-bottom-1.5')} />
    <div className="flex items-center gap-2 mb-2"><MapPin className="w-3.5 h-3.5 text-accent-green" />
      <span className="text-xs font-semibold text-text-primary">{data.label || 'Locación'}</span>
    </div>
    <div className="space-y-1 text-2xs text-text-muted">
      {data.address ? <p>📍 {data.address}</p> : <p className="text-text-muted/50 italic">Sin dirección</p>}
      {data.permits && <p className="text-accent-amber flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5" />{data.permits}</p>}
      {data.notes && <p className="text-text-secondary">{data.notes}</p>}
    </div>
  </div>
));
LocationNode.displayName = 'LocationNode';

// ---- Camera/Equipment Node ----
export const CameraNode = memo(({ data, selected }: NodeProps) => (
  <div className={clsx('relative group rounded-xl p-3 bg-surface-raised border min-w-[180px]', selected && 'border-accent-violet ring-2 ring-accent-violet/30')}>
    <Handle type="source" position={Position.Right} id="right" className={clsx(handleStyle, '!bg-accent-violet !-right-1.5')} />
    <Handle type="target" position={Position.Left} id="left" className={clsx(handleStyle, '!bg-accent-violet !-left-1.5')} />
    <Handle type="target" position={Position.Top} id="top" className={clsx(handleStyle, '!bg-accent-violet !-top-1.5')} />
    <Handle type="source" position={Position.Bottom} id="bottom" className={clsx(handleStyle, '!bg-accent-violet !-bottom-1.5')} />
    <div className="flex items-center gap-2 mb-2"><Camera className="w-3.5 h-3.5 text-accent-violet" />
      <span className="text-xs font-semibold text-text-primary">{data.label || 'Equipo'}</span>
    </div>
    <div className="grid grid-cols-2 gap-1 text-2xs">
      <div><span className="text-text-muted">📷</span> {data.camera || '—'}</div>
      <div><span className="text-text-muted">🔍</span> {data.lens || '—'}</div>
      <div><span className="text-text-muted">🎬</span> {data.fps || '24'}fps</div>
      {data.resolution && <div><span className="text-text-muted">📐</span> {data.resolution}</div>}
    </div>
  </div>
));
CameraNode.displayName = 'CameraNode';

// ---- Budget Node ----
export const BudgetNode = memo(({ data, selected }: NodeProps) => {
  const total = data.total || 0;
  const spent = data.spent || 0;
  const pct = total > 0 ? Math.round((spent / total) * 100) : 0;
  return (
    <div className={clsx('relative group rounded-xl p-3 bg-surface-raised border min-w-[200px]', selected && 'border-accent-amber ring-2 ring-accent-amber/30')}>
      <Handle type="source" position={Position.Right} id="right" className={clsx(handleStyle, '!bg-accent-amber !-right-1.5')} />
      <Handle type="target" position={Position.Left} id="left" className={clsx(handleStyle, '!bg-accent-amber !-left-1.5')} />
      <Handle type="target" position={Position.Top} id="top" className={clsx(handleStyle, '!bg-accent-amber !-top-1.5')} />
      <Handle type="source" position={Position.Bottom} id="bottom" className={clsx(handleStyle, '!bg-accent-amber !-bottom-1.5')} />
      <div className="flex items-center gap-2 mb-2"><DollarSign className="w-3.5 h-3.5 text-accent-amber" />
        <span className="text-xs font-semibold text-text-primary">{data.label || 'Presupuesto'}</span>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-2xs"><span className="text-text-muted">Total</span><span className="text-text-primary font-medium">${total.toLocaleString()}</span></div>
        <div className="flex justify-between text-2xs"><span className="text-text-muted">Gastado</span><span className="text-accent-red">${spent.toLocaleString()}</span></div>
        <div className="h-1.5 rounded-full bg-surface-edge overflow-hidden"><div className="h-full rounded-full bg-accent-amber transition-all" style={{ width: `${Math.min(pct, 100)}%` }} /></div>
        <div className="flex justify-between text-2xs"><span className="text-text-muted">Restante</span><span className="text-accent-green">${(total - spent).toLocaleString()}</span></div>
      </div>
    </div>
  );
});
BudgetNode.displayName = 'BudgetNode';

// ---- Risk Node ----
export const RiskNode = memo(({ data, selected }: NodeProps) => (
  <div className={clsx('relative group rounded-xl p-3 border min-w-[200px]', selected ? 'border-accent-red ring-2 ring-accent-red/30' : 'border-accent-red/30 bg-accent-red/5')}>
    <Handle type="source" position={Position.Right} id="right" className={clsx(handleStyle, '!bg-accent-red !-right-1.5')} />
    <Handle type="target" position={Position.Left} id="left" className={clsx(handleStyle, '!bg-accent-red !-left-1.5')} />
    <Handle type="target" position={Position.Top} id="top" className={clsx(handleStyle, '!bg-accent-red !-top-1.5')} />
    <Handle type="source" position={Position.Bottom} id="bottom" className={clsx(handleStyle, '!bg-accent-red !-bottom-1.5')} />
    <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-3.5 h-3.5 text-accent-red" />
      <span className="text-xs font-semibold text-accent-red">{data.label || 'Riesgo'}</span>
      <span className={clsx('ml-auto px-1.5 py-0.5 rounded text-[9px] font-bold capitalize', data.severity === 'alto' ? 'bg-accent-red/20 text-accent-red' : data.severity === 'bajo' ? 'bg-accent-green/20 text-accent-green' : 'bg-accent-amber/20 text-accent-amber')}>{data.severity || 'medio'}</span>
    </div>
    {data.description ? <p className="text-2xs text-text-secondary line-clamp-3">{data.description}</p> : <p className="text-2xs text-text-muted/50 italic">Sin descripción</p>}
  </div>
));
RiskNode.displayName = 'RiskNode';

// ---- Folder/Group Node ----
export const FolderNode = memo(({ data, selected }: NodeProps) => (
  <div className={clsx('relative group rounded-2xl border-2 border-dashed p-4 min-w-[240px] min-h-[120px]', selected ? 'border-accent-blue/40 bg-accent-blue/3' : 'border-surface-edge bg-surface-overlay/50')}>
    <Handle type="source" position={Position.Right} id="right" className={clsx(handleStyle, '!bg-text-muted !-right-1.5')} />
    <Handle type="target" position={Position.Left} id="left" className={clsx(handleStyle, '!bg-text-muted !-left-1.5')} />
    <Handle type="target" position={Position.Top} id="top" className={clsx(handleStyle, '!bg-text-muted !-top-1.5')} />
    <Handle type="source" position={Position.Bottom} id="bottom" className={clsx(handleStyle, '!bg-text-muted !-bottom-1.5')} />
    <div className="flex items-center gap-2"><Folder className="w-4 h-4 text-text-muted" />
      <span className="text-sm font-medium text-text-secondary">{data.label || 'Carpeta'}</span>
    </div>
  </div>
));
FolderNode.displayName = 'FolderNode';
