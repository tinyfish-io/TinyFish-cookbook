import { NextRequest, NextResponse } from "next/server";
import { parseTestDescription } from "@/lib/groq-client";

export async function POST(request: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "Missing GROQ_API_KEY" }, { status: 500 });
  }

  try {
    const { plainEnglish, websiteUrl } = await request.json();
    if (!plainEnglish || !websiteUrl) {
      return NextResponse.json({ error: "plainEnglish and websiteUrl are required" }, { status: 400 });
    }

    const result = await parseTestDescription(plainEnglish, websiteUrl);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to parse test description" },
      { status: 500 }
    );
  }
}
