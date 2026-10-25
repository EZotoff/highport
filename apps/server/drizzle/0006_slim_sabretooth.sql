CREATE TABLE IF NOT EXISTS "campaign_members" (
	"campaign_id" varchar(64) NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"role" varchar(20) NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_members_campaign_id_user_id_pk" PRIMARY KEY("campaign_id","user_id"),
	CONSTRAINT "campaign_members_role_check" CHECK ("campaign_members"."role" IN ('gm', 'player'))
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campaign_members" ADD CONSTRAINT "campaign_members_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
INSERT INTO campaigns (id, name, owner_id) VALUES
 ('default', 'Default Campaign', 'system'),
 ('campaign_default', 'Legacy Default Campaign', 'system')
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO campaign_members (campaign_id, user_id, role)
SELECT id, owner_id, 'gm' FROM campaigns
ON CONFLICT DO NOTHING;
