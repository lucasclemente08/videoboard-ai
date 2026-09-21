// ---- Tipos de API ----

export interface ApiResponse<T> {
  data: T;
  error: null;
}

export interface ApiError {
  data: null;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

// Request bodies
export interface CreateProjectBody {
  title: string;
  description?: string;
}

export interface UpdateProjectBody {
  title?: string;
  description?: string;
  status?: string;
  cover_url?: string;
}

export interface CreateSceneBody {
  title: string;
  description?: string;
  scene_type?: string;
  position_x?: number;
  position_y?: number;
}

export interface UpdateSceneBody {
  title?: string;
  description?: string;
  objective?: string;
  estimated_duration_secs?: number;
  priority?: string;
  status?: string;
  scene_type?: string;
  color?: string;
  tags?: string[];
  script_content?: Record<string, unknown>;
  narration_text?: string;
  narration_duration_secs?: number;
  narration_speed?: number;
  narration_language?: string;
  narrator?: string;
  hook_type?: string;
  hook_text?: string;
  hook_location?: string;
  hook_duration_secs?: number;
  storytelling_problem?: string;
  storytelling_conflict?: string;
  storytelling_solution?: string;
  storytelling_benefit?: string;
  storytelling_closing?: string;
  emotion?: string;
  position_x?: number;
  position_y?: number;
  width?: number;
  height?: number;
  sort_order?: number;
}

export interface CreateShotBody {
  name: string;
  description?: string;
  shot_type?: string;
  movement?: string;
  lens?: string;
  fps?: number;
  resolution?: string;
  estimated_duration_secs?: number;
  priority?: string;
  notes?: string;
  camera_letter?: string;
}

export interface UpdateShotBody {
  name?: string;
  description?: string;
  shot_type?: string;
  movement?: string;
  lens?: string;
  fps?: number;
  resolution?: string;
  estimated_duration_secs?: number;
  priority?: string;
  status?: string;
  notes?: string;
  camera_letter?: string;
  sort_order?: number;
}

export interface CreateConnectionBody {
  source_scene_id: string;
  target_scene_id: string;
  connection_type?: string;
  label?: string;
  transition_type?: string;
}

export interface CreateCommentBody {
  content: string;
  scene_id?: string;
  shot_id?: string;
  parent_id?: string;
  position_x?: number;
  position_y?: number;
}

export interface AIAnalysisRequest {
  type: 'rhythm' | 'emotion' | 'attention' | 'repetition' | 'hooks' | 'cta' | 'storytelling' | 'music' | 'effects' | 'broll' | 'shots' | 'lighting' | 'optimize' | 'storyboard' | 'narration' | 'subtitles' | 'summarize' | 'expand' | 'rewrite' | 'tone';
  platform?: string;
  targetTone?: string;
}

export interface AIAnalysisResult {
  type: string;
  summary: string;
  suggestions: AISuggestion[];
  metadata: Record<string, unknown>;
}

export interface AISuggestion {
  id: string;
  target: string; // scene_id or shot_id
  category: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  action?: string;
}

// Canvas
export interface CanvasState {
  zoom: number;
  position: { x: number; y: number };
  selectedNodes: string[];
}

// Timeline
export interface TimelineBlock {
  sceneId: string;
  startSecond: number;
  durationSeconds: number;
  color: string;
  title: string;
}

// Emotion Map
export interface EmotionPoint {
  second: number;
  value: number; // 0-1 intensity
  emotion: string;
  label?: string;
}

// Attention Map
export interface AttentionPoint {
  second: number;
  score: number; // 0-1 attention probability
  risk: 'low' | 'medium' | 'high';
  suggestion?: string;
}

// Shot List
export interface ShotListItem {
  number: number;
  sceneId: string;
  sceneTitle: string;
  shotId: string;
  shotName: string;
  description: string;
  shotType: string;
  movement: string;
  lens: string;
  durationSecs: number;
  status: string;
  cameraLetter?: string;
}

// Export
export interface ExportOptions {
  format: 'pdf' | 'storyboard' | 'shot_list' | 'markdown' | 'json' | 'csv' | 'davinci_resolve' | 'premiere_pro';
  includeAI: boolean;
  includeStoryboard: boolean;
  includeBudget: boolean;
  language: string;
}
