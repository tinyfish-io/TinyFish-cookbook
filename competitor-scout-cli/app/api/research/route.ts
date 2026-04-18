import { NextRequest } from "next/server";
import type {
  Competitor,
  CompetitorEvidenceAssessment,
  ResearchEvent,
  ResearchPipelineRun,
} from "@/lib/types";
import {
  planResearchGoals,
  summarizeCompetitorResult,
  generateComparisonReport,
  assessAndSummarizeFromFetchedPages,
} from "@/lib/openai-client";
import { fetchContents, searchWeb, submitRun, waitForCompletion } from "@/lib/tinyfish";

function isSearchFetchResult(
  raw: unknown
): raw is {
  method: "search_fetch";
  query: string;
  pages: unknown;
  assessment: CompetitorEvidenceAssessment;
  sources: unknown[];
} {
  return (
    typeof raw === "object" &&
    raw !== null &&
    (raw as { method?: string }).method === "search_fetch" &&
    typeof (raw as { assessment?: { summary_markdown?: string } }).assessment
      ?.summary_markdown === "string"
  );
}

export const maxDuration = 300;
export const runtime = "nodejs";

/** Rate limit: max requests per window per IP. */
const RATE_LIMIT_REQUESTS = 25;
const RATE_LIMIT_WINDOW_MS = 60_000; // 60 seconds

const rateLimitStore = new Map<
  string,
  { count: number; resetAt: number }
>();

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

