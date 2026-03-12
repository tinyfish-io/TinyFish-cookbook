import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { getAnonUserId } from '@/lib/anon';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });

export async function POST(req: NextRequest) {
  try {
    const userId = getAnonUserId(req);
    if (!userId) {
      return Response.json({ error: 'Session required. Refresh the page and try again.' }, { status: 401 });
    }

    const body = await req.json();
    const { plan } = body; // 'pro' | 'team'

    if (!plan || !['pro', 'team'].includes(plan)) {
      return Response.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const priceId = plan === 'pro'
      ? process.env.STRIPE_PRO_PRICE_ID
      : process.env.STRIPE_TEAM_PRICE_ID;

    if (!priceId || !process.env.STRIPE_SECRET_KEY) {
      return Response.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    let sub = await prisma.subscription.findUnique({ where: { userId } });
    if (!sub) {
      sub = await prisma.subscription.create({
        data: { userId, plan: 'free' },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?upgraded=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`,
      customer: sub.stripeCustomerId ?? undefined,
      customer_email: undefined, // Stripe collects email at checkout when no customer
      metadata: { userId, plan },
      subscription_data: { metadata: { userId } },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
