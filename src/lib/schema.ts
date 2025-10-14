import { pgTable, text, integer, real, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

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
});

export const guests = pgTable('guests', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  phoneNumber: varchar('phone_number', { length: 20 }),
  address: text('address'),
  partySize: integer('party_size').notNull().default(1), // Number of people in this guest's party
  tableId: uuid('table_id').references(() => tables.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type EventSettings = typeof eventSettings.$inferSelect;
export type NewEventSettings = typeof eventSettings.$inferInsert;

export type Table = typeof tables.$inferSelect;
export type NewTable = typeof tables.$inferInsert;

export type Guest = typeof guests.$inferSelect;
export type NewGuest = typeof guests.$inferInsert;