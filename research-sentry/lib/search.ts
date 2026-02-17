import { SearchCriteria, SearchResult, SourceType, ResearchPaper } from './types';
import { aggregateAndDeduplicate } from './aggregator';
import { runMinoAutomation } from './mino';

/**
 * HYBRID SEARCH ENGINE
 * Primary: TinyFish Web Agent (Real-time, Deep Scraping)
 * Fallback: Direct API calls (Reliability)
 */

// ============================================
// UTILITIES (Robustness layer)
// ============================================

/**
 * Hyper-robust JSON parser that handles markdown blocks and recursive scanning
 */
function parseMinoResponse(rawResponse: any): any[] {
    // If it's already an array, just return it
    if (Array.isArray(rawResponse)) return rawResponse;

    // If it's a string, it might be stringified JSON or markdown
    if (typeof rawResponse === 'string') {
        try {
            // Remove markdown code blocks if present
            const cleanJson = rawResponse.replace(/```json\n?|```/g, '').trim();
            const parsed = JSON.parse(cleanJson);
            return findPapersArray(parsed);
        } catch (e) {
            console.error('[Mino-Parser] Failed to parse stringified response:', e);
            return [];
        }
    }

    // If it's an object, find the array within it
    if (rawResponse && typeof rawResponse === 'object') {
        return findPapersArray(rawResponse);
    }

    return [];
}

/**
 * Deep-scans an object for any array containing paper-like objects
 */
function findPapersArray(obj: any): any[] {
    if (Array.isArray(obj)) return obj;
    if (!obj || typeof obj !== 'object') return [];

    // Check common keys first for speed
    const fastKeys = ['papers', 'results', 'data', 'articles', 'items', 'result'];
    for (const key of fastKeys) {
        if (Array.isArray(obj[key])) return obj[key];

        // Sometimes the key contains stringified JSON
        if (typeof obj[key] === 'string' && (obj[key].includes('[') || obj[key].includes('{'))) {
            try {
                const inner = JSON.parse(obj[key].replace(/```json\n?|```/g, '').trim());
                const innerArray = findPapersArray(inner);
                if (innerArray.length > 0) return innerArray;
            } catch (e) { }
        }
    }

    // Recursive search for any array
    for (const key in obj) {
        if (Array.isArray(obj[key])) return obj[key];
        if (typeof obj[key] === 'object') {
            const nested = findPapersArray(obj[key]);
            if (nested.length > 0) return nested;
        }
    }
    return [];
}

// ============================================
// FALLBACKS (Reliability layer)
// ============================================

async function fallbackArxiv(topic: string): Promise<ResearchPaper[]> {
    try {
        const query = encodeURIComponent(topic);
        const res = await fetch(`https://export.arxiv.org/api/query?search_query=all:${query}&start=0&max_results=10`);
        const xml = await res.text();
        const entries = xml.split('<entry>').slice(1);
        return entries.map(entry => {
            const get = (tag: string) => {
                const m = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
                return m ? m[1].trim().replace(/\s+/g, ' ') : '';
            };
            const id = get('id').split('/abs/').pop() || '';
            return {
                id, title: get('title'), authors: (entry.match(/<name>([^<]+)<\/name>/g) || []).map(a => a.replace(/<\/?name>/g, '')),
                abstract: get('summary'), publishedDate: get('published').split('T')[0],
                source: 'arxiv' as SourceType, url: `https://arxiv.org/abs/${id}`, pdfUrl: `https://arxiv.org/pdf/${id}.pdf`, citations: 0
            };
        });
    } catch (e) { return []; }
}

async function fallbackSemanticScholar(topic: string): Promise<ResearchPaper[]> {
    try {
        const res = await fetch(`https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(topic)}&limit=10&fields=paperId,title,abstract,authors,year,citationCount,openAccessPdf`);
        if (!res.ok) return [];
        const data = await res.json();
        return (data.data || []).map((p: any) => ({
            id: p.paperId, title: p.title || 'Untitled', authors: p.authors?.map((a: any) => a.name) || ['Unknown'],
            abstract: p.abstract || 'No abstract', publishedDate: p.year ? `${p.year}-01-01` : new Date().toISOString().split('T')[0],
            source: 'semantic_scholar' as SourceType,
            url: `https://semanticscholar.org/paper/${p.paperId}`,
            pdfUrl: p.openAccessPdf?.url,
            citations: p.citationCount || 0
        }));
    } catch (e) { return []; }
}

// ============================================
// CORE MINO ENGINE
// ============================================

