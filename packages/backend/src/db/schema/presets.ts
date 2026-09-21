import { pgTable, uuid, text, jsonb, boolean, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';

export const cameraLightingPresets = pgTable('camera_lighting_presets', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').references(() => users.id),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category').default('custom').notNull(), // 'interview', 'cinematic', 'commercial', 'youtube', 'custom'
  camera_setup: jsonb('camera_setup').notNull(),
  lighting_setup: jsonb('lighting_setup').notNull(),
  is_system: boolean('is_system').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
