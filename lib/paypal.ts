// lib/paypal.ts

import { createLogger } from './logger';

const log = createLogger({ component: 'paypal' });

/** PayPal HATEOAS link structure */
interface PayPalLink {
  href: string;
  rel: string;
  method?: string;
}

const PAYPAL_BASE_URL =
  process.env.PAYPAL_BASE_URL ?? 'https://api-m.sandbox.paypal.com';

const CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

async function getPayPalAccessToken(): Promise<string> {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Missing PayPal credentials in env');
  }
  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

  const res = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });

  if (!res.ok) {
    log.error('PayPal token error', undefined, await res.text());
    throw new Error('Failed to get PayPal access token');
  }

  const data = await res.json();
  return data.access_token as string;
}

// Create a subscription and get the approval URL to redirect the user to PayPal
export async function createPayPalSubscription(args: {
  planId: string;
  returnUrl: string;
  cancelUrl: string;
}) {
  const token = await getPayPalAccessToken();

  const res = await fetch(`${PAYPAL_BASE_URL}/v1/billing/subscriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      plan_id: args.planId,
      application_context: {
        return_url: args.returnUrl,
        cancel_url: args.cancelUrl,
        user_action: 'SUBSCRIBE_NOW',
      },
    }),
  });

  const json = await res.json();

  if (!res.ok) {
    log.error('PayPal create subscription error', undefined, json);
    throw new Error('Failed to create PayPal subscription');
  }

  const approvalUrl = (json.links as PayPalLink[] | undefined)?.find(
    (l) => l.rel === 'approve'
  )?.href;

  if (!approvalUrl) {
    throw new Error('No approval URL returned from PayPal');
  }

  return {
    id: json.id as string,        // subscription ID
    status: json.status as string,
    approvalUrl,
  };
}

export type PayPalSubscription = {
  id: string;
  status: string;
  plan_id: string;
};

// Verify a subscription that PayPal redirected back with
export async function getPayPalSubscription(subscriptionId: string): Promise<PayPalSubscription> {
  const token = await getPayPalAccessToken();

  const res = await fetch(`${PAYPAL_BASE_URL}/v1/billing/subscriptions/${subscriptionId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    log.error('PayPal subscription lookup error', undefined, await res.text());
    throw new Error('Failed to verify PayPal subscription');
  }

  return (await res.json()) as PayPalSubscription;
}
