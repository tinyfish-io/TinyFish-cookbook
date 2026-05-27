import { NextResponse } from "next/server";
import { runLlmCitationCheck } from "@/lib/llm-citations";

export const runtime = "nodejs";
// Up to 5 topics × 25s OpenAI timeout = 125s; use 150s so Vercel does not terminate early
export const maxDuration = 150;

export async function POST(request: Request) {
  let body: { url?: string; topics?: string[] } | null = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const rawUrl = body?.url;
  const url = typeof rawUrl === "string" ? rawUrl.trim() : "";
  if (!url) {
    return NextResponse.json(
      { error: "Missing url" },
      { status: 400 }
    );
  }

  try {
    new URL(url.toLowerCase().startsWith("http") ? url : `https://${url}`);
  } catch {
    return NextResponse.json(
      { error: "Invalid url" },
      { status: 400 }
    );
  }

  const topics =
    Array.isArray(body?.topics) && body.topics.length > 0
      ? body.topics.filter((t): t is string => typeof t === "string").slice(0, 5)
      : undefined;

  try {
    const result = await runLlmCitationCheck(url, topics);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "LLM citation check failed";
    console.error("LLM citations API error:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
