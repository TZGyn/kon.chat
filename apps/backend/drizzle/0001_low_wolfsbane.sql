CREATE TABLE "youtube" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"channel_name" text NOT NULL,
	"channel_url" varchar(255) NOT NULL,
	"channel_thumbnail_url" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"description_html" text NOT NULL,
	"transcript" json NOT NULL,
	"summary" text NOT NULL,
	"upload_time" text NOT NULL,
	"created_at" bigint NOT NULL
);
