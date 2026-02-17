import { NextRequest, NextResponse } from 'next/server';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText } from 'ai';
import { z } from 'zod';

// Schema for generated tests
const generatedTestSchema = z.object({
  title: z.string().describe('Short, descriptive title for the test case'),
  description: z.string().describe('Natural language description of the test steps'),
  expectedOutcome: z.string().describe('What should happen if the test passes'),
});

const bulkGenerateSchema = z.object({
  testCases: z.array(generatedTestSchema),
});

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

export async function POST(request: NextRequest) {
  try {
    const { rawText, websiteUrl } = await request.json();

    if (!rawText || !websiteUrl) {
      return NextResponse.json(
        { error: 'rawText and websiteUrl are required' },
        { status: 400 }
      );
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OPENROUTER_API_KEY not configured' },
        { status: 500 }
      );
    }

    const openrouter = createOpenRouterProvider();
    const model = openrouter.chatModel('openai/gpt-5-nano');

    const system = `You are a QA test automation expert. Your job is to analyze raw text (which may include feature descriptions, user stories, requirements, or test scenarios) and generate a comprehensive list of test cases. Return your response as JSON.

For each test case, create:
1. **title**: A short, descriptive title (e.g., "Login with valid credentials", "Add item to cart")
2. **description**: A clear, natural language description of what the test does. Write it as step-by-step instructions that a human or automation tool could follow. Be specific about what to click, what to enter, and what to look for.
3. **expectedOutcome**: What should happen if the test passes. Be specific about what the user should see or what state the application should be in.

Guidelines:
- Generate multiple test cases covering different scenarios (happy path, edge cases, error cases)
- Each test should be independent and atomic
- Use clear, action-oriented language
- Include both positive and negative test scenarios where applicable
- Make descriptions detailed enough that someone unfamiliar with the app could follow them`;

    const prompt = `Website URL: ${websiteUrl}

Analyze the following text and generate comprehensive test cases:

---
${rawText}
---

Generate a list of test cases based on this input. Cover the main functionality, edge cases, and potential error scenarios.`;

    const { text } = await generateText({
      model,
      system: system + '\n\nIMPORTANT: Respond with valid JSON only. No markdown, no code blocks. Return a JSON object with a "testCases" array.',
      prompt,
    });

    // Extract JSON from response
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

    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const validated = bulkGenerateSchema.parse(parsed);

    return NextResponse.json({ testCases: validated.testCases });
  } catch (error) {
    console.error('Error generating tests:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate tests' },
      { status: 500 }
    );
  }
}
