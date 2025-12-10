ALTER TABLE "model" ADD COLUMN "image" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "model" ADD COLUMN "file" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "model" ADD COLUMN "fast" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "model" ADD COLUMN "reasoning" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "model" ADD COLUMN "search_grounding" boolean DEFAULT false NOT NULL;