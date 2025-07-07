-- Custom SQL migration file, put your code below! --
ALTER TABLE "user" RENAME COLUMN "created_at" TO "created_at_unix";
ALTER TABLE "user" ALTER COLUMN "email" TYPE TEXT;
ALTER TABLE "user" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;

