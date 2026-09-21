import { Plus, Minus, Maximize2, StickyNote, CheckSquare, User, MapPin, Camera, DollarSign, AlertTriangle, Folder, Film, Image, Music, Video } from 'lucide-react';
import { useReactFlow } from 'reactflow';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { eventBus, AppEvents } from '../../services/eventBus';

interface Props {
  onAddScene: (x: number, y: number) => void;
}

const NODE_TYPES = [
  { type: 'sceneNode', icon: Film, label: 'Escena', color: '#3B82F6', viaAPI: true },
  { type: 'stickyNote', icon: StickyNote, label: 'Nota', color: '#F59E0B' },
  { type: 'checklist', icon: CheckSquare, label: 'Check', color: '#10B981' },
  { type: 'character', icon: User, label: 'Personaje', color: '#EC4899' },
  { type: 'location', icon: MapPin, label: 'Locación', color: '#10B981' },
  { type: 'camera', icon: Camera, label: 'Equipo', color: '#8B5CF6' },
  { type: 'budget', icon: DollarSign, label: 'Presup.', color: '#F97316' },
  { type: 'risk', icon: AlertTriangle, label: 'Riesgo', color: '#EF4444' },
  { type: 'folder', icon: Folder, label: 'Carpeta', color: '#71717A' },
];

export function CanvasToolbar({ onAddScene }: Props) {
  const { zoomIn, zoomOut, fitView, screenToFlowPosition } = useReactFlow();
  const { zoom } = useCanvasStore();
  const [showNodes, setShowNodes] = useState(false);
  const wrapperRef = useState<HTMLDivElement | null>(null);

  const getViewportCenter = useCallback(() => {
    // Get the center of the viewport in flow coordinates
    const el = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!el) return { x: 400, y: 300 };

    // Use screenToFlowPosition with the center of the viewport
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const pos = screenToFlowPosition({ x: centerX, y: centerY });
    return pos;
  }, [screenToFlowPosition]);

  const handleAddNode = useCallback((nt: typeof NODE_TYPES[0]) => {
    const pos = getViewportCenter();
    // Offset each new node slightly so they don't stack exactly
    pos.x += (Math.random() - 0.5) * 100;
    pos.y += (Math.random() - 0.5) * 100;

    if (nt.viaAPI) {
      onAddScene(Math.round(pos.x), Math.round(pos.y));
    } else {
      // Create custom node directly
      const id = `node-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const node = {
        id,
        type: nt.type,
        position: { x: Math.round(pos.x), y: Math.round(pos.y) },
        data: {
          label: nt.label,
          color: nt.color,
          // Default data for each type
          ...(nt.type === 'checklist' ? { items: ['Item 1', 'Item 2'], checked: [false, false] } : {}),
          ...(nt.type === 'budget' ? { total: 1000, spent: 0 } : {}),
          ...(nt.type === 'risk' ? { severity: 'medio', description: '' } : {}),
          ...(nt.type === 'stickyNote' ? { content: '' } : {}),
          ...(nt.type === 'character' ? { actor: '', wardrobe: '' } : {}),
          ...(nt.type === 'location' ? { address: '', permits: '' } : {}),
          ...(nt.type === 'camera' ? { camera: '', lens: '', fps: 24 } : {}),
        },
      };
      eventBus.emit(AppEvents.ADD_CUSTOM_NODE, { type: nt.type, node });
    }
    setShowNodes(false);
  }, [getViewportCenter, onAddScene]);

  return (
    <>
      {/* Add node panel */}
      {showNodes && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-1 p-2 bg-surface-raised/95 backdrop-blur-xl border border-surface-edge rounded-2xl shadow-2xl z-20">
          {NODE_TYPES.map((nt) => (
            <button
              key={nt.type}
              onClick={() => handleAddNode(nt)}
              className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-surface-hover transition-all group min-w-[60px]"
              title={nt.label}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: nt.color + '18' }}>
                <nt.icon className="w-4 h-4" style={{ color: nt.color }} />
              </div>
              <span className="text-[9px] text-text-muted group-hover:text-text-secondary">{nt.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main toolbar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 bg-surface-raised/90 backdrop-blur-xl border border-surface-edge rounded-2xl shadow-2xl z-10">
        <button onClick={() => zoomOut()} className="p-2 rounded-xl hover:bg-surface-hover transition-colors">
          <Minus className="w-4 h-4 text-text-secondary" />
        </button>
        <span className="text-2xs text-text-muted min-w-[3rem] text-center tabular-nums">{Math.round(zoom * 100)}%</span>
        <button onClick={() => zoomIn()} className="p-2 rounded-xl hover:bg-surface-hover transition-colors">
          <Plus className="w-4 h-4 text-text-secondary" />
        </button>
        <div className="w-px h-5 bg-surface-edge mx-1" />
        <button onClick={() => fitView({ padding: 0.2, duration: 300 })} className="p-2 rounded-xl hover:bg-surface-hover transition-colors">
          <Maximize2 className="w-4 h-4 text-text-secondary" />
        </button>
        <div className="w-px h-5 bg-surface-edge mx-1" />
        <button
          onClick={() => setShowNodes(!showNodes)}
          className={clsx('px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5', showNodes ? 'bg-accent-blue/10 text-accent-blue' : 'bg-accent-blue text-white hover:bg-accent-blue/90')}
        >
          <Plus className="w-3.5 h-3.5" /> Añadir
        </button>
      </div>
    </>
  );
}
