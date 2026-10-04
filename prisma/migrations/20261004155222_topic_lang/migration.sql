-- AlterTable
ALTER TABLE "lessons" ADD COLUMN     "lang" TEXT;

-- CreateIndex
CREATE INDEX "lessons_lang_idx" ON "lessons"("lang");
