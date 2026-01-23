// services/geminiService.ts
// Client-side helper: talk to our own API routes instead of Google directly, with guard rails to avoid rate-limit abuse.

import type { SessionEntry, SessionAnalysis } from '../types';

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
      throw new AiRateLimitError(
        payload?.error || 'Too many requests. Please slow down.',
        payload?.retryAfterMs,
      );
    }

    if (!res.ok) {
      console.error('Nia respond error:', await res.text());
      return "I'm having a little trouble hearing you. Can we try that again?";
    }

    const data = await res.json();
    return data.text || "I'm listening...";
  } catch (err) {
    if (err instanceof AiRateLimitError) throw err;
    console.error('Nia respond error:', err);
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
      console.error('Nia analyze error:', await res.text());
      return null;
    }

    const data = (await res.json()) as SessionAnalysis;
    return data;
  } catch (err) {
    if (err instanceof AiRateLimitError) throw err;
    console.error('Nia analyze error:', err);
    return null;
  }
};
