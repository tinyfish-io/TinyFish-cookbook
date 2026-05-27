import { NextRequest } from 'next/server';
import { prisma, requireDatabase } from '@/lib/db';
import { getAnonUserId } from '@/lib/anon';

export async function GET(req: NextRequest) {
  const dbErr = requireDatabase();
  if (dbErr) return dbErr;

  const userId = getAnonUserId(req);
  if (!userId) {
    return Response.json({ error: 'Session required. Refresh the page and try again.' }, { status: 401 });
  }

  const scans = await prisma.scan.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      url: true,
      status: true,
      createdAt: true,
      result: true,
    },
  });

  return Response.json({
    scans: scans.map((s) => ({
      id: s.id,
      url: s.url,
      status: s.status,
      createdAt: s.createdAt,
      techCount: s.result && typeof s.result === 'object' && 'detections' in s.result
        ? (s.result.detections as unknown[]).length
        : null,
    })),
  });
}
