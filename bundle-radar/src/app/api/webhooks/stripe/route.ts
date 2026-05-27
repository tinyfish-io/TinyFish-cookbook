import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  if (!webhookSecret) {
    return Response.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return Response.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const plan = session.metadata?.plan;
      if (userId && plan) {
        await prisma.subscription.upsert({
          where: { userId },
          create: {
            userId,
            plan,
            stripeCustomerId: session.customer as string | null,
            stripeSubscriptionId: session.subscription as string | null,
          },
          update: {
            plan,
            stripeCustomerId: session.customer as string | null,
            stripeSubscriptionId: session.subscription as string | null,
          },
        });
      }
    } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created') {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;
      if (userId) {
        const plan = subscription.metadata?.plan || 'pro';
        await prisma.subscription.upsert({
          where: { userId },
          create: {
            userId,
            plan,
            stripeCustomerId: subscription.customer as string,
            stripeSubscriptionId: subscription.id,
            currentPeriodEnd: new Date((subscription.current_period_end || 0) * 1000),
          },
          update: {
            plan,
            stripeSubscriptionId: subscription.id,
            currentPeriodEnd: new Date((subscription.current_period_end || 0) * 1000),
          },
        });
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;
      if (userId) {
        await prisma.subscription.update({
          where: { userId },
          data: { plan: 'free', stripeSubscriptionId: null, currentPeriodEnd: null },
        });
      }
    }
  } catch (e) {
    console.error('Webhook error:', e);
    return Response.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return Response.json({ received: true });
}
