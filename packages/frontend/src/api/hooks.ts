import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { Project, Scene, Shot, SceneConnection, Character, Location, BudgetItem } from '@videoboard/shared';

// ---- Projects ----
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get<Project[]>('/projects'),
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => api.get<Project>(`/projects/${id}`),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; description?: string }) =>
      api.post<Project>('/projects', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

// ---- Scenes ----
export function useScenes(projectId: string) {
  return useQuery({
    queryKey: ['scenes', projectId],
    queryFn: () => api.get<Scene[]>('/scenes', { project_id: projectId }),
    enabled: !!projectId,
  });
}

export function useCreateScene() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Scene>) => api.post<Scene>('/scenes', data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['scenes'] });
      (window as any).__emitSceneCreated?.(data);
    },
  });
}

export function useUpdateScene() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Scene>) =>
      api.patch<Scene>(`/scenes/${id}`, data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['scenes'] });
      (window as any).__emitSceneUpdate?.(data);
    },
  });
}

export function useDeleteScene() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/scenes/${id}`),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['scenes'] });
      (window as any).__emitSceneDeleted?.(id);
    },
  });
}

export function useDuplicateScene() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Scene>(`/scenes/${id}/duplicate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scenes'] }),
  });
}

// ---- Connections ----
export function useConnections(projectId: string) {
  return useQuery({
    queryKey: ['connections', projectId],
    queryFn: () => api.get<SceneConnection[]>('/scenes/connections', { project_id: projectId }),
    enabled: !!projectId,
  });
}

export function useCreateConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<SceneConnection>) =>
      api.post<SceneConnection>('/scenes/connections', data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['connections'] });
      (window as any).__emitConnectionCreated?.(data);
    },
  });
}

export function useDeleteConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/scenes/connections/${id}`),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['connections'] });
      (window as any).__emitConnectionDeleted?.(id);
    },
  });
}

// ---- Shots ----
export function useShots(sceneId: string) {
  return useQuery({
    queryKey: ['shots', sceneId],
    queryFn: () => api.get<Shot[]>('/shots', { scene_id: sceneId }),
    enabled: !!sceneId,
  });
}

export function useCreateShot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Shot>) => api.post<Shot>('/shots', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shots'] }),
  });
}

export function useUpdateShot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Shot>) =>
      api.patch<Shot>(`/shots/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shots'] }),
  });
}

export function useDeleteShot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/shots/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shots'] }),
  });
}

// ---- Production: Characters, Locations, Budget ----
export function useCharacters(projectId: string) {
  return useQuery({
    queryKey: ['characters', projectId],
    queryFn: () => api.get<Character[]>('/characters', { project_id: projectId }),
    enabled: !!projectId,
  });
}

export function useCreateCharacter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Character>) => api.post<Character>('/characters', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['characters'] }),
  });
}

export function useLocations(projectId: string) {
  return useQuery({
    queryKey: ['locations', projectId],
    queryFn: () => api.get<Location[]>('/characters/locations', { project_id: projectId }),
    enabled: !!projectId,
  });
}

export function useCreateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Location>) => api.post<Location>('/characters/locations', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['locations'] }),
  });
}

export function useBudgetItems(projectId: string) {
  return useQuery({
    queryKey: ['budget', projectId],
    queryFn: () => api.get<BudgetItem[]>(`/projects/${projectId}/budget`),
    enabled: !!projectId,
  });
}

export function useCreateBudgetItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, ...data }: { projectId: string } & Partial<BudgetItem>) =>
      api.post<BudgetItem>(`/projects/${projectId}/budget`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budget'] }),
  });
}

