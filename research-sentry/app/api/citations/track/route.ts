import { NextRequest, NextResponse } from 'next/server';
import { analyzeCitationTrend } from '@/lib/citation-tracker';

export async function POST(req: NextRequest) {
    try {
        const { paper } = await req.json();

        if (!paper) {
            return NextResponse.json({ error: 'Paper data required' }, { status: 400 });
        }

        const trackedData = await analyzeCitationTrend(paper);

        // In a real app, we would save this to a database here

        return NextResponse.json(trackedData);
    } catch (error) {
        console.error('Citation Tracking API Error:', error);
        return NextResponse.json({ error: 'Failed to track citation' }, { status: 500 });
    }
}
