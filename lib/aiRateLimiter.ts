import { NextRequest } from 'next/server';

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

type Bucket = { used: number; windowStart: number };
const buckets = new Map<string, Bucket>();

export const AI_RATE_LIMIT = {
  windowMs: WINDOW_MS,
  maxRequests: MAX_REQUESTS,
};

const getBucket = (id: string) => {
  const now = Date.now();
  const bucket = buckets.get(id);
  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    return { used: 0, windowStart: now };
  }
  return bucket;
};

export const applyRateLimit = (identifier: string) => {
  const now = Date.now();
  const bucket = getBucket(identifier);
  const elapsed = now - bucket.windowStart;

  if (bucket.used >= MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfterMs: Math.max(0, WINDOW_MS - elapsed),
      remaining: 0,
    };
  }

  const updated: Bucket = { used: bucket.used + 1, windowStart: bucket.windowStart };
  buckets.set(identifier, updated);

  return {
    allowed: true,
    retryAfterMs: Math.max(0, WINDOW_MS - elapsed),
    remaining: Math.max(0, MAX_REQUESTS - updated.used),
  };
};

export const getClientIdentifier = (req: NextRequest) => {
  const headerId = req.headers.get('x-client-session');
  if (headerId) return headerId.trim();

  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();

  return req.ip || 'anonymous';
};
