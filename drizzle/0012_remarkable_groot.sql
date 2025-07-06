ALTER TABLE "user" ADD COLUMN "name_for_llm" varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "additional_system_prompt" text DEFAULT '' NOT NULL;