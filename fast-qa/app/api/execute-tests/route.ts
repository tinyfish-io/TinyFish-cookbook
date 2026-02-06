import { NextRequest } from 'next/server';
import { runMinoAutomation } from '@/lib/mino-client';
import { generateTestResultSummary } from '@/lib/ai-client';
import type { TestCase, TestResult, TestEvent, QASettings } from '@/types';
import { generateId } from '@/lib/utils';

interface ExecuteTestsRequest {
  testCases: TestCase[];
  websiteUrl: string;
  parallelLimit?: number;
  settings?: Partial<QASettings>;
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  // Create a TransformStream for SSE
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  let isClosed = false;

  const sendEvent = async (event: TestEvent | { type: 'all_complete'; timestamp: number; summary: { total: number; passed: number; failed: number; skipped: number; duration: number } }) => {
    if (isClosed) return;
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
    } catch {
      isClosed = true;
    }
  };

  const closeWriter = async () => {
    if (isClosed) return;
    try {
      isClosed = true;
      await writer.close();
    } catch {
      // Already closed
    }
  };

  // Start processing in the background
  (async () => {
    try {
      const body: ExecuteTestsRequest = await request.json();
      let { testCases, websiteUrl, parallelLimit = 3, settings } = body;
      
      // Validate and sanitize parallelLimit to prevent infinite loops
      parallelLimit = Math.max(1, Math.min(10, Math.floor(Number(parallelLimit) || 3)));

      if (!testCases || testCases.length === 0) {
        await sendEvent({
          type: 'test_error',
          testCaseId: 'system',
          timestamp: Date.now(),
          data: { error: 'No test cases provided' },
        });
        await closeWriter();
        return;
      }

      if (!websiteUrl) {
        await sendEvent({
          type: 'test_error',
          testCaseId: 'system',
          timestamp: Date.now(),
          data: { error: 'No website URL provided' },
        });
        await closeWriter();
        return;
      }

      const apiKey = process.env.MINO_API_KEY;
      if (!apiKey) {
        await sendEvent({
          type: 'test_error',
          testCaseId: 'system',
          timestamp: Date.now(),
          data: { error: 'MINO_API_KEY not configured' },
        });
        await closeWriter();
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
        // Execute batch in parallel
        const batchPromises = batch.map(async (testCase) => {
          const result = await executeTestCase(testCase, websiteUrl, apiKey, settings, sendEvent);
          results.push(result);
          return result;
        });

        await Promise.all(batchPromises);
      }

      // Calculate summary
      const passed = results.filter((r) => r.status === 'passed').length;
      const failed = results.filter((r) => r.status === 'failed' || r.status === 'error').length;
      const skipped = results.filter((r) => r.status === 'skipped').length;

      await sendEvent({
        type: 'all_complete',
        timestamp: Date.now(),
        summary: {
          total: results.length,
          passed,
          failed,
          skipped,
          duration: Date.now() - startTime,
        },
      });
    } catch (error) {
      console.error('Error in execute-tests API:', error);
      await sendEvent({
        type: 'test_error',
        testCaseId: 'system',
        timestamp: Date.now(),
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
    } finally {
      await closeWriter();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

async function executeTestCase(
  testCase: TestCase,
  websiteUrl: string,
  apiKey: string,
  settings?: Partial<QASettings>,
  sendEvent?: (event: TestEvent) => Promise<void>
): Promise<TestResult> {
  const testCaseId = testCase.id;
  const startTime = Date.now();

  // Track step progress and collect all steps (outside try so catch can access)
  let stepCount = 0;
  const totalSteps = 5; // Estimate for progress UI
  const collectedSteps: string[] = [];

  // Send test start event
  await sendEvent?.({
    type: 'test_start',
    testCaseId,
    timestamp: startTime,
  });

  try {
    // Build the goal for Mino from the test description and expected outcome
    const goal = buildGoalFromTestCase(testCase);

    // Execute with Mino
    const minoResponse = await runMinoAutomation(
      {
        url: websiteUrl,
        goal,
        browser_profile: settings?.browserProfile || 'lite',
        proxy_config: settings?.proxyEnabled
          ? {
              enabled: true,
              country_code: settings.proxyCountry || 'US',
            }
          : undefined,
      },
      apiKey,
      {
        onStreamingUrl: async (streamingUrl) => {
          await sendEvent?.({
            type: 'streaming_url',
            testCaseId,
            timestamp: Date.now(),
            data: { streamingUrl },
          });
        },
        onStep: async (step) => {
          stepCount++;
          collectedSteps.push(step);
          await sendEvent?.({
            type: 'step_progress',
            testCaseId,
            timestamp: Date.now(),
            data: {
              currentStep: Math.min(stepCount, totalSteps),
              totalSteps,
              stepDescription: step,
            },
          });
        },
      }
    );

    const completedAt = Date.now();
    const duration = completedAt - startTime;

    // Determine success from Mino response
    let success = minoResponse.success;
    let error: string | undefined;
    let reason: string | undefined;
    let extractedData: Record<string, unknown> | undefined;

    // Parse result if available
    if (minoResponse.result && typeof minoResponse.result === 'object') {
      const result = minoResponse.result as Record<string, unknown>;
      if ('success' in result) {
        success = Boolean(result.success);
      }
      if ('error' in result && typeof result.error === 'string') {
        error = result.error;
      }
      if ('reason' in result && typeof result.reason === 'string') {
        reason = result.reason;
      }
      if ('extractedData' in result) {
        extractedData = result.extractedData as Record<string, unknown>;
      }
    }

    if (!success && minoResponse.error) {
      error = minoResponse.error;
    }

    // If no explicit reason but we have an error, use error as the reason
    if (!reason && error) {
      reason = error;
    }

    // Generate detailed AI summary if we don't have a good reason from Mino
    if (!reason || reason === error) {
      try {
        const aiSummary = await generateTestResultSummary(
          {
            title: testCase.title,
            description: testCase.description,
            expectedOutcome: testCase.expectedOutcome,
          },
          {
            status: success ? 'passed' : 'failed',
            steps: collectedSteps,
            error,
            duration,
          },
          websiteUrl
        );
        reason = aiSummary;
      } catch (summaryError) {
        console.error('Failed to generate AI summary:', summaryError);
        // Keep the existing reason or error
      }
    }

    const testResult: TestResult = {
      id: generateId(),
      testCaseId,
      status: success ? 'passed' : 'failed',
      startedAt: startTime,
      completedAt,
      duration,
      streamingUrl: minoResponse.streamingUrl,
      error,
      reason,
      steps: collectedSteps.length > 0 ? collectedSteps : undefined,
      extractedData,
    };

    await sendEvent?.({
      type: 'test_complete',
      testCaseId,
      timestamp: completedAt,
      data: { result: testResult },
    });

    return testResult;
  } catch (error) {
    const completedAt = Date.now();
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDuration = completedAt - startTime;

    // Try to generate an AI summary for the error
    let errorReason: string | undefined;
    try {
      errorReason = await generateTestResultSummary(
        {
          title: testCase.title,
          description: testCase.description,
          expectedOutcome: testCase.expectedOutcome,
        },
        {
          status: 'error',
          steps: collectedSteps,
          error: errorMessage,
          duration: errorDuration,
        },
        websiteUrl
      );
    } catch {
      errorReason = errorMessage;
    }

    const testResult: TestResult = {
      id: generateId(),
      testCaseId,
      status: 'error',
      startedAt: startTime,
      completedAt,
      duration: errorDuration,
      error: errorMessage,
      reason: errorReason,
      steps: collectedSteps.length > 0 ? collectedSteps : undefined,
    };

    await sendEvent?.({
      type: 'test_error',
      testCaseId,
      timestamp: completedAt,
      data: { error: errorMessage, result: testResult },
    });

    return testResult;
  }
}

function buildGoalFromTestCase(testCase: TestCase): string {
  let goal = testCase.description;

  if (testCase.expectedOutcome) {
    goal += `\n\nExpected outcome: ${testCase.expectedOutcome}`;
    goal += `\n\nAfter completing the steps, verify that the expected outcome is met. Return a JSON object with { "success": true/false, "reason": "explanation" }`;
  }

  return goal;
}
