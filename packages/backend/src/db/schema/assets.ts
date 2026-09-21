import { pgTable, uuid, text, bigint, integer, timestamp } from 'drizzle-orm/pg-core';
import { projects } from './projects';
import { scenes } from './scenes';
import { shots } from './shots';

export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  scene_id: uuid('scene_id').references(() => scenes.id, { onDelete: 'set null' }),
  shot_id: uuid('shot_id').references(() => shots.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  type: text('type').notNull(),
  url: text('url').notNull(),
  thumbnail_url: text('thumbnail_url'),
  size_bytes: bigint('size_bytes', { mode: 'number' }),
  duration_secs: integer('duration_secs'),
  width: integer('width'),
  height: integer('height'),
  notes: text('notes'),
  tags: text('tags').array(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
