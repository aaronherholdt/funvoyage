// services/geminiService.ts
// Client-side helper: talk to our own API routes instead of Google directly, with guard rails to avoid rate-limit abuse.

import type { SessionEntry, SessionAnalysis } from '../types';
import { createLogger } from '../lib/logger';

const log = createLogger({ component: 'geminiService' });

export const AI_RATE_LIMIT = {
  maxRequestsPerMinute: 10,
  windowMs: 60_000,
};

export class AiRateLimitError extends Error {
  retryAfterMs?: number;
  constructor(message: string, retryAfterMs?: number) {
    super(message);
    this.name = 'AiRateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

export class TurnLimitError extends Error {
  turnLimit: number;
  currentTurns: number;
  constructor(message: string, turnLimit: number, currentTurns: number) {
    super(message);
    this.name = 'TurnLimitError';
    this.turnLimit = turnLimit;
    this.currentTurns = currentTurns;
  }
}

const buildHeaders = (clientSessionId?: string) => ({
  'Content-Type': 'application/json',
  ...(clientSessionId ? { 'X-Client-Session': clientSessionId } : {}),
});

const parseErrorPayload = async (res: Response) => {
  try {
    return await res.json();
  } catch {
    return null;
  }
};

export const generateNiaResponse = async (
  history: { role: 'model' | 'user'; text: string }[],
  contextPrompt: string,
  kidAge: number,
  clientSessionId?: string,
): Promise<string> => {
  try {
    const res = await fetch('/api/nia/respond', {
      method: 'POST',
      headers: buildHeaders(clientSessionId),
      body: JSON.stringify({ history, contextPrompt, kidAge }),
    });

    if (res.status === 429) {
      const payload = await parseErrorPayload(res);
      // Check if it's a turn limit error vs rate limit error
      if (payload?.turnLimit !== undefined) {
        throw new TurnLimitError(
          payload?.error || 'Turn limit exceeded',
          payload.turnLimit,
          payload.currentTurns,
        );
      }
      throw new AiRateLimitError(
        payload?.error || 'Too many requests. Please slow down.',
        payload?.retryAfterMs,
      );
    }

    if (!res.ok) {
      log.error('Nia respond error', undefined, await res.text());
      return "I'm having a little trouble hearing you. Can we try that again?";
    }

    const data = await res.json();
    return data.text || "I'm listening...";
  } catch (err) {
    if (err instanceof AiRateLimitError || err instanceof TurnLimitError) throw err;
    log.error('Nia respond error', undefined, err);
    return "I'm having a little trouble hearing you. Can we try that again?";
  }
};

export const analyzeSession = async (
  sessionData: SessionEntry[],
  countryName: string,
  city: string | undefined,
  kidAge: number,
  clientSessionId?: string,
): Promise<SessionAnalysis | null> => {
  try {
    const res = await fetch('/api/nia/analyze', {
      method: 'POST',
      headers: buildHeaders(clientSessionId),
      body: JSON.stringify({ sessionData, countryName, city, kidAge }),
    });

    if (res.status === 429) {
      const payload = await parseErrorPayload(res);
      throw new AiRateLimitError(
        payload?.error || 'Too many requests. Please slow down.',
        payload?.retryAfterMs,
      );
    }

    if (!res.ok) {
      log.error('Nia analyze error', undefined, await res.text());
      return null;
    }

    const data = (await res.json()) as SessionAnalysis;
    return data;
  } catch (err) {
    if (err instanceof AiRateLimitError) throw err;
    log.error('Nia analyze error', undefined, err);
    return null;
  }
};
