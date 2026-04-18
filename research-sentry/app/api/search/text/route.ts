import { NextRequest } from 'next/server';
import { parseSearchIntent } from '@/lib/intent-parser';
import { scrapeSourceStreaming } from '@/lib/search';
import type { SearchCriteria, SourceType } from '@/lib/types';

export const maxDuration = 300;

const DEFAULT_SOURCES: SourceType[] = ['arxiv', 'pubmed', 'semantic_scholar'];

export async function POST(req: NextRequest) {
    const { query, sources } = await req.json();

    // Parse intent — returns { keywords, topics, authors, yearFrom, yearTo, intent }
    const parsed = await parseSearchIntent(query);

    // Build a proper SearchCriteria — topic is the original query or first keyword/topic
    const topic: string =
        query ||
        (Array.isArray(parsed.topics) && parsed.topics[0]) ||
        (Array.isArray(parsed.keywords) && parsed.keywords[0]) ||
        query;

    const criteria: SearchCriteria = {
        topic,
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [query],
        sources: (sources as SourceType[]) || DEFAULT_SOURCES,
        maxResults: 20,
        fullPrompt: query,
    };

    const encoder = new TextEncoder();
    const sseData = (payload: unknown) => encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);

    const stream = new ReadableStream({
        async start(controller) {
            let closed = false;
            const safeEnqueue = (payload: unknown) => {
                if (!closed) controller.enqueue(sseData(payload));
            };
            const safeClose = () => {
                if (!closed) { closed = true; controller.close(); }
            };

            safeEnqueue({ type: 'SEARCH_STARTED', total: criteria.sources.length, query: topic });

            const perSourceTimeoutMs = 40_000;
            let totalFound = 0;

            const tasks = criteria.sources.map((source: SourceType) =>
                scrapeSourceStreaming(source, criteria, perSourceTimeoutMs)
                    .then(papers => {
                        totalFound += papers.length;
                        safeEnqueue({ type: 'SOURCE_COMPLETE', source, papers, count: papers.length });
                    })
                    .catch(err => {
                        console.error(`[Search/${source}] Failed:`, err?.message);
                        safeEnqueue({ type: 'SOURCE_ERROR', source, error: err?.message });
                    })
            );

            await Promise.allSettled(tasks);

            safeEnqueue({ type: 'SEARCH_COMPLETE', totalFound });
            safeClose();
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    });
}
