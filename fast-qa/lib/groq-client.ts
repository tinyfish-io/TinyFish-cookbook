import Groq from "groq-sdk";
import { z } from "zod";

function getGroq() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured");
  return new Groq({ apiKey });
}

// Schemas
const testStepSchema = z.object({
  id: z.string(),
  action: z.enum(["navigate", "click", "type", "wait", "extract", "assert", "scroll", "hover", "select"]),
  target: z.string().optional(),
  value: z.string().optional(),
  goal: z.string(),
  expectedOutcome: z.string().optional(),
});

const parseTestSchema = z.object({
  steps: z.array(testStepSchema),
  suggestedTitle: z.string().optional(),
  suggestedCategory: z.enum(["smoke", "regression", "functional", "e2e", "accessibility", "performance", "custom"]).optional(),
});

const bugReportSchema = z.object({
  title: z.string(),
  severity: z.enum(["critical", "high", "medium", "low"]),
  description: z.string(),
  stepsToReproduce: z.array(z.string()),
  expectedBehavior: z.string(),
  actualBehavior: z.string(),
  environment: z.string().optional(),
  additionalNotes: z.string().optional(),
});

export type ParseTestResponse = z.infer<typeof parseTestSchema>;
export type BugReport = z.infer<typeof bugReportSchema>;

async function groqJSON<T>(
  schema: z.ZodType<T>,
  messages: { role: "system" | "user"; content: string }[],
  model = "llama-3.3-70b-versatile"
): Promise<T> {
  const groq = getGroq();
  const completion = await groq.chat.completions.create({
    model,
    messages,
    temperature: 0.3,
    max_tokens: 2048,
    response_format: { type: "json_object" },
  });

  const text = completion.choices[0]?.message?.content ?? "";
  const clean = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean);
  return schema.parse(parsed);
}

/**
 * Parse plain English test description into structured steps
 */
export async function parseTestDescription(
  plainEnglish: string,
  websiteUrl: string
): Promise<ParseTestResponse> {
  return groqJSON(parseTestSchema, [
    {
      role: "system",
      content: `You are a QA test automation expert. Convert plain English test descriptions into structured test steps.

Each step must have:
- id: "step-1", "step-2", etc.
- action: one of navigate, click, type, wait, extract, assert, scroll, hover, select
- target: visual description of the element (e.g. "the blue Submit button")
- value: value to type or expected value for assertions (optional)
- goal: clear natural language of what this step does
- expectedOutcome: what should happen after this step (optional)

Respond with ONLY valid JSON — no markdown, no code blocks.
Return: { "steps": [...], "suggestedTitle": "...", "suggestedCategory": "..." }`,
    },
    {
      role: "user",
      content: `Website URL: ${websiteUrl}\n\nTest Description:\n${plainEnglish}`,
    },
  ]);
}

/**
 * Generate a bug report from a failed test
 */
export async function generateBugReport(
  testCase: { title: string; description: string; expectedOutcome?: string },
  testResult: { error?: string; extractedData?: string },
  projectUrl: string
): Promise<BugReport> {
  return groqJSON(bugReportSchema, [
    {
      role: "system",
      content: `You are a QA engineer writing professional bug reports. Respond with ONLY valid JSON — no markdown, no code blocks.
Required fields: title, severity (critical/high/medium/low), description, stepsToReproduce (array), expectedBehavior, actualBehavior.
Optional: environment, additionalNotes.`,
    },
    {
      role: "user",
      content: `Generate a bug report for this failed test:

Website: ${projectUrl}
Test: ${testCase.title}
Description: ${testCase.description}
Expected: ${testCase.expectedOutcome ?? "Test should pass"}
Error: ${testResult.error ?? "Unknown error"}
${testResult.extractedData ? `Data: ${testResult.extractedData}` : ""}

Severity guide: critical=blocks core functionality, high=major feature, medium=workaround exists, low=minor.`,
    },
  ]);
}

/**
 * Generate a test result summary explaining why a test passed or failed
 */
export async function generateTestResultSummary(
  testCase: { title: string; description: string; expectedOutcome?: string },
  result: { status: "passed" | "failed" | "error" | "skipped"; steps?: string[]; error?: string; duration?: number },
  websiteUrl: string
): Promise<string> {
  const groq = getGroq();
  const stepsText =
    result.steps?.length
      ? `\n\nSteps executed:\n${result.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`
      : "";

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `You are a QA analyst. Summarize test results as 3-5 bullet points starting with "• ".
Write in past tense. Be specific about what was verified or what failed.`,
      },
      {
        role: "user",
        content: `Summarize this test result:

Test: ${testCase.title}
Website: ${websiteUrl}
Result: ${result.status.toUpperCase()}
${result.duration ? `Duration: ${Math.round(result.duration / 1000)}s` : ""}
Description: ${testCase.description}
Expected: ${testCase.expectedOutcome ?? "Test should pass"}
${stepsText}
${result.error ? `\nError: ${result.error}` : ""}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 512,
  });

  return completion.choices[0]?.message?.content?.trim() ?? "Test completed.";
}

/**
 * Generate test cases from raw text input
 */
export async function generateTestsFromText(
  rawText: string,
  websiteUrl: string
): Promise<{ title: string; description: string; expectedOutcome: string }[]> {
  const schema = z.object({
    testCases: z.array(
      z.object({
        title: z.string(),
        description: z.string(),
        expectedOutcome: z.string(),
      })
    ),
  });

  const result = await groqJSON(schema, [
    {
      role: "system",
      content: `You are a QA test automation expert. Analyze the input text and generate comprehensive test cases.
For each test: title (short), description (step-by-step instructions), expectedOutcome (what to verify).
Cover happy path, edge cases, and error scenarios.
Respond with ONLY valid JSON: { "testCases": [...] }`,
    },
    {
      role: "user",
      content: `Website URL: ${websiteUrl}\n\nAnalyze this and generate test cases:\n\n${rawText}`,
    },
  ]);

  return result.testCases;
}
