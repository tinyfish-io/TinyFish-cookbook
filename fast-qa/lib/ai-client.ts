import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateObject, generateText } from 'ai';
import { z } from 'zod';

// Create OpenRouter provider
function createOpenRouterProvider() {
  return createOpenAICompatible({
    name: 'openrouter',
    baseURL: 'https://openrouter.ai/api/v1',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://qa-tester.vercel.app',
      'X-Title': 'QA Testing Dashboard',
    },
  });
}

// Get model via OpenRouter
export function getModel(modelId: string = 'minimax/minimax-m2.1') {
  const openrouter = createOpenRouterProvider();
  return openrouter.chatModel(modelId);
}

// Test step schema
const testStepSchema = z.object({
  id: z.string(),
  action: z.enum(['navigate', 'click', 'type', 'wait', 'extract', 'assert', 'scroll', 'hover', 'select']),
  target: z.string().optional(),
  value: z.string().optional(),
  goal: z.string(),
  expectedOutcome: z.string().optional(),
});

// Parse test response schema
const parseTestSchema = z.object({
  steps: z.array(testStepSchema),
  suggestedTitle: z.string().optional(),
  suggestedCategory: z.enum(['smoke', 'regression', 'functional', 'e2e', 'accessibility', 'performance', 'custom']).optional(),
});

// Bug report schema
const bugReportSchema = z.object({
  title: z.string(),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  description: z.string(),
  stepsToReproduce: z.array(z.string()),
  expectedBehavior: z.string(),
  actualBehavior: z.string(),
  environment: z.string().optional(),
  additionalNotes: z.string().optional(),
});

export type ParseTestResponse = z.infer<typeof parseTestSchema>;
export type BugReport = z.infer<typeof bugReportSchema>;

/**
 * Parse plain English test description into structured steps
 */
export async function parseTestDescription(
  plainEnglish: string,
  websiteUrl: string,
  options?: { modelId?: string }
): Promise<ParseTestResponse> {
  const model = getModel(options?.modelId);

  const system = `You are a QA test automation expert. Your job is to convert plain English test descriptions into structured test steps that can be executed by a browser automation tool.

Each step should have:
- id: A unique identifier (use format "step-1", "step-2", etc.)
- action: One of: navigate, click, type, wait, extract, assert, scroll, hover, select
- target: Description of the element to interact with (use visual descriptions, not CSS selectors)
- value: Value to type, or expected value for assertions
- goal: Clear natural language description of what this step does
- expectedOutcome: What should happen after this step (optional)

Guidelines:
- Break down complex actions into simple, atomic steps
- Use visual descriptions for targets (e.g., "the blue Submit button", "the email input field")
- Include appropriate wait steps between actions if needed
- Add assertions to verify expected outcomes`;

  const prompt = `Convert this test description into structured test steps:

Website URL: ${websiteUrl}

Test Description:
${plainEnglish}

Return a JSON object with:
- steps: Array of test steps
- suggestedTitle: A concise title for this test case
- suggestedCategory: One of: smoke, regression, functional, e2e, accessibility, performance, custom`;

  try {
    const { object } = await generateObject({
      model,
      schema: parseTestSchema,
      system,
      prompt,
    });
    return object;
  } catch (error) {
    // Fallback to generateText with JSON parsing
    console.log('generateObject failed, falling back to generateText:', error);

    const { text } = await generateText({
      model,
      system: system + '\n\nIMPORTANT: Respond with valid JSON only. No markdown, no code blocks.',
      prompt,
    });

    const jsonMatch = text.match(/[\[{][\s\S]*[\]}]/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return parseTestSchema.parse(parsed);
  }
}

/**
 * Generate a bug report from a failed test
 */
export async function generateBugReport(
  testCase: {
    title: string;
    description: string;
    expectedOutcome?: string;
  },
  testResult: {
    error?: string;
    extractedData?: Record<string, unknown>;
  },
  projectUrl: string,
  options?: { modelId?: string }
): Promise<BugReport> {
  // Use GPT-4o-mini which has better JSON support
  const model = getModel(options?.modelId || 'openai/gpt-4o-mini');

  const system = `You are a QA engineer writing professional bug reports. Create clear, actionable bug reports.

IMPORTANT: You MUST respond with ONLY a valid JSON object. No markdown, no explanations, no code blocks.

The JSON must have this exact structure:
{
  "title": "Brief bug title",
  "severity": "critical" | "high" | "medium" | "low",
  "description": "Clear description of the bug",
  "stepsToReproduce": ["Step 1", "Step 2", ...],
  "expectedBehavior": "What should happen",
  "actualBehavior": "What actually happened",
  "environment": "Browser/OS details (optional)",
  "additionalNotes": "Any extra context (optional)"
}`;

  const prompt = `Generate a JSON bug report for this failed test:

Website: ${projectUrl}
Test Case: ${testCase.title}
Test Description: ${testCase.description}
Expected Outcome: ${testCase.expectedOutcome || 'Test should pass without errors'}
Error/Failure: ${testResult.error || 'Unknown error'}
${testResult.extractedData ? `Additional Data: ${JSON.stringify(testResult.extractedData)}` : ''}

Severity guide: critical=blocks core functionality, high=major feature affected, medium=workaround exists, low=minor issue.

Respond with ONLY the JSON object, nothing else.`;

  try {
    const { object } = await generateObject({
      model,
      schema: bugReportSchema,
      system,
      prompt,
    });
    return object;
  } catch (error) {
    console.log('generateObject failed, falling back to generateText:', error);

    const { text } = await generateText({
      model,
      system,
      prompt,
    });

    // Try to extract JSON from the response
    let jsonText = text.trim();

    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.slice(7);
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.slice(3);
    }
    if (jsonText.endsWith('```')) {
      jsonText = jsonText.slice(0, -3);
    }
    jsonText = jsonText.trim();

    // Try to find JSON object
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // If no JSON found, create a basic bug report from the error
      return {
        title: `Bug: ${testCase.title}`,
        severity: 'high',
        description: `Test failed: ${testCase.description}`,
        stepsToReproduce: ['Navigate to the website', 'Follow the test steps', 'Observe the error'],
        expectedBehavior: testCase.expectedOutcome || 'Test should pass',
        actualBehavior: testResult.error || 'Test failed with unknown error',
      };
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return bugReportSchema.parse(parsed);
    } catch {
      // Final fallback
      return {
        title: `Bug: ${testCase.title}`,
        severity: 'high',
        description: `Test failed: ${testCase.description}`,
        stepsToReproduce: ['Navigate to the website', 'Follow the test steps', 'Observe the error'],
        expectedBehavior: testCase.expectedOutcome || 'Test should pass',
        actualBehavior: testResult.error || 'Test failed with unknown error',
      };
    }
  }
}

