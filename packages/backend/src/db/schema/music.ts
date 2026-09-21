import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { projects } from './projects';
import { scenes } from './scenes';

export const music = pgTable('music', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  scene_id: uuid('scene_id').references(() => scenes.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  type: text('type').default('music').notNull(),
  mood: text('mood'),
  bpm: integer('bpm'),
  duration_secs: integer('duration_secs'),
  license: text('license'),
  source: text('source'),
  source_url: text('source_url'),
  file_url: text('file_url'),
  notes: text('notes'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
