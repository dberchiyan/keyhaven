-- CreateTable
CREATE TABLE "viewing_threads" (
    "viewing_id" UUID NOT NULL,
    "last_message_at" TIMESTAMPTZ(3) NOT NULL,
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "tenant_read_at" TIMESTAMPTZ(3),
    "owner_read_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "pk_viewing_threads" PRIMARY KEY ("viewing_id")
);

-- CreateTable
CREATE TABLE "viewing_messages" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "viewing_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "side" VARCHAR(16) NOT NULL,
    "body" VARCHAR(2000) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_viewing_messages" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_viewing_threads_last_message_at" ON "viewing_threads"("last_message_at");

-- CreateIndex
CREATE INDEX "idx_viewing_messages_viewing_id_created_at" ON "viewing_messages"("viewing_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_viewing_messages_sender_id" ON "viewing_messages"("sender_id");

-- AddForeignKey
ALTER TABLE "viewing_threads" ADD CONSTRAINT "fk_viewing_threads_viewing_id" FOREIGN KEY ("viewing_id") REFERENCES "viewings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewing_messages" ADD CONSTRAINT "fk_viewing_messages_viewing_id" FOREIGN KEY ("viewing_id") REFERENCES "viewing_threads"("viewing_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewing_messages" ADD CONSTRAINT "fk_viewing_messages_sender_id" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Messages: a conversation per confirmed viewing (message module). The side that wrote a
-- message decides whose unread count it belongs to; the body is never empty.
ALTER TABLE "viewing_messages"
    ADD CONSTRAINT "ck_viewing_messages_side" CHECK ("side" IN ('TENANT', 'OWNER')),
    ADD CONSTRAINT "ck_viewing_messages_body" CHECK (length("body") > 0);
ALTER TABLE "viewing_threads"
    ADD CONSTRAINT "ck_viewing_threads_message_count" CHECK ("message_count" >= 0);
