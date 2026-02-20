import { NextRequest, NextResponse } from "next/server";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";
import { z } from "zod";

const resumeSchema = z.object({
  fullName: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  location: z.string(),
  currentTitle: z.string(),
  yearsExperience: z.number(),
  skills: z.array(z.string()),
  industries: z.array(z.string()),
  education: z.string(),
  preferredTitles: z.array(z.string()),
  seniorityLevel: z.enum(["entry", "mid", "senior", "lead", "executive"]),
  summary: z.string(),
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
    const { resumeText } = await request.json();

    if (!resumeText || typeof resumeText !== "string") {
      return NextResponse.json(
        { error: "Resume text is required" },
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
      system:
        "You are an expert resume parser. Extract structured information from resumes accurately. Only extract what is explicitly stated or can be reasonably inferred. Always respond with valid JSON only, no markdown formatting.",
      prompt: `Parse this resume and return a JSON object with these exact fields:
{
  "fullName": "Full name of the candidate",
  "email": "Email address",
  "phone": "Phone number or null if not found",
  "location": "City, state or location",
  "currentTitle": "Current or most recent job title",
  "yearsExperience": number (estimated total years),
  "skills": ["array of top 10 technical and soft skills"],
  "industries": ["array of industries worked in"],
  "education": "Highest education level and field",
  "preferredTitles": ["3-5 job titles they would likely apply for"],
  "seniorityLevel": "entry" | "mid" | "senior" | "lead" | "executive",
  "summary": "2-sentence professional summary"
}

Resume text:
${resumeText}

Respond with only the JSON object, no other text.`,
    });

    const jsonStr = extractJSON(text);
    const parsed = JSON.parse(jsonStr);
    const validated = resumeSchema.parse(parsed);

    return NextResponse.json({ data: validated });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to parse resume" },
      { status: 500 }
    );
  }
}
