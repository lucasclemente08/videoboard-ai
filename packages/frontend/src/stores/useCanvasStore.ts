import { create } from 'zustand';

interface CanvasState {
  zoom: number;
  position: { x: number; y: number };
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  clipboard: string[]; // scene IDs

  setZoom: (zoom: number) => void;
  setPosition: (position: { x: number; y: number }) => void;
  setSelectedNodes: (ids: string[]) => void;
  setSelectedEdges: (ids: string[]) => void;
  copy: (ids: string[]) => void;
  clearClipboard: () => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  zoom: 1,
  position: { x: 0, y: 0 },
  selectedNodeIds: [],
  selectedEdgeIds: [],
  clipboard: [],

  setZoom: (zoom) => set({ zoom }),
  setPosition: (position) => set({ position }),
  setSelectedNodes: (ids) => set({ selectedNodeIds: ids }),
  setSelectedEdges: (ids) => set({ selectedEdgeIds: ids }),
  copy: (ids) => set({ clipboard: ids }),
  clearClipboard: () => set({ clipboard: [] }),
}));
