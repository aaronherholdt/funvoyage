import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { NIA_SYSTEM_INSTRUCTION, getRespondTokenLimit, getTurnLimit } from '@/constants';
import { AI_RATE_LIMIT, applyRateLimit, getClientIdentifier } from '@/lib/aiRateLimiter';
import { createLogger } from '@/lib/logger';

const log = createLogger({ component: 'api/nia/respond' });

export const runtime = 'nodejs';

const MODEL_NAME = 'gemini-2.5-flash';

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

  const identifier = getClientIdentifier(req);
  const limit = await applyRateLimit(identifier);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many AI requests. Please slow down.', retryAfterMs: limit.retryAfterMs, limit: AI_RATE_LIMIT.maxRequests },
      { status: 429, headers: { 'Retry-After': Math.ceil(limit.retryAfterMs / 1000).toString() } }
    );
  }

  const { history, contextPrompt, kidAge } = await req.json();

  if (!Array.isArray(history) || typeof contextPrompt !== 'string' || typeof kidAge !== 'number') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  // Count user turns and enforce limit
  const userTurns = history.filter((h: { role: string }) => h.role === 'user').length;
  const turnLimit = getTurnLimit(kidAge);

  if (userTurns > turnLimit) {
    return NextResponse.json(
      { error: 'Turn limit exceeded', turnLimit, currentTurns: userTurns },
      { status: 429 }
    );
  }

  // Trim history to last 5 exchanges (10 messages) to reduce input tokens
  // while maintaining conversation context
  const MAX_HISTORY_MESSAGES = 10;
  const trimmedHistory = history.slice(-MAX_HISTORY_MESSAGES);

  const messages = trimmedHistory
    .map((h: { role: 'model' | 'user'; text: string }) => `${h.role === 'model' ? 'Nia' : 'Child'}: ${h.text}`)
    .join('\n');

  const fullPrompt = `
    ${NIA_SYSTEM_INSTRUCTION}

    CONTEXT:
    Child's Age: ${kidAge}
    Current Task: ${contextPrompt}
    
    Current Conversation History:
    ${messages}
    
    Response (as Nia):
  `;

  try {
    const response = await client.models.generateContent({
      model: MODEL_NAME,
      contents: fullPrompt,
      config: {
        maxOutputTokens: getRespondTokenLimit(kidAge),
      },
    });

    return NextResponse.json({ text: response.text ?? "I'm listening..." });
  } catch (err) {
    log.error('Nia respond error', undefined, err);
    return NextResponse.json({ error: 'Failed to get response' }, { status: 500 });
  }
}
