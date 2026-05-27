import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";

export async function GET() {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is not configured");
    }
    const sql = neon(databaseUrl);
    const result = await sql`select 1 as ok`;
    return NextResponse.json({ ok: true, result: result[0]?.ok ?? 1 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Database unavailable";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
