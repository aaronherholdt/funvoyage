// services/geminiService.ts
// Client-side helper: talk to our own API routes instead of Google directly, with guard rails to avoid rate-limit abuse.

import type { SessionEntry, SessionAnalysis } from '../types';
import { MAX_CHILD_AGE, MIN_CHILD_AGE } from '../constants';
import { createLogger } from '../lib/logger';

const log = createLogger({ component: 'geminiService' });
const NIA_FALLBACK_RESPONSE = "I'm having a little trouble hearing you. Can we try that again?";

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

interface NiaErrorPayload {
  error?: string;
  retryAfterMs?: number;
  turnLimit?: number;
  currentTurns?: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isValidKidAge = (kidAge: number): boolean =>
  Number.isInteger(kidAge) && kidAge >= MIN_CHILD_AGE && kidAge <= MAX_CHILD_AGE;

const normalizeText = (value: string): string => value.replace(/\s+/g, ' ').trim();

const isValidHistory = (
  history: { role: 'model' | 'user'; text: string }[],
): history is { role: 'model' | 'user'; text: string }[] => {
  return history.every((entry) => {
    if (entry.role !== 'model' && entry.role !== 'user') return false;
    if (typeof entry.text !== 'string') return false;
    return normalizeText(entry.text).length > 0;
  });
};

const parseErrorPayload = async (res: Response): Promise<NiaErrorPayload | null> => {
  try {
    const raw: unknown = await res.clone().json();
    if (!isRecord(raw)) return null;

    return {
      error: typeof raw.error === 'string' ? raw.error : undefined,
      retryAfterMs: typeof raw.retryAfterMs === 'number' ? raw.retryAfterMs : undefined,
      turnLimit: typeof raw.turnLimit === 'number' ? raw.turnLimit : undefined,
      currentTurns: typeof raw.currentTurns === 'number' ? raw.currentTurns : undefined,
    };
  } catch {
    return null;
  }
};

const parseRespondPayload = async (res: Response): Promise<string | null> => {
  try {
    const raw: unknown = await res.json();
    if (!isRecord(raw)) return null;
    if (typeof raw.text !== 'string') return null;
    const text = normalizeText(raw.text);
    return text || null;
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
  const normalizedContextPrompt = normalizeText(contextPrompt);
  if (!isValidKidAge(kidAge) || !normalizedContextPrompt || !isValidHistory(history)) {
    log.warn('Invalid input for generateNiaResponse', {
      kidAge,
      historyLength: history.length,
      hasContext: Boolean(normalizedContextPrompt),
    });
    return NIA_FALLBACK_RESPONSE;
  }

  const normalizedHistory = history.map((entry) => ({
    role: entry.role,
    text: normalizeText(entry.text),
  }));

  try {
    const res = await fetch('/api/nia/respond', {
      method: 'POST',
      headers: buildHeaders(clientSessionId),
      body: JSON.stringify({ history: normalizedHistory, contextPrompt: normalizedContextPrompt, kidAge }),
    });

    if (res.status === 429) {
      const payload = await parseErrorPayload(res);
      if (payload?.turnLimit !== undefined && payload.currentTurns !== undefined) {
        throw new TurnLimitError(
          payload.error || 'Turn limit exceeded',
          payload.turnLimit,
          payload.currentTurns,
        );
      }
      throw new AiRateLimitError(
        payload?.error || 'Too many requests. Please slow down.',
        payload?.retryAfterMs ?? AI_RATE_LIMIT.windowMs,
      );
    }

    if (!res.ok) {
      const payload = await parseErrorPayload(res);
      log.error('Nia respond error', { status: res.status }, payload ?? await res.text());
      return NIA_FALLBACK_RESPONSE;
    }

    const text = await parseRespondPayload(res);
    if (!text) {
      log.warn('Nia respond payload missing text');
      return "I'm listening...";
    }
    return text;
  } catch (err) {
    if (err instanceof AiRateLimitError || err instanceof TurnLimitError) throw err;
    log.error('Nia respond error', undefined, err);
    return NIA_FALLBACK_RESPONSE;
  }
};

export const analyzeSession = async (
  sessionData: SessionEntry[],
  countryName: string,
  city: string | undefined,
  kidAge: number,
  clientSessionId?: string,
): Promise<SessionAnalysis | null> => {
  const normalizedCountryName = normalizeText(countryName);
  const normalizedCity = city ? normalizeText(city) : undefined;

  if (!isValidKidAge(kidAge) || !normalizedCountryName || !Array.isArray(sessionData)) {
    log.warn('Invalid input for analyzeSession', {
      kidAge,
      sessionEntries: Array.isArray(sessionData) ? sessionData.length : 'invalid',
      hasCountry: Boolean(normalizedCountryName),
    });
    return null;
  }

  try {
    const res = await fetch('/api/nia/analyze', {
      method: 'POST',
      headers: buildHeaders(clientSessionId),
      body: JSON.stringify({
        sessionData,
        countryName: normalizedCountryName,
        city: normalizedCity,
        kidAge,
      }),
    });

    if (res.status === 429) {
      const payload = await parseErrorPayload(res);
      throw new AiRateLimitError(
        payload?.error || 'Too many requests. Please slow down.',
        payload?.retryAfterMs ?? AI_RATE_LIMIT.windowMs,
      );
    }

    if (!res.ok) {
      const payload = await parseErrorPayload(res);
      log.error('Nia analyze error', { status: res.status }, payload ?? await res.text());
      return null;
    }

    const data: unknown = await res.json();
    if (!isRecord(data)) {
      log.error('Nia analyze error: invalid payload', undefined, data);
      return null;
    }

    const points = data.points;
    if (
      typeof data.summary !== 'string' ||
      typeof data.keyInsight !== 'string' ||
      !isRecord(points) ||
      typeof points.curiosity !== 'number' ||
      typeof points.empathy !== 'number' ||
      typeof points.resilience !== 'number' ||
      typeof points.problem_solving !== 'number'
    ) {
      log.error('Nia analyze error: malformed analysis payload', undefined, data);
      return null;
    }

    return {
      summary: data.summary,
      keyInsight: data.keyInsight,
      points: {
        curiosity: points.curiosity,
        empathy: points.empathy,
        resilience: points.resilience,
        problem_solving: points.problem_solving,
      },
    };
  } catch (err) {
    if (err instanceof AiRateLimitError) throw err;
    log.error('Nia analyze error', undefined, err);
    return null;
  }
};
