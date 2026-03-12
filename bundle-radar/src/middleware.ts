import { NextRequest, NextResponse } from 'next/server';

const ANON_COOKIE = 'br_sid';
const MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function generateAnonId(): string {
  return `anon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 11)}`;
}

export default function middleware(req: NextRequest) {
  const existing = req.cookies.get(ANON_COOKIE)?.value;
  if (existing) {
    return NextResponse.next();
  }
  const id = generateAnonId();
  const res = NextResponse.next();
  res.cookies.set(ANON_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  });
  return res;
}

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ico|woff2?|ttf|eot)$).*)'],
};