function checkRateLimit(ip: string): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  if (!entry) {
    rateLimitStore.set(ip, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return { ok: true };
  }
  if (now >= entry.resetAt) {
    rateLimitStore.set(ip, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return { ok: true };
  }
  if (entry.count >= RATE_LIMIT_REQUESTS) {
    return {
      ok: false,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }
  entry.count += 1;
  return { ok: true };
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rate = checkRateLimit(ip);
  if (!rate.ok) {
    return new Response(
      JSON.stringify({
        error: "Too many requests. Please try again later.",
        retryAfter: rate.retryAfter,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(rate.retryAfter ?? 60),
        },
      }
    );
  }

  const { competitors, question } = (await request.json()) as {
    competitors: Competitor[];
    question: string;
  };

  if (!competitors?.length || !question) {
    return new Response(
      JSON.stringify({ error: "Missing competitors or question" }),
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: ResearchEvent) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
        );
      }

      try {
        // Step 1: Plan research goals using OpenAI
        send({
          type: "planning",
          message: "Analyzing your question and creating research goals for each competitor...",
        });

        const goals = await planResearchGoals(competitors, question);

        send({
          type: "goals",
          message: `Created ${goals.length} research goals`,
          data: goals,
        });

        // Step 2: Search + Fetch per competitor (concurrently). Fall back to Agent if insufficient.
        const runRequests = goals.map(async (goal, index) => {
          const goalName =
            typeof goal?.competitor_name === "string" ? goal.competitor_name : "";
          const goalUrl =
            typeof goal?.competitor_url === "string" ? goal.competitor_url : "";
          const competitor =
            competitors.find(
              (c) =>
                (goalName &&
                  c.name.toLowerCase() === goalName.toLowerCase()) ||
                (goalUrl && c.url === goalUrl)
            ) || competitors[index];
          const competitorIndex = competitor
            ? competitors.findIndex((c) => c.id === competitor.id)
            : -1;

          if (!competitor) return null;
          const runGoal =
            typeof goal?.goal === "string" && goal.goal.trim()
              ? goal.goal.trim()
              : `Find information on "${question}" for ${competitor.name}.`;
          const goalWithSources = `${runGoal}\n\nWhen you find evidence, list the exact source URLs (including child pages you visited) in a "sources" list.`;
          let runUrl = goalUrl || competitor.url;
          if (!runUrl.startsWith("http://") && !runUrl.startsWith("https://")) {
            runUrl = `https://${runUrl}`;
          }
          try {
            new URL(runUrl);
          } catch {
            send({
              type: "error",
              competitor: competitor.name,
              message: `Invalid URL for ${competitor.name}: "${runUrl}"`,
            });
            return null;
          }

          send({
            type: "submitting",
            competitor: competitor.name,
            message: `Searching ${competitor.name} for relevant pages...`,
            data: { url: runUrl },
          });

          try {
            const baseHost = new URL(runUrl).hostname.replace(/^www\./, "");
            const searchQuery = `site:${baseHost} ${question}`;
            const search = await searchWeb({ query: searchQuery });
            const candidateUrls = search.results
              .map((r) => r.url)
              .filter((u) => {
                try {
                  const h = new URL(u).hostname.replace(/^www\./, "");
                  return h === baseHost || h.endsWith(`.${baseHost}`);
                } catch {
                  return false;
                }
              })
              .slice(0, 6);

            if (candidateUrls.length === 0) {
              send({
                type: "polling",
                competitor: competitor.name,
                message: `No on-domain search results. Falling back to agent run...`,
              });
              const runId = await submitRun(runUrl, goalWithSources);
              return {
                competitor,
                goal: goalWithSources,
                runId,
                competitorIndex: competitorIndex === -1 ? index : competitorIndex,
                mode: "agent" as const,
              };
            }

            send({
              type: "polling",
              competitor: competitor.name,
              message: `Fetching ${candidateUrls.length} pages for ${competitor.name}...`,
              data: { urls: candidateUrls },
            });

            const fetched = await fetchContents({
              urls: candidateUrls.slice(0, 10),
              format: "markdown",
              links: false,
            });

            const pages = fetched.results
              .map((p) => ({
                url: p.final_url || p.url,
                title: (p.title ?? undefined) as string | undefined,
                text: typeof p.text === "string" ? p.text : JSON.stringify(p.text ?? ""),
              }))
              .filter((p) => p.text && p.text.trim().length > 0)
              .slice(0, 6);

            send({
              type: "summarizing",
              competitor: competitor.name,
              message: `Assessing whether fetched evidence is sufficient for ${competitor.name}...`,
            });

            const assessment = await assessAndSummarizeFromFetchedPages({
              competitorName: competitor.name,
              competitorUrl: runUrl,
              question,
              searchQuery,
              fetchedPages: pages,
            });

            if (assessment.sufficient) {
              send({
                type: "result",
                competitor: competitor.name,
                message: `Collected sufficient evidence for ${competitor.name} via Search+Fetch`,
                data: { method: "search_fetch", assessment, fetchErrors: fetched.errors },
              });
              return {
                competitor,
                goal: goalWithSources,
                runId: `search_fetch:${competitor.id}`,
                competitorIndex: competitorIndex === -1 ? index : competitorIndex,
                mode: "search_fetch" as const,
                searchQuery,
                pages,
                assessment,
                fetchErrors: fetched.errors,
              };
            }

            send({
              type: "polling",
              competitor: competitor.name,
              message: `Evidence insufficient (${assessment.confidence}). Falling back to agent run...`,
              data: { reason: assessment.reason },
            });

            const runId = await submitRun(runUrl, goalWithSources);
            return {
              competitor,
              goal: goalWithSources,
              runId,
              competitorIndex: competitorIndex === -1 ? index : competitorIndex,
              mode: "agent" as const,
              searchQuery,
              pages,
              assessment,
              fetchErrors: fetched.errors,
            };
          } catch (err) {
            send({
              type: "error",
              competitor: competitor.name,
              message: `Search/Fetch failed for ${competitor.name}: ${err instanceof Error ? err.message : "Unknown error"}. Falling back to agent run...`,
            });
            try {
              const runId = await submitRun(runUrl, goalWithSources);
              return {
                competitor,
                goal: goalWithSources,
                runId,
                competitorIndex: competitorIndex === -1 ? index : competitorIndex,
                mode: "agent" as const,
              };
            } catch (e2) {
              send({
                type: "error",
                competitor: competitor.name,
                message: `Agent fallback also failed for ${competitor.name}: ${e2 instanceof Error ? e2.message : "Unknown error"}`,
              });
              return null;
            }
          }
        });

        const runs = (await Promise.all(runRequests)).filter(Boolean) as ResearchPipelineRun[];

        // Step 3: Poll for agent results where needed (concurrently)
        const completedResults: {
          name: string;
          summary: string;
          rawResult: unknown;
          competitorIndex: number;
        }[] = [];

        const runResults = await Promise.all(
          runs.map(async (run) => {
            const seenStatuses = new Set<string>();
            send({
              type: "polling",
              competitor: run.competitor.name,
              message: `Waiting for ${run.competitor.name} results...`,
            });

            try {
              if (run.mode === "search_fetch") {
                const assessment = run.assessment;
                return {
                  run,
                  result: {
                    status: "COMPLETED",
                    result: {
                      method: "search_fetch" as const,
                      query: run.searchQuery,
                      pages: run.pages,
                      assessment,
                      sources: assessment.sources ?? [],
                    },
                  },
                };
              }

              const result = await waitForCompletion(run.runId, (status) => {
                if (seenStatuses.has(status)) return;
                seenStatuses.add(status);
                send({
                  type: "polling",
                  competitor: run.competitor.name,
                  message: `${run.competitor.name}: ${status}`,
                });
              });

              send({
                type: "result",
                competitor: run.competitor.name,
                message: `Got results for ${run.competitor.name}`,
                data: result,
              });

              if (result.status === "COMPLETED" && result.result) {
                return {
                  run,
                  result,
                };
              }
              const errorMessage =
                typeof result.error === "string"
                  ? result.error
                  : result.error
                    ? JSON.stringify(result.error)
                    : "";
              send({
                type: "error",
                competitor: run.competitor.name,
                message: `Agent run for ${run.competitor.name} ended with status: ${result.status}${errorMessage ? ` - ${errorMessage}` : ""}`,
              });
              return { run, result };
            } catch (err) {
              send({
                type: "error",
                competitor: run.competitor.name,
                message: `Error polling ${run.competitor.name}: ${err instanceof Error ? err.message : "Unknown error"}`,
              });
              return { run, result: { status: "FAILED" } };
            }
          })
        );

        // Step 4: Summarize after all runs complete, in input order
        const summaries = await Promise.all(
          runResults.map(async (item) => {
            if (
              item.result.status === "COMPLETED" &&
              (item.result as { result?: unknown }).result
            ) {
              const rawResult = (item.result as { result?: unknown }).result;
              const summary = isSearchFetchResult(rawResult)
                ? rawResult.assessment.summary_markdown
                : await summarizeCompetitorResult(
                    item.run.competitor.name,
                    question,
                    rawResult
                  );
              return {
                competitor: item.run.competitor,
                competitorIndex: item.run.competitorIndex,
                summary,
                rawResult,
              };
            }
            return null;
          })
        );

        summaries
          .filter(
            (
              item
            ): item is {
              competitor: Competitor;
              competitorIndex: number;
              summary: string;
              rawResult: unknown;
            } => Boolean(item)
          )
          .sort((a, b) => a.competitorIndex - b.competitorIndex)
          .forEach((item) => {
            send({
              type: "summarizing",
              competitor: item.competitor.name,
              message: `Summarizing findings for ${item.competitor.name}...`,
            });
            send({
              type: "summary",
              competitor: item.competitor.name,
              message: item.summary,
              data: { rawResult: item.rawResult },
            });
            completedResults.push({
              name: item.competitor.name,
              summary: item.summary,
              rawResult: item.rawResult,
              competitorIndex: item.competitorIndex,
            });
          });

        // Step 5: Generate comparison report
        if (completedResults.length > 0) {
          send({
            type: "summarizing",
            message: "Generating comparison report...",
          });

          const report = await generateComparisonReport(
            question,
            completedResults
              .sort((a, b) => a.competitorIndex - b.competitorIndex)
              .map(({ name, summary, rawResult }) => ({
                name,
                summary,
                rawResult,
              }))
          );

          send({
            type: "done",
            message: report,
          });
        } else {
          send({
            type: "done",
            message: "No results were collected. Please check your competitor URLs and try again.",
          });
        }
      } catch (err) {
        send({
          type: "error",
          message: `Research failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        });
        send({
          type: "done",
          message: "Research encountered an error and could not complete.",
        });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
