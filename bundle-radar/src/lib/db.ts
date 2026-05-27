import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

/** Call before using prisma; returns a 503 Response if DATABASE_URL is not set. */
export function requireDatabase(): Response | null {
  if (!process.env.DATABASE_URL?.trim()) {
    return new Response(
      JSON.stringify({
        error: 'Database not configured. Set DATABASE_URL in .env.local (see .env.example).',
        code: 'DATABASE_NOT_CONFIGURED',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
  return null;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
