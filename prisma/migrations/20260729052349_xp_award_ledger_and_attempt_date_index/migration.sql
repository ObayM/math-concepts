-- AlterTable
ALTER TABLE "user_lesson_progress" ADD COLUMN     "xp_awarded" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "lesson_attempts_user_id_created_at_idx" ON "lesson_attempts"("user_id", "created_at");
