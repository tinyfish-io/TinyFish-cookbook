import { NextRequest, NextResponse } from 'next/server';
import { runMinoAutomation } from '@/lib/mino';
import { extractEmailsFromText } from '@/lib/email-utils';
import { fetchPdfText } from '@/lib/pdf-utils';

export const maxDuration = 300;
export const runtime = 'nodejs';

interface AuthorInfo {
    firstName: string;
    lastName: string;
    email: string;
}

function capitalizeNamePart(part: string): string {
    if (!part) return '';
    const lower = part.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function deriveNameFromEmail(email: string): Pick<AuthorInfo, 'firstName' | 'lastName'> {
    if (!email || !email.includes('@')) return { firstName: '', lastName: '' };
    const localRaw = email.split('@')[0] || '';
    const local = localRaw.split('+')[0];
    const tokens = local
        .replace(/[^a-zA-Z]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);

    if (tokens.length >= 2) {
        return {
            firstName: capitalizeNamePart(tokens[0]),
            lastName: capitalizeNamePart(tokens[tokens.length - 1]),
        };
    }

    if (tokens.length === 1) {
        const camelParts = tokens[0].match(/[A-Z]?[a-z]+|[A-Z]+(?![a-z])/g) || [];
        if (camelParts.length >= 2) {
            const first = camelParts[0] ?? '';
            const last = camelParts[camelParts.length - 1] ?? '';
            return {
                firstName: capitalizeNamePart(first),
                lastName: capitalizeNamePart(last),
            };
        }
        if (camelParts.length === 1) {
            const first = camelParts[0] ?? '';
            return { firstName: capitalizeNamePart(first), lastName: '' };
        }
    }

    return { firstName: '', lastName: '' };
}

function tryParseJsonString(s: string): any | null {
    try {
        const clean = s.replace(/```json\n?|```/g, '').trim();
        return JSON.parse(clean);
    } catch {
        return null;
    }
}

function normalizeArxivPdfUrl(url: string): string {
    // Accepts:
    // - https://arxiv.org/abs/XXXX.XXXXX -> https://arxiv.org/pdf/XXXX.XXXXX.pdf
    // - https://arxiv.org/pdf/XXXX.XXXXX -> https://arxiv.org/pdf/XXXX.XXXXX.pdf
    // - https://arxiv.org/pdf/XXXX.XXXXX.pdf -> unchanged
    if (!url) return url;
    const u = url.trim();
    if (u.includes('arxiv.org/abs/')) {
        const id = u.split('arxiv.org/abs/')[1]?.split(/[?#]/)[0];
        return id ? `https://arxiv.org/pdf/${id}.pdf` : u;
    }
    if (u.includes('arxiv.org/pdf/')) {
        if (u.endsWith('.pdf')) return u;
        return `${u.split(/[?#]/)[0]}.pdf`;
    }
    return u;
}

function findAuthorsArray(obj: any): AuthorInfo[] {
    if (!obj) return [];

    // Check if it's already an array of author objects
    if (Array.isArray(obj)) {
        const asAuthors = obj.filter((x) =>
            x && typeof x === 'object' &&
            ('firstName' in x || 'first_name' in x) &&
            ('lastName' in x || 'last_name' in x) &&
            ('email' in x)
        ).map((x) => ({
            firstName: x.firstName || x.first_name || '',
            lastName: x.lastName || x.last_name || '',
            email: x.email || ''
        }));
        if (asAuthors.length > 0) return asAuthors;
    }

    if (typeof obj === 'string') {
        const parsed = tryParseJsonString(obj);
        if (parsed) return findAuthorsArray(parsed);
        return [];
    }

    if (typeof obj !== 'object') return [];

    const keys = ['authors', 'authorInfo', 'author_info', 'authorDetails', 'author_details'];
    for (const k of keys) {
        if (Array.isArray(obj[k])) {
            const result = findAuthorsArray(obj[k]);
            if (result.length > 0) return result;
        }
        if (typeof obj[k] === 'string') {
            const parsed = tryParseJsonString(obj[k]);
            if (parsed) {
                const nested = findAuthorsArray(parsed);
                if (nested.length) return nested;
            }
        }
    }

    // Recursive scan
    for (const k of Object.keys(obj)) {
        const v = obj[k];
        if (Array.isArray(v)) {
            const result = findAuthorsArray(v);
            if (result.length > 0) return result;
        } else if (v && typeof v === 'object') {
            const nested = findAuthorsArray(v);
            if (nested.length) return nested;
        }
    }

    return [];
}

function findEmailsArray(obj: any): string[] {
    if (!obj) return [];

    if (Array.isArray(obj)) {
        const asStrings = obj.filter((x) => typeof x === 'string') as string[];
        return asStrings.length === obj.length ? asStrings : [];
    }

    if (typeof obj === 'string') {
        const parsed = tryParseJsonString(obj);
        if (parsed) return findEmailsArray(parsed);
        return extractEmailsFromText(obj);
    }

    if (typeof obj !== 'object') return [];

    const keys = ['emails', 'emailAddresses', 'email_addresses', 'authorEmails', 'author_emails', 'contacts'];
    for (const k of keys) {
        if (Array.isArray(obj[k])) return (obj[k] as any[]).filter((x) => typeof x === 'string') as string[];
        if (typeof obj[k] === 'string') {
            const parsed = tryParseJsonString(obj[k]);
            if (parsed) {
                const nested = findEmailsArray(parsed);
                if (nested.length) return nested;
            }
        }
    }

    // Recursive scan for the first plausible emails array
    for (const k of Object.keys(obj)) {
        const v = obj[k];
        if (Array.isArray(v)) {
            const strs = v.filter((x) => typeof x === 'string') as string[];
            if (strs.length >= 1 && strs.every((s) => s.includes('@'))) return strs;
        } else if (v && typeof v === 'object') {
            const nested = findEmailsArray(v);
            if (nested.length) return nested;
        } else if (typeof v === 'string') {
            const extracted = extractEmailsFromText(v);
            if (extracted.length) return extracted;
        }
    }

    return [];
}

export async function POST(req: NextRequest) {
    try {
        const startedAt = Date.now();
        const totalBudgetMs = 5 * 60 * 1000; // 5 minutes

        const { paper } = await req.json();
        if (!paper) return NextResponse.json({ error: 'Paper data required' }, { status: 400 });

        const candidatesRaw: string[] = [
            ...(paper.pdfUrl ? [paper.pdfUrl] : []),
            ...(paper.url ? [paper.url] : []),
        ].filter(Boolean);

        const candidates = candidatesRaw.map((u) => normalizeArxivPdfUrl(String(u)));
        if (candidates.length === 0) return NextResponse.json({ error: 'No paper URL available', authors: [] }, { status: 400 });

        // Fast/reliable path: attempt to download + parse PDF text from any candidate.
        for (const url of candidates) {
            try {
                const elapsed = Date.now() - startedAt;
                const remaining = totalBudgetMs - elapsed;
                if (remaining <= 0) break;

                const text = await fetchPdfText(url, {
                    timeoutMs: remaining,
                    maxBytes: 25_000_000, // allow larger PDFs under long budget
                });
                // Emails are usually on the first page, but sometimes in footers/last page.
                const head = text.slice(0, 450_000);
                const tail = text.length > 200_000 ? text.slice(-200_000) : '';
                const sample = `${head}\n${tail}`;

                const emailsFromPdf = extractEmailsFromText(sample); // internal normalization handles PDF spacing
                if (emailsFromPdf.length > 0) {
                    // Return emails in the new format (names derived when possible)
                    const authors = emailsFromPdf.map((email) => {
                        const name = deriveNameFromEmail(email);
                        return {
                            firstName: name.firstName,
                            lastName: name.lastName,
                            email: email,
                        };
                    });
                    return NextResponse.json({ authors: authors.sort((a, b) => a.email.localeCompare(b.email)) });
                }
                // If we successfully parsed the PDF but found no emails, stop here (avoid slow Mino + timeouts).
                return NextResponse.json({ authors: [], error: 'No emails found in the PDF text.' });
            } catch (e) {
                console.warn('[EmailExtract] PDF parse attempt failed for', url, e);
            }
        }

        const goal = `Extract all author information from this paper. 
For each author, extract their first name, last name, and email address.
If the URL is a PDF, open it and look for author information in the first pages and footers.
Return ONLY valid JSON with this exact schema:
{ "authors": [{ "firstName": string, "lastName": string, "email": string }] }
No markdown, no commentary. If you cannot find first or last name, use empty strings.`;

        // Mino fallback (best-effort): allow up to remaining budget.
        const elapsedBeforeMino = Date.now() - startedAt;
        const remainingForMino = totalBudgetMs - elapsedBeforeMino;
        if (remainingForMino <= 0) {
            return NextResponse.json({
                authors: [],
                error: 'Author extraction timed out after 5 minutes.',
            });
        }

        const minoTarget = candidates.find((u) => u.toLowerCase().includes('pdf')) || candidates[0];
        // IMPORTANT: pass timeoutMs to ensure the underlying request is aborted (no background leak).
        const raw = await runMinoAutomation(minoTarget, goal, false, { timeoutMs: remainingForMino });

        if (!raw) {
            return NextResponse.json({ authors: [], error: 'Author extraction timed out after 5 minutes.' });
        }

        const authors = findAuthorsArray(raw);

        // If we got authors with full info, return them
        if (authors.length > 0) {
            const normalized = authors.map(author => ({
                firstName: author.firstName.trim(),
                lastName: author.lastName.trim(),
                email: author.email.trim().replace(/[),.;:]+$/g, '').toLowerCase()
            })).map((author) => {
                if (author.email.includes('@') && (!author.firstName || !author.lastName)) {
                    const derived = deriveNameFromEmail(author.email);
                    return {
                        ...author,
                        firstName: author.firstName || derived.firstName,
                        lastName: author.lastName || derived.lastName,
                    };
                }
                return author;
            }).filter(author => author.email.includes('@'));

            if (normalized.length > 0) {
                return NextResponse.json({ authors: normalized.sort((a, b) => a.email.localeCompare(b.email)) });
            }
        }

        // Fallback: try to extract just emails
        const emails = findEmailsArray(raw);
        const normalizedEmails = Array.from(new Set(emails.flatMap((e) => extractEmailsFromText(e) || [e])))
            .map((e) => e.trim().replace(/[),.;:]+$/g, '').toLowerCase())
            .filter((e) => e.includes('@'));

        if (normalizedEmails.length === 0) {
            return NextResponse.json({ authors: [], error: 'No author information found.' });
        }

        // Convert emails to author format
        const authorsFromEmails = normalizedEmails.map(email => ({
            ...deriveNameFromEmail(email),
            email: email,
        }));

        return NextResponse.json({ authors: authorsFromEmails.sort((a, b) => a.email.localeCompare(b.email)) });
    } catch (error) {
        console.error('Author Extract API Error:', error);
        return NextResponse.json({ error: 'Failed to extract author information', authors: [] }, { status: 500 });
    }
}

