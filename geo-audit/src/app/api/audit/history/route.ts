import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  const limit = limitParam ? parseInt(limitParam, 10) : 10;
  const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

  if (isNaN(limit) || isNaN(offset) || limit < 1 || offset < 0) {
    return NextResponse.json({ error: "Invalid limit or offset" }, { status: 400 });
  }

  try {
    // Fetch all single-page audits (no pagination on DB queries)
    const singleAudits = await prisma.auditRun.findMany({
      where: {
        url: url,
      },
      select: {
        id: true,
        url: true,
        score: true,
        createdAt: true,
        status: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Fetch all multi-page audits (sessions) (no pagination on DB queries)
    const sessions = await prisma.auditSession.findMany({
      where: {
        baseUrl: url,
      },
      select: {
        id: true,
        baseUrl: true,
        overallScore: true,
        consistencyScore: true,
        createdAt: true,
        status: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Combine and sort by date
    const combined = [
      ...singleAudits.map((audit) => ({
        id: audit.id,
        url: audit.url,
        score: audit.score,
        createdAt: audit.createdAt.toISOString(),
        status: audit.status,
        type: "single" as const,
      })),
      ...sessions.map((session) => ({
        id: session.id,
        url: session.baseUrl,
        score: session.overallScore,
        consistencyScore: session.consistencyScore,
        createdAt: session.createdAt.toISOString(),
        status: session.status,
        type: "multi" as const,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply pagination after combining and sorting
    const paginatedAudits = combined.slice(offset, offset + limit);

    return NextResponse.json({
      audits: paginatedAudits,
      total: combined.length,
    });
  } catch (error) {
    console.error("Error fetching audit history:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit history" },
      { status: 500 }
    );
  }
}
