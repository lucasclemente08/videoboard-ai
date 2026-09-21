import type { SceneColor, Priority, ProjectStatus, SceneStatus, Emotion } from '../constants/enums';

// ---- Tipos Principales ----

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
}

export interface Project {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  status: ProjectStatus;
  owner_id: string;
  estimated_duration_secs: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithMeta extends Project {
  scene_count: number;
  shot_count: number;
  members: ProjectMember[];
}

export interface ProjectMember {
  project_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  user?: User;
}

export interface Scene {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  objective: string | null;
  estimated_duration_secs: number;
  priority: Priority;
  status: SceneStatus;
  assigned_to: string | null;
  due_date: string | null;
  color: SceneColor;
  tags: string[];
  scene_type: string | null;
  script_content: Record<string, unknown> | null;
  // Narration
  narration_text: string | null;
  narration_duration_secs: number | null;
  narration_speed: number;
  narration_language: string;
  narrator: string | null;
  // Hook
  hook_type: string | null;
  hook_text: string | null;
  hook_location: 'start' | 'middle' | 'end';
  hook_duration_secs: number | null;
  // Storytelling
  storytelling_problem: string | null;
  storytelling_conflict: string | null;
  storytelling_solution: string | null;
  storytelling_benefit: string | null;
  storytelling_closing: string | null;
  emotion: Emotion | null;
  // Canvas
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SceneConnection {
  id: string;
  project_id: string;
  source_scene_id: string;
  target_scene_id: string;
  connection_type: string;
  label: string | null;
  transition_type: string | null;
  created_at: string;
}

export interface Shot {
  id: string;
  scene_id: string;
  name: string;
  description: string | null;
  shot_type: string | null;
  movement: string | null;
  lens: string;
  fps: number;
  resolution: string;
  estimated_duration_secs: number;
  priority: Priority;
  status: string;
  notes: string | null;
  storyboard_image_url: string | null;
  storyboard_sketch_url: string | null;
  reference_url: string | null;
  ai_frame_prompt: string | null;
  camera_letter: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: string;
  project_id: string;
  scene_id: string | null;
  shot_id: string | null;
  name: string;
  type: string;
  url: string;
  thumbnail_url: string | null;
  size_bytes: number | null;
  duration_secs: number | null;
  width: number | null;
  height: number | null;
  notes: string | null;
  tags: string[];
  created_at: string;
}

export interface Character {
  id: string;
  project_id: string;
  name: string;
  actor_name: string | null;
  wardrobe: string | null;
  makeup: string | null;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
}

export interface Location {
  id: string;
  project_id: string;
  name: string;
  address: string | null;
  map_coordinates: string | null;
  photo_url: string | null;
  schedule: string | null;
  permits_required: boolean;
  permits_status: string | null;
  notes: string | null;
  created_at: string;
}

export interface Equipment {
  id: string;
  project_id: string;
  camera: string | null;
  lenses: string[];
  microphones: string[];
  lights: string[];
  tripods: boolean;
  batteries: number;
  sd_cards: number;
  drone: boolean;
  laptop: boolean;
  cables: string | null;
  notes: string | null;
  created_at: string;
}

export interface Music {
  id: string;
  project_id: string;
  scene_id: string | null;
  name: string;
  type: 'music' | 'sound_effect';
  mood: string | null;
  bpm: number | null;
  duration_secs: number | null;
  license: string | null;
  source: string | null;
  source_url: string | null;
  file_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface Comment {
  id: string;
  project_id: string;
  scene_id: string | null;
  shot_id: string | null;
  user_id: string;
  content: string;
  parent_id: string | null;
  resolved: boolean;
  position_x: number | null;
  position_y: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectVersion {
  id: string;
  project_id: string;
  user_id: string;
  label: string | null;
  snapshot: Record<string, unknown>;
  created_at: string;
}

export interface Template {
  id: string;
  user_id: string;
  name: string;
  category: string;
  content: Record<string, unknown>;
  is_public: boolean;
  created_at: string;
}

export interface ProductionChecklistItem {
  id: string;
  project_id: string;
  item: string;
  category: string | null;
  checked: boolean;
  notes: string | null;
  sort_order: number;
  created_at: string;
}

export interface BudgetItem {
  id: string;
  project_id: string;
  category: string;
  description: string;
  estimated_cost: number | null;
  actual_cost: number | null;
  notes: string | null;
  created_at: string;
}
