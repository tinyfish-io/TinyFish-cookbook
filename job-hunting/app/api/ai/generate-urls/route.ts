import { NextRequest, NextResponse } from "next/server";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";
import { z } from "zod";

const searchUrlsSchema = z.object({
  urls: z.array(
    z.object({
      boardName: z.string(),
      searchUrl: z.string(),
    })
  ),
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
    const { profile, searchConfig } = await request.json();

    if (!profile) {
      return NextResponse.json(
        { error: "Profile is required" },
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

    const locationStr =
      searchConfig?.locations?.length > 0
        ? searchConfig.locations.join(", ")
        : profile.location;

    const remoteNote =
      searchConfig?.remotePreference === "remote-only"
        ? "Focus on remote positions only."
        : searchConfig?.remotePreference === "hybrid-ok"
        ? "Include remote and hybrid positions."
        : "";

    const jobSearchPrompt = searchConfig?.jobSearchPrompt || "";

    const { text } = await generateText({
      model,
      system: `You are an expert at finding jobs on the internet. You know all the best job boards for different regions, industries, and job types. You create working search URLs with proper parameters. Always respond with valid JSON only.`,
      prompt: `Generate the BEST job board search URLs for this job search:

=== JOB SEARCH REQUEST ===
${jobSearchPrompt || `Looking for ${profile.preferredTitles?.join(" or ") || profile.currentTitle} positions`}

=== LOCATION ===
${locationStr}

=== CONTEXT ===
- Experience level: ${profile.seniorityLevel}
${remoteNote ? `- Remote preference: ${remoteNote}` : ""}
${searchConfig?.salaryMinimum ? `- Minimum salary: $${searchConfig.salaryMinimum}` : ""}

=== INSTRUCTIONS ===
1. Choose the BEST 10-15 job boards for this search based on the LOCATION and JOB TYPE
2. For each region, include LOCAL job boards (e.g., for Singapore: JobsCentral, JobStreet, TechInAsia; for UK: Reed, TotalJobs; for India: Naukri, etc.)
3. Include global boards like LinkedIn, Indeed (use regional domains like indeed.sg, indeed.co.uk, etc.)
4. Include industry-specific boards if relevant (tech: AngelList, Dice, HackerNews; startups: Y Combinator, etc.)
5. Create working search URLs with the job keywords and location pre-filled
6. Use proper URL encoding (spaces become %20 or +)

Return ONLY a JSON object:
{
  "urls": [
    { "boardName": "LinkedIn", "searchUrl": "https://www.linkedin.com/jobs/search/?keywords=..." },
    { "boardName": "Indeed Singapore", "searchUrl": "https://sg.indeed.com/jobs?q=..." },
    ...
  ]
}`,
    });

    const jsonStr = extractJSON(text);
    const parsed = JSON.parse(jsonStr);
    const validated = searchUrlsSchema.parse(parsed);

    return NextResponse.json({ data: validated.urls });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate search URLs" },
      { status: 500 }
    );
  }
}
