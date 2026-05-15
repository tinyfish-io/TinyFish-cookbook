import { NextRequest, NextResponse } from 'next/server';
import { transcribeAudio } from '@/lib/whisper';
import { parseSearchIntent } from '@/lib/intent-parser';
import { searchResearchPapers } from '@/lib/search';
import { SearchCriteria, SourceType } from '@/lib/types';

export const maxDuration = 300;

const DEFAULT_SOURCES: SourceType[] = ['arxiv', 'pubmed', 'semantic_scholar', 'google_scholar', 'ieee'];

export async function POST(req: NextRequest) {
    const form = await req.formData();
    const audio = form.get('audio');
    if (!audio || !(audio instanceof File)) {
        return NextResponse.json({ error: 'audio file is required' }, { status: 400 });
    }
    const buffer = Buffer.from(await audio.arrayBuffer());
    const transcript = await transcribeAudio(buffer);
    const intent = await parseSearchIntent(transcript);

    // Map intent parser output to SearchCriteria
    const criteria: SearchCriteria = {
        topic: intent.topics?.[0] || intent.keywords?.[0] || transcript,
        keywords: intent.keywords || [],
        sources: DEFAULT_SOURCES,
        maxResults: 20,
        fullPrompt: transcript,
        dateRange: (intent.yearFrom || intent.yearTo) ? {
            from: intent.yearFrom ? String(intent.yearFrom) : undefined,
            to: intent.yearTo ? String(intent.yearTo) : undefined,
        } : undefined,
    };

    const results = await searchResearchPapers(criteria);
    return NextResponse.json({ ...results, transcript });
}
