import { ResearchPaper } from './types';

export function aggregateAndDeduplicate(results: ResearchPaper[][]): ResearchPaper[] {
    const all = results.flat();
    const seen = new Map();
    for (const p of all) {
        const key = p.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 80);
        if (key && !seen.has(key)) seen.set(key, p);
    }
    return Array.from(seen.values()).sort((a, b) => (b.citations || 0) - (a.citations || 0));
}
