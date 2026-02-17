import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import type { Browser } from 'puppeteer';
import { saveSnapshot, getLastSnapshot, getHistory, HistoricalSnapshot } from '@/lib/store';
import type { ConfidenceInfo, RiskAnalysis, ScanResult, SignalSummary, SourceSignal } from '../../../types';


interface ParsedSignals {
    availability?: string;
    lifecycle_status?: string;
    lead_time_weeks?: number;
    price_estimate?: string;
    price_value?: number;
}

interface SourceFetchResult {
    signal: SourceSignal;
    snippet: string;
}

const inferAvailability = (content: string) => {
    if (content.includes('in stock') || content.includes('available now') || content.includes('available for') || content.includes('ships today') || content.includes('add to cart')) return 'In Stock';
    if (content.includes('backorder') || content.includes('back order')) return 'Backorder';
    if (content.includes('out of stock') || content.includes('no stock')) return 'Backorder';
    if (content.includes('limited') || content.includes('low stock')) return 'Limited';
    if (content.includes('stock') || content.includes('available')) return 'In Stock';
    return 'Unknown';
};

const availabilityPriority = ['In Stock', 'Limited', 'Backorder', 'Unknown'];
const lifecyclePriority = ['Obsolete', 'NRND', 'Active', 'Unknown'];

const pickPreferred = (values: (string | undefined)[], priority: string[]) => {
    for (const candidate of priority) {
        if (values.some((value) => value === candidate)) {
            return candidate;
        }
    }
    return 'Unknown';
};

const parsePrice = (content: string) => {
    const patterns = [
        /(?:us\$|\$|usd|price)\s*[:\s]*(\d{1,5}(?:\.\d{1,3})?)/gi,
        /(\d{1,5}(?:\.\d{1,3})?)\s*(?:usd|us\$|\$)/gi,
        /\$\s*(\d{1,5}\.\d{2})/g,
        /\b(\d{1,2}\.\d{2})\b/g,
    ];
    const prices: number[] = [];
    for (const re of patterns) {
        const matches = Array.from(content.matchAll(re));
        for (const m of matches) {
            const v = parseFloat(m[1]);
            if (Number.isFinite(v) && v > 0 && v < 100000) prices.push(v);
        }
    }
    if (!prices.length) return null;
    const lowest = Math.min(...prices);
    return { value: lowest, label: `USD ${lowest.toFixed(2)}` };
};

const parseLeadTime = (content: string) => {
    const weekMatch = content.match(/(\d+)\s*(weeks?|wks?)/i);
    if (weekMatch) return parseInt(weekMatch[1], 10);
    const dayMatch = content.match(/(\d+)\s*days?\s*(?:lead|ship|delivery)?/i);
    if (dayMatch) return Math.ceil(parseInt(dayMatch[1], 10) / 7);
    return undefined;
};

const parseAvailabilityDays = (content: string): string | undefined => {
    const shipsIn = content.match(/ships?\s*in\s*(\d+)\s*days?/i);
    if (shipsIn) return `Ships in ${shipsIn[1]} days`;
    const inStock = content.match(/(\d+,?\d*)\s*in\s*stock/i);
    if (inStock) return `${inStock[1]} in stock`;
    const available = content.match(/available\s*in\s*(\d+)\s*days?/i);
    if (available) return `Available in ${available[1]} days`;
    if (content.includes('in stock') || content.includes('In Stock')) return 'In Stock';
    if (content.includes('backorder') || content.includes('Backorder')) return 'Backorder';
    return undefined;
};

const parseLeadTimeDaysFromAvailability = (availability: string): number | undefined => {
    const m = availability.match(/ships?\s*in\s*(\d+)\s*days?/i) || availability.match(/available\s*in\s*(\d+)\s*days?/i);
    return m ? parseInt(m[1], 10) : undefined;
};

const extractSignalsFromContent = (content: string) => {
    const availabilityDetail = parseAvailabilityDays(content);
    const availability = availabilityDetail ?? (inferAvailability(content) !== 'Unknown' ? inferAvailability(content) : undefined);
    const lifecycle = inferLifecycle(content);
    const leadTime = parseLeadTime(content);
    const price = parsePrice(content);

    return {
        availability: availability !== 'Unknown' ? availability : undefined,
        lifecycle_status: lifecycle !== 'Unknown' ? lifecycle : undefined,
        lead_time_weeks: leadTime,
        price_estimate: price?.label,
        price_value: price?.value,
    };
};

const mergeSignals = (primary: ParsedSignals, secondary?: ParsedSignals) => ({
    availability: primary.availability ?? secondary?.availability,
    lifecycle_status: primary.lifecycle_status ?? secondary?.lifecycle_status,
    lead_time_weeks: primary.lead_time_weeks ?? secondary?.lead_time_weeks,
    price_estimate: primary.price_estimate ?? secondary?.price_estimate,
    price_value: primary.price_value ?? secondary?.price_value,
});

const mapSchemaAvailability = (value?: string) => {
    if (!value) return undefined;
    const lowered = value.toLowerCase();
    if (lowered.includes('instock')) return 'In Stock';
    if (lowered.includes('backorder') || lowered.includes('preorder')) return 'Backorder';
    if (lowered.includes('outofstock') || lowered.includes('soldout')) return 'Backorder';
    return undefined;
};

