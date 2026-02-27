import { NextRequest, NextResponse } from 'next/server';
import { transcribeAudio } from '@/lib/whisper';
import { parseSearchIntent } from '@/lib/intent-parser';
import { searchResearchPapers } from '@/lib/search';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
    const form = await req.formData();
    const audio = form.get('audio');
    if (!audio || !(audio instanceof File)) {
        return NextResponse.json({ error: 'audio file is required' }, { status: 400 });
    }
    const buffer = Buffer.from(await audio.arrayBuffer());
    const transcript = await transcribeAudio(buffer);
    const criteria = await parseSearchIntent(transcript);
    const results = await searchResearchPapers(criteria);
    return NextResponse.json({ ...results, transcript });
}
