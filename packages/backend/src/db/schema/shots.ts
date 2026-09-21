import { pgTable, uuid, text, integer, real, timestamp } from 'drizzle-orm/pg-core';
import { scenes } from './scenes';

export const shots = pgTable('shots', {
  id: uuid('id').primaryKey().defaultRandom(),
  scene_id: uuid('scene_id').references(() => scenes.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  shot_type: text('shot_type'),
  movement: text('movement'),
  lens: text('lens').default('24mm').notNull(),
  fps: integer('fps').default(24).notNull(),
  resolution: text('resolution').default('1920x1080').notNull(),
  estimated_duration_secs: integer('estimated_duration_secs').default(5).notNull(),
  priority: text('priority').default('medium').notNull(),
  status: text('status').default('planned').notNull(),
  notes: text('notes'),
  storyboard_image_url: text('storyboard_image_url'),
  storyboard_sketch_url: text('storyboard_sketch_url'),
  reference_url: text('reference_url'),
  ai_frame_prompt: text('ai_frame_prompt'),
  camera_letter: text('camera_letter'),
  sort_order: integer('sort_order').default(0).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
