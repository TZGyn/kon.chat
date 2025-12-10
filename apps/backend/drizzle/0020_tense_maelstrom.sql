-- Custom SQL migration file, put your code below! --
UPDATE "user" SET "created_at" = to_timestamp("created_at_unix" / 1000);