import {
  pgTable,
  varchar,
  timestamp,
  unique,
  customType,
  text,
  integer,
  check,
  jsonb,
  boolean,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

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

export const documents = pgTable(
  'documents',
  {
    id: varchar('id', { length: 128 }).primaryKey(),
    campaignId: varchar('campaign_id', { length: 64 })
      .notNull()
      .references(() => campaigns.id),
    docType: varchar('doc_type', { length: 32 }).notNull(),
    yjsState: bytea('yjs_state'),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    uniqueCampaignDocType: unique().on(table.campaignId, table.docType),
  }),
);

export const documentUpdates = pgTable('document_updates', {
  id: varchar('id', { length: 64 }).primaryKey(),
  docId: varchar('doc_id', { length: 128 })
    .notNull()
    .references(() => documents.id),
  updateData: bytea('update_data').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const users = pgTable('users', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const characterKnowledge = pgTable(
  'character_knowledge',
  {
    id: text('id').primaryKey(),
    characterId: text('character_id').notNull(),
    knowledgeTag: text('knowledge_tag').notNull(),
    grantedBy: text('granted_by').notNull(),
    grantedAt: timestamp('granted_at').defaultNow().notNull(),
  },
  (table) => ({
    secretTagCheck: check('secret_tag_check', sql`${table.knowledgeTag} LIKE 'secret:%'`),
  }),
);

export const ingestedDocuments = pgTable('ingested_documents', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id')
    .notNull()
    .references(() => campaigns.id),
  filename: text('filename').notNull(),
  accessScope: text('access_scope')
    .array()
    .notNull()
    .default(sql`'{public}'::text[]`),
  chunkCount: integer('chunk_count').notNull(),
  ingestedAt: timestamp('ingested_at').defaultNow().notNull(),
  ingestedBy: text('ingested_by').notNull(),
});

export const syncState = pgTable(
  'sync_state',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    nodeId: varchar('node_id', { length: 64 }).notNull(),
    foundryUuid: varchar('foundry_uuid', { length: 255 }).notNull(),
    fieldPath: varchar('field_path', { length: 255 }).notNull(),
    currentValue: jsonb('current_value'),
    lastFoundrySync: timestamp('last_foundry_sync'),
    lastHighportSync: timestamp('last_highport_sync'),
  },
  (table) => ({
    uniqueNodeField: unique().on(table.nodeId, table.fieldPath),
  }),
);

export const conflictQueue = pgTable('conflict_queue', {
  id: varchar('id', { length: 64 }).primaryKey(),
  nodeId: varchar('node_id', { length: 64 }).notNull(),
  fieldPath: varchar('field_path', { length: 255 }).notNull(),
  foundryValue: jsonb('foundry_value'),
  highportValue: jsonb('highport_value'),
  foundryTimestamp: timestamp('foundry_timestamp'),
  highportTimestamp: timestamp('highport_timestamp'),
  status: varchar('status', { length: 20 }).default('pending'),
  resolvedBy: varchar('resolved_by', { length: 64 }),
  resolvedAt: timestamp('resolved_at'),
  resolution: varchar('resolution', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const portraits = pgTable(
  'portraits',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    campaignId: varchar('campaign_id', { length: 64 })
      .notNull()
      .references(() => campaigns.id),
    subjectNodeId: varchar('subject_node_id', { length: 64 }),
    anchorPortraitId: varchar('anchor_portrait_id', { length: 64 }),
    sourcePortraitId: varchar('source_portrait_id', { length: 64 }),
    familyGroupId: varchar('family_group_id', { length: 64 }),
    protected: boolean('protected').notNull().default(false),
    sourcePolicy: varchar('source_policy', { length: 20 }).notNull().default('campaign'),
    tags: jsonb('tags')
      .notNull()
      .default(sql`'{}'::jsonb`),
    prompt: text('prompt'),
    promptFingerprint: text('prompt_fingerprint'),
    modelId: text('model_id'),
    storageKey: text('storage_key').notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    sizeBytes: integer('size_bytes'),
    width: integer('width'),
    height: integer('height'),
    createdByUserId: varchar('created_by_user_id', { length: 64 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    sourcePolicyCheck: check(
      'portrait_source_policy_check',
      sql`${table.sourcePolicy} IN ('subject_only', 'family_only', 'campaign', 'public')`,
    ),
  }),
);
