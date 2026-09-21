import { pgTable, uuid, text, boolean, real, jsonb, integer, timestamp } from 'drizzle-orm/pg-core';
import { projects } from './projects';
import { scenes } from './scenes';
import { shots } from './shots';
import { users } from './users';

export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  scene_id: uuid('scene_id').references(() => scenes.id, { onDelete: 'cascade' }),
  shot_id: uuid('shot_id').references(() => shots.id, { onDelete: 'cascade' }),
  user_id: uuid('user_id').references(() => users.id).notNull(),
  content: text('content').notNull(),
  parent_id: uuid('parent_id'),
  resolved: boolean('resolved').default(false).notNull(),
  position_x: real('position_x'),
  position_y: real('position_y'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const versions = pgTable('versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  user_id: uuid('user_id').references(() => users.id).notNull(),
  label: text('label'),
  snapshot: jsonb('snapshot').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const templates = pgTable('templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  content: jsonb('content').notNull(),
  is_public: boolean('is_public').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const productionChecklist = pgTable('production_checklist', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  item: text('item').notNull(),
  category: text('category'),
  checked: boolean('checked').default(false).notNull(),
  notes: text('notes'),
  sort_order: integer('sort_order').default(0).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const budgetItems = pgTable('budget_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  category: text('category').notNull(),
  description: text('description').notNull(),
  estimated_cost: integer('estimated_cost'),
  actual_cost: integer('actual_cost'),
  notes: text('notes'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
