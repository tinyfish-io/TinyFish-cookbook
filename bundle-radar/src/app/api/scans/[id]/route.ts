import { NextRequest } from 'next/server';
import { prisma, requireDatabase } from '@/lib/db';
import { getAnonUserId } from '@/lib/anon';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const dbErr = requireDatabase();
  if (dbErr) return dbErr;

  const userId = getAnonUserId(req);
  if (!userId) {
    return Response.json({ error: 'Session required. Refresh the page and try again.' }, { status: 401 });
  }

  const { id } = await params;
  const scan = await prisma.scan.findFirst({
    where: { id, userId },
  });

  if (!scan) {
    return Response.json({ error: 'Scan not found' }, { status: 404 });
  }

  return Response.json({
    id: scan.id,
    url: scan.url,
    status: scan.status,
    result: scan.result,
    error: scan.error,
    createdAt: scan.createdAt,
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const dbErr = requireDatabase();
  if (dbErr) return dbErr;

  const userId = getAnonUserId(req);
  if (!userId) {
    return Response.json({ error: 'Session required. Refresh the page and try again.' }, { status: 401 });
  }

  const { id } = await params;

  try {
    await prisma.scan.deleteMany({
      where: { id, userId },
    });
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: 'Failed to delete scan' }, { status: 500 });
  }
}
