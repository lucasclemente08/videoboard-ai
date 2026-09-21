import { pgTable, uuid, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { projects } from './projects';

export const characters = pgTable('characters', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  actor_name: text('actor_name'),
  wardrobe: text('wardrobe'),
  makeup: text('makeup'),
  notes: text('notes'),
  photo_url: text('photo_url'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const locations = pgTable('locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  address: text('address'),
  map_coordinates: text('map_coordinates'),
  photo_url: text('photo_url'),
  schedule: text('schedule'),
  permits_required: boolean('permits_required').default(false).notNull(),
  permits_status: text('permits_status'),
  notes: text('notes'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const equipment = pgTable('equipment', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  camera: text('camera'),
  lenses: text('lenses').array(),
  microphones: text('microphones').array(),
  lights: text('lights').array(),
  tripods: boolean('tripods').default(false).notNull(),
  batteries: integer('batteries').default(0).notNull(),
  sd_cards: integer('sd_cards').default(0).notNull(),
  drone: boolean('drone').default(false).notNull(),
  laptop: boolean('laptop').default(false).notNull(),
  cables: text('cables'),
  notes: text('notes'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
