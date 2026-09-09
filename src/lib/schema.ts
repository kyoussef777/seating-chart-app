import { pgTable, text, integer, real, timestamp, uuid, varchar, index, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  password: text('password').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// The column defaults double as the backfill for the existing production row,
// so the fields added with the template system default to the copy the live
// bridal-shower page previously hard-coded. New events overwrite them from the
// chosen template's defaults (see lib/event-settings.ts).
export const eventSettings = pgTable('event_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  /** Which guest-portal template to render: see lib/templates.ts. */
  template: varchar('template', { length: 32 }).notNull().default('bridal-shower'),
  eventName: text('event_name').notNull().default("Mira & Kamal's Engagement"),
  /** Small-caps line above the event name. Empty hides it. */
  eventKicker: text('event_kicker').notNull().default('Bridal Shower'),
  homePageText: text('home_page_text').notNull().default('Welcome to our engagement! Please find your table below.'),
  /** Venue line under the event name. Empty hides it. */
  venueName: text('venue_name').notNull().default("Angelina's Restaurant, Staten Island"),
  /** Date line, shown beside the venue. Empty hides it. */
  eventDate: text('event_date').notNull().default('September 26'),
  /** Shown in place of the search box while search is switched off. */
  searchClosedMessage: text('search_closed_message')
    .notNull()
    .default('Seating will be revealed on the day of the celebration.'),
  searchEnabled: boolean('search_enabled').notNull().default(true),
  addressCollectionEnabled: boolean('address_collection_enabled').notNull().default(true),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const tables = pgTable('tables', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
  shape: varchar('shape', { length: 20 }).notNull(), // 'round' or 'rectangular'
  capacity: integer('capacity').notNull().default(8),
  positionX: real('position_x').notNull().default(0),
  positionY: real('position_y').notNull().default(0),
  rotation: real('rotation').notNull().default(0), // rotation in degrees (0-360)
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  nameIdx: index('tables_name_idx').on(table.name),
}));

export const guests = pgTable('guests', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  phoneNumber: varchar('phone_number', { length: 20 }),
  address: text('address'),
  partySize: integer('party_size').notNull().default(1), // Number of people in this guest's party
  tableId: uuid('table_id').references(() => tables.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  nameIdx: index('guests_name_idx').on(table.name),
  tableIdIdx: index('guests_table_id_idx').on(table.tableId),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type EventSettings = typeof eventSettings.$inferSelect;
export type NewEventSettings = typeof eventSettings.$inferInsert;

export type Table = typeof tables.$inferSelect;
export type NewTable = typeof tables.$inferInsert;

export type Guest = typeof guests.$inferSelect;
export type NewGuest = typeof guests.$inferInsert;

export const labels = pgTable('labels', {
  id: uuid('id').defaultRandom().primaryKey(),
  text: text('text').notNull(),
  x: real('x').notNull().default(0),
  y: real('y').notNull().default(0),
  fontSize: integer('font_size').notNull().default(16),
  rotation: real('rotation').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const shapes = pgTable('shapes', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: varchar('type', { length: 20 }).notNull(), // 'rectangle', 'circle', 'line'
  x: real('x').notNull().default(0),
  y: real('y').notNull().default(0),
  width: real('width').notNull().default(100),
  height: real('height').notNull().default(100),
  rotation: real('rotation').notNull().default(0),
  color: varchar('color', { length: 50 }).notNull().default('#000000'),
  label: text('label'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const referenceObjects = pgTable('reference_objects', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: varchar('type', { length: 20 }).notNull(), // 'danceFloor', 'bar', 'buffet', etc.
  x: real('x').notNull().default(0),
  y: real('y').notNull().default(0),
  width: real('width').notNull().default(100),
  height: real('height').notNull().default(100),
  rotation: real('rotation').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Label = typeof labels.$inferSelect;
export type NewLabel = typeof labels.$inferInsert;

export type Shape = typeof shapes.$inferSelect;
export type NewShape = typeof shapes.$inferInsert;

export type ReferenceObject = typeof referenceObjects.$inferSelect;
export type NewReferenceObject = typeof referenceObjects.$inferInsert;