import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import {
  MAX_CHILD_AGE,
  MIN_CHILD_AGE,
  NIA_SYSTEM_INSTRUCTION,
  getRespondTokenLimit,
  getTurnLimit,
} from '@/constants';
import { AI_RATE_LIMIT, applyRateLimit, getClientIdentifier } from '@/lib/aiRateLimiter';
import { createLogger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

const log = createLogger({ component: 'api/nia/respond' });

export const runtime = 'nodejs';

const MODEL_NAME = 'gemini-2.5-flash';
const MAX_HISTORY_MESSAGES = 10;
const MAX_HISTORY_CHARS = 4000;
const MAX_CONTEXT_CHARS = 1000;
const MAX_MESSAGE_CHARS = 600;
const FALLBACK_TEXT = "I'm listening. What part felt most important to you, and why?";

type ConversationRole = 'model' | 'user';

interface ConversationEntry {
  role: ConversationRole;
  text: string;
}

interface RespondPayload {
  history: ConversationEntry[];
  contextPrompt: string;
  kidAge: number;
}

interface StructuredNiaResponse {
  acknowledgment: string;
  question: string;
  reasoningGoal: string;
}

interface ConversationSignals {
  stageHint: string;
  problemHints: string[];
  lastChildMessage: string | null;
  lastNiaQuestion: string | null;
  unresolvedDetailHints: string[];
}

interface ResponseQualityFixture {
  name: string;
  payload: RespondPayload;
  candidate: StructuredNiaResponse;
}

const GENERIC_ACK_PATTERNS = [
  /^great (job|thinking|idea)/i,
  /^good (job|thinking|idea)/i,
  /^nice\b/i,
  /^awesome\b/i,
  /^wow\b/i,
];

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    log.error('Missing GEMINI_API_KEY');
    return null;
  }

  return new GoogleGenAI({ apiKey });
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

const getWordCount = (value: string): number =>
  normalizeWhitespace(value).split(' ').filter(Boolean).length;

const isConversationRole = (value: unknown): value is ConversationRole =>
  value === 'model' || value === 'user';

const parseRespondPayload = (raw: unknown): { payload?: RespondPayload; error?: string } => {
  if (!isRecord(raw)) return { error: 'Invalid payload' };

  const rawHistory = raw.history;
  const rawContextPrompt = raw.contextPrompt;
  const rawKidAge = raw.kidAge;

  if (!Array.isArray(rawHistory) || typeof rawContextPrompt !== 'string' || typeof rawKidAge !== 'number') {
    return { error: 'Invalid payload' };
  }

  if (!Number.isInteger(rawKidAge) || rawKidAge < MIN_CHILD_AGE || rawKidAge > MAX_CHILD_AGE) {
    return { error: `kidAge must be an integer between ${MIN_CHILD_AGE} and ${MAX_CHILD_AGE}` };
  }

  const contextPrompt = normalizeWhitespace(rawContextPrompt);
  if (!contextPrompt) return { error: 'Context is required' };
  if (contextPrompt.length > MAX_CONTEXT_CHARS) return { error: 'Context too large' };

  const history: ConversationEntry[] = [];
  for (let i = 0; i < rawHistory.length; i += 1) {
    const entry = rawHistory[i];
    if (!isRecord(entry)) return { error: `Invalid history entry at index ${i}` };
    if (!isConversationRole(entry.role)) return { error: `Invalid role at history index ${i}` };
    if (typeof entry.text !== 'string') return { error: `Invalid text at history index ${i}` };

    const text = normalizeWhitespace(entry.text);
    if (!text) return { error: `History text is empty at index ${i}` };
    if (text.length > MAX_MESSAGE_CHARS) return { error: `History message too large at index ${i}` };

    history.push({ role: entry.role, text });
  }

  return {
    payload: {
      history,
      contextPrompt,
      kidAge: rawKidAge,
    },
  };
};

const extractStageHint = (contextPrompt: string): string => {
  const stageMatch = contextPrompt.match(/stage:\s*([a-z_]+)/i);
  return stageMatch?.[1]?.toLowerCase() ?? 'unknown';
};

const extractProblemHints = (contextPrompt: string): string[] => {
  const match = contextPrompt.match(/challenges?:\s*([^.\n]+)/i);
  if (!match) return [];
  return match[1]
    .split(',')
    .map((segment) => normalizeWhitespace(segment))
    .filter(Boolean)
    .slice(0, 3);
};

