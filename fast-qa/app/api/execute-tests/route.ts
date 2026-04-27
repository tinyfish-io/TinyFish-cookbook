import { NextRequest } from "next/server";
import { TinyFish, EventType, RunStatus } from "@tiny-fish/sdk";
import { generateTestResultSummary } from "@/lib/groq-client";
import type { TestCase, TestResult, TestEvent, QASettings } from "@/types";
import { generateId } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 300;

interface ExecuteTestsRequest {
  testCases: TestCase[];
  websiteUrl: string;
  parallelLimit?: number;
  settings?: Partial<QASettings>;
}

type AllCompleteEvent = {
  type: "all_complete";
  timestamp: number;
  summary: { total: number; passed: number; failed: number; skipped: number; duration: number };
};

const sseData = (payload: unknown) => `data: ${JSON.stringify(payload)}\n\n`;

export async function POST(request: NextRequest) {
  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) {
    return new Response(
      sseData({ type: "test_error", testCaseId: "system", timestamp: Date.now(), data: { error: "Missing TINYFISH_API_KEY" } }),
      { headers: { "Content-Type": "text/event-stream" } }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: TestEvent | AllCompleteEvent) => {
        controller.enqueue(encoder.encode(sseData(event)));
      };

      try {
        const body: ExecuteTestsRequest = await request.json();
        let { testCases, websiteUrl, parallelLimit = 3, settings } = body;
        parallelLimit = Math.max(1, Math.min(10, Math.floor(Number(parallelLimit) || 3)));

        if (!testCases?.length || !websiteUrl) {
          send({ type: "test_error", testCaseId: "system", timestamp: Date.now(), data: { error: "testCases and websiteUrl are required" } });
          return;
        }

        const startTime = Date.now();
        const results: TestResult[] = [];

        // Execute tests in batches based on parallelLimit
        const batches: TestCase[][] = [];
        for (let i = 0; i < testCases.length; i += parallelLimit) {
          batches.push(testCases.slice(i, i + parallelLimit));
        }

        for (const batch of batches) {
          const batchResults = await Promise.allSettled(
            batch.map((testCase) => executeTestCase(testCase, websiteUrl, apiKey, settings, send))
          );
          for (const r of batchResults) {
            if (r.status === "fulfilled") results.push(r.value);
          }
        }

        const passed = results.filter((r) => r.status === "passed").length;
        const failed = results.filter((r) => r.status === "failed" || r.status === "error").length;
        const skipped = results.filter((r) => r.status === "skipped").length;

        send({
          type: "all_complete",
          timestamp: Date.now(),
          summary: { total: results.length, passed, failed, skipped, duration: Date.now() - startTime },
        });
      } catch (error) {
        send({
          type: "test_error",
          testCaseId: "system",
          timestamp: Date.now(),
          data: { error: error instanceof Error ? error.message : "Unknown error" },
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

async function executeTestCase(
  testCase: TestCase,
  websiteUrl: string,
  apiKey: string,
  settings?: Partial<QASettings>,
  sendEvent?: (event: TestEvent) => void
): Promise<TestResult> {
  const testCaseId = testCase.id;
  const startTime = Date.now();
  const collectedSteps: string[] = [];
  let stepCount = 0;
  const totalSteps = 5;

  sendEvent?.({ type: "test_start", testCaseId, timestamp: startTime });

  try {
    const goal = buildGoal(testCase);
    const client = new TinyFish({ apiKey });
    let streamingUrl: string | undefined;

    const tfStream = await client.agent.stream({
      url: websiteUrl,
      goal,
      browser_profile: settings?.browserProfile ?? "lite",
      ...(settings?.proxyEnabled ? { proxy_config: { enabled: true, country_code: settings.proxyCountry ?? "US" } } : {}),
    });

    let agentResult: unknown = null;
    let agentSuccess = false;

    for await (const event of tfStream) {
      if (event.type === EventType.STREAMING_URL) {
        streamingUrl = event.streaming_url;
        sendEvent?.({ type: "streaming_url", testCaseId, timestamp: Date.now(), data: { streamingUrl } });
      } else if (event.type === EventType.PROGRESS) {
        stepCount++;
        collectedSteps.push(event.purpose);
        sendEvent?.({
          type: "step_progress",
          testCaseId,
          timestamp: Date.now(),
          data: { currentStep: Math.min(stepCount, totalSteps), totalSteps, stepDescription: event.purpose },
        });
      } else if (event.type === EventType.COMPLETE) {
        if (event.status === RunStatus.COMPLETED) {
          // COMPLETED only means the browser ran without crashing
          // — always validate result content, not just the status
          agentResult = event.result;
          agentSuccess = true;
        } else {
          agentResult = null;
          agentSuccess = false;
        }
        break;
      }
    }

    const completedAt = Date.now();
    const duration = completedAt - startTime;

    let success = agentSuccess;
    let error: string | undefined;
    let reason: string | undefined;
    let extractedData: Record<string, unknown> | undefined;

    if (agentResult && typeof agentResult === "object") {
      const r = agentResult as Record<string, unknown>;
      if ("success" in r) success = Boolean(r.success);
      if ("error" in r && typeof r.error === "string") error = r.error;
      if ("reason" in r && typeof r.reason === "string") reason = r.reason;
      if ("extractedData" in r) extractedData = r.extractedData as Record<string, unknown>;
    }

    // Generate AI summary if no explicit reason
    if (!reason) {
      try {
        reason = await generateTestResultSummary(
          { title: testCase.title, description: testCase.description, expectedOutcome: testCase.expectedOutcome },
          { status: success ? "passed" : "failed", steps: collectedSteps, error, duration },
          websiteUrl
        );
      } catch { reason = error; }
    }

    const testResult: TestResult = {
      id: generateId(),
      testCaseId,
      status: success ? "passed" : "failed",
      startedAt: startTime,
      completedAt,
      duration,
      streamingUrl,
      error,
      reason,
      steps: collectedSteps.length > 0 ? collectedSteps : undefined,
      extractedData,
    };

    sendEvent?.({ type: "test_complete", testCaseId, timestamp: completedAt, data: { result: testResult } });
    return testResult;
  } catch (err) {
    const completedAt = Date.now();
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    let errorReason: string | undefined;

    try {
      errorReason = await generateTestResultSummary(
        { title: testCase.title, description: testCase.description, expectedOutcome: testCase.expectedOutcome },
        { status: "error", steps: collectedSteps, error: errorMessage, duration: completedAt - startTime },
        websiteUrl
      );
    } catch { errorReason = errorMessage; }

    const testResult: TestResult = {
      id: generateId(),
      testCaseId,
      status: "error",
      startedAt: startTime,
      completedAt,
      duration: completedAt - startTime,
      error: errorMessage,
      reason: errorReason,
      steps: collectedSteps.length > 0 ? collectedSteps : undefined,
    };

    sendEvent?.({ type: "test_error", testCaseId, timestamp: completedAt, data: { error: errorMessage, result: testResult } });
    return testResult;
  }
}

function buildGoal(testCase: TestCase): string {
  let goal = testCase.description;
  if (testCase.expectedOutcome) {
    goal += `\n\nExpected outcome: ${testCase.expectedOutcome}`;
    goal += `\n\nAfter completing the steps, verify the expected outcome is met. Return JSON: { "success": true/false, "reason": "explanation" }`;
  }
  return goal;
}
