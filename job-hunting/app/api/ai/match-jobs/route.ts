import { NextRequest, NextResponse } from "next/server";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";
import { z } from "zod";

const jobMatchSchema = z.object({
  matchScore: z.number().min(0).max(100),
  matchExplanation: z.string(),
  keyStrengths: z.array(z.string()),
  potentialConcerns: z.array(z.string()),
  isReach: z.boolean(),
  isPerfectFit: z.boolean(),
});

function extractJSON(text: string): string {
  // Remove markdown code blocks if present
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  // Try to find JSON object directly
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }
  return text;
}

export async function POST(request: NextRequest) {
  try {
    const { job, profile } = await request.json();

    if (!job || !profile) {
      return NextResponse.json(
        { error: "Job and profile are required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenRouter API key not configured" },
        { status: 500 }
      );
    }

    const openrouter = createOpenAICompatible({
      name: "openrouter",
      baseURL: "https://openrouter.ai/api/v1",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://jobhunter.app",
        "X-Title": "Job Hunter Dashboard",
      },
    });

    const model = openrouter.chatModel("minimax/minimax-m2.1");

    const { text } = await generateText({
      model,
      system: `You are a career matching expert. Analyze how well job listings match candidate profiles. Consider: title alignment, skills match, experience level fit, and any stated preferences. Be honest but encouraging. Always respond with valid JSON only.`,
      prompt: `Analyze this job match:

CANDIDATE PROFILE:
- Current title: ${profile.currentTitle}
- Years of experience: ${profile.yearsExperience}
- Skills: ${profile.skills?.join(", ") || ""}
- Preferred titles: ${profile.preferredTitles?.join(", ") || ""}
- Seniority level: ${profile.seniorityLevel}
- Location: ${profile.location}

JOB LISTING:
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location}
- Remote status: ${job.remoteStatus || "not specified"}
- Description: ${job.description?.slice(0, 500) || "not provided"}
- Salary: ${job.salaryRange || "not specified"}

Return a JSON object with this exact structure:
{
  "matchScore": number (0-100),
  "matchExplanation": "1-2 sentence explanation",
  "keyStrengths": ["up to 3 strengths"],
  "potentialConcerns": ["up to 2 concerns"],
  "isReach": boolean (true if stretch role),
  "isPerfectFit": boolean (true if excellent match)
}

Respond with only the JSON object, no other text.`,
    });

    const jsonStr = extractJSON(text);
    const parsed = JSON.parse(jsonStr);
    const validated = jobMatchSchema.parse(parsed);

    return NextResponse.json({ data: validated });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to analyze job match" },
      { status: 500 }
    );
  }
}
