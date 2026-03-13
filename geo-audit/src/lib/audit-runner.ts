import { randomUUID } from "crypto";
import { prisma } from "@/db/prisma";
import { AnswerStatus, Importance } from "@/generated/prisma/client";
import { computeGeoScore } from "@/lib/scoring";
import { runTinyFishAnalysis } from "@/lib/tinyfish";
import { runOpenAiCleanup } from "@/lib/openai";
import { discoverSitemapUrls } from "@/lib/sitemap";
import { computeConsistency } from "@/lib/consistency";
import { computeLlmoScore } from "@/lib/llmo-scoring";
import {
  collectMachineReadabilitySignals,
  collectPageLlmoSignals,
} from "@/lib/llmo-signals";
import type { LlmoScoreResult } from "@/lib/llmo-types";

type AuditPayload = {
  url: string;
  scope?: string;
  sitemap?: boolean;
  useOpenAiCleanup: boolean;
};

type PageResult = {
  url: string;
  score: number;
  overallLlmoScore: number;
  clarityIndex: number;
  createdAt: Date;
  importanceBreakdown: ReturnType<typeof computeGeoScore>["importanceBreakdown"];
  llmoBreakdown: LlmoScoreResult["llmoBreakdown"];
  llmoFindings: LlmoScoreResult["llmoFindings"];
  questions: Array<{
    question: string;
    answeredInDocs: "YES" | "NO" | "PARTIAL";
    partialAnswer: string | null;
    importance: "HIGH" | "MEDIUM";
  }>;
};

type RunAuditConfig = {
  maxSitemapPages: number;
  concurrencyLimit: number;
  tinyfishTimeoutMs: number;
  tinyfishRetries: number;
};

function mapAnswerStatus(value: string): AnswerStatus {
  if (value === "partial") return AnswerStatus.PARTIAL;
  if (value === "true") return AnswerStatus.YES;
  return AnswerStatus.NO;
}

function mapImportance(value: string): Importance {
  return value === "high" ? Importance.HIGH : Importance.MEDIUM;
}

