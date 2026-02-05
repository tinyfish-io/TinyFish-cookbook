import { NextRequest, NextResponse } from 'next/server';
import { comparePapers } from '@/lib/comparator';

export async function POST(req: NextRequest) {
    try {
        const { papers } = await req.json();

        if (!papers || papers.length < 2) {
            return NextResponse.json({ error: 'Select at least 2 papers to compare' }, { status: 400 });
        }

        const comparison = await comparePapers(papers);

        return NextResponse.json(comparison);
    } catch (error) {
        console.error('Comparison API Error:', error);
        return NextResponse.json({ error: 'Failed to generate comparison' }, { status: 500 });
    }
}
