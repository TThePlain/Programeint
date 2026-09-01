CREATE TABLE "portfolio_projects" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brief" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'java',
    "entryClass" TEXT NOT NULL DEFAULT 'Check',
    "starterFiles" JSONB NOT NULL,
    "hiddenFiles" JSONB NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "timeoutMs" INTEGER NOT NULL DEFAULT 20000,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolio_projects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_requirements" (
    "projectId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,

    CONSTRAINT "project_requirements_pkey" PRIMARY KEY ("projectId","nodeId")
);

CREATE TABLE "project_workspaces" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_workspaces_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_files" (
    "workspaceId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_files_pkey" PRIMARY KEY ("workspaceId","path")
);

CREATE TABLE "project_runs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "status" TEXT NOT NULL,
    "passed" BOOLEAN,
    "exitCode" INTEGER,
    "stdout" TEXT NOT NULL DEFAULT '',
    "stderr" TEXT NOT NULL DEFAULT '',
    "errorCode" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "project_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "portfolio_evidence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portfolio_evidence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "portfolio_projects_slug_key" ON "portfolio_projects"("slug");
CREATE UNIQUE INDEX "project_workspaces_userId_projectId_key" ON "project_workspaces"("userId", "projectId");
CREATE INDEX "project_runs_userId_projectId_idx" ON "project_runs"("userId", "projectId");
CREATE UNIQUE INDEX "portfolio_evidence_runId_key" ON "portfolio_evidence"("runId");
CREATE UNIQUE INDEX "portfolio_evidence_userId_projectId_key" ON "portfolio_evidence"("userId", "projectId");

ALTER TABLE "portfolio_projects" ADD CONSTRAINT "portfolio_projects_language_check" CHECK ("language" IN ('java'));
ALTER TABLE "project_runs" ADD CONSTRAINT "project_runs_status_check" CHECK ("status" IN ('running', 'succeeded', 'failed', 'timeout', 'blocked'));

ALTER TABLE "project_requirements" ADD CONSTRAINT "project_requirements_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "portfolio_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_requirements" ADD CONSTRAINT "project_requirements_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "knowledge_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_workspaces" ADD CONSTRAINT "project_workspaces_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_workspaces" ADD CONSTRAINT "project_workspaces_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "portfolio_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_files" ADD CONSTRAINT "project_files_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "project_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_runs" ADD CONSTRAINT "project_runs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_runs" ADD CONSTRAINT "project_runs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "portfolio_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_runs" ADD CONSTRAINT "project_runs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "project_workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "portfolio_evidence" ADD CONSTRAINT "portfolio_evidence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "portfolio_evidence" ADD CONSTRAINT "portfolio_evidence_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "portfolio_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "portfolio_evidence" ADD CONSTRAINT "portfolio_evidence_runId_fkey" FOREIGN KEY ("runId") REFERENCES "project_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
