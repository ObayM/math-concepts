-- CreateIndex
CREATE INDEX "lesson_attempts_user_id_skill_created_at_idx" ON "lesson_attempts"("user_id", "skill", "created_at");
