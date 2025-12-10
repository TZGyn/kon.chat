CREATE TABLE "model" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" varchar(255) NOT NULL,
	"model" varchar(255) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "openai_api_key" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "gemini_api_key" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "claude_api_key" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "openrouter_api_key" text;