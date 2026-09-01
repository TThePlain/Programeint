ALTER TABLE "questions" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'diagnosis';
ALTER TABLE "questions" ADD CONSTRAINT "questions_kind_check" CHECK ("kind" IN ('diagnosis', 'check'));

ALTER TABLE "node_mastery" DROP CONSTRAINT IF EXISTS "node_mastery_status_check";
ALTER TABLE "node_mastery" ADD CONSTRAINT "node_mastery_status_check" CHECK ("status" IN ('unassessed', 'passed', 'failed', 'skipped', 'studied'));

CREATE TABLE "learning_modules" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "checkQuestionId" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "learning_modules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "study_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "readAt" TIMESTAMP(3),
    "checkAnsweredAt" TIMESTAMP(3),
    "checkCorrect" BOOLEAN,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "study_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fsrs_cards" (
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "due" TIMESTAMP(3) NOT NULL,
    "stability" DOUBLE PRECISION NOT NULL,
    "difficulty" DOUBLE PRECISION NOT NULL,
    "elapsedDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scheduledDays" INTEGER NOT NULL DEFAULT 0,
    "learningSteps" INTEGER NOT NULL DEFAULT 0,
    "reps" INTEGER NOT NULL DEFAULT 0,
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "state" INTEGER NOT NULL DEFAULT 0,
    "lastReview" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "fsrs_cards_pkey" PRIMARY KEY ("userId","questionId")
);

CREATE UNIQUE INDEX "learning_modules_nodeId_key" ON "learning_modules"("nodeId");
CREATE UNIQUE INDEX "learning_modules_slug_key" ON "learning_modules"("slug");
CREATE INDEX "study_sessions_userId_status_idx" ON "study_sessions"("userId", "status");
CREATE INDEX "fsrs_cards_userId_due_idx" ON "fsrs_cards"("userId", "due");

ALTER TABLE "learning_modules" ADD CONSTRAINT "learning_modules_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "knowledge_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "learning_modules" ADD CONSTRAINT "learning_modules_checkQuestionId_fkey" FOREIGN KEY ("checkQuestionId") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "learning_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "knowledge_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fsrs_cards" ADD CONSTRAINT "fsrs_cards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fsrs_cards" ADD CONSTRAINT "fsrs_cards_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_status_check" CHECK ("status" IN ('in_progress', 'completed', 'abandoned'));
