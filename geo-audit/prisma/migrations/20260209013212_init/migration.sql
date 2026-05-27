-- CreateEnum
CREATE TYPE "AnswerStatus" AS ENUM ('YES', 'NO', 'PARTIAL');

-- CreateEnum
CREATE TYPE "Importance" AS ENUM ('HIGH', 'MEDIUM');

-- CreateTable
CREATE TABLE "AuditRun" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "scope" TEXT,
    "status" TEXT NOT NULL,
    "score" INTEGER,
    "rawReport" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditSession" (
    "id" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "overallScore" INTEGER,
    "consistencyScore" INTEGER,
    "consistencyReport" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditPage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "pageOrder" INTEGER NOT NULL,
    "score" INTEGER,
    "clarityIndex" INTEGER,
    "rawReport" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditQuestion" (
    "id" TEXT NOT NULL,
    "auditRunId" TEXT,
    "auditPageId" TEXT,
    "question" TEXT NOT NULL,
    "answeredInDocs" "AnswerStatus" NOT NULL,
    "partialAnswer" TEXT,
    "importance" "Importance" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditRun_url_idx" ON "AuditRun"("url");

-- CreateIndex
CREATE INDEX "AuditRun_status_idx" ON "AuditRun"("status");

-- CreateIndex
CREATE INDEX "AuditRun_createdAt_idx" ON "AuditRun"("createdAt");

-- CreateIndex
CREATE INDEX "AuditSession_baseUrl_idx" ON "AuditSession"("baseUrl");

-- CreateIndex
CREATE INDEX "AuditSession_status_idx" ON "AuditSession"("status");

-- CreateIndex
CREATE INDEX "AuditSession_createdAt_idx" ON "AuditSession"("createdAt");

-- CreateIndex
CREATE INDEX "AuditPage_sessionId_idx" ON "AuditPage"("sessionId");

-- CreateIndex
CREATE INDEX "AuditPage_url_idx" ON "AuditPage"("url");

-- CreateIndex
CREATE INDEX "AuditPage_pageOrder_idx" ON "AuditPage"("pageOrder");

-- CreateIndex
CREATE INDEX "AuditPage_createdAt_idx" ON "AuditPage"("createdAt");

-- CreateIndex
CREATE INDEX "AuditPage_sessionId_pageOrder_idx" ON "AuditPage"("sessionId", "pageOrder");

-- CreateIndex
CREATE INDEX "AuditQuestion_auditRunId_idx" ON "AuditQuestion"("auditRunId");

-- CreateIndex
CREATE INDEX "AuditQuestion_auditPageId_idx" ON "AuditQuestion"("auditPageId");

-- AddForeignKey
ALTER TABLE "AuditPage" ADD CONSTRAINT "AuditPage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AuditSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditQuestion" ADD CONSTRAINT "AuditQuestion_auditRunId_fkey" FOREIGN KEY ("auditRunId") REFERENCES "AuditRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditQuestion" ADD CONSTRAINT "AuditQuestion_auditPageId_fkey" FOREIGN KEY ("auditPageId") REFERENCES "AuditPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
