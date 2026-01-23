import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { NIA_SYSTEM_INSTRUCTION } from '@/constants';
import { AI_RATE_LIMIT, applyRateLimit, getClientIdentifier } from '@/lib/aiRateLimiter';

export const runtime = 'nodejs';

const MODEL_NAME = 'gemini-2.5-flash';

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Missing GEMINI_API_KEY');
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
  const limit = applyRateLimit(identifier);
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

  const messages = history
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
    });

    return NextResponse.json({ text: response.text ?? "I'm listening..." });
  } catch (err) {
    console.error('Nia respond error:', err);
    return NextResponse.json({ error: 'Failed to get response' }, { status: 500 });
  }
}
