-- Custom SQL migration file, put your code below! --
INSERT INTO "user" ("id", "email", "name", "created_at", "updated_at", "role")
VALUES ('defaultuser', 'default@kon.chat', 'Default User', current_timestamp, current_timestamp, 'admin');

INSERT INTO "account" ("id", "account_id", "provider_id", "user_id", "password", "created_at", "updated_at")
VALUES ('defaultuseraccount', 'defaultuser', 'credential', 'defaultuser', 'dd72024e0d6b4bf1c53db1be040a4ca7:1febe4079fa5b9941454437c2042a903ec6f559b9d4054ccb1abc9f4b74baca64863fde2185b1f0cea137e8f44709d5b1dfdd5e1ca8ecb6bb121dabd56180501', current_timestamp, current_timestamp);