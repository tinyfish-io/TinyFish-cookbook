import { analyzeCode, generateSearchQueries } from './openrouter';
import { executeSearches } from './search';
import { startMinoAgent } from './mino-client';
import { buildGitHubGoal, buildSOReasoningGoal } from './goal-builder';
import { AGENT_TIMEOUT_MS } from './constants';
import type { CodeAnalysis, OrchestratorEvent, SearchResult, ReferenceData } from './types';

const encoder = new TextEncoder();

function emitEvent(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  event: OrchestratorEvent
) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  writer.write(encoder.encode(payload)).catch(() => {
    // Stream may be closed by client — ignore
  });
}

function makeAgentId(index: number, platform: string): string {
  return `agent-${platform}-${index}-${Date.now()}`;
}

function launchAgent(
  agentId: string,
  searchResult: SearchResult,
  analysis: CodeAnalysis,
  writer: WritableStreamDefaultWriter<Uint8Array>
): Promise<void> {
  return new Promise((resolve) => {
    // Build the appropriate goal
    const config =
      searchResult.platform === 'github'
        ? buildGitHubGoal(searchResult.url, analysis)
        : buildSOReasoningGoal(searchResult, analysis);

    emitEvent(writer, {
      type: 'agent_connecting',
      data: {
        id: agentId,
        url: searchResult.url,
        platform: searchResult.platform,
        title: searchResult.title,
      },
    });

    let controller: AbortController;

    // Timeout
    const timeout = setTimeout(() => {
      controller?.abort();
      emitEvent(writer, {
        type: 'agent_error',
        data: { id: agentId, error: 'Agent timed out after 6 minutes' },
      });
      resolve();
    }, AGENT_TIMEOUT_MS);

    controller = startMinoAgent(config, {
      onStep(event) {
        const message =
          event.message || event.purpose || event.action || 'Working...';
        emitEvent(writer, {
          type: 'agent_step',
          data: { id: agentId, step: message },
        });
      },

      onStreamingUrl(url) {
        emitEvent(writer, {
          type: 'agent_streaming_url',
          data: { id: agentId, streamingUrl: url },
        });
      },

      onComplete(resultJson) {
        clearTimeout(timeout);
        const result = resultJson as ReferenceData;
        // Ensure required fields have defaults
        const normalized: ReferenceData = {
          sourceUrl: result.sourceUrl || searchResult.url,
          platform: searchResult.platform,
          title: result.title || searchResult.title,
          relevanceScore: result.relevanceScore ?? 50,
          alignmentExplanation: result.alignmentExplanation || '',
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
        emitEvent(writer, {
          type: 'agent_complete',
          data: { id: agentId, result: normalized },
        });
        resolve();
      },

      onError(error) {
        clearTimeout(timeout);
        emitEvent(writer, {
          type: 'agent_error',
          data: { id: agentId, error },
        });
        resolve();
      },
    });
  });
}

export async function runPipeline(
  code: string,
  writer: WritableStreamDefaultWriter<Uint8Array>
): Promise<void> {
  try {
    // Stage 1: Analyze code + generate queries
    const analysis = await analyzeCode(code);
    const queries = await generateSearchQueries(analysis);

    emitEvent(writer, {
      type: 'analysis_complete',
      data: {
        analysis,
        queries,
      },
    });

    // Stage 2: Execute indexed searches
    const searchResults = await executeSearches(queries);

    emitEvent(writer, {
      type: 'search_complete',
      data: {
        results: searchResults,
      },
    });

    if (searchResults.length === 0) {
      emitEvent(writer, {
        type: 'pipeline_complete',
        data: { message: 'No search results found' },
      });
      return;
    }

    // Stage 3: Launch parallel Mino agents
    const agentPromises = searchResults.map((result, index) => {
      const agentId = makeAgentId(index, result.platform);
      return launchAgent(agentId, result, analysis, writer);
    });

    await Promise.allSettled(agentPromises);

    // Stage 4: Pipeline complete
    emitEvent(writer, {
      type: 'pipeline_complete',
      data: { message: 'All agents finished' },
    });
  } catch (error) {
    emitEvent(writer, {
      type: 'pipeline_error',
      data: { error: (error as Error).message },
    });
  }
}
