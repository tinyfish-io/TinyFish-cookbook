import { NextRequest, NextResponse } from 'next/server';
import { parseSearchIntent } from '@/lib/intent-parser';
import { searchResearchPapers } from '@/lib/search';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
    const { query, sources } = await req.json();
    const criteria = await parseSearchIntent(query);
    if (sources) criteria.sources = sources;
    const results = await searchResearchPapers(criteria);
    return NextResponse.json(results);
}
