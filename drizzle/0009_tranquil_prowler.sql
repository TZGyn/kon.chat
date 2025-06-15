ALTER TABLE "upload" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "upload" ADD COLUMN "visibility" varchar(255) DEFAULT 'private' NOT NULL;