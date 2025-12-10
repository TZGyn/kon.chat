ALTER TABLE "user" ADD COLUMN "credits" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "purchased_credits" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "standard_chat_limit";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "premium_chat_limit";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "standard_chat_credit";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "premium_chat_credit";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "search_limit";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "search_credit";