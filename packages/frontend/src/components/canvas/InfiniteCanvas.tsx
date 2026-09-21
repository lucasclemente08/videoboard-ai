import { useCallback, useRef, useEffect, useState } from 'react';
import ReactFlow, {
  Background, Controls, MiniMap, useNodesState, useEdgesState,
  Connection, Node, Edge, BackgroundVariant, SelectionMode,
  ReactFlowProvider, MarkerType, ConnectionMode,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { SceneNode } from '../scene/SceneNode';
import { Film, Plus } from 'lucide-react';
import { StickyNode, ChecklistNode, CharacterNode, LocationNode, CameraNode, BudgetNode, RiskNode, FolderNode } from './nodes/ExtraNodes';
import { useSceneStore } from '../../stores/useSceneStore';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { useCreateScene, useCreateConnection, useDeleteConnection, useUpdateScene, useDeleteScene, useDuplicateScene } from '../../api/hooks';
import { useUIStore } from '../../stores/useUIStore';
import { CanvasToolbar } from './CanvasToolbar';
import { ContextMenu, type ContextMenuState } from './ContextMenu';
import { ConnectionLine } from './ConnectionLine';
import { NodeEditor } from './NodeEditor';
import { LiveCursors } from '../collaboration/LiveCursors';
import { useCollaboration } from '../../hooks/useCollaboration';
import type { Scene, SceneConnection } from '@videoboard/shared';
import { eventBus, AppEvents, mediaDragState } from '../../services/eventBus';

const nodeTypes = { sceneNode: SceneNode, stickyNote: StickyNode, checklist: ChecklistNode, character: CharacterNode, location: LocationNode, camera: CameraNode, budget: BudgetNode, risk: RiskNode, folder: FolderNode };
const edgeTypes = { connectionLine: ConnectionLine };

const TRANSITION_LABELS: Record<string, string> = {
  cut: 'Corte', dissolve: 'Disolver', wipe: 'Wipe', fade: 'Fade',
  slide: 'Deslizar', zoom_transition: 'Zoom', spin: 'Giro', none: 'Ninguna',
};

function sceneToNode(scene: Scene, count: number): Node {
  return {
    id: scene.id, type: 'sceneNode',
    position: { x: scene.position_x || 0, y: scene.position_y || 0 },
    data: { scene, connectionCount: count },
    style: { width: scene.width || 320 },
  };
}

function connectionToEdge(conn: SceneConnection): Edge {
  const color = conn.connection_type === 'sequence' ? '#3B82F6' : conn.connection_type === 'parallel' ? '#F59E0B' : '#8B5CF6';
  return {
    id: conn.id, source: conn.source_scene_id, target: conn.target_scene_id,
    type: 'connectionLine', animated: conn.connection_type === 'sequence',
    style: { stroke: color, strokeWidth: 2.5, strokeDasharray: conn.connection_type === 'parallel' ? '8,4' : 'none' },
    markerEnd: { type: MarkerType.ArrowClosed, color, width: 14, height: 14 },
    label: conn.transition_type ? TRANSITION_LABELS[conn.transition_type] || conn.transition_type : undefined,
    labelStyle: { fill: '#A1A1AA', fontSize: 9, fontWeight: 600 },
    labelBgStyle: { fill: '#141416', fillOpacity: 0.95 },
    labelBgPadding: [6, 3] as [number, number], labelBgBorderRadius: 4,
  };
}

export function InfiniteCanvas({ projectId }: { projectId: string }) {
  const { scenes, connections, setConnections } = useSceneStore();
  const { setSelectedNodes } = useCanvasStore();
  const { setRightPanelTab } = useUIStore();
  const createScene = useCreateScene();
  const createConnection = useCreateConnection();
  const deleteConnection = useDeleteConnection();
  const updateScene = useUpdateScene();
  const deleteScene = useDeleteScene();
  const duplicateScene = useDuplicateScene();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null);
  const [editor, setEditor] = useState<{ id: string; type: string; data: any; x: number; y: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // Collaboration
  const collaboration = useCollaboration(projectId);
  const { cursors, presence, connected } = collaboration;
  const lastCursorEmit = useRef(0);

  // Throttled cursor emission (max 20 fps)
  const emitCursorThrottled = useCallback((x: number, y: number) => {
    const now = Date.now();
    if (now - lastCursorEmit.current < 50) return;
    lastCursorEmit.current = now;
    collaboration.emitCursor({ x, y });
  }, [collaboration]);

  // Load custom nodes from localStorage on initial render
  const initialCustomNodes = useRef<Node[]>([]);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`vb_custom_nodes_${projectId}`);
      if (saved) {
        initialCustomNodes.current = JSON.parse(saved);
      }
    } catch {}
  }, [projectId]);

  // Sync scenes/connections to nodes/edges without clobbering custom nodes
  useEffect(() => {
    const counts = new Map<string, number>();
    connections.forEach(c => {
      counts.set(c.source_scene_id, (counts.get(c.source_scene_id) || 0) + 1);
      counts.set(c.target_scene_id, (counts.get(c.target_scene_id) || 0) + 1);
    });
    setNodes((prevNodes) => {
      const customNodes = prevNodes.filter(n => n.type !== 'sceneNode');
      const activeCustom = customNodes.length > 0 ? customNodes : initialCustomNodes.current;
      const sceneNodes = scenes.map(s => sceneToNode(s, counts.get(s.id) || 0));
      return [...sceneNodes, ...activeCustom];
    });
  }, [scenes, connections, setNodes]);

  // Auto-persist custom nodes when modified
  useEffect(() => {
    const custom = nodes.filter(n => n.type !== 'sceneNode');
    if (custom.length > 0) {
      try {
        localStorage.setItem(`vb_custom_nodes_${projectId}`, JSON.stringify(custom));
      } catch {}
    }
  }, [nodes, projectId]);

  useEffect(() => { setEdges(connections.map(connectionToEdge)); }, [connections, setEdges]);

  const onConnect = useCallback(async (c: Connection) => {
    if (!c.source || !c.target || c.source === c.target) return;

    // Prevent duplicate connections in either direction
    const exists = connections.some(
      conn => (conn.source_scene_id === c.source && conn.target_scene_id === c.target) ||
              (conn.source_scene_id === c.target && conn.target_scene_id === c.source)
    );
    if (exists) return;

    const conn = await createConnection.mutateAsync({
      project_id: projectId, source_scene_id: c.source, target_scene_id: c.target,
      connection_type: 'sequence', transition_type: 'cut',
    });
    setConnections([...connections, conn]);
    collaboration.emitConnectionCreated(conn);
  }, [projectId, createConnection, connections, setConnections, collaboration]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    useSceneStore.getState().selectScene(node.id);
    setRightPanelTab('info');
  }, [setRightPanelTab]);

  const onNodeDoubleClick = useCallback((_: any, node: Node) => {
    // Open NodeEditor directly on double-click
    const data = node.data || {};
    const nodeData = typeof data.scene !== 'undefined' ? data.scene : data;
    const nodeType = node.type || 'sceneNode';
    setEditor({
      id: node.id,
      type: nodeType,
      data: nodeData,
      x: node.position.x + 340,
      y: node.position.y,
    });
  }, []);

  const onNodeDragStop = useCallback(async (_: any, node: Node) => {
    await updateScene.mutateAsync({ id: node.id, position_x: Math.round(node.position.x), position_y: Math.round(node.position.y) });
    collaboration.emitSceneUpdate(useSceneStore.getState().scenes.find(s => s.id === node.id));
  }, [updateScene, collaboration]);

  const onEdgeClick = useCallback((_: any, edge: Edge) => {
    // Select edge for deletion
    useCanvasStore.getState().setSelectedEdges([edge.id]);
  }, []);

  const onSelectionChange = useCallback(({ nodes: selNodes, edges: selEdges }: { nodes: Node[]; edges: Edge[] }) => {
    setSelectedNodes(selNodes.map(n => n.id));
    useCanvasStore.getState().setSelectedEdges(selEdges.map(e => e.id));
  }, [setSelectedNodes]);

  const onPaneClick = useCallback(() => {
    useSceneStore.getState().selectScene(null);
    useCanvasStore.getState().setSelectedEdges([]);
    useCanvasStore.getState().setSelectedNodes([]);
    setCtxMenu(null);
    setEditor(null);
  }, []);

  const onCtxMenu = useCallback((e: React.MouseEvent) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, projectId }); }, [projectId]);

  const onNodeContextMenu = useCallback((e: React.MouseEvent, node: Node) => {
    e.preventDefault();
    const data = node.data || {};
    setCtxMenu({ x: e.clientX, y: e.clientY, projectId, nodeId: node.id, nodeType: node.type || undefined, nodeData: typeof data.scene !== 'undefined' ? data.scene : data });
  }, [projectId]);

  const addScene = useCallback(async (x: number, y: number) => {
    const scene = await createScene.mutateAsync({ project_id: projectId, title: 'Nueva escena', position_x: x, position_y: y });
    setCtxMenu(null);
    collaboration.emitSceneCreated(scene);
  }, [projectId, createScene, collaboration]);

  // Register scene-drop handler + custom node adder via eventBus
  useEffect(() => {
    const unsubDrop = eventBus.on(AppEvents.SCENE_DROP, async ({ sceneId, media }: any) => {
      await updateScene.mutateAsync({ id: sceneId, description: media.url || media.thumb || '' });
    });
    const unsubNode = eventBus.on(AppEvents.ADD_CUSTOM_NODE, ({ node }: any) => {
      setNodes((nds) => [...nds, node]);
    });
    return () => {
      unsubDrop();
      unsubNode();
    };
  }, [updateScene, setNodes]);

  // Delete via keyboard
  const deleteSelected = useCallback(async () => {
    const store = useCanvasStore.getState();
    const sceneStore = useSceneStore.getState();
    const ids = store.selectedNodeIds;
    const edgeIds = store.selectedEdgeIds;

    // Delete selected edges
    for (const eid of edgeIds) {
      const conn = connections.find(c => c.id === eid);
      if (conn) {
        await deleteConnection.mutateAsync(eid);
        setConnections(connections.filter(c => c.id !== eid));
        collaboration.emitConnectionDeleted(eid);
      }
    }
    store.setSelectedEdges([]);

    // Delete selected nodes
    for (const id of ids) {
      await deleteScene.mutateAsync(id);
      sceneStore.removeScene(id);
      // Also remove custom nodes from React Flow
      setNodes((nds) => nds.filter(n => n.id !== id));
      collaboration.emitSceneDeleted(id);
    }
    store.setSelectedNodes([]);
  }, [deleteScene, deleteConnection, connections, setConnections, collaboration, setNodes]);

  // Single node delete (from context menu)
  const deleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter(n => n.id !== nodeId));
    setEdges((eds) => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
  }, [setNodes, setEdges]);

  // Edit node
  const editNode = useCallback((nodeId: string, nodeType: string, data: any) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setEditor({ id: nodeId, type: nodeType, data, x: node.position.x + 340, y: node.position.y });
    }
  }, [nodes]);

  // Save node edits
  const saveNodeEdit = useCallback((nodeId: string, newData: any) => {
    setNodes((nds) => nds.map(n => {
      if (n.id !== nodeId) return n;
      // Scene nodes have nested data.scene
      if (n.type === 'sceneNode' && n.data?.scene) {
        return { ...n, data: { ...n.data, scene: { ...n.data.scene, ...newData, title: newData.label || newData.title || n.data.scene.title } } };
      }
      return { ...n, data: { ...n.data, ...newData } };
    }));
    // Also update API for scene nodes
    if (nodes.find(n => n.id === nodeId)?.type === 'sceneNode') {
      updateScene.mutate({ id: nodeId, ...newData });
    }
  }, [setNodes, nodes, updateScene]);

  // Drag & Drop
  const dragCounter = useRef(0);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    if (dragCounter.current === 1) setDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setDragOver(false);
    }
  }, []);

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setDragOver(false);
    const pos = { x: 200 + Math.random() * 300, y: 150 + Math.random() * 250 };

    // Try mediaDragState first, then dataTransfer
    let media = mediaDragState.current;
    if (!media) {
      const raw = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('application/json');
      if (raw) { try { media = JSON.parse(raw); } catch {} }
    }
    mediaDragState.current = null;

    if (media) {
      await createScene.mutateAsync({
        project_id: projectId,
        title: media.alt || media.name || 'Media',
        description: media.url || '',
        position_x: pos.x, position_y: pos.y,
      });
      return;
    }

    for (let i = 0; i < e.dataTransfer.files.length; i++) {
      await createScene.mutateAsync({ project_id: projectId, title: e.dataTransfer.files[i].name, position_x: pos.x + i * 30, position_y: pos.y + i * 30 });
    }
  }, [projectId, createScene]);

  // Keyboard
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const store = useCanvasStore.getState();
        if (store.selectedNodeIds.length > 0 || store.selectedEdgeIds.length > 0) {
          e.preventDefault();
          deleteSelected();
        }
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [deleteSelected]);

  // Native contextmenu listener for all nodes (React Flow synthetic events don't always fire)
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const nodeEl = target.closest('.react-flow__node') as HTMLElement;
      if (!nodeEl) return;
      e.preventDefault();
      const nodeId = nodeEl.getAttribute('data-id');
      if (!nodeId) return;
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        const data = node.data || {};
        setCtxMenu({
          x: e.clientX, y: e.clientY, projectId,
          nodeId: node.id, nodeType: node.type || undefined,
          nodeData: typeof data.scene !== 'undefined' ? data.scene : data,
        });
      }
    };
    el.addEventListener('contextmenu', handler);
    return () => el.removeEventListener('contextmenu', handler);
  }, [nodes, projectId]);

  // Native mousemove for cursors (avoids React re-renders)
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      const bounds = el.getBoundingClientRect();
      emitCursorThrottled(e.clientX - bounds.left, e.clientY - bounds.top);
    };
    el.addEventListener('mousemove', handler, { passive: true });
    return () => el.removeEventListener('mousemove', handler);
  }, [emitCursorThrottled]);

  // Remote sync receivers via eventBus
  useEffect(() => {
    const unsub1 = eventBus.on(AppEvents.REMOTE_SCENE_ADD, (scene: Scene) => {
      useSceneStore.getState().addScene(scene);
    });
    const unsub2 = eventBus.on(AppEvents.REMOTE_SCENE_UPDATE, (scene: Scene) => {
      useSceneStore.getState().updateScene(scene.id, scene);
    });
    const unsub3 = eventBus.on(AppEvents.REMOTE_SCENE_REMOVE, (sceneId: string) => {
      useSceneStore.getState().removeScene(sceneId);
    });
    const unsub4 = eventBus.on(AppEvents.REMOTE_CONNECTION_ADD, (conn: SceneConnection) => {
      const current = useSceneStore.getState().connections;
      const exists = current.some(c => c.id === conn.id);
      if (!exists) useSceneStore.getState().setConnections([...current, conn]);
    });
    const unsub5 = eventBus.on(AppEvents.REMOTE_CONNECTION_REMOVE, (connectionId: string) => {
      const current = useSceneStore.getState().connections;
      useSceneStore.getState().setConnections(current.filter(c => c.id !== connectionId));
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
    };
  }, []);

  const onEdgesDelete = useCallback(async (edgesToDelete: Edge[]) => {
    for (const edge of edgesToDelete) {
      const conn = connections.find(c => c.id === edge.id);
      if (conn) {
        await deleteConnection.mutateAsync(edge.id);
        setConnections(connections.filter(c => c.id !== edge.id));
        collaboration.emitConnectionDeleted(edge.id);
      }
    }
  }, [deleteConnection, connections, setConnections, collaboration]);

  return (
    <ReactFlowProvider>
      <div ref={wrapperRef} className="w-full h-full relative" onDragOver={onDragOver} onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDrop={onDrop}>
        {dragOver && (
          <div className="absolute inset-0 z-50 bg-accent-green/10 border-4 border-dashed border-accent-green rounded-xl pointer-events-none flex items-center justify-center">
            <div className="bg-surface-raised border-2 border-accent-green rounded-2xl px-8 py-5 shadow-2xl">
              <p className="text-base font-bold text-accent-green">+ Soltar para añadir</p>
            </div>
          </div>
        )}
        <ReactFlow
          nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          onConnect={onConnect} onNodeClick={onNodeClick} onNodeDragStop={onNodeDragStop}
          onNodeDoubleClick={onNodeDoubleClick}
          onEdgeClick={onEdgeClick}
          onEdgesDelete={onEdgesDelete}
 onNodeContextMenu={onNodeContextMenu}
          onSelectionChange={onSelectionChange} onPaneClick={onPaneClick} onContextMenu={onCtxMenu}
          nodeTypes={nodeTypes} edgeTypes={edgeTypes}
          selectionMode={SelectionMode.Partial} deleteKeyCode={['Delete', 'Backspace']}
          multiSelectionKeyCode="Shift" selectionOnDrag panOnDrag={[1, 2]}
          fitView className="bg-surface" minZoom={0.1} maxZoom={4}
          nodesDraggable elementsSelectable
          elevateNodesOnSelect={false} nodesFocusable={false}
          onlyRenderVisibleElements
          proOptions={{ hideAttribution: true }}
          connectionMode={ConnectionMode.Loose}
          connectionRadius={32}
          defaultEdgeOptions={{ type: 'connectionLine', style: { stroke: '#3B82F6', strokeWidth: 2.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#3B82F6', width: 14, height: 14 } }}
          connectionLineStyle={{ stroke: '#3B82F6', strokeWidth: 2, strokeDasharray: '5,5' }}
          snapToGrid snapGrid={[16, 16]}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#1F1F23" />
          <Controls className="!bg-surface-raised !border-surface-edge !rounded-xl" />
          <MiniMap nodeColor={n => (n.data as any)?.scene?.color || '#3B82F6'} maskColor="rgba(10,10,11,0.7)" className="!bg-surface-raised !border-surface-edge !rounded-xl" />
        </ReactFlow>

        {/* Onboarding Empty State */}
        {scenes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="pointer-events-auto max-w-sm p-6 rounded-2xl bg-surface-raised/95 border border-surface-edge shadow-2xl backdrop-blur-xl text-center space-y-3 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-2xl bg-accent-blue/15 text-accent-blue flex items-center justify-center mx-auto shadow-inner">
                <Film className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-primary">Tu lienzo está listo</h3>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  Crea tu primera escena para comenzar a estructurar el guion, storyboard y tomas.
                </p>
              </div>
              <button
                onClick={() => addScene(200, 200)}
                className="w-full py-2.5 px-4 rounded-xl bg-accent-blue hover:bg-accent-blue-hover text-white text-xs font-semibold transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Crear primera escena
              </button>
            </div>
          </div>
        )}

        <LiveCursors cursors={cursors} />

        {/* Presence badge */}
        {connected && presence.length > 1 && (
          <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1.5 bg-surface-raised/90 backdrop-blur-xl border border-surface-edge rounded-full shadow-lg">
            <div className="flex -space-x-1.5">
              {presence.slice(0, 4).map((u, i) => (
                <div key={u.id} className="w-5 h-5 rounded-full border-2 border-surface-raised flex items-center justify-center text-[8px] font-bold text-white" style={{ backgroundColor: u.color, zIndex: 4 - i }}>{u.name.charAt(0).toUpperCase()}</div>
              ))}
            </div>
            <span className="text-2xs text-text-muted">{presence.length} conectados</span>
          </div>
        )}

        <CanvasToolbar onAddScene={addScene} />

        {ctxMenu && (
          <ContextMenu
            state={ctxMenu}
            onClose={() => setCtxMenu(null)}
            onAddScene={addScene}
            onDeleteNode={deleteNode}
            onDuplicateNode={(id) => duplicateScene.mutate(id)}
            onDeleteSelected={deleteSelected}
            onEditNode={editNode}
          />
        )}
        {editor && (
          <NodeEditor
            nodeId={editor.id} nodeType={editor.type} data={editor.data}
            position={{ x: editor.x, y: editor.y }}
            onSave={saveNodeEdit} onClose={() => setEditor(null)}
          />
        )}
      </div>
    </ReactFlowProvider>
  );
}
