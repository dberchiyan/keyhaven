CREATE TABLE "conversations" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "kind" VARCHAR(16) NOT NULL,
    "viewing_id" UUID,
    "subject" VARCHAR(120),
    "opened_by" UUID,
    "listing_id" UUID,
    "closed_at" TIMESTAMPTZ(3),
    "last_message_at" TIMESTAMPTZ(3) NOT NULL,
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "requester_read_at" TIMESTAMPTZ(3),
    "responder_read_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "pk_conversations" PRIMARY KEY ("id"),
    CONSTRAINT "ck_conversations_kind" CHECK ("kind" IN ('VIEWING', 'SUPPORT')),
    CONSTRAINT "ck_conversations_viewing" CHECK (("kind" = 'VIEWING') = ("viewing_id" IS NOT NULL)),
    CONSTRAINT "ck_conversations_viewing_id_is_id" CHECK ("viewing_id" IS NULL OR "viewing_id" = "id"),
    CONSTRAINT "ck_conversations_support" CHECK (("kind" = 'SUPPORT') = ("subject" IS NOT NULL AND "opened_by" IS NOT NULL)),
    CONSTRAINT "ck_conversations_support_only" CHECK (("listing_id" IS NULL AND "closed_at" IS NULL) OR "kind" = 'SUPPORT'),
    CONSTRAINT "ck_conversations_message_count" CHECK ("message_count" >= 0)
);

CREATE UNIQUE INDEX "uq_conversations_viewing_id" ON "conversations"("viewing_id");
CREATE INDEX "idx_conversations_last_message_at" ON "conversations"("last_message_at");
CREATE INDEX "idx_conversations_kind_last_message_at" ON "conversations"("kind", "last_message_at");
CREATE INDEX "idx_conversations_opened_by_last_message_at" ON "conversations"("opened_by", "last_message_at");
CREATE INDEX "idx_conversations_listing_id" ON "conversations"("listing_id");

ALTER TABLE "conversations" ADD CONSTRAINT "fk_conversations_viewing_id" FOREIGN KEY ("viewing_id") REFERENCES "viewings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "fk_conversations_opened_by" FOREIGN KEY ("opened_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "fk_conversations_listing_id" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "messages" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "conversation_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "side" VARCHAR(16) NOT NULL,
    "body" VARCHAR(2000) NOT NULL,
    "is_removed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_messages" PRIMARY KEY ("id"),
    CONSTRAINT "ck_messages_side" CHECK ("side" IN ('REQUESTER', 'RESPONDER')),
    CONSTRAINT "ck_messages_body" CHECK ("is_removed" OR length("body") > 0),
    CONSTRAINT "ck_messages_removed_body" CHECK (NOT "is_removed" OR "body" = '')
);

CREATE INDEX "idx_messages_conversation_id_created_at" ON "messages"("conversation_id", "created_at");
CREATE INDEX "idx_messages_sender_id" ON "messages"("sender_id");

ALTER TABLE "messages" ADD CONSTRAINT "fk_messages_conversation_id" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "fk_messages_sender_id" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