const extractLastQuestion = (text: string): string | null => {
  const matches = text.match(/[^?]+\?/g);
  if (!matches || matches.length === 0) return null;
  return normalizeWhitespace(matches[matches.length - 1]);
};

const buildUnresolvedDetailHints = (lastChildMessage: string | null): string[] => {
  if (!lastChildMessage) {
    return ['No child response yet. Ask what they noticed first and why it mattered.'];
  }

  const hints: string[] = [];

  if (getWordCount(lastChildMessage) < 8) {
    hints.push('Child response is brief. Ask for concrete who/where/when details.');
  }

  if (!/\b(because|since|so|cause|caused|reason|why)\b/i.test(lastChildMessage)) {
    hints.push('Cause is unclear. Ask why they think it happened.');
  }

  if (!/\b(feel|felt|emotion|worried|happy|sad|angry|frustrated|excited|scared|proud)\b/i.test(lastChildMessage)) {
    hints.push('Perspective is missing. Ask how they or others felt.');
  }

  if (hints.length === 0) {
    hints.push('Depth is available. Move to trade-offs or next-step reasoning.');
  }

  return hints;
};

const buildConversationSignals = (
  contextPrompt: string,
  history: ConversationEntry[],
): ConversationSignals => {
  const lastChildMessage = [...history].reverse().find((entry) => entry.role === 'user')?.text ?? null;
  const lastNiaTurn = [...history]
    .reverse()
    .find((entry) => entry.role === 'model' && entry.text.includes('?'));

  return {
    stageHint: extractStageHint(contextPrompt),
    problemHints: extractProblemHints(contextPrompt),
    lastChildMessage,
    lastNiaQuestion: lastNiaTurn ? extractLastQuestion(lastNiaTurn.text) : null,
    unresolvedDetailHints: buildUnresolvedDetailHints(lastChildMessage),
  };
};

const buildHistoryTranscript = (history: ConversationEntry[]): string => {
  if (history.length === 0) return 'No prior messages.';
  return history
    .map((entry) => `${entry.role === 'model' ? 'Nia' : 'Child'}: ${entry.text}`)
    .join('\n');
};

const buildPromptForModel = (
  payload: RespondPayload,
  signals: ConversationSignals,
  transcript: string,
): string => {
  const problemHints = signals.problemHints.length > 0 ? signals.problemHints.join('; ') : 'Not explicitly listed';
  const unresolvedHints = signals.unresolvedDetailHints.join(' | ');

  return [
    'Coaching Context',
    `- Child age: ${payload.kidAge}`,
    `- Stage hint: ${signals.stageHint}`,
    `- Current task: ${payload.contextPrompt}`,
    `- Active problem hints: ${problemHints}`,
    `- Last child message: ${signals.lastChildMessage ?? 'None yet'}`,
    `- Last Nia question: ${signals.lastNiaQuestion ?? 'None yet'}`,
    `- Unresolved detail priorities: ${unresolvedHints}`,
    '',
    'Conversation Transcript',
    transcript,
    '',
    'Return only JSON with keys: acknowledgment, question, reasoningGoal.',
    'The question must be open-ended and must end with a question mark.',
  ].join('\n');
};

const parseModelJson = (rawText: string | null | undefined): StructuredNiaResponse | null => {
  if (!rawText) return null;

  const normalized = rawText
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/, '')
    .trim();

  try {
    const parsed: unknown = JSON.parse(normalized);
    if (!isRecord(parsed)) return null;

    return {
      acknowledgment: typeof parsed.acknowledgment === 'string' ? parsed.acknowledgment : '',
      question: typeof parsed.question === 'string' ? parsed.question : '',
      reasoningGoal: typeof parsed.reasoningGoal === 'string' ? parsed.reasoningGoal : '',
    };
  } catch {
    return null;
  }
};

const ensureQuestionMark = (question: string): string => {
  const cleaned = normalizeWhitespace(question).replace(/[.!]+$/, '');
  if (!cleaned) return cleaned;
  return cleaned.endsWith('?') ? cleaned : `${cleaned}?`;
};

const isOpenEndedQuestion = (question: string): boolean => {
  const cleaned = normalizeWhitespace(question).toLowerCase();
  if (!cleaned.endsWith('?') || getWordCount(cleaned) < 6) return false;

  return /^(what|how|why|which|who|where|when|tell|describe|walk me|in what way|what might|how might)\b/.test(
    cleaned,
  );
};

