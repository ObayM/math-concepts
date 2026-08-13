-- CreateTable
CREATE TABLE "user_slide_notes" (
    "user_id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "slide_id" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "strokes" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_slide_notes_pkey" PRIMARY KEY ("user_id","lesson_id","slide_id")
);

-- CreateIndex
CREATE INDEX "user_slide_notes_user_id_lesson_id_idx" ON "user_slide_notes"("user_id", "lesson_id");

-- AddForeignKey
ALTER TABLE "user_slide_notes" ADD CONSTRAINT "user_slide_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_slide_notes" ADD CONSTRAINT "user_slide_notes_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
