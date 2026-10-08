-- CreateTable
CREATE TABLE "lesson_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "slide_id" TEXT,
    "type" TEXT NOT NULL,
    "client_at" TIMESTAMP(3) NOT NULL,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lesson_events_user_id_created_at_idx" ON "lesson_events"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "lesson_events_lesson_id_created_at_idx" ON "lesson_events"("lesson_id", "created_at");

-- CreateIndex
CREATE INDEX "lesson_events_session_id_idx" ON "lesson_events"("session_id");

-- CreateIndex
CREATE INDEX "lesson_events_created_at_idx" ON "lesson_events"("created_at");

-- AddForeignKey
ALTER TABLE "lesson_events" ADD CONSTRAINT "lesson_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_events" ADD CONSTRAINT "lesson_events_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
