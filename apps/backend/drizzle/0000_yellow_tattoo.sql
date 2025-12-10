CREATE TABLE "chat" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message" (
	"id" text PRIMARY KEY NOT NULL,
	"chat_id" text NOT NULL,
	"role" varchar NOT NULL,
	"brave_data" json DEFAULT '{}'::json NOT NULL,
	"jina_data" json DEFAULT '[]'::json NOT NULL,
	"content" json NOT NULL,
	"model" varchar,
	"provider" varchar,
	"provider_metadata" json DEFAULT '{}'::json NOT NULL,
	"prompt_tokens" bigint NOT NULL,
	"completion_tokens" bigint NOT NULL,
	"total_tokens" bigint NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at_epoch" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"google_id" varchar(255) NOT NULL,
	"username" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"standard_chat_limit" bigint DEFAULT 0 NOT NULL,
	"premium_chat_limit" bigint DEFAULT 0 NOT NULL,
	"standard_chat_credit" bigint DEFAULT 0 NOT NULL,
	"premium_chat_credit" bigint DEFAULT 0 NOT NULL,
	"search_limit" bigint DEFAULT 0 NOT NULL,
	"search_credit" bigint DEFAULT 0 NOT NULL,
	"polar_customer_id" varchar(255),
	"plan" varchar(255) DEFAULT 'free' NOT NULL,
	"created_at" bigint NOT NULL
);
