// ---- Enums & Constantes ----

export const PROJECT_STATUSES = ['draft', 'planning', 'shooting', 'editing', 'review', 'published'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const SCENE_STATUSES = ['draft', 'writing', 'ready', 'shooting', 'done'] as const;
export type SceneStatus = (typeof SCENE_STATUSES)[number];

export const SCENE_TYPES = [
  'intro', 'development', 'example', 'tutorial',
  'comparison', 'conclusion', 'cta', 'outro'
] as const;
export type SceneType = (typeof SCENE_TYPES)[number];

export const HOOK_TYPES = ['question', 'fact', 'shock', 'story', 'curiosity', 'cta'] as const;
export type HookType = (typeof HOOK_TYPES)[number];

export const EMOTIONS = ['inspiring', 'urgent', 'funny', 'epic', 'serious', 'technical'] as const;
export type Emotion = (typeof EMOTIONS)[number];

export const SHOT_TYPES = [
  'close_up', 'medium_shot', 'american_shot', 'wide_shot',
  'detail_shot', 'pov', 'drone', 'overhead', 'low_angle',
  'high_angle', 'macro'
] as const;
export type ShotType = (typeof SHOT_TYPES)[number];

export const CAMERA_MOVEMENTS = [
  'pan', 'tilt', 'zoom', 'handheld', 'steadicam',
  'dolly', 'crane', 'slider', 'static'
] as const;
export type CameraMovement = (typeof CAMERA_MOVEMENTS)[number];

export const CONNECTION_TYPES = ['sequence', 'parallel', 'branch'] as const;
export type ConnectionType = (typeof CONNECTION_TYPES)[number];

export const TRANSITION_TYPES = [
  'cut', 'dissolve', 'wipe', 'fade', 'slide',
  'zoom_transition', 'spin', 'none'
] as const;
export type TransitionType = (typeof TRANSITION_TYPES)[number];

export const PLATFORMS = ['youtube', 'tiktok', 'shorts', 'instagram'] as const;
export type Platform = (typeof PLATFORMS)[number];

export const NARRATIVE_TEMPLATES = [
  'AIDA', 'PAS', 'heros_journey', 'storybrand',
  'documentary', 'interview', 'vlog', 'tutorial'
] as const;
export type NarrativeTemplate = (typeof NARRATIVE_TEMPLATES)[number];

export const ASSET_TYPES = [
  'video', 'image', 'audio', 'pdf', 'psd',
  'ai', 'raw', 'document'
] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const SOUND_EFFECTS = [
  'whoosh', 'click', 'explosion', 'typing',
  'wind', 'crowd', 'nature', 'custom'
] as const;
export type SoundEffect = (typeof SOUND_EFFECTS)[number];

export const SCENE_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
  '#6366F1', '#14B8A6', '#E11D48', '#84CC16'
] as const;
export type SceneColor = (typeof SCENE_COLORS)[number];
