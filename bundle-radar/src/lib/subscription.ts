import { prisma } from './db';
import { PLANS, type PlanId } from './plans';

export async function getOrCreateSubscription(userId: string) {
  return prisma.subscription.upsert({
    where: { userId },
    create: { userId, plan: 'free' },
    update: {},
  });
}

export async function getPlanForUser(userId: string): Promise<PlanId> {
  const sub = await getOrCreateSubscription(userId);
  return (sub.plan as PlanId) || 'free';
}

/** Count scans this month that count toward quota: completed + running (so concurrent requests cannot exceed limit). */
export async function getScansThisMonth(userId: string): Promise<number> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return prisma.scan.count({
    where: {
      userId,
      status: { in: ['completed', 'running'] },
      createdAt: { gte: start },
    },
  });
}

export async function canStartScan(userId: string): Promise<{ ok: boolean; message?: string; used: number; limit: number }> {
  const plan = await getPlanForUser(userId);
  const limit = PLANS[plan].scansPerMonth;
  const used = await getScansThisMonth(userId);
  if (used >= limit) {
    return {
      ok: false,
      message: `You've used all ${limit} scans this month. Upgrade to Pro for more.`,
      used,
      limit,
    };
  }
  return { ok: true, used, limit };
}

export class QuotaExceededError extends Error {
  constructor(
    message: string,
    public used: number,
    public limit: number
  ) {
    super(message);
    this.name = 'QuotaExceededError';
  }
}

/**
 * Reserve a scan slot in a transaction so concurrent requests cannot exceed quota.
 * Creates the scan with status 'running' and returns it, or throws QuotaExceededError.
 */
export async function reserveScanSlot(userId: string, url: string) {
  const plan = await getPlanForUser(userId);
  const limit = PLANS[plan].scansPerMonth;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);

  const scan = await prisma.$transaction(
    async (tx) => {
      const used = await tx.scan.count({
        where: {
          userId,
          status: { in: ['completed', 'running'] },
          createdAt: { gte: start },
        },
      });
      if (used >= limit) {
        throw new QuotaExceededError(
          `You've used all ${limit} scans this month. Upgrade to Pro for more.`,
          used,
          limit
        );
      }
      return tx.scan.create({
        data: { userId, url, status: 'running' },
      });
    },
    { isolationLevel: 'Serializable' }
  );

  return scan;
}
