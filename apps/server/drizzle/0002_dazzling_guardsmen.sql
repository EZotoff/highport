CREATE TABLE IF NOT EXISTS "character_knowledge" (
	"id" text PRIMARY KEY NOT NULL,
	"character_id" text NOT NULL,
	"knowledge_tag" text NOT NULL,
	"granted_by" text NOT NULL,
	"granted_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "secret_tag_check" CHECK ("character_knowledge"."knowledge_tag" LIKE 'secret:%')
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ingested_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"filename" text NOT NULL,
	"access_scope" text[] DEFAULT '{public}'::text[] NOT NULL,
	"chunk_count" integer NOT NULL,
	"ingested_at" timestamp DEFAULT now() NOT NULL,
	"ingested_by" text NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ingested_documents" ADD CONSTRAINT "ingested_documents_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
