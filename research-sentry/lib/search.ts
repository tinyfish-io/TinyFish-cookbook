import { SearchCriteria, SearchResult, SourceType, ResearchPaper } from './types';
import { aggregateAndDeduplicate } from './aggregator';
import { runTinyFishAutomation } from './tinyfish';

// ── JSON parsing ──────────────────────────────────────────────────────────────

function parseTinyFishResponse(raw: any): any[] {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw.replace(/```json\n?|```/g, '').trim());
            return findPapersArray(parsed);
        } catch { return []; }
    }
    if (raw && typeof raw === 'object') return findPapersArray(raw);
    return [];
}

function findPapersArray(obj: any): any[] {
    if (Array.isArray(obj)) return obj;
    if (!obj || typeof obj !== 'object') return [];
    for (const key of ['papers', 'results', 'data', 'articles', 'items', 'result']) {
        if (Array.isArray(obj[key])) return obj[key];
    }
    for (const key in obj) {
        if (Array.isArray(obj[key])) return obj[key];
        if (typeof obj[key] === 'object') {
            const nested = findPapersArray(obj[key]);
            if (nested.length > 0) return nested;
        }
    }
    return [];
}

// ── Fallbacks ─────────────────────────────────────────────────────────────────

async function fallbackArxiv(topic: string): Promise<ResearchPaper[]> {
    try {
        const res = await fetch(`https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(topic)}&start=0&max_results=10`);
        const xml = await res.text();
        return xml.split('<entry>').slice(1).map(entry => {
            const get = (tag: string) => { const m = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`)); return m ? m[1].trim().replace(/\s+/g, ' ') : ''; };
            const id = get('id').split('/abs/').pop() || '';
            return { id, title: get('title'), authors: (entry.match(/<name>([^<]+)<\/name>/g) || []).map(a => a.replace(/<\/?name>/g, '')), abstract: get('summary'), publishedDate: get('published').split('T')[0], source: 'arxiv' as SourceType, url: `https://arxiv.org/abs/${id}`, pdfUrl: `https://arxiv.org/pdf/${id}.pdf`, citations: 0 };
        });
    } catch { return []; }
}

async function fallbackSemanticScholar(topic: string): Promise<ResearchPaper[]> {
    try {
        const res = await fetch(`https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(topic)}&limit=10&fields=paperId,title,abstract,authors,year,citationCount,openAccessPdf`);
        if (!res.ok) return [];
        const data = await res.json();
        return (data.data || []).map((p: any) => ({ id: p.paperId, title: p.title || 'Untitled', authors: p.authors?.map((a: any) => a.name) || ['Unknown'], abstract: p.abstract || 'No abstract', publishedDate: p.year ? `${p.year}-01-01` : new Date().toISOString().split('T')[0], source: 'semantic_scholar' as SourceType, url: `https://semanticscholar.org/paper/${p.paperId}`, pdfUrl: p.openAccessPdf?.url, citations: p.citationCount || 0 }));
    } catch { return []; }
}

// ── Tight goal prompts ────────────────────────────────────────────────────────

const GOALS: Record<string, (topic: string) => string> = {
    arxiv: (t) => `Go to https://arxiv.org/search/?query=${encodeURIComponent(t)}&searchtype=all — you are already on the results page. DO NOT navigate elsewhere. Extract the first 5 papers visible on screen RIGHT NOW. For each paper return: title, authors (array), abstract, arxivId, publishedDate, url, pdfUrl. Return ONLY a JSON array. No explanations.`,

    pubmed: (t) => `Go to https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(t)} — you are on the results page. DO NOT click any links or navigate away. Extract the first 5 articles visible. For each: title, authors (array), abstract, pmid, url. Return ONLY a JSON array. No explanations.`,

    semantic_scholar: (t) => `Go to https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(t)}&limit=5&fields=paperId,title,abstract,authors,year,citationCount,openAccessPdf — this is a JSON API. Parse the response and return the papers array as-is. Return ONLY valid JSON. No explanations.`,

    google_scholar: (t) => `Go to https://scholar.google.com/scholar?q=${encodeURIComponent(t)} — you are on the results page. DO NOT click links. Extract the first 5 results visible: title, authors (array), snippet (as abstract), citations count, link (url). Return ONLY a JSON array. No explanations.`,

    ieee: (t) => `Go to https://ieeexplore.ieee.org/search/searchresult.jsp?queryText=${encodeURIComponent(t)} — you are on the results page. DO NOT navigate away. Extract the first 5 papers: title, authors (array), abstract, doi, url. Return ONLY a JSON array. No explanations.`,

    ssrn: (t) => `Go to https://www.ssrn.com/index.cfm/en/ssrn-search-results/?query=${encodeURIComponent(t)} — you are on the results page. DO NOT navigate away. Extract the first 5 papers: title, authors (array), abstract, url. Return ONLY a JSON array. No explanations.`,

    core: (t) => `Go to https://core.ac.uk/search?q=${encodeURIComponent(t)} — you are on the results page. DO NOT navigate away. Extract the first 5 results: title, authors (array), abstract, url. Return ONLY a JSON array. No explanations.`,

    doaj: (t) => `Go to https://doaj.org/search/articles?source=%7B%22query%22%3A%7B%22query_string%22%3A%7B%22query%22%3A%22${encodeURIComponent(t)}%22%7D%7D%7D — you are on the results page. DO NOT navigate away. Extract the first 5 articles: title, authors (array), abstract, url. Return ONLY a JSON array. No explanations.`,
};

// ── Core scraper ──────────────────────────────────────────────────────────────

async function scrapeWithTinyFish(url: string, goal: string, source: SourceType, stealth = false, timeoutMs?: number): Promise<ResearchPaper[]> {
    const rawResult = await runTinyFishAutomation(url, goal, stealth, timeoutMs ? { timeoutMs } : undefined);
    const result = parseTinyFishResponse(rawResult);
    if (result.length === 0) return [];

    return result.filter((p: any) => p && typeof p === 'object').map((p: any) => {
        const getV = (keys: string[]) => { for (const k of keys) { for (const ak in p) { if (ak.toLowerCase() === k.toLowerCase()) return p[ak]; } } return null; };
        const paperId = getV(['paperId', 'id', 'paper_id']);
        const arxivId = getV(['arxivId', 'arxiv_id', 'arxiv']);
        const pmid = getV(['pmid', 'pubmed_id']);
        const doi = getV(['doi']);
        const id = paperId || arxivId || pmid || doi || `${source}-${Date.now()}-${Math.random()}`;

        let paperUrl = getV(['url', 'link', 'href', 'paperUrl', 'paperLink']) || '#';
        let pdfUrl = getV(['pdfUrl', 'pdfLink', 'pdf', 'fullText', 'pdf_url']);

        if (paperUrl === '#' || !paperUrl) {
            if (source === 'arxiv' && arxivId) paperUrl = `https://arxiv.org/abs/${arxivId}`;
            else if (source === 'pubmed' && pmid) paperUrl = `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
            else if (source === 'semantic_scholar' && paperId) paperUrl = `https://www.semanticscholar.org/paper/${paperId}`;
            else if (p.title) paperUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(p.title)}`;
        }
        if (!pdfUrl && source === 'arxiv' && arxivId) pdfUrl = `https://arxiv.org/pdf/${arxivId}.pdf`;
        if (source === 'arxiv' && typeof pdfUrl === 'string' && pdfUrl.includes('arxiv.org/abs/')) {
            const idPart = pdfUrl.split('arxiv.org/abs/')[1]?.split(/[?#]/)[0];
            if (idPart) pdfUrl = `https://arxiv.org/pdf/${idPart}.pdf`;
        }

        return {
            id,
            title: p.title || p.header || 'Untitled',
            authors: Array.isArray(p.authors) ? p.authors : (p.authors ? [p.authors] : ['Unknown']),
            abstract: p.abstract || p.snippet || p.summary || 'No abstract available',
            publishedDate: p.publishedDate || p.publicationDate || p.date || (p.year ? `${p.year}-01-01` : new Date().toISOString().split('T')[0]),
            source,
            url: paperUrl,
            pdfUrl: pdfUrl || undefined,
            citations: p.citations || p.citationCount || p.downloads || 0,
            doi,
        };
    });
}

// ── Source scrapers ───────────────────────────────────────────────────────────

export async function scrapeSourceStreaming(source: string, criteria: SearchCriteria, timeoutMs?: number): Promise<ResearchPaper[]> {
    const s = source.toLowerCase().replace(/[\s_]+/g, '');
    const topic = criteria.topic;

    // Map source key to goal function
    const goalKey = s === 'semanticscholar' ? 'semantic_scholar' : s;
    const goalFn = GOALS[goalKey];
    if (!goalFn) return [];

    const goal = goalFn(topic);
    const stealth = s === 'googlescholar' || s === 'ieee';

    // Extract the real target URL from the goal so the agent starts there directly
    const urlMatch = goal.match(/Go to (https?:\/\/[^\s—]+)/);
    const startUrl = urlMatch ? urlMatch[1] : 'https://www.google.com';

    const tinyFishResults = await scrapeWithTinyFish(startUrl, goal, s as SourceType, stealth, timeoutMs);
    if (tinyFishResults.length > 0) return tinyFishResults;

    // Fallback
    if (s === 'arxiv') return fallbackArxiv(topic);
    if (s === 'pubmed' || s === 'semanticscholar' || s === 'ieee') return fallbackSemanticScholar(topic);
    return [];
}

// ── Legacy sync export (for other routes that call searchResearchPapers) ──────

export async function searchResearchPapers(criteria: SearchCriteria): Promise<SearchResult> {
    const perSourceTimeoutMs = 40_000;
    const results = await Promise.all(
        criteria.sources.map((s: string) =>
            scrapeSourceStreaming(s, criteria, perSourceTimeoutMs).catch(() => [] as ResearchPaper[])
        )
    );
    const papers = aggregateAndDeduplicate(results);
    return { query: criteria.topic, papers: papers.slice(0, criteria.maxResults), totalFound: papers.length };
}
