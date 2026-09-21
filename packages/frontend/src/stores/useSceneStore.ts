import { create } from 'zustand';
import type { Scene, SceneConnection, Shot } from '@videoboard/shared';

interface SceneState {
  scenes: Scene[];
  connections: SceneConnection[];
  selectedSceneId: string | null;
  selectedShotId: string | null;
  setScenes: (scenes: Scene[]) => void;
  setConnections: (connections: SceneConnection[]) => void;
  selectScene: (id: string | null) => void;
  selectShot: (id: string | null) => void;
  updateScene: (id: string, data: Partial<Scene>) => void;
  addScene: (scene: Scene) => void;
  removeScene: (id: string) => void;
}

export const useSceneStore = create<SceneState>((set) => ({
  scenes: [],
  connections: [],
  selectedSceneId: null,
  selectedShotId: null,

  setScenes: (scenes) => set({ scenes }),
  setConnections: (connections) => set({ connections }),

  selectScene: (id) => set({ selectedSceneId: id, selectedShotId: null }),
  selectShot: (id) => set({ selectedShotId: id }),

  updateScene: (id, data) =>
    set((s) => ({
      scenes: s.scenes.map((sc) => (sc.id === id ? { ...sc, ...data } : sc)),
    })),

  addScene: (scene) => set((s) => ({ scenes: [...s.scenes, scene] })),

  removeScene: (id) =>
    set((s) => ({
      scenes: s.scenes.filter((sc) => sc.id !== id),
      selectedSceneId: s.selectedSceneId === id ? null : s.selectedSceneId,
    })),
}));
