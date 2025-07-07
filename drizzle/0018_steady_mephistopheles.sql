CREATE TABLE "setting" (
	"user_id" text NOT NULL,
	"name_for_llm" varchar(255) DEFAULT '' NOT NULL,
	"additional_system_prompt" text DEFAULT '' NOT NULL,
	"openai_api_key" text,
	"gemini_api_key" text,
	"claude_api_key" text,
	"openrouter_api_key" text
);
--> statement-breakpoint
ALTER TABLE "setting" ADD CONSTRAINT "setting_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;