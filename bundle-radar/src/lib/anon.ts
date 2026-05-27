import { NextRequest } from 'next/server';

const ANON_COOKIE = 'br_sid';

/**
 * Read the anonymous session ID from the request cookie.
 * Middleware sets br_sid on first visit; APIs use this for scans, quota, and listing.
 */
export function getAnonUserId(req: NextRequest): string | null {
  return req.cookies.get(ANON_COOKIE)?.value ?? null;
}
