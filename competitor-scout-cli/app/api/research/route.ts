import { NextRequest } from "next/server";
import type { Competitor, ResearchEvent } from "@/lib/types";
import {
  planResearchGoals,
  summarizeCompetitorResult,
  generateComparisonReport,
} from "@/lib/openai-client";
import { submitRun, waitForCompletion } from "@/lib/tinyfish";

export const maxDuration = 300;
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
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

        // Step 2: Submit Tinyfish runs for all competitors (concurrently)
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
            message: `Dispatching agent to ${competitor.name}...`,
            data: { url: runUrl, goal: goalWithSources },
          });

          try {
            const runId = await submitRun(runUrl, goalWithSources);
            send({
              type: "submitting",
              competitor: competitor.name,
              message: `Agent dispatched for ${competitor.name} (run: ${runId.slice(0, 8)}...)`,
            });
            return {
              competitor,
              goal: goalWithSources,
              runId,
              competitorIndex: competitorIndex === -1 ? index : competitorIndex,
            };
          } catch (err) {
            send({
              type: "error",
              competitor: competitor.name,
              message: `Failed to dispatch agent for ${competitor.name}: ${err instanceof Error ? err.message : "Unknown error"}`,
            });
            return null;
          }
        });

        const runs = (await Promise.all(runRequests)).filter(
          (
            run
          ): run is {
            competitor: Competitor;
            goal: string;
            runId: string;
            competitorIndex: number;
          } => Boolean(run)
        );

        // Step 3: Poll for results (concurrently)
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
              const summary = await summarizeCompetitorResult(
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