/**
 * Generate text (for general AI tasks)
 */
export async function generateAIText(
  prompt: string,
  options?: {
    modelId?: string;
    system?: string;
  }
): Promise<string> {
  const model = getModel(options?.modelId);

  const { text } = await generateText({
    model,
    system: options?.system,
    prompt,
  });

  return text;
}

/**
 * Generate a detailed test result summary explaining why a test passed or failed
 */
export async function generateTestResultSummary(
  testCase: {
    title: string;
    description: string;
    expectedOutcome?: string;
  },
  result: {
    status: 'passed' | 'failed' | 'error' | 'skipped';
    steps?: string[];
    error?: string;
    duration?: number;
  },
  websiteUrl: string,
  options?: { modelId?: string }
): Promise<string> {
  // Use a faster model for quick summaries
  const model = getModel(options?.modelId || 'openai/gpt-4o-mini');

  const stepsText = result.steps && result.steps.length > 0
    ? `\n\nSteps executed:\n${result.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
    : '';

  const system = `You are a QA analyst providing clear, professional test result summaries in a structured bullet point format.

Your response MUST be formatted as bullet points, one per line, starting with "• " (bullet character).

Format:
• [Key finding or action taken]
• [What was verified or what failed]
• [Outcome explanation]
• [Any notable observations]

Guidelines:
- Use 3-5 bullet points
- Each bullet should be a complete, concise statement
- Write in past tense
- Be specific about what actions were taken and what was observed
- For passed tests: highlight the key verifications that confirmed success
- For failed tests: identify where and why the failure occurred`;

  const prompt = `Summarize this test result as bullet points:

Test: ${testCase.title}
Website: ${websiteUrl}
Result: ${result.status.toUpperCase()}
${result.duration ? `Duration: ${Math.round(result.duration / 1000)}s` : ''}

Test Description:
${testCase.description}

Expected Outcome:
${testCase.expectedOutcome || 'Test should complete successfully'}
${stepsText}
${result.error ? `\nError: ${result.error}` : ''}

Provide 3-5 bullet points explaining why this test ${result.status}. Each bullet must start with "• ". Focus on specific actions taken and what was verified or what went wrong.`;

  try {
    const { text } = await generateText({
      model,
      system,
      prompt,
    });
    return text.trim();
  } catch (error) {
    console.error('Failed to generate test summary:', error);
    // Fallback to basic summary
    if (result.status === 'passed') {
      return result.steps && result.steps.length > 0
        ? `Successfully completed ${result.steps.length} steps and verified the expected outcome.`
        : 'Test completed successfully.';
    } else {
      return result.error || 'Test did not complete as expected.';
    }
  }
}
