// app/api/paypal/checkout/route.ts

import { NextRequest, NextResponse } from 'next/server';

import { createPayPalSubscription } from '@/lib/paypal';

export const runtime = 'nodejs';

const PLAN_BY_TIER: Record<'STARTER' | 'PRO' | 'ADVENTURER', string | undefined> = {
  STARTER: process.env.PAYPAL_PLAN_STARTER_ID,
  PRO: process.env.PAYPAL_PLAN_PRO_ID,
  ADVENTURER: process.env.PAYPAL_PLAN_ADVENTURER_ID,
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const tierParam = (url.searchParams.get('tier') || '').toUpperCase() as 'STARTER' | 'PRO' | 'ADVENTURER';

  if (!tierParam || !PLAN_BY_TIER[tierParam]) {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return NextResponse.json({ error: 'Missing NEXT_PUBLIC_APP_URL' }, { status: 500 });
  }

  try {
    const returnUrl = `${appUrl}/billing/paypal/return?tier=${tierParam}`;
    const cancelUrl = `${appUrl}/billing/paypal/cancel?tier=${tierParam}`;

    const subscription = await createPayPalSubscription({
      planId: PLAN_BY_TIER[tierParam]!,
      returnUrl,
      cancelUrl,
    });

    // OPTIONAL: you could save subscription.id + tier in a payments table here
    return NextResponse.redirect(subscription.approvalUrl);
  } catch (err) {
    console.error('PayPal checkout error', err);
    return NextResponse.json({ error: 'Could not start PayPal checkout' }, { status: 500 });
  }
}
