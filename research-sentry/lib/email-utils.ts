export function extractEmailsFromText(input: string): string[] {
    if (!input) return [];

    // PDFs often insert spaces/newlines around @ and . :
    //  "name @ domain . edu" or "name@\ndomain.edu"
    // Normalize aggressively, then apply email regex.
    const normalized = input
        // Remove common wrapper punctuation around emails
        .replace(/[<>{}\[\]()"']/g, ' ')
        // Light de-obfuscation for patterns like "name [at] domain [dot] edu"
        .replace(/\s*\[(at|AT)\]\s*/g, '@')
        .replace(/\s*\((at|AT)\)\s*/g, '@')
        .replace(/\s*\{(at|AT)\}\s*/g, '@')
        .replace(/\s*\[(dot|DOT)\]\s*/g, '.')
        .replace(/\s*\((dot|DOT)\)\s*/g, '.')
        .replace(/\s*\{(dot|DOT)\}\s*/g, '.')
        // Collapse whitespace around @ and .
        .replace(/\s*@\s*/g, '@')
        .replace(/\s*\.\s*/g, '.')
        // Collapse newlines/tabs into spaces (after tightening @/.)
        .replace(/\s+/g, ' ')
        .trim();

    const matches = normalized.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];

    const cleaned = matches
        .map((m) => m.trim().replace(/[),.;:]+$/g, ''))
        .map((m) => m.toLowerCase());

    return Array.from(new Set(cleaned));
}