const getFallbackAcknowledgment = (signals: ConversationSignals): string => {
  if (!signals.lastChildMessage) {
    return 'Thanks for sharing these observations.';
  }

  const excerpt = signals.lastChildMessage.replace(/"/g, "'").slice(0, 72);
  return `I hear that "${excerpt}" stood out to you.`;
};

const getFallbackQuestion = (kidAge: number, signals: ConversationSignals): string => {
  const stage = signals.stageHint;

  if (!signals.lastChildMessage) {
    return kidAge <= 6
      ? 'What did you notice first?'
      : 'What did you notice first, and why did it stand out to you?';
  }

  if (getWordCount(signals.lastChildMessage) < 8) {
    return kidAge <= 6
      ? 'Can you tell me what happened first, and who was there?'
      : 'Can you walk me through what happened first, where it happened, and who was involved?';
  }

  if (stage === 'explore') {
    return kidAge <= 9
      ? 'How might this affect other people there?'
      : 'How might this affect different people in that place, and what trade-off do you notice?';
  }

  if (stage === 'celebrate') {
    return kidAge <= 9
      ? 'What is one thing you want to try next time?'
      : 'What is one next step you would test, and why does it seem realistic?';
  }

  return kidAge <= 6
    ? 'Why do you think that happened?'
    : 'Why do you think that happened, and what detail makes you think that?';
};

const evaluateResponseQuality = (
  candidate: StructuredNiaResponse | null,
  signals: ConversationSignals,
): string[] => {
  if (!candidate) return ['missing_structured_response'];

  const issues: string[] = [];
  const acknowledgment = normalizeWhitespace(candidate.acknowledgment);
  const question = ensureQuestionMark(candidate.question);

  if (!acknowledgment) {
    issues.push('missing_acknowledgment');
  } else {
    if (GENERIC_ACK_PATTERNS.some((pattern) => pattern.test(acknowledgment))) {
      issues.push('generic_acknowledgment');
    }
    if (getWordCount(acknowledgment) < 4) {
      issues.push('acknowledgment_too_thin');
    }
  }

  if (!question) {
    issues.push('missing_question');
  } else if (!isOpenEndedQuestion(question)) {
    issues.push('question_not_open_ended');
  }

  if (signals.lastNiaQuestion && normalizeWhitespace(signals.lastNiaQuestion).toLowerCase() === question.toLowerCase()) {
    issues.push('question_repeated');
  }

  return issues;
};

const composeTutorReply = (
  candidate: StructuredNiaResponse | null,
  signals: ConversationSignals,
  kidAge: number,
): { text: string; qualityIssues: string[] } => {
  const qualityIssues = evaluateResponseQuality(candidate, signals);

  const preferredAck = candidate?.acknowledgment ? normalizeWhitespace(candidate.acknowledgment) : '';
  const preferredQuestion = candidate?.question ? ensureQuestionMark(candidate.question) : '';

  const finalAck =
    preferredAck &&
    !qualityIssues.includes('missing_acknowledgment') &&
    !qualityIssues.includes('generic_acknowledgment') &&
    !qualityIssues.includes('acknowledgment_too_thin')
      ? preferredAck
      : getFallbackAcknowledgment(signals);

  const finalQuestion =
    preferredQuestion &&
    !qualityIssues.includes('missing_question') &&
    !qualityIssues.includes('question_not_open_ended') &&
    !qualityIssues.includes('question_repeated')
      ? preferredQuestion
      : getFallbackQuestion(kidAge, signals);

  return {
    text: `${finalAck} ${finalQuestion}`.trim(),
    qualityIssues,
  };
};

const NIA_QUALITY_FIXTURES: ResponseQualityFixture[] = [
  {
    name: 'age6_intro_observation',
    payload: {
      kidAge: 6,
      contextPrompt:
        'Stage: intro. The child identified these challenges: trash near the river. Ask what they noticed first and why it mattered.',
      history: [],
    },
    candidate: {
      acknowledgment: 'You noticed something important near the river.',
      question: 'What did you see first when you looked at that area?',
      reasoningGoal: 'facts and context',
    },
  },
  {
    name: 'age9_brainstorm_details',
    payload: {
      kidAge: 9,
      contextPrompt:
        'Stage: brainstorm. The child is proposing ideas. Ask for concrete details and one first step.',
      history: [{ role: 'user', text: 'Maybe people can pick up trash after lunch.' }],
    },
    candidate: {
      acknowledgment: 'That is a thoughtful starting idea.',
      question: 'How would you organize who helps, where they meet, and when they start?',
      reasoningGoal: 'details and first step',
    },
  },
  {
    name: 'age12_explore_tradeoffs',
    payload: {
      kidAge: 12,
      contextPrompt:
        'Stage: explore. Ask about who is affected and trade-offs.',
      history: [
        { role: 'user', text: 'More buses could reduce traffic.' },
        { role: 'model', text: 'How might that help people who live far from school?' },
      ],
    },
    candidate: {
      acknowledgment: 'You are connecting transport choices to daily life.',
      question: 'What trade-off might appear if buses increase, and who might benefit or struggle most?',
      reasoningGoal: 'trade-offs and stakeholders',
    },
  },
  {
    name: 'age14_celebrate_reflection',
    payload: {
      kidAge: 14,
      contextPrompt:
        'Stage: celebrate. Affirm a specific insight and ask one reflective next-step question.',
      history: [{ role: 'user', text: 'The root problem seems like weak waste rules, not just littering.' }],
    },
    candidate: {
      acknowledgment: 'You identified a deeper system-level issue.',
      question: 'What is one realistic step you would test first to influence that rule problem, and why?',
      reasoningGoal: 'reflection and action',
    },
  },
];

const runNiaQualitySmokeChecks = () => {
  if (process.env.NODE_ENV === 'production') return;

  for (const fixture of NIA_QUALITY_FIXTURES) {
    const signals = buildConversationSignals(fixture.payload.contextPrompt, fixture.payload.history);
    const issues = evaluateResponseQuality(fixture.candidate, signals);
    if (issues.length > 0) {
      log.warn('Nia quality fixture failed', { fixture: fixture.name, issues });
    }
  }
};

runNiaQualitySmokeChecks();

export async function POST(req: NextRequest) {
  try {
    const client = getClient();
    if (!client) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      log.warn('Failed to resolve authenticated user for rate limiting', undefined, authError);
    }

    const identifier = getClientIdentifier(req, { userId: user?.id });
    const limit = await applyRateLimit(identifier);
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: 'Too many AI requests. Please slow down.',
          retryAfterMs: limit.retryAfterMs,
          limit: AI_RATE_LIMIT.maxRequests,
        },
        { status: 429, headers: { 'Retry-After': Math.ceil(limit.retryAfterMs / 1000).toString() } },
      );
    }

    let rawPayload: unknown;
    try {
      rawPayload = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const { payload, error } = parseRespondPayload(rawPayload);
    if (!payload) {
      return NextResponse.json({ error: error ?? 'Invalid payload' }, { status: 400 });
    }

    const userTurns = payload.history.filter((entry) => entry.role === 'user').length;
    const turnLimit = getTurnLimit(payload.kidAge);
    if (userTurns >= turnLimit) {
      return NextResponse.json(
        { error: 'Turn limit exceeded', turnLimit, currentTurns: userTurns },
        { status: 429 },
      );
    }

    const trimmedHistory = payload.history.slice(-MAX_HISTORY_MESSAGES);
    const totalHistoryChars = trimmedHistory.reduce((sum, entry) => sum + entry.text.length, 0);
    if (totalHistoryChars > MAX_HISTORY_CHARS) {
      return NextResponse.json({ error: 'History too large' }, { status: 413 });
    }

    const signals = buildConversationSignals(payload.contextPrompt, trimmedHistory);
    const transcript = buildHistoryTranscript(trimmedHistory);
    const modelPrompt = buildPromptForModel(payload, signals, transcript);

    const response = await client.models.generateContent({
      model: MODEL_NAME,
      contents: modelPrompt,
      config: {
        systemInstruction: NIA_SYSTEM_INSTRUCTION,
        maxOutputTokens: getRespondTokenLimit(payload.kidAge),
        temperature: 0.8,
        topP: 0.95,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            acknowledgment: { type: Type.STRING },
            question: { type: Type.STRING },
            reasoningGoal: { type: Type.STRING },
          },
          required: ['acknowledgment', 'question', 'reasoningGoal'],
        },
      },
    });

    const parsedResponse = parseModelJson(response.text ?? null);
    const { text, qualityIssues } = composeTutorReply(parsedResponse, signals, payload.kidAge);

    if (qualityIssues.length > 0) {
      log.warn('Nia response quality repaired', {
        qualityIssues,
        stageHint: signals.stageHint,
        reasoningGoal: parsedResponse?.reasoningGoal,
      });
    }

    return NextResponse.json({ text: text || FALLBACK_TEXT });
  } catch (err) {
    log.error('Nia respond error', undefined, err);
    return NextResponse.json({ error: 'Failed to get response' }, { status: 500 });
  }
}
