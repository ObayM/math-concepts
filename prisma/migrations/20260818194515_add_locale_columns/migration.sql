-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "lang" TEXT NOT NULL DEFAULT 'en';

-- AlterTable
ALTER TABLE "lesson_attempts" ADD COLUMN     "lang" TEXT;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "locale" TEXT;

-- CreateIndex
CREATE INDEX "courses_lang_idx" ON "courses"("lang");