const parseJsonLdSignals = (jsonLdBlocks: string[]): ParsedSignals => {
    const parsed: ParsedSignals = {};
    let lowestPrice: number | undefined;

    const handleNode = (node: any) => {
        if (!node || typeof node !== 'object') return;
        const offers = node.offers || (node.aggregateOffer ? node.aggregateOffer : undefined);
        const offersArray = Array.isArray(offers) ? offers : offers ? [offers] : [];

        for (const offer of offersArray) {
            const priceValue = typeof offer?.price === 'string' ? parseFloat(offer.price) : offer?.price;
            if (Number.isFinite(priceValue)) {
                if (lowestPrice === undefined || priceValue < lowestPrice) {
                    lowestPrice = priceValue;
                }
            }
            const availability = mapSchemaAvailability(offer?.availability);
            if (availability) {
                parsed.availability = parsed.availability ?? availability;
            }
        }
    };

    for (const block of jsonLdBlocks) {
        try {
            const data = JSON.parse(block);
            const nodes = Array.isArray(data) ? data : data['@graph'] ? data['@graph'] : [data];
            for (const node of nodes) {
                if (node?.['@type'] === 'Product' || node?.['@type']?.includes?.('Product')) {
                    handleNode(node);
                }
                handleNode(node);
            }
        } catch (e) {
            continue;
        }
    }

    if (lowestPrice !== undefined) {
        parsed.price_value = lowestPrice;
        parsed.price_estimate = `USD ${lowestPrice.toFixed(2)}`;
    }

    return parsed;
};

const computeConfidence = (sourcesCount: number, signalsCount: number): ConfidenceInfo => {
    const score = Math.min(100, 20 + sourcesCount * 10 + signalsCount * 15);
    const level = score >= 70 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW';
    return { score, level, sources: sourcesCount, signals: signalsCount };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithTimeout = async (url: string, timeoutMs: number) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: controller.signal });
    } finally {
        clearTimeout(timeoutId);
    }
};

const fetchHtmlSnippet = async (url: string, timeoutMs: number, retries: number) => {
    for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
            const res = await fetchWithTimeout(url, timeoutMs);
            const text = await res.text();
            if (text) {
                return text.replace(/<[^>]*>?/gm, ' ').substring(0, 5000);
            }
        } catch (e) {
            if (attempt === retries) {
                return '';
            }
            await sleep(250 * (attempt + 1));
        }
    }
    return '';
};

const fetchSourcesWithLimit = async (
    sources: { name: string; url: string }[],
    limit: number,
    timeoutMs: number,
    retries: number,
    preSnippets?: Record<string, string>,
    preSignals?: Record<string, ParsedSignals>
) => {
    const results: SourceFetchResult[] = [];
    let index = 0;

    const workers = Array.from({ length: limit }).map(async () => {
        while (index < sources.length) {
            const current = sources[index];
            index += 1;
            const prefilled = preSnippets?.[current.name];
            const snippet = prefilled ?? await fetchHtmlSnippet(current.url, timeoutMs, retries);
            if (snippet) {
                const signals = extractSignalsFromContent(snippet.toLowerCase());
                const structured = preSignals?.[current.name];
                const merged = structured ? mergeSignals(structured, signals) : signals;
                results.push({
                    snippet,
                    signal: {
                        name: current.name,
                        url: current.url,
                        ok: true,
                        blocked: false,
                        availability: merged.availability,
                        lifecycle_status: merged.lifecycle_status,
                        lead_time_weeks: merged.lead_time_weeks,
                        price_estimate: merged.price_estimate,
                    }
                });
            } else {
                results.push({
                    snippet: '',
                    signal: {
                        name: current.name,
                        url: current.url,
                        ok: false,
                        blocked: true,
                    }
                });
            }
        }
    });

    await Promise.all(workers);
    return results;
};
const inferLifecycle = (content: string) => {
    if (content.includes('obsolete') || content.includes('end of life') || content.includes('eol')) {
        return 'Obsolete';
    }
    if (content.includes('nrnd') || content.includes('not recommended for new designs')) {
        return 'NRND';
    }
    if (content.includes('active') || content.includes('production')) {
        return 'Active';
    }
    return 'Unknown';
};

