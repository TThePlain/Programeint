-- CreateTable
CREATE TABLE "learning_resources" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publisher" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "license" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "summary" TEXT NOT NULL,
    "official" BOOLEAN NOT NULL DEFAULT true,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "lastCheckedAt" TIMESTAMP(3),
    "lastStatus" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_nodes" (
    "resourceId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,

    CONSTRAINT "resource_nodes_pkey" PRIMARY KEY ("resourceId","nodeId")
);

-- CreateIndex
CREATE UNIQUE INDEX "learning_resources_slug_key" ON "learning_resources"("slug");

-- CreateIndex
CREATE INDEX "resource_nodes_nodeId_idx" ON "resource_nodes"("nodeId");

-- AddForeignKey
ALTER TABLE "resource_nodes" ADD CONSTRAINT "resource_nodes_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "learning_resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_nodes" ADD CONSTRAINT "resource_nodes_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "knowledge_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
