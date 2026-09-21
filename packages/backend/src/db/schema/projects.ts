import { pgTable, uuid, text, integer, timestamp, boolean } from 'drizzle-orm/pg-core';
import { users } from './users';

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  cover_url: text('cover_url'),
  status: text('status').default('draft').notNull(),
  owner_id: uuid('owner_id').references(() => users.id),
  estimated_duration_secs: integer('estimated_duration_secs').default(0).notNull(),
  is_template: boolean('is_template').default(false).notNull(),
  template_category: text('template_category'),
  clone_count: integer('clone_count').default(0).notNull(),
  share_token: text('share_token'),
  share_password: text('share_password'),
  client_approved: boolean('client_approved').default(false).notNull(),
  client_feedback: text('client_feedback'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const projectMembers = pgTable('project_members', {
  project_id: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  user_id: uuid('user_id').references(() => users.id).notNull(),
  role: text('role').default('editor').notNull(),
});
