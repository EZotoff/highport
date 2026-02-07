CREATE TABLE IF NOT EXISTS "portraits" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"campaign_id" varchar(64) NOT NULL,
	"subject_node_id" varchar(64),
	"anchor_portrait_id" varchar(64),
	"source_portrait_id" varchar(64),
	"family_group_id" varchar(64),
	"protected" boolean DEFAULT false NOT NULL,
	"source_policy" varchar(20) DEFAULT 'campaign' NOT NULL,
	"tags" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"prompt" text,
	"prompt_fingerprint" text,
	"model_id" text,
	"storage_key" text NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size_bytes" integer,
	"width" integer,
	"height" integer,
	"created_by_user_id" varchar(64) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "portrait_source_policy_check" CHECK ("portraits"."source_policy" IN ('subject_only', 'family_only', 'campaign', 'public'))
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portraits" ADD CONSTRAINT "portraits_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
