ALTER TABLE "user" ALTER COLUMN "google_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "github_id" varchar(255);