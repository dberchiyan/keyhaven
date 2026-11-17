ALTER TABLE "messages" DROP CONSTRAINT "ck_messages_removed_body";
ALTER TABLE "messages" DROP CONSTRAINT "ck_messages_body";
ALTER TABLE "messages" DROP COLUMN "is_removed";
ALTER TABLE "messages" ADD CONSTRAINT "ck_messages_body" CHECK (length("body") > 0) NOT VALID;
