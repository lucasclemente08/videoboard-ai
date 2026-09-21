import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Copy, Trash2, Pencil } from 'lucide-react';

export interface ContextMenuState {
  x: number;
  y: number;
  projectId: string;
  nodeId?: string;
  nodeType?: string;
  nodeData?: any;
}

interface Props {
  state: ContextMenuState;
  onClose: () => void;
  onAddScene: (x: number, y: number) => void;
  onDeleteNode?: (nodeId: string) => void;
  onDuplicateNode?: (nodeId: string) => void;
  onDeleteSelected?: () => void;
  onEditNode?: (nodeId: string, nodeType: string, data: any) => void;
}

export function ContextMenu({
  state,
  onClose,
  onAddScene,
  onDeleteNode,
  onDuplicateNode,
  onDeleteSelected,
  onEditNode,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const isNode = !!state.nodeId;
  const editableTypes = ['stickyNote', 'checklist', 'character', 'location', 'camera', 'budget', 'risk', 'folder'];

  const items = isNode
    ? [
        ...(editableTypes.includes(state.nodeType || '') ? [
          { icon: Pencil, label: 'Editar', shortcut: '', action: () => { onEditNode?.(state.nodeId!, state.nodeType!, state.nodeData); onClose(); }, danger: false },
          { type: 'separator' as const },
        ] : []),
        {
          icon: Copy,
          label: 'Duplicar',
          shortcut: '⌘D',
          action: () => {
            if (state.nodeId && onDuplicateNode) onDuplicateNode(state.nodeId);
            onClose();
          },
          danger: false,
        },
        { type: 'separator' as const },
        {
          icon: Trash2,
          label: 'Eliminar',
          shortcut: '⌫',
          action: () => {
            onDeleteNode?.(state.nodeId!);
            onClose();
          },
          danger: true,
        },
      ]
    : [
        { icon: Plus, label: 'Añadir escena aquí', shortcut: '', action: () => { onAddScene(state.x, state.y); onClose(); } },
        ...(onDeleteSelected ? [
          { type: 'separator' as const },
          {
            icon: Trash2,
            label: 'Eliminar selección',
            shortcut: '⌫',
            action: () => {
              onDeleteSelected();
              onClose();
            },
            danger: true,
          },
        ] : []),
      ];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.12 }}
      className="fixed z-50 w-52 bg-surface-raised border border-surface-edge rounded-xl shadow-2xl py-1 overflow-hidden"
      style={{ left: state.x, top: state.y }}
    >
      {items.map((item, i) => {
        if ('type' in item && item.type === 'separator')
          return <div key={i} className="h-px bg-surface-edge my-1" />;
        const Icon = item.icon;
        return (
          <button
            key={i}
            onClick={item.action}
            className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-surface-hover transition-colors text-left"
          >
            <span className="flex items-center gap-2.5">
              <Icon className={`w-3.5 h-3.5 ${item.danger ? 'text-accent-red' : 'text-text-muted'}`} />
              <span className={item.danger ? 'text-accent-red' : 'text-text-secondary'}>{item.label}</span>
            </span>
            {item.shortcut && <span className="text-2xs text-text-muted ml-4">{item.shortcut}</span>}
          </button>
        );
      })}
    </motion.div>
  );
}
