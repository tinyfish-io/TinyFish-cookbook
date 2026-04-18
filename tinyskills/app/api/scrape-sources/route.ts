import { getTinyFishClient } from "@/lib/tinyfish-client";
import { countWords } from "@/lib/utils";
import type { IdentifiedSource, ScrapeProgress } from "@/types";

const FETCH_BATCH_SIZE = 10;

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.toString();
  } catch {
    return url;
  }
}

function markdownFromFetchPage(result: {
  title?: string | null;
  description?: string | null;
  text?: string | null;
}): string {
  const parts: string[] = [];
  if (result.title) parts.push(`# ${result.title}\n`);
  if (result.description) parts.push(`${result.description}\n\n`);
  if (result.text) parts.push(result.text);
  return parts.join("").trim();
}

export async function POST(request: Request) {
  const encoder = new TextEncoder();

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  let isClosed = false;

  const sendEvent = async (data: object) => {
    if (isClosed) return;
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    } catch {
      isClosed = true;
    }
  };

  const closeWriter = async () => {
    if (isClosed) return;
    try {
      isClosed = true;
      await writer.close();
    } catch {
      // Already closed
    }
  };

  (async () => {
    try {
      const { sources, topic } = (await request.json()) as {
        sources: IdentifiedSource[];
        topic: string;
      };

      if (!sources || !Array.isArray(sources) || sources.length === 0) {
        await sendEvent({ type: "error", error: "No sources provided" });
        await closeWriter();
        return;
      }

      const apiKey = process.env.TINYFISH_API_KEY;
      if (!apiKey) {
        await sendEvent({
          type: "error",
          error: "TinyFish API key not configured",
        });
        await closeWriter();
        return;
      }

      const progressMap = new Map<string, ScrapeProgress>();
      for (const source of sources) {
        progressMap.set(source.url, {
          source,
          status: "pending",
          steps: [],
        });
      }

      await sendEvent({
        type: "scrape_start",
        sourceCount: sources.length,
        timestamp: Date.now(),
      });

      const client = await getTinyFishClient(apiKey);

      const batches: IdentifiedSource[][] = [];
      for (let i = 0; i < sources.length; i += FETCH_BATCH_SIZE) {
        batches.push(sources.slice(i, i + FETCH_BATCH_SIZE));
      }

      await Promise.all(
        batches.map(async (batch) => {
          for (const source of batch) {
            const progress = progressMap.get(source.url)!;
            progress.status = "scraping";
            await sendEvent({
              type: "source_start",
              sourceUrl: source.url,
              sourceType: source.type,
              sourceTitle: source.title,
              timestamp: Date.now(),
            });
          }

          let fetchRes;
          try {
            fetchRes = await client.fetch.getContents({
              urls: batch.map((s) => s.url),
              format: "markdown",
            });
          } catch (err) {
            const msg =
              err instanceof Error ? err.message : "Fetch batch request failed";
            for (const source of batch) {
              const progress = progressMap.get(source.url)!;
              progress.status = "error";
              progress.error = msg;
              await sendEvent({
                type: "source_step",
                sourceUrl: source.url,
                detail: "Fetch request failed",
                stepCount: 1,
                timestamp: Date.now(),
              });
              await sendEvent({
                type: "source_error",
                sourceUrl: source.url,
                error: msg,
                timestamp: Date.now(),
              });
            }
            return;
          }

          const findResult = (sourceUrl: string) => {
            const n = normalizeUrl(sourceUrl);
            return fetchRes.results.find((r) => {
              if (normalizeUrl(r.url) === n) return true;
              if (r.final_url && normalizeUrl(r.final_url) === n) return true;
              return false;
            });
          };

          const findError = (sourceUrl: string) => {
            const n = normalizeUrl(sourceUrl);
            return fetchRes.errors.find((e) => normalizeUrl(e.url) === n);
          };

          for (const source of batch) {
            const progress = progressMap.get(source.url)!;

            await sendEvent({
              type: "source_step",
              sourceUrl: source.url,
              detail: `Fetching and extracting content via TinyFish Fetch… (${topic.slice(0, 40)}${topic.length > 40 ? "…" : ""})`,
              stepCount: 1,
              timestamp: Date.now(),
            });

            const row = findResult(source.url);
            const errRow = findError(source.url);

            if (errRow) {
              progress.status = "error";
              progress.error = errRow.error;
              progress.steps.push(errRow.error);
              await sendEvent({
                type: "source_error",
                sourceUrl: source.url,
                error: errRow.error,
                timestamp: Date.now(),
              });
              continue;
            }

            if (row && row.format === "json" && row.text && typeof row.text === "object") {
              const content = markdownFromFetchPage({
                title: row.title,
                description: row.description,
                text: JSON.stringify(row.text, null, 2),
              });
              const wordCount = countWords(content);
              progress.status = "complete";
              progress.content = content;
              progress.wordCount = wordCount;
              progress.steps.push("Content extracted (TinyFish Fetch)");
              await sendEvent({
                type: "source_complete",
                sourceUrl: source.url,
                content,
                wordCount,
                timestamp: Date.now(),
              });
              continue;
            }

            if (
              row &&
              (row.format === "markdown" || row.format === "html") &&
              row.text
            ) {
              const content = markdownFromFetchPage(row);
              const wordCount = countWords(content);

              progress.status = "complete";
              progress.content = content;
              progress.wordCount = wordCount;
              progress.steps.push("Content extracted (TinyFish Fetch)");

              await sendEvent({
                type: "source_complete",
                sourceUrl: source.url,
                content,
                wordCount,
                timestamp: Date.now(),
              });

              continue;
            }

            const fallbackMsg = "No extractable content returned for this URL";
            progress.status = "error";
            progress.error = fallbackMsg;
            await sendEvent({
              type: "source_error",
              sourceUrl: source.url,
              error: fallbackMsg,
              timestamp: Date.now(),
            });
          }
        }),
      );

      const finalResults: ScrapeProgress[] = sources.map((source) => {
        const p = progressMap.get(source.url)!;
        return {
          source,
          status: p.status,
          steps: p.steps,
          content: p.content,
          wordCount: p.wordCount,
          error: p.error,
          streamingUrl: p.streamingUrl,
        };
      });

      await sendEvent({
        type: "scrape_complete",
        results: finalResults,
        successCount: finalResults.filter((r) => r.status === "complete")
          .length,
        totalCount: sources.length,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Error in scrape-sources:", error);
      await sendEvent({
        type: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      await closeWriter();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
