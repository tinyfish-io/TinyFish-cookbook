import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";
import { subDays, format } from "date-fns";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  const timeframe = searchParams.get("timeframe") || "30d";

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  // Parse timeframe (7d, 30d, 90d)
  const days = parseInt(timeframe.replace("d", ""), 10);
  if (isNaN(days) || days < 1) {
    return NextResponse.json({ error: "Invalid timeframe format" }, { status: 400 });
  }

  const startDate = subDays(new Date(), days);

  try {
    // Fetch single-page audits within timeframe
    const singleAudits = await prisma.auditRun.findMany({
      where: {
        url: url,
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        id: true,
        score: true,
        createdAt: true,
        questions: {
          select: {
            answeredInDocs: true,
            importance: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Fetch multi-page audit sessions within timeframe
    const sessions = await prisma.auditSession.findMany({
      where: {
        baseUrl: url,
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        id: true,
        overallScore: true,
        consistencyScore: true,
        createdAt: true,
        pages: {
          select: {
            clarityIndex: true,
            questions: {
              select: {
                answeredInDocs: true,
                importance: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Aggregate data for trend visualization
    const trendData = [
      ...singleAudits.map((audit) => {
        const total = audit.questions.length;
        const answered = audit.questions.filter((q) => q.answeredInDocs === "YES").length;
        const partial = audit.questions.filter((q) => q.answeredInDocs === "PARTIAL").length;
        const highImportance = audit.questions.filter((q) => q.importance === "HIGH").length;
        const clarityIndex = total > 0 ? Math.round(((answered + partial * 0.5) / total) * 100) : 0;

        return {
          date: format(new Date(audit.createdAt), "MMM dd"),
          timestamp: audit.createdAt.toISOString(),
          score: audit.score || 0,
          clarityIndex,
          answered,
          partial,
          missing: total - answered - partial,
          highImportance,
        };
      }),
      ...sessions.map((session) => {
        const allQuestions = session.pages.flatMap((page) => page.questions);
        const total = allQuestions.length;
        const answered = allQuestions.filter((q) => q.answeredInDocs === "YES").length;
        const partial = allQuestions.filter((q) => q.answeredInDocs === "PARTIAL").length;
        const highImportance = allQuestions.filter((q) => q.importance === "HIGH").length;
        
        const avgClarityIndex = session.pages.length > 0
          ? Math.round(
              session.pages.reduce((sum, page) => sum + (page.clarityIndex || 0), 0) /
                session.pages.length
            )
          : 0;

        return {
          date: format(new Date(session.createdAt), "MMM dd"),
          timestamp: session.createdAt.toISOString(),
          score: session.overallScore || 0,
          clarityIndex: avgClarityIndex,
          answered,
          partial,
          missing: total - answered - partial,
          highImportance,
          consistencyScore: session.consistencyScore,
        };
      }),
    ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return NextResponse.json({
      timeframe: `${days}d`,
      data: trendData,
      summary: {
        totalAudits: trendData.length,
        averageScore:
          trendData.length > 0
            ? Math.round(
                trendData.reduce((sum, item) => sum + item.score, 0) / trendData.length
              )
            : 0,
        trend:
          trendData.length >= 2
            ? trendData[trendData.length - 1].score - trendData[0].score
            : 0,
      },
    });
  } catch (error) {
    console.error("Error fetching audit trends:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit trends" },
      { status: 500 }
    );
  }
}
