-- Back to the viewing-only threads: support conversations and their messages are dropped.
DELETE FROM "messages" WHERE "conversation_id" IN (SELECT "id" FROM "conversations" WHERE "kind" = 'SUPPORT');
DELETE FROM "conversations" WHERE "kind" = 'SUPPORT';
ALTER TABLE "messages" DROP CONSTRAINT "fk_messages_conversation_id";
ALTER TABLE "messages" DROP CONSTRAINT "ck_messages_side";
UPDATE "messages" SET "side" = CASE "side" WHEN 'REQUESTER' THEN 'TENANT' ELSE 'OWNER' END;
ALTER TABLE "messages" RENAME COLUMN "conversation_id" TO "viewing_id";
ALTER INDEX "idx_messages_conversation_id_created_at" RENAME TO "idx_viewing_messages_viewing_id_created_at";
ALTER INDEX "idx_messages_sender_id" RENAME TO "idx_viewing_messages_sender_id";
ALTER TABLE "messages" RENAME CONSTRAINT "ck_messages_body" TO "ck_viewing_messages_body";
ALTER TABLE "messages" RENAME CONSTRAINT "fk_messages_sender_id" TO "fk_viewing_messages_sender_id";
ALTER TABLE "messages" RENAME CONSTRAINT "pk_messages" TO "pk_viewing_messages";
ALTER TABLE "messages" RENAME TO "viewing_messages";
ALTER TABLE "viewing_messages" ADD CONSTRAINT "ck_viewing_messages_side" CHECK ("side" IN ('TENANT', 'OWNER'));

ALTER TABLE "conversations"
    DROP CONSTRAINT "fk_conversations_viewing_id",
    DROP CONSTRAINT "fk_conversations_opened_by",
    DROP CONSTRAINT "fk_conversations_listing_id",
    DROP CONSTRAINT "ck_conversations_kind",
    DROP CONSTRAINT "ck_conversations_viewing",
    DROP CONSTRAINT "ck_conversations_viewing_id_is_id",
    DROP CONSTRAINT "ck_conversations_support",
    DROP CONSTRAINT "ck_conversations_support_only",
    DROP CONSTRAINT "ck_conversations_message_count";
DROP INDEX "uq_conversations_viewing_id";
DROP INDEX "idx_conversations_kind_last_message_at";
DROP INDEX "idx_conversations_opened_by_last_message_at";
ALTER TABLE "conversations"
    DROP COLUMN "kind", DROP COLUMN "viewing_id", DROP COLUMN "subject", DROP COLUMN "opened_by",
    DROP COLUMN "listing_id", DROP COLUMN "closed_at";
ALTER TABLE "conversations" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "conversations" RENAME COLUMN "requester_read_at" TO "tenant_read_at";
ALTER TABLE "conversations" RENAME COLUMN "responder_read_at" TO "owner_read_at";
ALTER TABLE "conversations" RENAME COLUMN "id" TO "viewing_id";
ALTER INDEX "idx_conversations_last_message_at" RENAME TO "idx_viewing_threads_last_message_at";
ALTER TABLE "conversations" RENAME CONSTRAINT "pk_conversations" TO "pk_viewing_threads";
ALTER TABLE "conversations" RENAME TO "viewing_threads";
ALTER TABLE "viewing_threads"
    ADD CONSTRAINT "fk_viewing_threads_viewing_id" FOREIGN KEY ("viewing_id") REFERENCES "viewings"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "ck_viewing_threads_message_count" CHECK ("message_count" >= 0);
ALTER TABLE "viewing_messages" ADD CONSTRAINT "fk_viewing_messages_viewing_id" FOREIGN KEY ("viewing_id") REFERENCES "viewing_threads"("viewing_id") ON DELETE CASCADE ON UPDATE CASCADE;
