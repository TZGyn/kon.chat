CREATE TABLE "upload" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"size" bigint NOT NULL,
	"mime_type" varchar(255) NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat" ADD COLUMN "visibility" varchar(255) DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "upload_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "document" DROP COLUMN "url";