async function scrapeWithMino(
    url: string,
    goal: string,
    source: SourceType,
    stealth = false,
    timeoutMs?: number
): Promise<ResearchPaper[]> {
    const rawResult = await runMinoAutomation(url, goal, stealth, timeoutMs ? { timeoutMs } : undefined);

    let result = parseMinoResponse(rawResult);

    if (result.length === 0) {
        console.warn(`[TinyFish] ${source} return 0 papers. RAW STRUCTURE:`, JSON.stringify(rawResult).slice(0, 300));
        return [];
    }

    console.log(`[TinyFish] ${source} found ${result.length} papers via web automation`);

    return result
        .filter((p: any) => p && typeof p === 'object')
        .map((p: any) => {
        // Case-insensitive key lookup helper
        const getV = (keys: string[]) => {
            const lowerKeys = keys.map(k => k.toLowerCase());
            for (const actualKey in p) {
                if (lowerKeys.includes(actualKey.toLowerCase())) return p[actualKey];
            }
            return null;
        };

        const paperId = getV(['paperId', 'id', 'paper_id']);
        const arxivId = getV(['arxivId', 'arxiv_id', 'arxiv']);
        const pmid = getV(['pmid', 'pubmed_id']);
        const doi = getV(['doi']);

        const id = paperId || arxivId || pmid || doi || `${source}-${Date.now()}-${Math.random()}`;

        // Synthesize URLs if missing but ID is present
        let url = getV(['url', 'link', 'href', 'paperUrl', 'paperLink']) || '#';
        let pdfUrl = getV(['pdfUrl', 'pdfLink', 'pdf', 'fullText', 'pdf_url']);

        if (url === '#' || !url) {
            if (source === 'arxiv' && arxivId) url = `https://arxiv.org/abs/${arxivId}`;
            else if (source === 'pubmed' && pmid) url = `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
            else if (source === 'semantic_scholar' && paperId) url = `https://www.semanticscholar.org/paper/${paperId}`;
            else if (source === 'google_scholar' && p.title) url = `https://scholar.google.com/scholar?q=${encodeURIComponent(p.title)}`;
        }

        if (!pdfUrl) {
            if (source === 'arxiv' && arxivId) pdfUrl = `https://arxiv.org/pdf/${arxivId}.pdf`;
        }
        // Normalize arXiv pdf URLs (Mino often returns without ".pdf")
        if (source === 'arxiv' && typeof pdfUrl === 'string') {
            if (pdfUrl.includes('arxiv.org/abs/')) {
                const idPart = pdfUrl.split('arxiv.org/abs/')[1]?.split(/[?#]/)[0];
                if (idPart) pdfUrl = `https://arxiv.org/pdf/${idPart}.pdf`;
            } else if (pdfUrl.includes('arxiv.org/pdf/') && !pdfUrl.endsWith('.pdf')) {
                pdfUrl = `${pdfUrl.split(/[?#]/)[0]}.pdf`;
            }
        }

        // Trace logging for debugging
        console.log(`[Link-Trace] ${source}:${p.title?.substring(0, 15)} | Link: ${url !== '#'} | PDF: ${!!pdfUrl}`);

        return {
            id,
            title: p.title || p.header || 'Untitled',
            authors: Array.isArray(p.authors) ? p.authors : (p.authors ? [p.authors] : ['Unknown']),
            abstract: p.abstract || p.snippet || p.summary || 'No abstract available',
            publishedDate: p.publishedDate || p.publicationDate || p.date || (p.year ? `${p.year}-01-01` : new Date().toISOString().split('T')[0]),
            source: source,
            url,
            pdfUrl: pdfUrl || undefined,
            citations: p.citations || p.citationCount || p.downloads || 0,
            doi: doi
        };
        });
}

// Scraper Wrappers

async function scrapeArxiv(criteria: SearchCriteria, timeoutMs?: number): Promise<ResearchPaper[]> {
    const goal = `Search ArXiv for "${criteria.topic}". Extract top 5 papers. For each paper, MUST extract: title, authors array, abstract, publishedDate, arxivId, url, and pdfUrl. Return JSON array. ${criteria.fullPrompt ? `Instruction: ${criteria.fullPrompt}` : ''}`;
    const minoResults = await scrapeWithMino('https://arxiv.org/search', goal, 'arxiv', false, timeoutMs);
    if (minoResults.length > 0) return minoResults;
    console.log(`[Mino-Search] ArXiv zero results. Triggering fallback API...`);
    return fallbackArxiv(criteria.topic);
}

async function scrapePubmed(criteria: SearchCriteria, timeoutMs?: number): Promise<ResearchPaper[]> {
    const goal = `Search PubMed for "${criteria.topic}". Extract top 5 papers. MUST extract: title, authors array, abstract, pmid, and link (url). Return JSON array.`;
    const minoResults = await scrapeWithMino('https://pubmed.ncbi.nlm.nih.gov/', goal, 'pubmed', false, timeoutMs);
    if (minoResults.length > 0) return minoResults;
    return fallbackSemanticScholar(`${criteria.topic} pubmed`);
}

async function scrapeSemanticScholar(criteria: SearchCriteria, timeoutMs?: number): Promise<ResearchPaper[]> {
    const goal = `Search Semantic Scholar for "${criteria.topic}". Extract top 5 papers. MUST extract: title, authors array, abstract, year, paperId, url, and pdfUrl. Return JSON array. ${criteria.fullPrompt ? `Instruction: ${criteria.fullPrompt}` : ''}`;
    const minoResults = await scrapeWithMino('https://www.semanticscholar.org/', goal, 'semantic_scholar', false, timeoutMs);
    if (minoResults.length > 0) return minoResults;
    return fallbackSemanticScholar(criteria.topic);
}

async function scrapeGoogleScholar(criteria: SearchCriteria, timeoutMs?: number): Promise<ResearchPaper[]> {
    const searchUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(criteria.topic)}`;
    const goal = `Extract papers from this Google Scholar page: title, authors, snippet (abstract), citations count, link. Return JSON array.`;
    return scrapeWithMino(searchUrl, goal, 'google_scholar', true, timeoutMs);
}

async function scrapeIEEE(criteria: SearchCriteria, timeoutMs?: number): Promise<ResearchPaper[]> {
    const goal = `Search IEEE Xplore for "${criteria.topic}". Extract first 5 papers: title, authors, abstract, doi. Return JSON array.`;
    const minoResults = await scrapeWithMino('https://ieeexplore.ieee.org/', goal, 'ieee', true, timeoutMs);
    if (minoResults.length > 0) return minoResults;
    return fallbackSemanticScholar(`${criteria.topic} ieee`);
}

async function scrapeSSRN(criteria: SearchCriteria, timeoutMs?: number): Promise<ResearchPaper[]> {
    const goal = `Search SSRN for "${criteria.topic}". Extract top 5 papers: title, authors, abstract. Return JSON.`;
    return scrapeWithMino('https://www.ssrn.com/', goal, 'ssrn', false, timeoutMs);
}

async function scrapeCORE(criteria: SearchCriteria, timeoutMs?: number): Promise<ResearchPaper[]> {
    const goal = `Search CORE for "${criteria.topic}". Extract 5 results with title, abstract, link. Return JSON.`;
    return scrapeWithMino('https://core.ac.uk/', goal, 'core', false, timeoutMs);
}

async function scrapeDOAJ(criteria: SearchCriteria, timeoutMs?: number): Promise<ResearchPaper[]> {
    const goal = `Search DOAJ for "${criteria.topic}". Extract 5 articles with title, abstract, link. Return JSON.`;
    return scrapeWithMino('https://doaj.org/', goal, 'doaj', false, timeoutMs);
}

async function scrapeSource(source: string, criteria: SearchCriteria, timeoutMs?: number): Promise<ResearchPaper[]> {
    const s = source.toLowerCase().replace(/[\s_]+/g, '');
    switch (s) {
        case 'arxiv': return scrapeArxiv(criteria, timeoutMs);
        case 'pubmed': return scrapePubmed(criteria, timeoutMs);
        case 'semanticscholar': return scrapeSemanticScholar(criteria, timeoutMs);
        case 'googlescholar': return scrapeGoogleScholar(criteria, timeoutMs);
        case 'ieee': case 'ieeexplore': return scrapeIEEE(criteria, timeoutMs);
        case 'ssrn': return scrapeSSRN(criteria, timeoutMs);
        case 'core': return scrapeCORE(criteria, timeoutMs);
        case 'doaj': return scrapeDOAJ(criteria, timeoutMs);
        default: return [];
    }
}

export async function searchResearchPapers(criteria: SearchCriteria): Promise<SearchResult> {
    console.log(`\n=================================================`);
    console.log(`DISCOVERY: "${criteria.topic}"`);
    console.log(`SOURCES: ${criteria.sources.join(', ')}`);
    console.log(`=================================================`);

    // Prevent one slow portal from forcing a platform timeout.
    // Each source gets a time budget for Mino automation.
    const perSourceTimeoutMs = 40_000;

    const results = await Promise.all(
        criteria.sources.map((s) =>
            scrapeSource(s, criteria, perSourceTimeoutMs).catch((e: any) => {
                console.error(`[Search/${s}] Failed:`, e?.message);
                return [];
            })
        )
    );

    const papers = aggregateAndDeduplicate(results);

    console.log(`\n=================================================`);
    console.log(`TOTAL DISCOVERY YIELD: ${papers.length}`);
    console.log(`=================================================\n`);

    return {
        query: criteria.topic,
        papers: papers.slice(0, criteria.maxResults),
        totalFound: papers.length,
    };
}
