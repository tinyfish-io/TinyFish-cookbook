import { NextRequest, NextResponse } from "next/server";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";

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
      system: `You are an expert cover letter writer who creates compelling, personalized letters.
Write naturally and professionally, avoiding generic phrases.
Be specific about why this candidate is a great fit for this role.
Never use placeholder text - use actual company and candidate names.`,
      prompt: `Write a compelling cover letter for this job application:

JOB DETAILS:
- Company: ${job.company}
- Title: ${job.title}
- Location: ${job.location}
- Description: ${job.description}
${job.requirements ? `- Requirements: ${job.requirements.join(", ")}` : ""}

CANDIDATE PROFILE:
- Name: ${profile.fullName}
- Current title: ${profile.currentTitle}
- Years of experience: ${profile.yearsExperience}
- Key skills: ${profile.skills?.slice(0, 8).join(", ") || ""}
- Summary: ${profile.summary}

Write a 3-4 paragraph cover letter that:
- Opens with a strong hook relevant to the company/role
- Highlights 2-3 specific qualifications that match the job requirements
- Shows enthusiasm for the company and role
- Ends with a clear call to action`,
    });

    return NextResponse.json({ data: text });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate cover letter" },
      { status: 500 }
    );
  }
}
