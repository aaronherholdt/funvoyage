import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import type { SessionAnalysis, SessionEntry } from '@/types';
import { TOKEN_LIMITS } from '@/constants';
import { AI_RATE_LIMIT, applyRateLimit, getClientIdentifier } from '@/lib/aiRateLimiter';
import { createLogger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

const log = createLogger({ component: 'api/nia/analyze' });

export const runtime = 'nodejs';

const MODEL_NAME = 'gemini-2.5-flash';
const MAX_SESSION_ENTRIES = 50;
const MAX_SESSION_CHARS = 12000;
const MAX_CONTEXT_CHARS = 200;

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    log.error('Missing GEMINI_API_KEY');
    return null;
  }

  return new GoogleGenAI({ apiKey });
};

export async function POST(req: NextRequest) {
  const client = getClient();
  if (!client) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const identifier = getClientIdentifier(req, { userId: user?.id });
  const limit = await applyRateLimit(identifier);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many AI requests. Please slow down.', retryAfterMs: limit.retryAfterMs, limit: AI_RATE_LIMIT.maxRequests },
      { status: 429, headers: { 'Retry-After': Math.ceil(limit.retryAfterMs / 1000).toString() } }
    );
  }

  const { sessionData, countryName, city, kidAge } = (await req.json()) as {
    sessionData: SessionEntry[];
    countryName: string;
    city?: string;
    kidAge: number;
  };

  if (!Array.isArray(sessionData) || typeof countryName !== 'string' || typeof kidAge !== 'number') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  if (countryName.length > MAX_CONTEXT_CHARS || (city && city.length > MAX_CONTEXT_CHARS)) {
    return NextResponse.json({ error: 'Context too large' }, { status: 413 });
  }

  const trimmedSessionData = sessionData.slice(-MAX_SESSION_ENTRIES);
  const totalSessionChars = trimmedSessionData.reduce((sum: number, entry: { text?: string }) => {
    if (typeof entry.text !== 'string') return sum;
    return sum + entry.text.length;
  }, 0);

  if (totalSessionChars > MAX_SESSION_CHARS) {
    return NextResponse.json({ error: 'Session data too large' }, { status: 413 });
  }

  const location = city ? `${city}, ${countryName}` : countryName;
  const prompt = `
    Analyze the following travel reflection conversation between an AI (Nia) and a child (Age: ${kidAge}) about ${location}.
    
    Task:
    1. Create a summary suited for the child's age (max 3 sentences).
    2. Extract one key insight or idea the child had.
    3. Score the child's responses (0-20 points) on these 4 traits based on depth of reflection relative to their age:
       - Curiosity
       - Empathy
       - Resilience
       - Problem Solving

    Transcript:
    ${JSON.stringify(trimmedSessionData)}
  `;

  try {
    const response = await client.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        maxOutputTokens: TOKEN_LIMITS.analyze,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            keyInsight: { type: Type.STRING },
            points: {
              type: Type.OBJECT,
              properties: {
                curiosity: { type: Type.INTEGER },
                empathy: { type: Type.INTEGER },
                resilience: { type: Type.INTEGER },
                problem_solving: { type: Type.INTEGER },
              },
              required: ['curiosity', 'empathy', 'resilience', 'problem_solving'],
            },
          },
          required: ['summary', 'keyInsight', 'points'],
        },
      },
    });

    if (!response.text) {
      return NextResponse.json({ error: 'No analysis returned' }, { status: 500 });
    }

    const data = JSON.parse(response.text) as SessionAnalysis;
    return NextResponse.json(data);
  } catch (err) {
    log.error('Nia analyze error', undefined, err);
    return NextResponse.json({ error: 'Failed to analyze session' }, { status: 500 });
  }
}
