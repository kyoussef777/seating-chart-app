import { pgTable, text, integer, real, timestamp, uuid, varchar, index, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  password: text('password').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const eventSettings = pgTable('event_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventName: text('event_name').notNull().default("Mira & Kamal's Engagement"),
  homePageText: text('home_page_text').notNull().default('Welcome to our engagement! Please find your table below.'),
  searchEnabled: boolean('search_enabled').notNull().default(true),
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