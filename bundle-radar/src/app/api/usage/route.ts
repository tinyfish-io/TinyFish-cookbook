import { NextRequest } from 'next/server';
import { requireDatabase } from '@/lib/db';
import { getScansThisMonth, getPlanForUser } from '@/lib/subscription';
import { PLANS } from '@/lib/plans';
import { getAnonUserId } from '@/lib/anon';

export async function GET(req: NextRequest) {
  const dbErr = requireDatabase();
  if (dbErr) return dbErr;

  const userId = getAnonUserId(req);
  if (!userId) {
    return Response.json({ error: 'Session required. Refresh the page and try again.' }, { status: 401 });
  }

  const plan = await getPlanForUser(userId);
  const used = await getScansThisMonth(userId);
  const limit = PLANS[plan].scansPerMonth;

  return Response.json({
    plan,
    planName: PLANS[plan].name,
    used,
    limit,
    remaining: Math.max(0, limit - used),
  });
}
