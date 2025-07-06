CREATE TABLE "document" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" varchar NOT NULL,
	"name" varchar(255) NOT NULL,
	"url" varchar(255) NOT NULL,
	"markdown" text,
	"summary" text,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "embeddings" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"resource_type" varchar(255) NOT NULL,
	"resource_id" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(768) NOT NULL
);
--> statement-breakpoint
CREATE INDEX "embeddingIndex" ON "embeddings" USING hnsw ("embedding" vector_cosine_ops);