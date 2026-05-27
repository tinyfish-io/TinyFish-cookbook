import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { runTinyFishAgentWithStream } from "@/app/lib/tinyfish";
import {
  TEST_SUITES,
  calculateFinalScore,
  compileTopFixes,
  TestResult,
} from "@/app/lib/tests";
import {
  pushAuditEvent,
  storeAudit,
  updateLeaderboard,
  cleanupAudit,
  getLatestAudit,
} from "@/app/lib/redis";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url.startsWith("http") ? url : `https://${url}`);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const domain = parsedUrl.hostname;
    const fullUrl = parsedUrl.toString();
    const auditId = uuidv4();

    // Get previous score for before/after comparison
    let previousScore: number | null = null;
    try {
      const previousAudit = await getLatestAudit(domain);
      if (previousAudit) {
        previousScore = previousAudit.score;
      }
    } catch {
      // Ignore — previous audit lookup is best-effort
    }

    // Push initial queued events for all tests
    for (const test of TEST_SUITES) {
      pushAuditEvent(auditId, {
        testId: test.id,
        status: "queued",
        message: `Waiting to start ${test.name}...`,
        timestamp: Date.now(),
      });
    }

    // Run all 5 tests in parallel (don't await here — let them run in background)
    runAllTests(auditId, fullUrl, domain, previousScore).catch((error) => {
      console.error("Audit failed:", error);
      pushAuditEvent(auditId, {
        testId: "system",
        status: "error",
        message: `Audit failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: Date.now(),
      });
    });

    return NextResponse.json({
      auditId,
      url: fullUrl,
      domain,
      tests: TEST_SUITES.map((t) => ({ id: t.id, name: t.name, description: t.description, icon: t.icon })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

async function runAllTests(auditId: string, url: string, domain: string, previousScore: number | null) {
  const testResults: Record<string, TestResult> = {};

  // Run all tests in parallel
  const promises = TEST_SUITES.map(async (test) => {
    // Mark test as running
    pushAuditEvent(auditId, {
      testId: test.id,
      status: "running",
      message: `Running ${test.name}...`,
      timestamp: Date.now(),
    });

    try {
      // Call TinyFish agent with streaming callback to capture live preview URL immediately
      const goal = test.buildGoal(url);
      const result = await runTinyFishAgentWithStream(
        { url, goal },
        (tfEvent) => {
          // Forward PROGRESS events to the live activity feed
          if (tfEvent.type === "PROGRESS" && tfEvent.purpose) {
            pushAuditEvent(auditId, {
              testId: test.id,
              status: "running",
              message: tfEvent.purpose,
              timestamp: Date.now(),
            });
          }

          // Notify client as soon as TinyFish finishes (before local scoring)
          if (tfEvent.type === "COMPLETE" && tfEvent.status === "COMPLETED") {
            pushAuditEvent(auditId, {
              testId: test.id,
              status: "running",
              message: `${test.name} agent done, scoring results...`,
              timestamp: Date.now(),
            });
          }
        }
      );

      if (!result.success || !result.data) {
        const errorMsg = result.error || "Agent returned no data";
        const isApiError = classifyApiError(errorMsg);
        pushAuditEvent(auditId, {
          testId: test.id,
          status: "error",
          message: `${test.name} failed: ${isApiError.userMessage}`,
          data: { isApiError: isApiError.isApi },
          timestamp: Date.now(),
        });
        testResults[test.id] = {
          subscore: 0,
          passed: [],
          failed: [`Test failed: ${isApiError.userMessage}`],
          issues: [errorMsg],
          fixes: [isApiError.isApi
            ? isApiError.userMessage
            : "Ensure the site is accessible and not blocking automated browsers."],
        };
        return;
      }

      // Score the results
      const scored = test.score(result.data);
      testResults[test.id] = scored;

      // Push result event
      pushAuditEvent(auditId, {
        testId: test.id,
        status: scored.subscore >= 60 ? "pass" : "fail",
        message: `${test.name}: ${scored.subscore}/100`,
        subscore: scored.subscore,
        data: {
          passed: scored.passed,
          failed: scored.failed,
          issues: scored.issues,
          fixes: scored.fixes,
        },
        timestamp: Date.now(),
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      const isApiError = classifyApiError(errorMsg);
      pushAuditEvent(auditId, {
        testId: test.id,
        status: "error",
        message: `${test.name} error: ${isApiError.userMessage}`,
        data: { isApiError: isApiError.isApi },
        timestamp: Date.now(),
      });
      testResults[test.id] = {
        subscore: 0,
        passed: [],
        failed: [`Error: ${isApiError.userMessage}`],
        issues: [errorMsg],
        fixes: [],
      };
    }
  });

  // Wait for all tests to complete
  await Promise.all(promises);

  // Calculate final score
  const { score, grade, gradeColor } = calculateFinalScore(testResults);
  const topFixes = compileTopFixes(testResults);

  // Build full audit result
  const auditResult = {
    url,
    domain,
    score,
    grade,
    gradeColor,
    tests: Object.fromEntries(
      TEST_SUITES.map((t) => [
        t.id,
        {
          ...testResults[t.id],
          name: t.name,
          description: t.description,
          icon: t.icon,
        },
      ])
    ),
    topFixes,
    timestamp: new Date().toISOString(),
  };

  // Store in Redis
  await storeAudit(domain, auditResult);
  await updateLeaderboard(domain, score);

  // Push completion event (include previousScore for before/after comparison)
  pushAuditEvent(auditId, {
    testId: "complete",
    status: "pass",
    message: `Audit complete: ${score}/100 (${grade})`,
    subscore: score,
    data: { ...auditResult, previousScore } as unknown as Record<string, unknown>,
    timestamp: Date.now(),
  });

  // Schedule cleanup
  cleanupAudit(auditId);
}

function classifyApiError(errorMsg: string): { isApi: boolean; userMessage: string } {
  const lower = errorMsg.toLowerCase();

  if (!process.env.TINYFISH_API_KEY) {
    return { isApi: true, userMessage: "TINYFISH_API_KEY not configured in .env.local" };
  }
  if (lower.includes("403") || lower.includes("forbidden")) {
    return { isApi: true, userMessage: "Check TINYFISH_API_KEY is valid and has remaining credits" };
  }
  if (lower.includes("401") || lower.includes("unauthorized")) {
    return { isApi: true, userMessage: "TINYFISH_API_KEY may be invalid or expired" };
  }
  if (lower.includes("429") || lower.includes("rate limit")) {
    return { isApi: true, userMessage: "Rate limit exceeded, wait and retry" };
  }

  return { isApi: false, userMessage: errorMsg };
}
