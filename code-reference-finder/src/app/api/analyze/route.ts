import { NextRequest, NextResponse } from 'next/server';
import { runPipeline } from '@/lib/orchestrator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const code = body?.code;

    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty "code" field in request body' },
        { status: 400 }
      );
    }

    // Create a TransformStream for SSE
    const { readable, writable } = new TransformStream<Uint8Array>();
    const writer = writable.getWriter();

    // Run the pipeline in the background — don't await
    runPipeline(code.trim(), writer)
      .catch((err) => {
        const encoder = new TextEncoder();
        const errorEvent = `data: ${JSON.stringify({
          type: 'pipeline_error',
          data: { error: (err as Error).message },
        })}\n\n`;
        writer.write(encoder.encode(errorEvent)).catch(() => {});
      })
      .finally(() => {
        writer.close().catch(() => {});
      });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
