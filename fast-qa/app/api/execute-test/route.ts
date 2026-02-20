/**
 * POST /api/execute-test - Execute a SINGLE test case against Mino via SSE streaming
 * 
 * This endpoint now returns a streaming SSE response that proxies Mino's events
 * to the client in real-time. This avoids Vercel timeout limits since streaming
 * responses don't count against execution time once the first byte is sent.
 * 
 * Uses Edge Runtime for compatibility with ReadableStream.
 */

export const runtime = 'edge';

import type { TestCase, TestResult, QASettings } from '@/types';
import { generateId, parseSSELine, isCompleteEvent, isErrorEvent, formatStepMessage } from '@/lib/utils';
import { generateTestResultSummary } from '@/lib/ai-client';

interface ExecuteTestRequest {
  testCase: TestCase;
  websiteUrl: string;
  settings?: Partial<QASettings>;
}

const MINO_API_URL = "https://mino.ai/v1/automation/run-sse";

export async function POST(request: Request) {
  try {
    const body: ExecuteTestRequest = await request.json();
    const { testCase, websiteUrl, settings } = body;

    if (!testCase) {
      return Response.json({ error: 'No test case provided' }, { status: 400 });
    }

    if (!websiteUrl) {
      return Response.json({ error: 'No website URL provided' }, { status: 400 });
    }

    const apiKey = process.env.MINO_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'MINO_API_KEY not configured' }, { status: 500 });
    }

    // Build the goal from test case
    let goal = testCase.description;
    if (testCase.expectedOutcome) {
      goal += `\n\nExpected outcome: ${testCase.expectedOutcome}`;
      goal += `\n\nAfter completing the steps, verify that the expected outcome is met. Return a JSON object with { "success": true/false, "reason": "explanation" }`;
    }

    const minoConfig = {
      url: websiteUrl,
      goal,
      browser_profile: settings?.browserProfile || 'lite',
      proxy_config: settings?.proxyEnabled
        ? {
            enabled: true,
            country_code: settings.proxyCountry || 'US',
          }
        : undefined,
    };

    // Create a readable stream that proxies Mino's SSE events
    const stream = new ReadableStream({
      async start(controller) {
        const startTime = Date.now();
        const collectedSteps: string[] = [];
        let streamingUrl: string | undefined;

        try {
          // Start the Mino automation request
          const minoResponse = await fetch(MINO_API_URL, {
            method: 'POST',
            headers: {
              'X-API-Key': apiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(minoConfig),
          });

          if (!minoResponse.ok) {
            const errorText = await minoResponse.text();
            throw new Error(`Mino API request failed: ${minoResponse.status} ${errorText}`);
          }

          if (!minoResponse.body) {
            throw new Error('Mino response body is null');
          }

          // Send initial event to client
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({
            type: 'test_start',
            testCaseId: testCase.id,
            timestamp: Date.now(),
          })}\n\n`));

          const reader = minoResponse.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              const event = parseSSELine(line);
              if (!event) continue;

              // Capture streaming URL
              if (event.streamingUrl && !streamingUrl) {
                streamingUrl = event.streamingUrl;
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({
                  type: 'streaming_url',
                  testCaseId: testCase.id,
                  timestamp: Date.now(),
                  data: { streamingUrl: event.streamingUrl },
                })}\n\n`));
              }

              // Handle step events
              if (event.type === 'STEP') {
                const stepMessage = formatStepMessage(event);
                collectedSteps.push(stepMessage);
                
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({
                  type: 'step_progress',
                  testCaseId: testCase.id,
                  timestamp: Date.now(),
                  data: { 
                    stepDescription: stepMessage,
                    currentStep: collectedSteps.length,
                  },
                })}\n\n`));
              }

              // Check for completion
              if (isCompleteEvent(event)) {
                const completedAt = Date.now();
                const duration = completedAt - startTime;

                // Determine success from Mino response
                let success = true;
                let error: string | undefined;
                let reason: string | undefined;
                let extractedData: Record<string, unknown> | undefined;

                if (event.resultJson && typeof event.resultJson === 'object') {
                  const result = event.resultJson as Record<string, unknown>;
                  if ('success' in result) success = Boolean(result.success);
                  if ('error' in result && typeof result.error === 'string') error = result.error;
                  if ('reason' in result && typeof result.reason === 'string') reason = result.reason;
                  if ('extractedData' in result) extractedData = result.extractedData as Record<string, unknown>;
                }

                // Generate AI summary if needed
                if (!reason || reason === error) {
                  try {
                    reason = await generateTestResultSummary(
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
                  } catch (summaryError) {
                    console.error('Failed to generate AI summary:', summaryError);
                  }
                }

                const testResult: TestResult = {
                  id: generateId(),
                  testCaseId: testCase.id,
                  status: success ? 'passed' : 'failed',
                  startedAt: startTime,
                  completedAt,
                  duration,
                  streamingUrl,
                  error,
                  reason,
                  steps: collectedSteps.length > 0 ? collectedSteps : undefined,
                  extractedData,
                };

                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({
                  type: 'test_complete',
                  testCaseId: testCase.id,
                  timestamp: Date.now(),
                  data: { result: testResult },
                })}\n\n`));

                controller.close();
                return;
              }

              // Check for errors
              if (isErrorEvent(event)) {
                const completedAt = Date.now();
                const duration = completedAt - startTime;
                const errorMsg = event.message || 'Automation failed';

                const testResult: TestResult = {
                  id: generateId(),
                  testCaseId: testCase.id,
                  status: 'failed',
                  startedAt: startTime,
                  completedAt,
                  duration,
                  streamingUrl,
                  error: errorMsg,
                  reason: errorMsg,
                  steps: collectedSteps.length > 0 ? collectedSteps : undefined,
                };

                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({
                  type: 'test_error',
                  testCaseId: testCase.id,
                  timestamp: Date.now(),
                  data: { result: testResult, error: errorMsg },
                })}\n\n`));

                controller.close();
                return;
              }
            }
          }

          // If we reach here without completion, it's an unexpected end
          const testResult: TestResult = {
            id: generateId(),
            testCaseId: testCase.id,
            status: 'error',
            startedAt: startTime,
            completedAt: Date.now(),
            duration: Date.now() - startTime,
            streamingUrl,
            error: 'Stream ended without completion event',
            steps: collectedSteps.length > 0 ? collectedSteps : undefined,
          };

          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({
            type: 'test_error',
            testCaseId: testCase.id,
            timestamp: Date.now(),
            data: { result: testResult, error: 'Stream ended unexpectedly' },
          })}\n\n`));

          controller.close();
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          
          const testResult: TestResult = {
            id: generateId(),
            testCaseId: testCase.id,
            status: 'error',
            startedAt: startTime,
            completedAt: Date.now(),
            duration: Date.now() - startTime,
            streamingUrl,
            error: errorMsg,
            steps: collectedSteps.length > 0 ? collectedSteps : undefined,
          };

          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({
            type: 'test_error',
            testCaseId: testCase.id,
            timestamp: Date.now(),
            data: { result: testResult, error: errorMsg },
          })}\n\n`));

          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err) {
    console.error('Error in execute-test API:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