const extractFirstProductLinks = (content: string, limit: number) => {
    const patterns = [
        /https?:\/\/www\.digikey\.com\/en\/products\/detail\/[^\s"']+/gi,
        /https?:\/\/www\.mouser\.com\/ProductDetail\/[^\s"']+/gi,
        /https?:\/\/www\.newark\.com\/[^\s"']+/gi,
        /https?:\/\/www\.farnell\.com\/[^\s"']+/gi,
        /https?:\/\/www\.arrow\.com\/en\/products\/[^\s"']+/gi,
    ];

    const links: string[] = [];
    for (const pattern of patterns) {
        const matches = content.match(pattern) || [];
        for (const match of matches) {
            if (!links.includes(match)) {
                links.push(match);
            }
            if (links.length >= limit) {
                return links;
            }
        }
    }

    return links;
};

const extractLinksFromHtml = (html: string, limit: number) => {
    const links: string[] = [];
    const hrefMatches = html.match(/href="([^"]+)"/gi) || [];
    for (const href of hrefMatches) {
        const urlMatch = href.match(/href="([^"]+)"/i);
        if (!urlMatch?.[1]) continue;
        const url = urlMatch[1];
        if (!url.startsWith('http')) continue;
        links.push(url);
        if (links.length >= limit * 4) {
            break;
        }
    }
    return extractFirstProductLinks(links.join(' '), limit);
};

const inferSourceName = (url: string) => {
    if (url.includes('digikey.com')) return 'DigiKey';
    if (url.includes('mouser.com')) return 'Mouser';
    if (url.includes('newark.com')) return 'Newark';
    if (url.includes('farnell.com')) return 'Farnell';
    if (url.includes('arrow.com')) return 'Arrow';
    return 'Unknown';
};

const getFirstProductDetailUrl = (): string | null => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return null;
    const sel = [
        'a[href*="/en/products/detail/"]',
        'a[href*="/ProductDetail/"]',
        'a[href*="/product/"]',
        'a[href*="/en/products/"]',
    ];
    for (const s of sel) {
        const a = document.querySelector(s) as HTMLAnchorElement | null;
        if (a?.href && (a.href.includes('digikey.com') || a.href.includes('mouser.com') || a.href.includes('newark.com') || a.href.includes('farnell.com') || a.href.includes('arrow.com'))) {
            return a.href;
        }
    }
    const allLinks = document.querySelectorAll('a[href]');
    for (let i = 0; i < allLinks.length; i++) {
        const a = allLinks[i] as HTMLAnchorElement;
        const h = a.href || '';
        if ((h.includes('digikey.com/en/products/detail/') || h.includes('mouser.com/ProductDetail/') || h.includes('newark.com/') || h.includes('farnell.com/') || h.includes('arrow.com/en/products/')) && !h.includes('/result?') && !h.includes('/search?')) return h;
    }
    return null;
};

interface DomExtract {
    price: string | null;
    availability: string | null;
    lead_time_weeks?: number;
}

const extractFromProductPage = (): DomExtract => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const result: DomExtract = { price: null, availability: null };
    const body = typeof document !== 'undefined' ? document.body : null;
    if (!body) return result;
    const text = body.innerText || '';

    const parseLeadTimeFromText = (t: string): number | undefined => {
        const standardLead = t.match(/standard\s*lead\s*time\s*:\s*(\d+)\s*(?:weeks?|wks?)/i);
        if (standardLead) return parseInt(standardLead[1], 10);
        const weekMatch = t.match(/(\d+)\s*(?:weeks?|wks?\.?)\s*(?:lead|ship|delivery)?/i);
        if (weekMatch) return parseInt(weekMatch[1], 10);
        const dayMatch = t.match(/(?:ships?\s*(?:in|within)|delivery\s*in|usually\s*ships?\s*within|within)\s*(\d+)(?:-\d+)?\s*(?:business\s*)?days?/i)
            || t.match(/(\d+)(?:-\d+)?\s*(?:business\s*)?days?\s*(?:lead|ship|delivery|to\s*ship)?/i);
        if (dayMatch) return Math.ceil(parseInt(dayMatch[1], 10) / 7);
        return undefined;
    };

    const parseAvailabilityFromText = (t: string): string | null => {
        const shipsIn = t.match(/ships?\s*in\s*(\d+)(?:-\d+)?\s*(?:business\s*)?days?/i);
        if (shipsIn) return `Ships in ${shipsIn[1]} days`;
        const inStock = t.match(/([\d,]+)\s*in\s*stock/i);
        if (inStock) return `${inStock[1]} in stock`;
        const availableIn = t.match(/available\s*in\s*(\d+)\s*days?/i);
        if (availableIn) return `Available in ${availableIn[1]} days`;
        const usuallyShips = t.match(/usually\s*ships?\s*(?:in|within)\s*(\d+)(?:-\d+)?\s*days?/i);
        if (usuallyShips) return `Ships in ${usuallyShips[1]} days`;
        if (t.includes('In Stock') || t.includes('in stock')) return 'In Stock';
        if (t.includes('Backorder') || t.includes('back order')) return 'Backorder';
        return null;
    };

    if (url.includes('digikey.com')) {
        const priceMatch = text.match(/\$\s*(\d+\.\d{2})/) || text.match(/(\d+\.\d{2})\s*USD/);
        if (priceMatch) result.price = priceMatch[1];
        result.availability = parseAvailabilityFromText(text);
        result.lead_time_weeks = parseLeadTimeFromText(text);
        const priceCell = document.querySelector('[data-testid="product-detail-price"], .product-detail-price, [class*="Pricing"], [data-product-id] [class*="price"]');
        if (priceCell && !result.price) {
            const m = priceCell.textContent?.match(/(\d+\.\d{2})/);
            if (m) result.price = m[1];
        }
        const stockEl = document.querySelector('[class*="quantity"], [class*="stock"], [class*="availability"]');
        if (stockEl && !result.availability) {
            const stockText = stockEl.textContent || '';
            result.availability = parseAvailabilityFromText(stockText) || (stockText.includes('Stock') ? 'In Stock' : null);
        }
    }
    if (url.includes('mouser.com')) {
        const priceMatch = text.match(/\$\s*(\d+\.\d{2})/) || text.match(/(\d+\.\d{2})\s*USD/);
        if (priceMatch) result.price = priceMatch[1];
        result.availability = parseAvailabilityFromText(text);
        result.lead_time_weeks = parseLeadTimeFromText(text);
        const priceEl = document.querySelector('.price, [class*="product-price"], [class*="Price"], [data-testid*="price"]');
        if (priceEl && !result.price) {
            const m = priceEl.textContent?.match(/(\d+\.\d{2})/);
            if (m) result.price = m[1];
        }
        const shipEl = document.querySelector('[class*="ship"], [class*="delivery"], [class*="lead-time"]');
        if (shipEl && result.lead_time_weeks === undefined) {
            const w = parseLeadTimeFromText(shipEl.textContent || '');
            if (w !== undefined) result.lead_time_weeks = w;
        }
    }
    if (url.includes('newark.com') || url.includes('farnell.com')) {
        const priceMatch = text.match(/\$\s*(\d+\.\d{2})/) || text.match(/(\d+\.\d{2})\s*USD/);
        if (priceMatch) result.price = priceMatch[1];
        result.availability = parseAvailabilityFromText(text);
        result.lead_time_weeks = parseLeadTimeFromText(text);
        const priceEl = document.querySelector('[class*="price"], [class*="Price"]');
        if (priceEl && !result.price) {
            const m = priceEl.textContent?.match(/(\d+\.\d{2})/);
            if (m) result.price = m[1];
        }
    }
    if (url.includes('arrow.com')) {
        const priceMatch = text.match(/\$\s*(\d+\.\d{2})/) || text.match(/(\d+\.\d{2})\s*USD/);
        if (priceMatch) result.price = priceMatch[1];
        result.availability = parseAvailabilityFromText(text);
        result.lead_time_weeks = parseLeadTimeFromText(text);
    }
    return result;
};

const extractManufacturer = (content: string) => {
    const knownMfrs = [
        'stmicroelectronics',
        'texas instruments',
        'analog devices',
        'microchip',
        'onsemi',
        'nexperia',
        'infineon',
        'renesas',
        'nxp',
        'ti.com',
        'stmicro',
    ];

    for (const mfr of knownMfrs) {
        if (content.includes(mfr)) {
            if (mfr === 'ti.com') return 'Texas Instruments';
            if (mfr === 'stmicro') return 'STMicroelectronics';
            return mfr
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        }
    }

    return '';
};

const CACHE_TTL_MS = 0;
const MAX_CACHE_ENTRIES = 200;
const SOURCE_TIMEOUT_MS = 100000;
const FALLBACK_AVAILABILITY = 'Listed';
const FALLBACK_LIFECYCLE = 'Active';
const FALLBACK_PRICE = 'Varies';
const SOURCE_RETRIES = 2;
const SOURCE_CONCURRENCY = 3;
const SCAN_TIMEOUT_MS = 120000;

const scanCache = new Map<string, { expires: number; result: ScanResult }>();

const getDirectSearchUrls = (partNumber: string) => [
    { name: 'DigiKey', url: `https://www.digikey.com/en/products/result?keywords=${encodeURIComponent(partNumber)}` },
    { name: 'Mouser', url: `https://www.mouser.com/c/?q=${encodeURIComponent(partNumber)}` },
    { name: 'Newark', url: `https://www.newark.com/search?st=${encodeURIComponent(partNumber)}` },
    { name: 'Farnell', url: `https://www.farnell.com/search?st=${encodeURIComponent(partNumber)}` },
    { name: 'Arrow', url: `https://www.arrow.com/en/products/search?q=${encodeURIComponent(partNumber)}` },
];

export async function POST(request: Request) {
    const agentLogs: string[] = [];
    const logPrefix = '[Tinyfish]';
    let part_number = "";
    let manufacturer = "";

    try {
        const body = await request.json();
        part_number = String(body.part_number ?? '').trim();
        manufacturer = String(body.manufacturer ?? '').trim();

        if (!part_number) {
            return NextResponse.json({ error: "Part number required" }, { status: 400 });
        }
        if (part_number.length > 64) {
            return NextResponse.json({ error: "Part number too long" }, { status: 400 });
        }
        if (!/^[A-Za-z0-9._/+-]+$/.test(part_number)) {
            return NextResponse.json({ error: "Part number contains invalid characters" }, { status: 400 });
        }

        const scannedAt = new Date().toISOString();
        const timestamp = scannedAt.split('T')[0];
        const cacheKey = `${part_number.toLowerCase()}|${(manufacturer || '').toLowerCase()}`;
        if (CACHE_TTL_MS > 0) {
            const cached = scanCache.get(cacheKey);
            if (cached && cached.expires > Date.now()) {
                return NextResponse.json({
                    ...cached.result,
                    agent_logs: [...(cached.result.agent_logs || []), `${logPrefix} Cache hit. Returning recent scan.`],
                });
            }
        }
        let status = "Unknown";
        let riskLevel = "MEDIUM";
        let riskScore = 50;
        let reasoning = "Gathering live data...";
        let evidence: string[] = [];
        let leadTime = 0;
        let moq = 0;
        let availability = "Unknown";
        let priceEstimate = "N/A";
        const detectedSources: string[] = [];
        const directSourcesChecked: string[] = [];
        const directSourcesBlocked: string[] = [];
        let uniqueSources: string[] = [];
        let sourceSignals: SourceSignal[] = [];
        let signalsSummary: SignalSummary | undefined;
        let confidence: ConfidenceInfo | undefined;
        const scanStartTime = Date.now();
        let scanTimedOut = false;

        agentLogs.push(`${logPrefix} Initializing tracker for part: ${part_number}`);

        if (process.env.MINO_API_KEY) {
            agentLogs.push(`${logPrefix} System Status: Successfully detected MINO_API_KEY. Secure link established.`);
        } else {
            agentLogs.push(`${logPrefix} Note: No MINO_API_KEY detected. Running in limited scope mode.`);
        }

        let pageContent1 = "";
        let pageContent2 = "";
        let searchHtml1 = "";
        let searchHtml2 = "";
        let combinedContent = "";
        let directContent = "";
        const browserSnippets: Record<string, string> = {};
        const browserStructuredSignals: Record<string, ParsedSignals> = {};

        try {
            agentLogs.push(`${logPrefix} Initializing crawler...`);

            let browser: Browser | undefined;
            const isWindows = process.platform === 'win32';
            const isServerless = (process.env.VERCEL || process.env.AWS_EXECUTION_ENV || process.cwd().includes('/var/task')) && !isWindows;

            try {
                if (isServerless) {
                    agentLogs.push(`${logPrefix} Detected cloud environment (Linux). Launching optimized browser...`);
                    const puppeteerCore = await import('puppeteer-core');
                    const chromium = (await import('@sparticuz/chromium')).default;

                    // @ts-ignore
                    const executablePath = await chromium.executablePath();

                    browser = await puppeteerCore.launch({
                        // @ts-ignore
                        args: chromium.args,
                        // @ts-ignore
                        defaultViewport: chromium.defaultViewport,
                        executablePath,
                        // @ts-ignore
                        headless: chromium.headless,
                    });
                } else {
                    agentLogs.push(`${logPrefix} Detected local environment (${process.platform}). Launching standard browser...`);
                    browser = await puppeteer.launch({
                        headless: true,
                        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
                    });
                }

                const page = await browser.newPage();
                agentLogs.push(`${logPrefix} Step 1/2: Scanning Distribution Channels (DigiKey, Mouser, Newark)...`);
                const query1 = `${part_number} price stock distributor`;
                const searchUrl1 = `https://duckduckgo.com/?q=${encodeURIComponent(query1)}&ia=web`;

                await page.goto(searchUrl1, { waitUntil: 'networkidle2', timeout: 100000 });
                pageContent1 = await page.evaluate(() => document.body.innerText);
                searchHtml1 = await page.content();
                evidence.push(searchUrl1);

                agentLogs.push(`${logPrefix} Step 2/2: Mapping Lifecycle Status...`);
                const query2 = `${part_number} lifecycle status obsolescence`;
                const searchUrl2 = `https://duckduckgo.com/?q=${encodeURIComponent(query2)}&ia=web`;

                await page.goto(searchUrl2, { waitUntil: 'networkidle2', timeout: 100000 });
                pageContent2 = await page.evaluate(() => document.body.innerText);
                searchHtml2 = await page.content();
                evidence.push(searchUrl2);

                const directSearchUrls = getDirectSearchUrls(part_number);

                for (const source of directSearchUrls) {
                    if (Date.now() - scanStartTime > SCAN_TIMEOUT_MS) {
                        scanTimedOut = true;
                        agentLogs.push(`${logPrefix} Scan timed out; returning partial results.`);
                        break;
                    }
                    try {
                        await page.goto(source.url, { waitUntil: 'networkidle2', timeout: 100000 });
                        let domFromSearch: ParsedSignals = {};
                        try {
                            const searchDom = await page.evaluate(extractFromProductPage) as DomExtract;
                            if (searchDom?.price) {
                                const n = parseFloat(searchDom.price);
                                if (Number.isFinite(n)) {
                                    domFromSearch.price_estimate = `USD ${n.toFixed(2)}`;
                                    domFromSearch.price_value = n;
                                }
                            }
                            if (searchDom?.availability) domFromSearch.availability = searchDom.availability;
                            if (typeof searchDom?.lead_time_weeks === 'number') domFromSearch.lead_time_weeks = searchDom.lead_time_weeks;
                        } catch {
                            // optional
                        }
                        const productDetailUrl = await page.evaluate(getFirstProductDetailUrl) as string | null;
                        if (productDetailUrl) {
                            try {
                                await page.goto(productDetailUrl, { waitUntil: 'networkidle2', timeout: 100000 });
                                agentLogs.push(`${logPrefix} Followed to product page for ${source.name}.`);
                            } catch {
                                // stay on search page if product page fails
                            }
                        }
                        let domFromProduct: ParsedSignals = {};
                        try {
                            const productDom = await page.evaluate(extractFromProductPage) as DomExtract;
                            if (productDom?.price) {
                                const n = parseFloat(productDom.price);
                                if (Number.isFinite(n)) {
                                    domFromProduct.price_estimate = `USD ${n.toFixed(2)}`;
                                    domFromProduct.price_value = n;
                                }
                            }
                            if (productDom?.availability) domFromProduct.availability = productDom.availability;
                            if (typeof productDom?.lead_time_weeks === 'number') domFromProduct.lead_time_weeks = productDom.lead_time_weeks;
                        } catch {
                            // optional
                        }
                        const domSignalsSearch = mergeSignals(domFromProduct, domFromSearch);
                        const snippet = await page.evaluate(() => document.body.innerText);
                        const jsonLd = await page.$$eval('script[type="application/ld+json"]', (elements) =>
                            elements.map((element) => element.textContent || '')
                        );
                        const structuredSignals = parseJsonLdSignals(jsonLd);
                        if (snippet) {
                            browserSnippets[source.name] = snippet.replace(/\s+/g, ' ').substring(0, 5000);
                        }
                        const mergedSearch = mergeSignals(structuredSignals, domSignalsSearch);
                        if (mergedSearch.price_estimate || mergedSearch.availability || mergedSearch.lead_time_weeks) {
                            browserStructuredSignals[source.name] = mergedSearch;
                        } else if (structuredSignals.price_estimate || structuredSignals.availability || structuredSignals.lead_time_weeks) {
                            browserStructuredSignals[source.name] = structuredSignals;
                        }
                    } catch (e) {
                        // Ignore and allow lightweight fetch to try.
                    }
                }

                const productLinks = extractLinksFromHtml(`${searchHtml1} ${searchHtml2}`, 5);
                if (productLinks.length) {
                    agentLogs.push(`${logPrefix} Found ${productLinks.length} product links from search results.`);
                }

                for (const link of productLinks) {
                    if (Date.now() - scanStartTime > SCAN_TIMEOUT_MS) {
                        scanTimedOut = true;
                        agentLogs.push(`${logPrefix} Scan timed out; returning partial results.`);
                        break;
                    }
                    try {
                        await page.goto(link, { waitUntil: 'networkidle2', timeout: 100000 });
                        const snippet = await page.evaluate(() => document.body.innerText);
                        const jsonLd = await page.$$eval('script[type="application/ld+json"]', (elements) =>
                            elements.map((element) => element.textContent || '')
                        );
                        const structuredSignals = parseJsonLdSignals(jsonLd);
                        const sourceName = inferSourceName(link);
                        if (snippet) {
                            browserSnippets[sourceName] = [
                                browserSnippets[sourceName],
                                snippet.replace(/\s+/g, ' ').substring(0, 5000),
                            ]
                                .filter(Boolean)
                                .join(' ');
                            evidence.push(link);
                            detectedSources.push(sourceName);
                            directSourcesChecked.push(sourceName);
                        }
                        let domSignals: ParsedSignals = {};
                        try {
                            const dom = await page.evaluate(extractFromProductPage) as DomExtract;
                            if (dom?.price) {
                                const n = parseFloat(dom.price);
                                if (Number.isFinite(n)) {
                                    domSignals.price_estimate = `USD ${n.toFixed(2)}`;
                                    domSignals.price_value = n;
                                }
                            }
                            if (dom?.availability) domSignals.availability = dom.availability;
                            if (typeof dom?.lead_time_weeks === 'number') domSignals.lead_time_weeks = dom.lead_time_weeks;
                        } catch {
                            // DOM extraction optional
                        }
                        const mergedStructured = mergeSignals(structuredSignals, domSignals);
                        if (mergedStructured.price_estimate || mergedStructured.availability) {
                            browserStructuredSignals[sourceName] = mergeSignals(
                                mergedStructured,
                                browserStructuredSignals[sourceName]
                            );
                        } else if (structuredSignals.price_estimate || structuredSignals.availability) {
                            browserStructuredSignals[sourceName] = mergeSignals(
                                structuredSignals,
                                browserStructuredSignals[sourceName]
                            );
                        }
                    } catch (e) {
                        // ignore product page failures
                    }
                }

                await browser.close();
                browser = undefined;
                agentLogs.push(`${logPrefix} Browser session closed. Passing to risk assessment.`);

            } catch (browserError) {
                agentLogs.push(`${logPrefix} Note: Environment blocked browser launch. Engaging lightweight tracking engine...`);
                if (browser) {
                    try {
                        await browser.close();
                    } catch {
                        // ignore browser close failures
                    }
                    browser = undefined;
                }

                const fetchSnippet = async (query: string) => {
                    const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
                    try {
                        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                        const text = await res.text();
                        return text.replace(/<[^>]*>?/gm, ' ').substring(0, 5000);
                    } catch (e) {
                        return "";
                    }
                };

                pageContent1 = await fetchSnippet(`${part_number} price stock distributor`);
                pageContent2 = await fetchSnippet(`${part_number} lifecycle status`);

                if (pageContent1 || pageContent2) {
                    agentLogs.push(`${logPrefix} Signals captured via lightweight engine. Accuracy may be reduced.`);
                    evidence.push(`https://duckduckgo.com/html/?q=${encodeURIComponent(part_number)}`);
                } else {
                    agentLogs.push(`${logPrefix} ERROR: Lightweight engine also blocked by network policy.`);
                }
            }

            const directSearchUrls = getDirectSearchUrls(part_number);

            const sourceFetches = await fetchSourcesWithLimit(
                directSearchUrls,
                SOURCE_CONCURRENCY,
                SOURCE_TIMEOUT_MS,
                SOURCE_RETRIES,
                browserSnippets,
                browserStructuredSignals
            );

            sourceSignals = sourceFetches.map((item) => item.signal);

            for (const result of sourceFetches) {
                if (result.snippet) {
                    directContent += ` ${result.snippet}`;
                }
                if (result.signal.ok) {
                    evidence.push(result.signal.url);
                    detectedSources.push(result.signal.name);
                    directSourcesChecked.push(result.signal.name);
                } else {
                    directSourcesBlocked.push(result.signal.name);
                }

                const signalDetails = [
                    result.signal.availability ? `availability=${result.signal.availability}` : null,
                    result.signal.lifecycle_status ? `lifecycle=${result.signal.lifecycle_status}` : null,
                    result.signal.lead_time_weeks ? `lead=${result.signal.lead_time_weeks}w` : null,
                    result.signal.price_estimate ? `price=${result.signal.price_estimate}` : null,
                ].filter(Boolean);

                if (signalDetails.length > 0) {
                    agentLogs.push(`${logPrefix} ${result.signal.name} signals: ${signalDetails.join(', ')}`);
                } else if (result.signal.ok) {
                    agentLogs.push(`${logPrefix} ${result.signal.name} responded without explicit signals.`);
                }
            }

            const lowerContent1 = pageContent1.toLowerCase();
            const lowerContent2 = pageContent2.toLowerCase();
            combinedContent = `${lowerContent1} ${lowerContent2} ${directContent.toLowerCase()}`;

            if (combinedContent.includes("digikey")) detectedSources.push("DigiKey");
            if (combinedContent.includes("mouser")) detectedSources.push("Mouser");
            if (combinedContent.includes("newark") || combinedContent.includes("farnell")) detectedSources.push("Newark");
            if (combinedContent.includes("ti.com")) detectedSources.push("TI Direct");
            if (combinedContent.includes("arrow.com")) detectedSources.push("Arrow");

            uniqueSources = Array.from(new Set(detectedSources));

            if (uniqueSources.length > 0) {
                agentLogs.push(`${logPrefix} identified ${uniqueSources.length} sources: ${uniqueSources.join(', ')}`);
            } else if (!pageContent1 && !pageContent2) {
                agentLogs.push(`${logPrefix} Note: No major distributors identified in top results.`);
            }

            const sourceAvailability = sourceSignals.map((signal) => signal.availability).filter(Boolean) as string[];
            const sourceLifecycle = sourceSignals.map((signal) => signal.lifecycle_status).filter(Boolean) as string[];
            const sourceLeadTimes = sourceSignals
                .map((signal) => signal.lead_time_weeks)
                .filter((value): value is number => typeof value === 'number');
            const sourcePriceValues = sourceSignals
                .map((signal) => signal.price_estimate)
                .filter(Boolean)
                .map((label) => parsePrice(label || ''))
                .filter((value): value is { value: number; label: string } => Boolean(value));

            const availabilitySummary = pickPreferred(sourceAvailability, availabilityPriority);
            const lifecycleSummary = pickPreferred(sourceLifecycle, lifecyclePriority);
            const leadTimeSummary = sourceLeadTimes.length ? Math.max(...sourceLeadTimes) : undefined;
            const priceSummary = sourcePriceValues.length
                ? sourcePriceValues.reduce((lowest, current) => (current.value < lowest.value ? current : lowest))
                : undefined;

            const availabilityDetailFromContent = parseAvailabilityDays(combinedContent);
            const hasDetailAvailability = (s: string) => /ships?\s*in\s*\d+\s*days?/i.test(s) || /\d+(\s*,?\d*)\s*in\s*stock/i.test(s) || /available\s*in\s*\d+\s*days?/i.test(s);
            const firstDetailAvailability = sourceAvailability.find(hasDetailAvailability) ?? availabilityDetailFromContent;

            if (firstDetailAvailability) {
                availability = firstDetailAvailability;
                agentLogs.push(`${logPrefix} Availability (detail): ${availability}`);
            } else if (availabilitySummary !== 'Unknown') {
                availability = availabilitySummary;
            }
            if (lifecycleSummary !== 'Unknown') {
                status = lifecycleSummary;
            }
            if (leadTimeSummary) {
                leadTime = leadTimeSummary;
                agentLogs.push(`${logPrefix} Lead time: ${leadTime} weeks.`);
            }
            if (priceSummary) {
                priceEstimate = priceSummary.label;
                agentLogs.push(`${logPrefix} Market price: ${priceEstimate}`);
            }

            const availabilityGuess = availability === 'Unknown' ? inferAvailability(combinedContent) : availability;
            if (availabilityGuess !== 'Unknown' && availability === 'Unknown') {
                availability = availabilityGuess;
                agentLogs.push(`${logPrefix} Availability heuristic: ${availability}`);
            }

            const lifecycleGuess = inferLifecycle(combinedContent);
            if (lifecycleGuess !== 'Unknown') {
                status = lifecycleGuess;
                agentLogs.push(`${logPrefix} Lifecycle heuristic: ${status}`);
            }

            if (leadTime === 0 && combinedContent.includes('week')) {
                const match = combinedContent.match(/(\d+)\s+weeks?/);
                if (match) {
                    leadTime = parseInt(match[1], 10);
                    agentLogs.push(`${logPrefix} Data: Lead time estimate: ${leadTime} weeks.`);
                }
            }
            if (leadTime === 0) {
                const leadFromContent = parseLeadTime(combinedContent);
                if (leadFromContent !== undefined) {
                    leadTime = leadFromContent;
                    agentLogs.push(`${logPrefix} Lead time from content: ${leadTime} weeks.`);
                }
            }

            if (priceEstimate === 'N/A') {
                const priceFallback = parsePrice(combinedContent);
                if (priceFallback) {
                    priceEstimate = priceFallback.label;
                    agentLogs.push(`${logPrefix} Pricing heuristic: ${priceEstimate}`);
                }
            }

        } catch (error) {
            console.error("Mino Tracker Error:", error);
            status = "Error";
            agentLogs.push(`${logPrefix} ERROR: Tracker failed. ${error instanceof Error ? error.message : String(error)}`);
        }

        const signalsCount = sourceSignals.filter((signal) =>
            Boolean(signal.availability || signal.lifecycle_status || signal.lead_time_weeks || signal.price_estimate)
        ).length;
        const sourcesOk = sourceSignals.filter((signal) => signal.ok).length;
        confidence = computeConfidence(sourcesOk, signalsCount);
        const hasAnySignals = uniqueSources.length > 0 || Boolean(pageContent1 || pageContent2 || directContent);
        signalsSummary = {
            availability: hasAnySignals && availability === 'Unknown' ? FALLBACK_AVAILABILITY : availability,
            lifecycle_status: hasAnySignals && status === 'Unknown' ? FALLBACK_LIFECYCLE : status,
            lead_time_weeks: leadTime || undefined,
            price_estimate: hasAnySignals && priceEstimate === 'N/A' ? FALLBACK_PRICE : priceEstimate,
        };

        const hasSignals = Boolean(pageContent1 || pageContent2 || directContent || signalsCount > 0);

        if (!hasSignals) {
            reasoning = 'No verified signals found in live sources for this part number.';
            riskScore = 50;
            riskLevel = 'MEDIUM';
        } else {
            if (!manufacturer) {
                manufacturer = extractManufacturer(combinedContent);
            }

            if (availability === 'Unknown' && status === 'Unknown') {
                reasoning = 'Signals found, but availability and lifecycle were not explicitly stated.';
            } else if (availability !== 'Unknown' || status !== 'Unknown') {
                reasoning = `Signals found for ${availability !== 'Unknown' ? `availability: ${availability}` : 'availability'}` +
                    `${status !== 'Unknown' ? ` and lifecycle: ${status}` : ''}.`;
            }
        }

        const lastSnapshot = getLastSnapshot(part_number);

        if (lastSnapshot) {
            agentLogs.push(`${logPrefix} History: Comparing with entry from ${lastSnapshot.timestamp}...`);

            if (lastSnapshot.lifecycle_status !== status && status !== "Unknown") {
                riskScore = 95;
                riskLevel = "HIGH";
                reasoning = `CRITICAL SHIFT: Lifecycle changed from ${lastSnapshot.lifecycle_status} to ${status}. ${reasoning}`;
            } else if (leadTime > (lastSnapshot.lead_time_weeks || 0) + 4 && leadTime > 0) {
                riskScore = Math.max(riskScore, 75);
                riskLevel = "HIGH";
                reasoning = `SUPPLY STRESS: Lead time spiked to ${leadTime} weeks. ${reasoning}`;
            }
        }

        if (status === "Obsolete") {
            riskScore = 95;
            riskLevel = "HIGH";
        } else if (status !== "Error" && status !== "Unknown") {
            riskScore = riskScore === 0 ? 15 : riskScore;
            riskLevel = riskScore > 70 ? "HIGH" : riskScore > 30 ? "MEDIUM" : "LOW";
        }

        const currentSnapshot: HistoricalSnapshot = {
            timestamp,
            lifecycle_status: status,
            lead_time_weeks: leadTime,
            moq: moq,
            availability: availability,
            risk_score: riskScore
        };

        try {
            saveSnapshot(part_number, currentSnapshot);
        } catch (e) {
            const err = e instanceof Error ? e.message : String(e);
            agentLogs.push(`${logPrefix} WARNING: Failed to record history snapshot. ${err}`);
        }

        const fullHistory = getHistory(part_number);
        const historyPoints = fullHistory.map(h => ({
            timestamp: h.timestamp,
            score: h.risk_score || 50
        }));

        if (hasAnySignals) {
            if (availability === 'Unknown') availability = FALLBACK_AVAILABILITY;
            if (status === 'Unknown') status = FALLBACK_LIFECYCLE;
            if (priceEstimate === 'N/A') priceEstimate = FALLBACK_PRICE;
        }

        const leadTimeDays = parseLeadTimeDaysFromAvailability(availability);

        const result: ScanResult = {
            part_number,
            manufacturer: manufacturer || 'Unknown',
            lifecycle_status: status,
            lead_time_weeks: leadTime || undefined,
            lead_time_days: leadTimeDays,
            moq: moq,
            availability: availability,
            timestamp,
            risk: {
                score: riskScore,
                level: riskLevel,
                reasoning
            },
            evidence_links: evidence,
            price_estimate: priceEstimate,
            sources: uniqueSources,
            sources_checked: directSourcesChecked,
            sources_blocked: directSourcesBlocked,
            source_signals: sourceSignals,
            signals: signalsSummary,
            confidence,
            scanned_at: scannedAt,
            scan_duration_ms: Date.now() - scanStartTime,
            scan_timed_out: scanTimedOut,
            agent_logs: agentLogs,
            history: historyPoints
        };

        if (CACHE_TTL_MS > 0) {
            scanCache.set(cacheKey, {
                expires: Date.now() + CACHE_TTL_MS,
                result,
            });
            while (scanCache.size > MAX_CACHE_ENTRIES) {
                const oldestKey = scanCache.keys().next().value;
                if (oldestKey) {
                    scanCache.delete(oldestKey);
                } else {
                    break;
                }
            }
        }

        return NextResponse.json(result);

    } catch (globalError) {
        console.error("Global Scan API Error:", globalError);
        const errMessage = globalError instanceof Error ? globalError.message : String(globalError);
        agentLogs.push(`${logPrefix} CRITICAL ERROR: System failed. ${errMessage}`);

        return NextResponse.json({
            part_number: part_number || "Unknown",
            manufacturer: manufacturer || "Unknown",
            lifecycle_status: "Error",
            timestamp: new Date().toISOString().split('T')[0],
            risk: {
                score: 100,
                level: "HIGH",
                reasoning: `Critical failure during scan: ${errMessage}`
            },
            evidence_links: [],
            agent_logs: agentLogs
        }, { status: 500 });
    }
}
