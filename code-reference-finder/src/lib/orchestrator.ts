import { TinyFish, EventType, RunStatus } from "@tiny-fish/sdk";
import { analyzeCode, generateSearchQueries } from "./gemini-client";
import { executeSearches } from "./search";
import { buildGitHubGoal, buildSOReasoningGoal } from "./goal-builder";
import { AGENT_TIMEOUT_MS } from "./constants";
import type { CodeAnalysis, OrchestratorEvent, SearchResult, ReferenceData } from "./types";

const encoder = new TextEncoder();

function emitEvent(
  controller: ReadableStreamDefaultController<Uint8Array>,
  event: OrchestratorEvent
) {
  try {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
  } catch {
    // Stream may be closed by client — ignore
  }
}

function makeAgentId(index: number, platform: string): string {
  return `agent-${platform}-${index}-${Date.now()}`;
}

async function launchAgent(
  agentId: string,
  searchResult: SearchResult,
  analysis: CodeAnalysis,
  apiKey: string,
  controller: ReadableStreamDefaultController<Uint8Array>
): Promise<void> {
  const config =
    searchResult.platform === "github"
      ? buildGitHubGoal(searchResult.url, analysis)
      : buildSOReasoningGoal(searchResult, analysis);

  emitEvent(controller, {
    type: "agent_connecting",
    data: {
      id: agentId,
      url: searchResult.url,
      platform: searchResult.platform,
      title: searchResult.title,
    },
  });

  const timeoutPromise = new Promise<void>((resolve) => {
    setTimeout(() => {
      emitEvent(controller, {
        type: "agent_error",
        data: { id: agentId, error: "Agent timed out after 6 minutes" },
      });
      resolve();
    }, AGENT_TIMEOUT_MS);
  });

  const agentPromise = (async () => {
    try {
      const client = new TinyFish({ apiKey });
      const tfStream = await client.agent.stream({ url: config.url, goal: config.goal });

      for await (const event of tfStream) {
        if (event.type === EventType.STREAMING_URL) {
          emitEvent(controller, {
            type: "agent_streaming_url",
            data: { id: agentId, streamingUrl: event.streaming_url },
          });
        } else if (event.type === EventType.PROGRESS) {
          emitEvent(controller, {
            type: "agent_step",
            data: { id: agentId, step: event.purpose },
          });
        } else if (event.type === EventType.COMPLETE) {
          if (event.status === RunStatus.COMPLETED) {
            // COMPLETED only means the browser ran without crashing
            // — always validate result content, not just the status
            const result = (event.result ?? {}) as ReferenceData;

            const normalized: ReferenceData = {
              sourceUrl: result.sourceUrl || searchResult.url,
              platform: searchResult.platform,
              title: result.title || searchResult.title,
              relevanceScore: result.relevanceScore ?? 50,
              alignmentExplanation: result.alignmentExplanation || "",
              codeSnippets: Array.isArray(result.codeSnippets) ? result.codeSnippets : [],
              repoName: result.repoName,
              repoDescription: result.repoDescription,
              stars: result.stars,
              repoLanguage: result.repoLanguage,
              readmeExcerpt: result.readmeExcerpt,
              questionTitle: result.questionTitle,
              votes: result.votes,
              answerSnippets: result.answerSnippets,
              tags: result.tags,
              isAccepted: result.isAccepted,
            };

            emitEvent(controller, {
              type: "agent_complete",
              data: { id: agentId, result: normalized },
            });
          } else {
            emitEvent(controller, {
              type: "agent_error",
              data: { id: agentId, error: event.error?.message || "Agent run failed" },
            });
          }
          break;
        }
      }
    } catch (error) {
      emitEvent(controller, {
        type: "agent_error",
        data: { id: agentId, error: (error as Error).message },
      });
    }
  })();

  await Promise.race([agentPromise, timeoutPromise]);
}

export async function runPipeline(
  code: string,
  controller: ReadableStreamDefaultController<Uint8Array>
): Promise<void> {
  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) {
    emitEvent(controller, {
      type: "pipeline_error",
      data: { error: "Missing TINYFISH_API_KEY" },
    });
    return;
  }

  try {
    // Stage 1: Analyze code + generate queries via Gemini
    const analysis = await analyzeCode(code);
    const queries = await generateSearchQueries(analysis);

    emitEvent(controller, {
      type: "analysis_complete",
      data: { analysis, queries },
    });

    // Stage 2: Search via TinyFish Search API
    const searchResults = await executeSearches(queries);

    emitEvent(controller, {
      type: "search_complete",
      data: { results: searchResults },
    });

    if (searchResults.length === 0) {
      emitEvent(controller, {
        type: "pipeline_complete",
        data: { message: "No search results found" },
      });
      return;
    }

    // Stage 3: Launch parallel TinyFish agents — one per search result
    await Promise.allSettled(
      searchResults.map((result, index) => {
        const agentId = makeAgentId(index, result.platform);
        return launchAgent(agentId, result, analysis, apiKey, controller);
      })
    );

    // Stage 4: Done
    emitEvent(controller, {
      type: "pipeline_complete",
      data: { message: "All agents finished" },
    });
  } catch (error) {
    emitEvent(controller, {
      type: "pipeline_error",
      data: { error: (error as Error).message },
    });
  }
}
