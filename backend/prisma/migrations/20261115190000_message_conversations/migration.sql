-- Conversations (message module): the viewing threads become one kind of conversation, and a
-- member's request to Keyhaven (SUPPORT) the other. Renames keep every row; a viewing's
-- conversation keeps the viewing's id.
ALTER TABLE "viewing_messages" DROP CONSTRAINT "fk_viewing_messages_viewing_id";

ALTER TABLE "viewing_threads" RENAME TO "conversations";
ALTER TABLE "conversations" RENAME CONSTRAINT "pk_viewing_threads" TO "pk_conversations";
ALTER TABLE "conversations" DROP CONSTRAINT "fk_viewing_threads_viewing_id";
ALTER TABLE "conversations" DROP CONSTRAINT "ck_viewing_threads_message_count";
ALTER INDEX "idx_viewing_threads_last_message_at" RENAME TO "idx_conversations_last_message_at";
ALTER TABLE "conversations" RENAME COLUMN "viewing_id" TO "id";
ALTER TABLE "conversations" RENAME COLUMN "tenant_read_at" TO "requester_read_at";
ALTER TABLE "conversations" RENAME COLUMN "owner_read_at" TO "responder_read_at";
ALTER TABLE "conversations"
    ALTER COLUMN "id" SET DEFAULT uuidv7(),
    ADD COLUMN "kind" VARCHAR(16) NOT NULL DEFAULT 'VIEWING',
    ADD COLUMN "viewing_id" UUID,
    ADD COLUMN "subject" VARCHAR(120),
    ADD COLUMN "opened_by" UUID,
    ADD COLUMN "listing_id" UUID,
    ADD COLUMN "closed_at" TIMESTAMPTZ(3);
UPDATE "conversations" SET "viewing_id" = "id";
ALTER TABLE "conversations" ALTER COLUMN "kind" DROP DEFAULT;

CREATE UNIQUE INDEX "uq_conversations_viewing_id" ON "conversations"("viewing_id");
CREATE INDEX "idx_conversations_kind_last_message_at" ON "conversations"("kind", "last_message_at");
CREATE INDEX "idx_conversations_opened_by_last_message_at" ON "conversations"("opened_by", "last_message_at");

ALTER TABLE "conversations"
    ADD CONSTRAINT "fk_conversations_viewing_id" FOREIGN KEY ("viewing_id") REFERENCES "viewings"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "fk_conversations_opened_by" FOREIGN KEY ("opened_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "fk_conversations_listing_id" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "ck_conversations_kind" CHECK ("kind" IN ('VIEWING', 'SUPPORT')),
    -- A viewing's conversation is the viewing (same id); a support request has a subject and an opener.
    ADD CONSTRAINT "ck_conversations_viewing" CHECK (("kind" = 'VIEWING') = ("viewing_id" IS NOT NULL)),
    ADD CONSTRAINT "ck_conversations_viewing_id_is_id" CHECK ("viewing_id" IS NULL OR "viewing_id" = "id"),
    ADD CONSTRAINT "ck_conversations_support" CHECK (("kind" = 'SUPPORT') = ("subject" IS NOT NULL AND "opened_by" IS NOT NULL)),
    ADD CONSTRAINT "ck_conversations_support_only" CHECK (("listing_id" IS NULL AND "closed_at" IS NULL) OR "kind" = 'SUPPORT'),
    ADD CONSTRAINT "ck_conversations_message_count" CHECK ("message_count" >= 0);

ALTER TABLE "viewing_messages" RENAME TO "messages";
ALTER TABLE "messages" RENAME CONSTRAINT "pk_viewing_messages" TO "pk_messages";
ALTER TABLE "messages" RENAME CONSTRAINT "fk_viewing_messages_sender_id" TO "fk_messages_sender_id";
ALTER TABLE "messages" DROP CONSTRAINT "ck_viewing_messages_side";
ALTER TABLE "messages" RENAME CONSTRAINT "ck_viewing_messages_body" TO "ck_messages_body";
ALTER INDEX "idx_viewing_messages_viewing_id_created_at" RENAME TO "idx_messages_conversation_id_created_at";
ALTER INDEX "idx_viewing_messages_sender_id" RENAME TO "idx_messages_sender_id";
ALTER TABLE "messages" RENAME COLUMN "viewing_id" TO "conversation_id";
UPDATE "messages" SET "side" = CASE "side" WHEN 'TENANT' THEN 'REQUESTER' ELSE 'RESPONDER' END;
ALTER TABLE "messages"
    ADD CONSTRAINT "ck_messages_side" CHECK ("side" IN ('REQUESTER', 'RESPONDER')),
    ADD CONSTRAINT "fk_messages_conversation_id" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
