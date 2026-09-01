CREATE TABLE "lab_exercises" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'java',
    "entryClass" TEXT NOT NULL DEFAULT 'Check',
    "starterFiles" JSONB NOT NULL,
    "hiddenFiles" JSONB NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "timeoutMs" INTEGER NOT NULL DEFAULT 15000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "lab_exercises_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lab_workspaces" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "lab_workspaces_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lab_files" (
    "workspaceId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "lab_files_pkey" PRIMARY KEY ("workspaceId","path")
);

CREATE TABLE "lab_runs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "status" TEXT NOT NULL,
    "passed" BOOLEAN,
    "exitCode" INTEGER,
    "stdout" TEXT NOT NULL DEFAULT '',
    "stderr" TEXT NOT NULL DEFAULT '',
    "errorCode" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    CONSTRAINT "lab_runs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "lab_exercises_slug_key" ON "lab_exercises"("slug");
CREATE INDEX "lab_exercises_nodeId_idx" ON "lab_exercises"("nodeId");
CREATE UNIQUE INDEX "lab_workspaces_userId_exerciseId_key" ON "lab_workspaces"("userId", "exerciseId");
CREATE INDEX "lab_runs_userId_exerciseId_idx" ON "lab_runs"("userId", "exerciseId");

ALTER TABLE "lab_exercises" ADD CONSTRAINT "lab_exercises_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "knowledge_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lab_workspaces" ADD CONSTRAINT "lab_workspaces_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lab_workspaces" ADD CONSTRAINT "lab_workspaces_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "lab_exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lab_files" ADD CONSTRAINT "lab_files_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "lab_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lab_runs" ADD CONSTRAINT "lab_runs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lab_runs" ADD CONSTRAINT "lab_runs_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "lab_exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lab_runs" ADD CONSTRAINT "lab_runs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "lab_workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "lab_exercises" ADD CONSTRAINT "lab_exercises_language_check" CHECK ("language" IN ('java'));
ALTER TABLE "lab_runs" ADD CONSTRAINT "lab_runs_status_check" CHECK ("status" IN ('running', 'succeeded', 'failed', 'timeout', 'blocked'));
