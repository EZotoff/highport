CREATE TABLE IF NOT EXISTS "conflict_queue" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"node_id" varchar(64) NOT NULL,
	"field_path" varchar(255) NOT NULL,
	"foundry_value" jsonb,
	"planeshift_value" jsonb,
	"foundry_timestamp" timestamp,
	"planeshift_timestamp" timestamp,
	"status" varchar(20) DEFAULT 'pending',
	"resolved_by" varchar(64),
	"resolved_at" timestamp,
	"resolution" varchar(20),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sync_state" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"node_id" varchar(64) NOT NULL,
	"foundry_uuid" varchar(255) NOT NULL,
	"field_path" varchar(255) NOT NULL,
	"current_value" jsonb,
	"last_foundry_sync" timestamp,
	"last_planeshift_sync" timestamp,
	CONSTRAINT "sync_state_node_id_field_path_unique" UNIQUE("node_id","field_path")
);
