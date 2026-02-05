import {
  runMinoAutomation,
  buildScrapeGoal,
  parseScrapedContent,
} from "@/lib/mino-client";
import { countWords } from "@/lib/utils";
import type { IdentifiedSource, ScrapeProgress, Settings } from "@/types";

export async function POST(request: Request) {
  const encoder = new TextEncoder();

  // Create a TransformStream for SSE
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

  // Start processing in the background
  (async () => {
    try {
      const { sources, topic, settings } = (await request.json()) as {
        sources: IdentifiedSource[];
        topic: string;
        settings?: Partial<Settings>;
      };

      if (!sources || !Array.isArray(sources) || sources.length === 0) {
        await sendEvent({ type: "error", error: "No sources provided" });
        await closeWriter();
        return;
      }

      const apiKey = process.env.MINO_API_KEY;
      if (!apiKey) {
        await sendEvent({ type: "error", error: "Mino API key not configured" });
        await closeWriter();
        return;
      }

      // Initialize progress tracking
      const progressMap = new Map<string, ScrapeProgress>();
      for (const source of sources) {
        progressMap.set(source.url, {
          source,
          status: "pending",
          steps: [],
        });
      }

      // Send initial state
      await sendEvent({
        type: "scrape_start",
        sourceCount: sources.length,
        timestamp: Date.now(),
      });

      // Scrape all sources in parallel
      const scrapePromises = sources.map(async (source) => {
        const progress = progressMap.get(source.url)!;

        // Update status to scraping
        progress.status = "scraping";
        await sendEvent({
          type: "source_start",
          sourceUrl: source.url,
          sourceType: source.type,
          sourceTitle: source.title,
          timestamp: Date.now(),
        });

        try {
          const goal = buildScrapeGoal(source.type, topic);

          const result = await runMinoAutomation(
            {
              url: source.url,
              goal,
              browser_profile: settings?.browserProfile || "lite",
              ...(settings?.enableProxy && {
                proxy_config: {
                  enabled: true,
                  country_code: (settings.proxyCountry || "US") as
                    | "US"
                    | "GB"
                    | "CA"
                    | "DE"
                    | "FR"
                    | "JP"
                    | "AU",
                },
              }),
            },
            apiKey,
            {
              onStep: async (message) => {
                progress.steps.push(message);
                await sendEvent({
                  type: "source_step",
                  sourceUrl: source.url,
                  detail: message,
                  stepCount: progress.steps.length,
                  timestamp: Date.now(),
                });
              },
              onStreamingUrl: async (url) => {
                progress.streamingUrl = url;
                await sendEvent({
                  type: "source_streaming",
                  sourceUrl: source.url,
                  streamingUrl: url,
                  timestamp: Date.now(),
                });
              },
            }
          );

          if (result.success && result.result) {
            const content = parseScrapedContent(result.result);
            const wordCount = countWords(content);

            progress.status = "complete";
            progress.content = content;
            progress.wordCount = wordCount;

            await sendEvent({
              type: "source_complete",
              sourceUrl: source.url,
              content,
              wordCount,
              timestamp: Date.now(),
            });

            return { source, content, success: true };
          } else {
            throw new Error(result.error || "Unknown scrape error");
          }
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : "Unknown error";
          progress.status = "error";
          progress.error = errorMsg;

          await sendEvent({
            type: "source_error",
            sourceUrl: source.url,
            error: errorMsg,
            timestamp: Date.now(),
          });

          return { source, content: "", success: false, error: errorMsg };
        }
      });

      // Wait for all scrapes to complete
      const results = await Promise.allSettled(scrapePromises);

      // Collect final results
      const finalResults: ScrapeProgress[] = [];
      for (const result of results) {
        if (result.status === "fulfilled") {
          const { source, content, success, error } = result.value;
          finalResults.push({
            source,
            status: success ? "complete" : "error",
            steps: progressMap.get(source.url)?.steps || [],
            content: success ? content : undefined,
            wordCount: success ? countWords(content) : undefined,
            error: success ? undefined : error,
          });
        }
      }

      await sendEvent({
        type: "scrape_complete",
        results: finalResults,
        successCount: finalResults.filter((r) => r.status === "complete").length,
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
