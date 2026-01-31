import { NextRequest, NextResponse } from 'next/server';
import { generatePaperSummary } from '@/lib/summarizer';

export const maxDuration = 120; // Allow time for generation + synthesis

export async function POST(req: NextRequest) {
    try {
        const { paper, length } = await req.json();

        if (!paper) {
            return NextResponse.json({ error: 'Paper data required' }, { status: 400 });
        }

        const summary = await generatePaperSummary(paper, length);
        return NextResponse.json({ summary });

    } catch (error) {
        console.error('Summary API Error:', error);
        return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
    }
}
