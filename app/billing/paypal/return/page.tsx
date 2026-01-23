// app/billing/paypal/return/page.tsx

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPayPalSubscription, type PayPalSubscription } from '@/lib/paypal';

const PLAN_BY_TIER: Record<'STARTER' | 'PRO' | 'ADVENTURER', string | undefined> = {
  STARTER: process.env.PAYPAL_PLAN_STARTER_ID,
  PRO: process.env.PAYPAL_PLAN_PRO_ID,
  ADVENTURER: process.env.PAYPAL_PLAN_ADVENTURER_ID,
};

type Props = {
  searchParams: Promise<{
    subscription_id?: string;
  }>;
};

export default async function PayPalReturnPage({ searchParams }: Props) {
  const params = await searchParams;
  const subscriptionId = params.subscription_id ?? null;

  if (!subscriptionId) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-2xl font-semibold mb-4">Something went wrong</h1>
        <p className="mb-4">We could not verify your PayPal subscription.</p>
      </div>
    );
  }

  // 1) Normal client: read user & current profile (with RLS)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: existingProfile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('Supabase profile fetch error', profileError);
  }

  // 2) Verify subscription with PayPal (you already have this)
  let subscription: PayPalSubscription;
  try {
    subscription = await getPayPalSubscription(subscriptionId);
  } catch (err) {
    console.error('PayPal verification failed', err);
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-2xl font-semibold mb-4">Unable to verify payment</h1>
        <p className="mb-4">We could not validate your PayPal subscription. Please contact support.</p>
      </div>
    );
  }

  const resolvedTierEntry = Object.entries(PLAN_BY_TIER).find(
    ([, planId]) => planId && subscription.plan_id === planId
  );
  const resolvedTier = resolvedTierEntry?.[0] as 'STARTER' | 'PRO' | 'ADVENTURER' | undefined;

  const isActive =
    subscription.status === 'ACTIVE' ||
    subscription.status === 'APPROVAL_PENDING' ||
    subscription.status === 'APPROVED';

  if (!resolvedTier || !isActive) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-2xl font-semibold mb-4">Payment not finalized</h1>
        <p className="mb-4">
          We could not confirm an active subscription for your account. Please try again or reach out to
          support.
        </p>
      </div>
    );
  }

  const nextProfile = {
    ...(existingProfile || {}),
    id: user.id,
    tier: resolvedTier,
    paypal_subscription_id: subscription.id,
    paypal_plan_id: subscription.plan_id,
  };

  // 3) Admin client: perform the privileged upsert
  const adminSupabase = createAdminClient();

  const { error } = await adminSupabase.from('profiles').upsert(nextProfile);

  if (error) {
    console.error('Supabase update error', error);
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-2xl font-semibold mb-4">Payment received.</h1>
        <p className="mb-4">
          Your PayPal payment went through, but we could not update your account automatically.
          Please contact support and we will fix it manually.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-3xl font-bold mb-4">Welcome to {resolvedTier}</h1>
      <p className="mb-6">
        Your subscription is active. Your dashboard will reflect your new features in a moment.
      </p>
      <a
        href="/dashboard"
        className="inline-flex items-center rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50"
      >
        Go to dashboard
      </a>
    </div>
  );
}
