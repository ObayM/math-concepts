-- AlterTable
ALTER TABLE "user_daily_activity" ADD COLUMN     "warmup_xp" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "warmup_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "seed" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "answered" INTEGER NOT NULL DEFAULT 0,
    "correct" INTEGER NOT NULL DEFAULT 0,
    "best_streak" INTEGER NOT NULL DEFAULT 0,
    "total_ms" INTEGER NOT NULL DEFAULT 0,
    "xp_awarded" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "warmup_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warmup_answers" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "idx" INTEGER NOT NULL,
    "fact_key" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "given" TEXT,
    "correct" BOOLEAN NOT NULL,
    "elapsed_ms" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warmup_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "warmup_sessions_user_id_started_at_idx" ON "warmup_sessions"("user_id", "started_at");

-- CreateIndex
CREATE INDEX "warmup_sessions_user_id_level_started_at_idx" ON "warmup_sessions"("user_id", "level", "started_at");

-- CreateIndex
CREATE INDEX "warmup_answers_user_id_fact_key_created_at_idx" ON "warmup_answers"("user_id", "fact_key", "created_at");

-- CreateIndex
CREATE INDEX "warmup_answers_user_id_level_created_at_idx" ON "warmup_answers"("user_id", "level", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "warmup_answers_session_id_idx_key" ON "warmup_answers"("session_id", "idx");

-- AddForeignKey
ALTER TABLE "warmup_sessions" ADD CONSTRAINT "warmup_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warmup_answers" ADD CONSTRAINT "warmup_answers_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "warmup_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warmup_answers" ADD CONSTRAINT "warmup_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
