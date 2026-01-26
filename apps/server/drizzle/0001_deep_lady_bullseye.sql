CREATE TABLE IF NOT EXISTS "document_updates" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"doc_id" varchar(128) NOT NULL,
	"update_data" "bytea" NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "documents" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"campaign_id" varchar(64) NOT NULL,
	"doc_type" varchar(32) NOT NULL,
	"yjs_state" "bytea",
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "documents_campaign_id_doc_type_unique" UNIQUE("campaign_id","doc_type")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document_updates" ADD CONSTRAINT "document_updates_doc_id_documents_id_fk" FOREIGN KEY ("doc_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documents" ADD CONSTRAINT "documents_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
