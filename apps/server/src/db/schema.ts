import { pgTable, varchar, timestamp, unique, customType } from 'drizzle-orm/pg-core';

// Custom type for bytea since drizzle-orm/pg-core doesn't export it directly
const bytea = customType<{ data: Uint8Array; driverData: Buffer }>({
  dataType() {
    return 'bytea';
  },
  toDriver(value: Uint8Array): Buffer {
    return Buffer.from(value);
  },
  fromDriver(value: Buffer): Uint8Array {
    return new Uint8Array(value);
  },
});

export const campaigns = pgTable('campaigns', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  ownerId: varchar('owner_id', { length: 64 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const documents = pgTable('documents', {
  id: varchar('id', { length: 128 }).primaryKey(),
  campaignId: varchar('campaign_id', { length: 64 }).notNull().references(() => campaigns.id),
  docType: varchar('doc_type', { length: 32 }).notNull(),
  yjsState: bytea('yjs_state'),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  uniqueCampaignDocType: unique().on(table.campaignId, table.docType),
}));

export const documentUpdates = pgTable('document_updates', {
  id: varchar('id', { length: 64 }).primaryKey(),
  docId: varchar('doc_id', { length: 128 }).notNull().references(() => documents.id),
  updateData: bytea('update_data').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const users = pgTable('users', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
});
