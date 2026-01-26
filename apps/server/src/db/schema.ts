// Placeholder schema for Drizzle ORM
// This will be expanded in Task 4 (Persistence Layer)

import { pgTable, varchar, timestamp, text } from 'drizzle-orm/pg-core';

// Placeholder campaigns table
export const campaigns = pgTable('campaigns', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  ownerId: varchar('owner_id', { length: 64 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Placeholder users table
export const users = pgTable('users', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
});
