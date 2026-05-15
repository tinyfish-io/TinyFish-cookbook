import { NextRequest, NextResponse } from "next/server";
import { generateBugReport } from "@/lib/groq-client";
import type { TestCase, TestResult } from "@/types";

interface GenerateReportRequest {
  failedTest: TestResult;
  testCase: TestCase;
  projectUrl: string;
}

const sanitizePII = (text: string | undefined): string => {
  if (!text) return "";
  return text
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "[EMAIL_REDACTED]")
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, "[PHONE_REDACTED]")
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, "[CARD_REDACTED]");
};

export async function POST(request: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "Missing GROQ_API_KEY" }, { status: 500 });
  }

  try {
    const body: GenerateReportRequest = await request.json();
    const { failedTest, testCase, projectUrl } = body;

    if (!failedTest || !testCase || !projectUrl) {
      return NextResponse.json({ error: "failedTest, testCase, and projectUrl are required" }, { status: 400 });
    }

    const report = await generateBugReport(
      { title: testCase.title, description: sanitizePII(testCase.description), expectedOutcome: testCase.expectedOutcome },
      { error: failedTest.error, extractedData: sanitizePII(JSON.stringify(failedTest.extractedData)) },
      projectUrl
    );

    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate bug report" },
      { status: 500 }
    );
  }
}
