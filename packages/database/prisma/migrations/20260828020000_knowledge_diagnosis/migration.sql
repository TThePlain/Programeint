CREATE TABLE "knowledge_nodes" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "knowledge_nodes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "node_prerequisites" (
    "nodeId" TEXT NOT NULL,
    "prerequisiteId" TEXT NOT NULL,
    "nature" TEXT NOT NULL DEFAULT 'required',
    CONSTRAINT "node_prerequisites_pkey" PRIMARY KEY ("nodeId","prerequisiteId")
);

CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "code" TEXT,
    "choices" JSONB NOT NULL,
    "correctChoiceId" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "diagnosis_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "targetNodeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "currentQuestionId" TEXT,
    "askedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedNodeIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "diagnosis_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "diagnosis_answers" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "choiceId" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "diagnosis_answers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "node_mastery" (
    "userId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "knowledgeScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "node_mastery_pkey" PRIMARY KEY ("userId","nodeId")
);

CREATE UNIQUE INDEX "knowledge_nodes_slug_key" ON "knowledge_nodes"("slug");
CREATE UNIQUE INDEX "questions_slug_key" ON "questions"("slug");
CREATE INDEX "questions_nodeId_idx" ON "questions"("nodeId");
CREATE INDEX "diagnosis_sessions_userId_status_idx" ON "diagnosis_sessions"("userId", "status");
CREATE UNIQUE INDEX "diagnosis_answers_sessionId_questionId_key" ON "diagnosis_answers"("sessionId", "questionId");

ALTER TABLE "node_prerequisites" ADD CONSTRAINT "node_prerequisites_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "knowledge_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "node_prerequisites" ADD CONSTRAINT "node_prerequisites_prerequisiteId_fkey" FOREIGN KEY ("prerequisiteId") REFERENCES "knowledge_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "questions" ADD CONSTRAINT "questions_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "knowledge_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "diagnosis_sessions" ADD CONSTRAINT "diagnosis_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "diagnosis_sessions" ADD CONSTRAINT "diagnosis_sessions_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "diagnosis_sessions" ADD CONSTRAINT "diagnosis_sessions_targetNodeId_fkey" FOREIGN KEY ("targetNodeId") REFERENCES "knowledge_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "diagnosis_answers" ADD CONSTRAINT "diagnosis_answers_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "diagnosis_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "diagnosis_answers" ADD CONSTRAINT "diagnosis_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "diagnosis_answers" ADD CONSTRAINT "diagnosis_answers_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "knowledge_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "node_mastery" ADD CONSTRAINT "node_mastery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "node_mastery" ADD CONSTRAINT "node_mastery_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "knowledge_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "node_prerequisites" ADD CONSTRAINT "node_prerequisites_nature_check" CHECK ("nature" IN ('required', 'recommended'));
ALTER TABLE "diagnosis_sessions" ADD CONSTRAINT "diagnosis_sessions_status_check" CHECK ("status" IN ('in_progress', 'completed'));
ALTER TABLE "node_mastery" ADD CONSTRAINT "node_mastery_status_check" CHECK ("status" IN ('unassessed', 'passed', 'failed', 'skipped'));
