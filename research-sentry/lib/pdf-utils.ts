export async function fetchPdfText(
    pdfUrl: string,
    options?: { timeoutMs?: number; maxBytes?: number }
): Promise<string> {
    if (!pdfUrl) throw new Error('Missing PDF URL');

    const parsedUrl = safeParseUrl(pdfUrl);
    if (!parsedUrl || !isSafeHttpUrl(parsedUrl)) {
        throw new Error('Blocked PDF URL');
    }

    // Treat timeoutMs as a TOTAL budget for (fetch + parse).
    const startMs = Date.now();
    const controller = new AbortController();
    const totalTimeoutMs = options?.timeoutMs ?? 10_000;
    const timeout = setTimeout(() => controller.abort(), totalTimeoutMs);

    let res: Response;
    let bytes: Buffer;
    try {
        res = await fetch(pdfUrl, {
            // Some hosts (rarely) block default fetch UA
            headers: {
                'User-Agent': 'ResearchSentry/1.0 (+email-extraction)',
                'Accept': 'application/pdf,*/*;q=0.8',
            },
            redirect: 'follow',
            signal: controller.signal,
        });
        if (!res.ok) {
            throw new Error(`Failed to download PDF (${res.status})`);
        }

        const maxBytes = options?.maxBytes ?? 8_000_000; // ~8MB
        const contentLength = res.headers.get('content-length');
        if (contentLength) {
            const len = Number(contentLength);
            if (Number.isFinite(len) && len > maxBytes) {
                throw new Error(`PDF too large to parse (${Math.round(len / 1_000_000)}MB)`);
            }
        }

        bytes = Buffer.from(await res.arrayBuffer());
        if (bytes.length > maxBytes) {
            throw new Error(`PDF too large to parse (${Math.round(bytes.length / 1_000_000)}MB)`);
        }
    } finally {
        clearTimeout(timeout);
    }
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    const looksLikePdfHeader = bytes.slice(0, 5).toString('utf8') === '%PDF-';
    const isProbablyPdf =
        looksLikePdfHeader ||
        contentType.includes('application/pdf') ||
        contentType.includes('application/octet-stream') ||
        pdfUrl.toLowerCase().includes('.pdf');

    if (!isProbablyPdf) {
        throw new Error(`URL did not return a PDF (content-type: ${contentType || 'unknown'})`);
    }

    // pdf-parse v2+ exposes a PDFParse class (not a callable function).
    const { PDFParse, VerbosityLevel } = await import('pdf-parse');
    const parser = new PDFParse({ data: bytes, verbosity: VerbosityLevel.ERRORS });

    const elapsedMs = Date.now() - startMs;
    const remainingMs = totalTimeoutMs - elapsedMs;
    if (remainingMs <= 0) {
        throw new Error(`PDF parse timed out after ${totalTimeoutMs}ms`);
    }

    // Never exceed the remaining total budget (even if it's very small).
    const parseTimeoutMs = remainingMs;
    let parseTimeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<null>((resolve) => {
        parseTimeoutId = setTimeout(() => resolve(null), parseTimeoutMs);
    });
    const result = await Promise.race([parser.getText(), timeoutPromise]);
    if (parseTimeoutId) clearTimeout(parseTimeoutId);
    if (result === null) {
        throw new Error(`PDF parse timed out after ${parseTimeoutMs}ms`);
    }
    return typeof result?.text === 'string' ? result.text : '';
}

function safeParseUrl(value: string): URL | null {
    try {
        return new URL(value);
    } catch {
        return null;
    }
}

function isSafeHttpUrl(url: URL): boolean {
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.localhost')) return false;
    if (isPrivateIp(host)) return false;
    return true;
}

function isPrivateIp(host: string): boolean {
    if (isIpv4(host)) {
        const parts = host.split('.').map(Number);
        const [a, b] = parts;
        if (a === 10) return true;
        if (a === 127) return true;
        if (a === 0) return true;
        if (a === 169 && b === 254) return true;
        if (a === 192 && b === 168) return true;
        if (a === 172 && b >= 16 && b <= 31) return true;
        return false;
    }
    if (isIpv6(host)) {
        const normalized = host.toLowerCase();
        return normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80');
    }
    return false;
}

function isIpv4(host: string): boolean {
    return /^(\d{1,3}\.){3}\d{1,3}$/.test(host);
}

function isIpv6(host: string): boolean {
    return host.includes(':');
}

