import { NextRequest } from 'next/server';
import { createAdminClient } from './supabase/admin';
import { createLogger } from './logger';

const log = createLogger({ component: 'aiRateLimiter' });

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

export const AI_RATE_LIMIT = {
  windowMs: WINDOW_MS,
  maxRequests: MAX_REQUESTS,
};

// In-memory fallback (for when Supabase is unavailable)
type Bucket = { used: number; windowStart: number };
const memoryBuckets = new Map<string, Bucket>();

const getMemoryBucket = (id: string) => {
  const now = Date.now();
  const bucket = memoryBuckets.get(id);
  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    return { used: 0, windowStart: now };
  }
  return bucket;
};

const applyMemoryRateLimit = (identifier: string) => {
  const now = Date.now();
  const bucket = getMemoryBucket(identifier);
  const elapsed = now - bucket.windowStart;

  if (bucket.used >= MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfterMs: Math.max(0, WINDOW_MS - elapsed),
      remaining: 0,
    };
  }

  const updated: Bucket = { used: bucket.used + 1, windowStart: bucket.windowStart };
  memoryBuckets.set(identifier, updated);

  return {
    allowed: true,
    retryAfterMs: Math.max(0, WINDOW_MS - elapsed),
    remaining: Math.max(0, MAX_REQUESTS - updated.used),
  };
};

/**
 * Apply rate limit using Supabase for persistence
 * Falls back to in-memory rate limiting if Supabase is unavailable
 */
export const applyRateLimit = async (identifier: string): Promise<{
  allowed: boolean;
  retryAfterMs: number;
  remaining: number;
}> => {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_identifier: identifier,
      p_max_requests: MAX_REQUESTS,
      p_window_ms: WINDOW_MS,
    });

    if (error) {
      log.error('Supabase rate limit check failed, using memory fallback', { identifier }, error);
      return applyMemoryRateLimit(identifier);
    }

    if (data && data.length > 0) {
      const result = data[0];
      return {
        allowed: result.allowed,
        retryAfterMs: result.retry_after_ms,
        remaining: result.remaining,
      };
    }

    // Unexpected response, fall back to memory
    log.warn('Unexpected rate limit response', { identifier, data });
    return applyMemoryRateLimit(identifier);
  } catch (err) {
    log.error('Rate limit error, using memory fallback', { identifier }, err);
    return applyMemoryRateLimit(identifier);
  }
};

/**
 * Synchronous rate limit check using in-memory only
 * Use this when you can't await (but prefer applyRateLimit when possible)
 */
export const applyRateLimitSync = (identifier: string) => {
  return applyMemoryRateLimit(identifier);
};

export const getClientIdentifier = (req: NextRequest) => {
  const headerId = req.headers.get('x-client-session');
  if (headerId) return headerId.trim();

  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();

  return req.ip || 'anonymous';
};
