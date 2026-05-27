import { NextRequest, NextResponse } from "next/server";
import { runPipeline } from "@/lib/orchestrator";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const code = body?.code;

  if (!code || typeof code !== "string" || code.trim().length === 0) {
    return NextResponse.json(
      { error: 'Missing or empty "code" field in request body' },
      { status: 400 }
    );
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        await runPipeline(code.trim(), controller);
      } catch (err) {
        const encoder = new TextEncoder();
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "pipeline_error", data: { error: (err as Error).message } })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
