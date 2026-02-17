import { NextRequest, NextResponse } from 'next/server';
import { parseTestDescription } from '@/lib/ai-client';

export async function POST(request: NextRequest) {
  try {
    const { plainEnglish, websiteUrl } = await request.json();

    if (!plainEnglish || !websiteUrl) {
      return NextResponse.json(
        { error: 'plainEnglish and websiteUrl are required' },
        { status: 400 }
      );
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OPENROUTER_API_KEY not configured' },
        { status: 500 }
      );
    }

    const result = await parseTestDescription(plainEnglish, websiteUrl);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error parsing test description:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to parse test description' },
      { status: 500 }
    );
  }
}
