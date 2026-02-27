import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => ({}));
    const papers = body?.papers;
    if (!Array.isArray(papers)) {
        return NextResponse.json({ error: 'papers[] is required' }, { status: 400 });
    }

    const escapeBibtex = (value: string) =>
        String(value ?? '')
            .replace(/\\/g, '\\\\')
            .replace(/[{}]/g, '\\$&');

    const yearFrom = (dateValue: string) =>
        String(dateValue ?? '').match(/\b(19|20)\d{2}\b/)?.[0] ?? '';

    const bib = papers.map((p: any, i: number) => {
        const key = 'paper' + i;
        return '@article{' + key +
            ',\n  title={' + escapeBibtex(p.title) +
            '},\n  author={' + escapeBibtex(p.authors?.join(' and ') || '') +
            '},\n  year={' + yearFrom(p.publishedDate) +
            '},\n  url={' + escapeBibtex(p.url) + '}\n}';
    }).join('\n\n');
    return new NextResponse(bib, {
        headers: { 'Content-Type': 'application/x-bibtex', 'Content-Disposition': 'attachment; filename=papers.bib' }
    });
}
