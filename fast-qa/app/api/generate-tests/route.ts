import { NextRequest, NextResponse } from "next/server";
import { generateTestsFromText } from "@/lib/groq-client";

export async function POST(request: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "Missing GROQ_API_KEY" }, { status: 500 });
  }

  try {
    const { rawText, websiteUrl } = await request.json();
    if (!rawText || !websiteUrl) {
      return NextResponse.json({ error: "rawText and websiteUrl are required" }, { status: 400 });
    }

    const testCases = await generateTestsFromText(rawText, websiteUrl);
    return NextResponse.json({ testCases });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate tests" },
      { status: 500 }
    );
  }
}
