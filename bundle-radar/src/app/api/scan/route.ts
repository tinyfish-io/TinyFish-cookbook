import { NextRequest } from 'next/server';
import { runScan } from '@/lib/orchestrator';
import { prisma, requireDatabase } from '@/lib/db';
import { reserveScanSlot, QuotaExceededError } from '@/lib/subscription';
import { checkRateLimit } from '@/lib/ratelimit';
import { getAnonUserId } from '@/lib/anon';

export const maxDuration = 300;

const SCAN_TIMEOUT_MS = 290_000; // Slightly under maxDuration so we can mark scan failed before platform kills the request

function runWithTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId!));
}

export async function POST(req: NextRequest) {
  try {
    const dbErr = requireDatabase();
    if (dbErr) return dbErr;

    const userId = getAnonUserId(req);
    if (!userId) {
      return Response.json({ error: 'Session required. Refresh the page and try again.' }, { status: 401 });
    }

    const body = await req.json();
    const { url } = body;

    if (!url) {
      return Response.json({ error: 'URL is required' }, { status: 400 });
    }

    const trimmed = String(url).trim();
    const hasScheme = /^https?:\/\//i.test(trimmed);
    const normalized = hasScheme ? trimmed : `https://${trimmed}`;
    try {
      new URL(normalized);
    } catch {
      return Response.json({ error: 'Invalid URL' }, { status: 400 });
    }

    const rateLimit = await checkRateLimit(userId);
    if (!rateLimit.ok) {
      return Response.json({ error: rateLimit.message }, { status: 429 });
    }

    if (!process.env.TINYFISH_API_KEY && !process.env.MINO_API_KEY) {
      return Response.json(
        { error: 'TinyFish API key not configured. Set TINYFISH_API_KEY (or MINO_API_KEY).' },
        { status: 500 }
      );
    }
    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        { error: 'OpenAI API key not configured. Set OPENAI_API_KEY.' },
        { status: 500 }
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let streamClosed = false;
        const send = (event: string, data: unknown): boolean => {
          if (streamClosed) return true;
          try {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
            return true;
          } catch (err) {
            const isInvalidState = err instanceof Error && (err as NodeJS.ErrnoException).code === 'ERR_INVALID_STATE';
            if (!isInvalidState) console.error('[scan] send failed', event, err);
            return isInvalidState;
          }
        };

        let scan: { id: string } | undefined;
        try {
          scan = await reserveScanSlot(userId, normalized);
        } catch (e) {
          if (e instanceof QuotaExceededError) {
            send('error', {
              error: e.message,
              code: 'QUOTA_EXCEEDED',
              used: e.used,
              limit: e.limit,
            });
            streamClosed = true;
            controller.close();
            return;
          }
          const msg = e instanceof Error ? e.message : 'Failed to start scan. Please try again.';
          send('error', { error: msg });
          streamClosed = true;
          controller.close();
          return;
        }

        let resolved = false;
        let streamAborted = false;
        try {
          send('started', { url: normalized, scanId: scan.id });
          const result = await runWithTimeout(
            runScan({ url: normalized }, (progress) => {
              if (streamAborted) return;
              const ok = send('progress', progress);
              if (!ok) streamAborted = true;
            }),
            SCAN_TIMEOUT_MS,
            'Scan timed out. Please try again.'
          );

          try {
            await prisma.scan.update({
              where: { id: scan.id },
              data: { status: 'completed', result: result as object },
            });
            resolved = true;
            const sent = send('complete', result);
            if (!sent) {
              send('error', {
                error: 'Result saved but could not stream. Refetch from history.',
                scanId: scan.id,
                code: 'REFETCH',
              });
            }
          } catch (updateErr) {
            console.error('[scan] Failed to persist completed scan', scan.id, updateErr);
            const errMsg =
              updateErr instanceof Error ? updateErr.message : 'Scan finished but could not save results. Please try again.';
            send('error', { error: errMsg });
            try {
              await prisma.scan.update({
                where: { id: scan.id },
                data: { status: 'failed', error: errMsg },
              });
            } catch (fallbackUpdateErr) {
              console.error('[scan] Failed to persist failed status', scan.id, fallbackUpdateErr);
            }
            resolved = true;
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Unknown error';
          send('error', { error: msg });
          if (scan) {
            try {
              await prisma.scan.update({
                where: { id: scan.id },
                data: { status: 'failed', error: msg },
              });
            } catch (updateErr) {
              console.error('[scan] Failed to persist failed scan', scan.id, updateErr);
            }
          }
          resolved = true;
        } finally {
          streamClosed = true;
          if (!resolved && scan) {
            try {
              await prisma.scan.update({
                where: { id: scan.id },
                data: { status: 'failed', error: 'Scan ended; final status could not be saved.' },
              });
            } catch (fallbackErr) {
              console.error('[scan] Fallback status update failed', scan.id, fallbackErr);
            }
          }
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