export async function runAuditJob(payload: AuditPayload, config: RunAuditConfig) {
  const {
    url,
    scope,
    sitemap,
    useOpenAiCleanup,
  } = payload;
  const { maxSitemapPages, concurrencyLimit, tinyfishTimeoutMs, tinyfishRetries } =
    config;

  if (sitemap) {
    const sitemapResult = await discoverSitemapUrls(url, maxSitemapPages);
    if (!sitemapResult.urls.length) {
      return {
        status: 400,
        body: { error: "No URLs found in sitemap" },
      } as const;
    }

    const pageErrors: Array<{ url: string; error: string }> = [];
    const machineSignals = await collectMachineReadabilitySignals(url);

    async function analyzePage(pageUrl: string, index: number) {
      let analysis = await runTinyFishAnalysis(pageUrl, {
        timeoutMs: tinyfishTimeoutMs,
        maxRetries: tinyfishRetries,
      });
      const pageSignals = await collectPageLlmoSignals(pageUrl);
      if (useOpenAiCleanup) {
        try {
          analysis = await runOpenAiCleanup(analysis);
        } catch {
          // Fallback to TinyFish analysis if cleanup fails.
        }
      }
      if (!Array.isArray(analysis.selfGeneratedQuestions) || analysis.selfGeneratedQuestions.length === 0) {
        throw new Error("Analysis returned no questions");
      }
      const breakdown = computeGeoScore(analysis.selfGeneratedQuestions);
      const llmo = computeLlmoScore({
        coverageScore: breakdown.score,
        signals: {
          ...pageSignals,
          machineReadability: machineSignals,
        },
      });
      return { pageUrl, index, analysis, breakdown, llmo };
    }

    const pages = sitemapResult.urls.slice(0, maxSitemapPages);
    const analyzedPages: Array<
      ReturnType<typeof analyzePage> extends Promise<infer T> ? T : never
    > = [];

    for (let i = 0; i < pages.length; i += concurrencyLimit) {
      const batch = pages.slice(i, i + concurrencyLimit);
      const results = await Promise.all(
        batch.map(async (pageUrl, idx) => {
          try {
            const result = await analyzePage(pageUrl, i + idx);
            return { ok: true as const, result };
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "Analysis failed";
            return { ok: false as const, url: pageUrl, error: message };
          }
        })
      );

      for (const result of results) {
        if (result.ok) {
          analyzedPages.push(result.result);
        } else {
          pageErrors.push({ url: result.url, error: result.error });
        }
      }
    }

    if (!analyzedPages.length) {
      return {
        status: 502,
        body: { error: "All sitemap pages failed to analyze", pageErrors },
      } as const;
    }

    const pageResults: PageResult[] = analyzedPages.map((page) => ({
      url: page.pageUrl,
      score: page.breakdown.score,
      overallLlmoScore: page.llmo.overallLlmoScore,
      clarityIndex: page.breakdown.clarityIndex,
      createdAt: new Date(),
      importanceBreakdown: page.breakdown.importanceBreakdown,
      llmoBreakdown: page.llmo.llmoBreakdown,
      llmoFindings: page.llmo.llmoFindings,
      questions: page.analysis.selfGeneratedQuestions.map((q) => ({
        question: q.question,
        answeredInDocs: mapAnswerStatus(q.answeredInDocs),
        partialAnswer: q.partialAnswer ?? null,
        importance: mapImportance(q.importance),
      })),
    }));

    const overallScore = Math.round(
      pageResults.reduce((sum, page) => sum + page.score, 0) /
        pageResults.length
    );
    const overallClarity = Math.round(
      pageResults.reduce((sum, page) => sum + page.clarityIndex, 0) /
        pageResults.length
    );
    const overallLlmoScore = Math.round(
      pageResults.reduce((sum, page) => sum + page.overallLlmoScore, 0) /
        pageResults.length
    );

    const consistencyReport = computeConsistency(
      pageResults.map((page) => ({
        url: page.url,
        questions: page.questions.map((q) => ({
          question: q.question,
          answeredInDocs: q.answeredInDocs,
          partialAnswer: q.partialAnswer,
          importance: q.importance,
        })),
      }))
    );

    let sessionId: string = randomUUID();
    try {
      const session = await prisma.auditSession.create({
        data: {
          baseUrl: url,
          status: "IN_PROGRESS",
        },
      });
      sessionId = session.id;

      await prisma.$transaction(async (tx) => {
        for (const page of analyzedPages) {
          const created = await tx.auditPage.create({
            data: {
              sessionId: session.id,
              url: page.pageUrl,
              pageOrder: page.index,
              score: page.breakdown.score,
              clarityIndex: page.breakdown.clarityIndex,
              rawReport: page.analysis,
            },
          });

          const questions = page.analysis.selfGeneratedQuestions.map((q) => ({
            auditPageId: created.id,
            question: q.question,
            answeredInDocs: mapAnswerStatus(q.answeredInDocs),
            partialAnswer: q.partialAnswer ?? null,
            importance: mapImportance(q.importance),
          }));

          if (questions.length) {
            await tx.auditQuestion.createMany({ data: questions });
          }
        }
      });

      await prisma.auditSession.update({
        where: { id: session.id },
        data: {
          status: pageErrors.length ? "COMPLETED_WITH_ERRORS" : "COMPLETED",
          overallScore,
          consistencyScore: consistencyReport.consistencyScore,
          consistencyReport,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to persist audit";
      console.warn(
        JSON.stringify({
          event: "audit_persist_failed",
          error: message,
        })
      );
    }

    const responseBody = {
      mode: "multi",
      sessionId,
      baseUrl: url,
      overallScore,
      overallLlmoScore,
      clarityIndex: overallClarity,
      pages: pageResults,
      pageErrors,
      consistency: consistencyReport,
      sitemapInfo: {
        totalUrlsFound: sitemapResult.totalFound,
        urlsAudited: pages.length,
        urlsTruncated: sitemapResult.totalFound > pages.length,
        urls: pages,
      },
    };

    return { status: 200, body: responseBody } as const;
  }

  let analysis = await runTinyFishAnalysis(url, {
    timeoutMs: tinyfishTimeoutMs,
    maxRetries: tinyfishRetries,
  });
  if (useOpenAiCleanup) {
    try {
      analysis = await runOpenAiCleanup(analysis);
    } catch {
      // Fallback to TinyFish analysis if cleanup fails.
    }
  }
  if (!Array.isArray(analysis.selfGeneratedQuestions) || analysis.selfGeneratedQuestions.length === 0) {
    return {
      status: 502,
      body: {
        error:
          "Audit analysis did not return any questions. Please retry or adjust the URL/scope.",
      },
    } as const;
  }
  const breakdown = computeGeoScore(analysis.selfGeneratedQuestions);
  const pageSignals = await collectPageLlmoSignals(url);
  const machineSignals = await collectMachineReadabilitySignals(url);
  const llmo = computeLlmoScore({
    coverageScore: breakdown.score,
    signals: {
      ...pageSignals,
      machineReadability: machineSignals,
    },
  });

  const questions = analysis.selfGeneratedQuestions.map((q) => ({
    question: q.question,
    answeredInDocs: mapAnswerStatus(q.answeredInDocs),
    partialAnswer: q.partialAnswer ?? null,
    importance: mapImportance(q.importance),
  }));
  let runId: string = randomUUID();
  let createdAt = new Date();

  try {
    const run = await prisma.auditRun.create({
      data: {
        url,
        scope,
        status: "COMPLETED",
        score: breakdown.score,
        rawReport: analysis,
      },
    });
    runId = run.id;
    createdAt = run.createdAt;

    if (questions.length) {
      await prisma.auditQuestion.createMany({
        data: questions.map((q) => ({
          auditRunId: run.id,
          question: q.question,
          answeredInDocs: q.answeredInDocs,
          partialAnswer: q.partialAnswer ?? null,
          importance: q.importance,
        })),
      });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to persist audit";
    console.warn(
      JSON.stringify({
        event: "audit_persist_failed",
        error: message,
      })
    );
  }

  const responseBody = {
    mode: "single",
    id: runId,
    url,
    createdAt,
    score: breakdown.score,
    overallLlmoScore: llmo.overallLlmoScore,
    clarityIndex: breakdown.clarityIndex,
    importanceBreakdown: breakdown.importanceBreakdown,
    llmoBreakdown: llmo.llmoBreakdown,
    llmoFindings: llmo.llmoFindings,
    questions,
  };

  return { status: 200, body: responseBody } as const;
}
