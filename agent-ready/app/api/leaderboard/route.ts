import { NextResponse } from "next/server";
import { getLeaderboard } from "@/app/lib/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const entries = await getLeaderboard(20);
    return NextResponse.json({ entries });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
