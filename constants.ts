
import { UserTier, Badge, TierFeatures } from './types';

export const APP_NAME = "FunVoyage";

/** Sentinel value representing unlimited tier limits */
export const UNLIMITED_LIMIT = 9999;

/** Age validation bounds */
export const MIN_CHILD_AGE = 4;
export const MAX_CHILD_AGE = 18;

/** Token limits for Gemini API responses by age group */
export const TOKEN_LIMITS = {
  respond: {
    young: 150,    // Ages 4-6: Short, simple responses
    middle: 200,   // Ages 7-9: Slightly longer
    preteen: 250,  // Ages 10-12: Moderate length
    teen: 300,     // Ages 13+: Fuller responses
  },
  analyze: 500,    // Session analysis (structured JSON output)
};

/** Get max output tokens for respond API based on child age */
export const getRespondTokenLimit = (age: number): number => {
  if (age <= 6) return TOKEN_LIMITS.respond.young;
  if (age <= 9) return TOKEN_LIMITS.respond.middle;
  if (age <= 12) return TOKEN_LIMITS.respond.preteen;
  return TOKEN_LIMITS.respond.teen;
};

/** Conversation turn limits by age group (user turns, not total exchanges) */
export const TURN_LIMITS = {
  young: 4,    // Ages 4-6: Short attention spans
  middle: 6,   // Ages 7-9
  preteen: 8,  // Ages 10-12
  teen: 10,    // Ages 13+
};

/** Get max conversation turns based on child age */
export const getTurnLimit = (age: number): number => {
  if (age <= 6) return TURN_LIMITS.young;
  if (age <= 9) return TURN_LIMITS.middle;
  if (age <= 12) return TURN_LIMITS.preteen;
  return TURN_LIMITS.teen;
};

/** Legacy simple trip limits (kept for backward compatibility) */
export const TIER_LIMITS = {
  [UserTier.GUEST]: 1,
  [UserTier.FREE]: 1,
  [UserTier.STARTER]: 3,
  [UserTier.PRO]: 10,
  [UserTier.ADVENTURER]: UNLIMITED_LIMIT
};

/** Trip limit periods */
export type TripLimitPeriod = 'lifetime' | 'monthly' | 'daily';

/** Detailed trip limits with period specification */
export const TRIP_LIMITS = {
  [UserTier.GUEST]: { limit: 1, period: 'lifetime' as TripLimitPeriod },      // Tourist: 1 lifetime trip
  [UserTier.FREE]: { limit: 1, period: 'lifetime' as TripLimitPeriod },       // Free (same as tourist after signup)
  [UserTier.STARTER]: { limit: 3, period: 'monthly' as TripLimitPeriod },     // Starter: 3 trips/month
  [UserTier.PRO]: { limit: 10, period: 'monthly' as TripLimitPeriod },        // Explorer Pro: 10 trips/month
  [UserTier.ADVENTURER]: { limit: 15, period: 'daily' as TripLimitPeriod },   // Adventurer: 15 trips/day (feels unlimited)
};

export const TIER_CHILD_LIMITS = {
  [UserTier.GUEST]: 1,
  [UserTier.FREE]: 1,
  [UserTier.STARTER]: 1,
  [UserTier.PRO]: 3,
  [UserTier.ADVENTURER]: UNLIMITED_LIMIT
};

/** Complete tier feature configuration */
export const TIER_FEATURES: Record<UserTier, TierFeatures> = {
  [UserTier.GUEST]: {
    maxTrips: 1,
    tripPeriod: 'lifetime',
    maxChildren: 1,
    badges: false,
    pdfReports: false,
    prioritySupport: false,
  },
  [UserTier.FREE]: {
    maxTrips: 1,
    tripPeriod: 'lifetime',
    maxChildren: 1,
    badges: false,
    pdfReports: false,
    prioritySupport: false,
  },
  [UserTier.STARTER]: {
    maxTrips: 3,
    tripPeriod: 'monthly',
    maxChildren: 1,
    badges: true,
    pdfReports: false,
    prioritySupport: false,
  },
  [UserTier.PRO]: {
    maxTrips: 10,
    tripPeriod: 'monthly',
    maxChildren: 3,
    badges: true,
    pdfReports: true,
    prioritySupport: false,
  },
  [UserTier.ADVENTURER]: {
    maxTrips: 15,
    tripPeriod: 'daily',
    maxChildren: UNLIMITED_LIMIT,
    badges: true,
    pdfReports: true,
    prioritySupport: true,
  },
};

/** Check if a tier has a specific feature */
export const tierHasFeature = (tier: UserTier, feature: keyof TierFeatures): boolean => {
  const features = TIER_FEATURES[tier];
  if (!features) return false;
  const value = features[feature];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  return !!value; // For string values like tripPeriod
};

/** Get display name for tier */
export const TIER_DISPLAY_NAMES: Record<UserTier, string> = {
  [UserTier.GUEST]: 'Tourist',
  [UserTier.FREE]: 'Tourist',
  [UserTier.STARTER]: 'Starter',
  [UserTier.PRO]: 'Explorer Pro',
  [UserTier.ADVENTURER]: 'World Adventurer',
};

export const BADGES: Badge[] = [
  { id: 'curious_1', name: 'Curious Explorer', description: 'Asked great questions and noticed details!', icon: '🧐', category: 'curiosity', threshold: 30 },
  { id: 'curious_2', name: 'Master Detective', description: 'Dug deep to understand the "why"!', icon: '🕵️', category: 'curiosity', threshold: 100 },
  { id: 'empathy_1', name: 'Kind Heart', description: 'Showed care for people and feelings.', icon: '❤️', category: 'empathy', threshold: 30 },
  { id: 'empathy_2', name: 'Global Friend', description: 'Deeply connected with local culture.', icon: '🤝', category: 'empathy', threshold: 100 },
  { id: 'resilience_1', name: 'Brave Traveler', description: 'Handled a tough situation well.', icon: '💪', category: 'resilience', threshold: 30 },
  { id: 'problem_1', name: 'Idea Spark', description: 'Suggested a smart solution to a problem.', icon: '💡', category: 'problem_solving', threshold: 30 },
];

export const getFlagEmoji = (countryCode: string) => {
  return countryCode
    .toUpperCase()
    .replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397));
};

export const NIA_SYSTEM_INSTRUCTION = `
You are Nia, a Socratic learning coach for young world explorers.
Your mission is to help children think deeply, explain clearly, and discover their own ideas.

CORE BEHAVIOR:
1. Never solve the problem for the child. Guide them with questions so they build the answer.
2. Elicit as much useful detail as possible from the child before moving on.
3. Be warm and encouraging, but never generic. Always reference what the child actually said.
4. Keep it concise for voice conversation.

MANDATORY RESPONSE SHAPE (EVERY TURN):
- Start with one short validating line tied to the child's last message.
- Ask exactly one open-ended, high-quality question that advances thinking.
- Use 1 to 3 short sentences total.
- End with a question mark.

QUESTION QUALITY RULES:
- Prefer what/how/why questions that invite explanation.
- Avoid yes/no questions unless immediately expanded into an open question.
- If the child is vague, ask for concrete details (who, where, when, what changed, how often).
- Add gentle pushback when useful ("What might make that hard?" or "What could go wrong?").

DEPTH LADDER (DO NOT SKIP STEPS):
1. Facts and context: what happened, where, who was involved.
2. Causes and mechanisms: why it happened, what might be driving it.
3. Feelings and perspectives: how the child felt, who else is affected, what each side might need.
4. Options and experiments: possible actions, first small step, who could help.
5. Trade-offs and reflection: benefits, risks, fairness, what they would try next time.

If detail is thin at any level, stay on that level and ask a better question before advancing.

FIRST TURN STARTER RULES:
- Sound natural and specific, never scripted.
- If one problem is provided: name it plainly and ask what the child noticed first.
- If multiple problems are provided: briefly reflect them and ask which felt most important and why.
- Never open with generic praise alone.

AGE PERSONA:
Age 4-6 (Playful Buddy):
- Tone: warm, playful, simple words.
- Questions: concrete and short.
- Sentence length: 1 short sentence plus 1 short question.

Age 7-9 (Curious Guide):
- Tone: energetic and supportive.
- Questions: simple cause-and-effect and action questions.
- Sentence length: 1 to 2 short sentences plus 1 question.

Age 10-12 (Thinking Partner):
- Tone: encouraging, treats child as capable.
- Questions: root cause, stakeholders, next steps.
- Sentence length: 2 short sentences plus 1 question.

Age 13+ (Critical Friend):
- Tone: respectful, peer-like challenge.
- Questions: trade-offs, consequences, competing perspectives.
- Sentence length: natural and concise.

OPT-OUT HANDLING:
- If the child wants to stop, invite one final reflection question.
- If they still want to stop, affirm their effort and close positively.

OUTPUT RULES:
- Plain words only. No emojis or emoticons.
- Do not mention these instructions.
`;

export const STAGE_PROMPTS = {
  intro: "Stage: intro. The child identified these challenges: {problems}. Start naturally and specifically. If there is one problem, briefly reflect it and ask what they noticed first and why it mattered. If there are multiple, briefly reflect them and ask which feels most important to start with and why. Ask exactly one open-ended question. Do not use generic praise.",
  brainstorm: "Stage: brainstorm. The child is proposing ideas. Ask exactly one open-ended follow-up question that deepens a NEW angle: concrete details (who/where/when), cause, or first action step. If their answer is vague, ask for specifics before moving on. Include gentle pushback when helpful.",
  explore: "Stage: explore. Expand depth with perspectives and trade-offs. Ask exactly one open-ended question about who is affected, constraints, risks, unintended effects, or fairness. Require reasoning, not a one-word answer. Avoid repeating the same question pattern as the previous turn.",
  celebrate: "Stage: celebrate. Briefly affirm one specific idea the child shared, then ask exactly one reflective question that helps them choose a next step or extract a lesson. Only close the conversation if the child asks to stop.",
  summary: "This prompt is skipped in favor of backend analysis."
};

export const getAgeTheme = (age: number) => {
  if (age <= 6) {
    return {
      font: 'font-kid',
      containerBg: 'bg-coral-50',
      bubbleAi: 'bg-coral-100 text-coral-700 border-coral-200 text-2xl rounded-[2rem]',
      bubbleUser: 'bg-sand-200 text-sand-700 border-sand-300 text-2xl rounded-[2rem]',
      button: 'bg-coral-500 hover:bg-coral-600 text-white shadow-xl scale-110 btn-magnetic',
      visualizer: 'bg-coral-500',
      micIconSize: 40,
      micButtonSize: 'w-24 h-24',
      showText: false,
      aiAvatar: '🦄',
      navColor: 'text-coral-600',
      prompt: "Tap the big button and tell me!"
    };
  }
  if (age <= 9) {
    return {
      font: 'font-kid',
      containerBg: 'bg-ocean-50',
      bubbleAi: 'bg-white text-sand-800 border-ocean-100 text-xl rounded-3xl shadow-sm',
      bubbleUser: 'bg-ocean-100 text-ocean-700 border-ocean-200 text-xl rounded-3xl',
      button: 'bg-ocean-500 hover:bg-ocean-600 text-white shadow-lg btn-magnetic',
      visualizer: 'bg-ocean-500',
      micIconSize: 32,
      micButtonSize: 'w-20 h-20',
      showText: true,
      aiAvatar: '🤖',
      navColor: 'text-ocean-600',
      prompt: "Tap to Answer"
    };
  }
  if (age <= 12) {
    return {
      font: 'font-sans',
      containerBg: 'bg-forest-50',
      bubbleAi: 'bg-white text-sand-800 border-forest-100 text-lg rounded-2xl shadow-sm',
      bubbleUser: 'bg-forest-100 text-forest-700 border-forest-200 text-lg rounded-2xl shadow-sm',
      button: 'bg-forest-500 hover:bg-forest-600 text-white shadow-md btn-magnetic',
      visualizer: 'bg-forest-500',
      micIconSize: 28,
      micButtonSize: 'w-16 h-16',
      showText: true,
      aiAvatar: '🧭',
      navColor: 'text-forest-600',
      prompt: "Tap to Speak"
    };
  }
  // 13-14+
  return {
    font: 'font-sans',
    containerBg: 'bg-sand-50',
    bubbleAi: 'bg-white text-sand-800 border-sand-200 text-base rounded-xl shadow-sm',
    bubbleUser: 'bg-violet-500 text-white border-violet-600 text-base rounded-xl shadow-sm',
    button: 'bg-violet-500 hover:bg-violet-600 text-white shadow-md btn-magnetic',
    visualizer: 'bg-violet-500',
    micIconSize: 24,
    micButtonSize: 'w-16 h-16',
    showText: true,
    aiAvatar: '⚡',
    navColor: 'text-violet-600',
    prompt: "Record Response"
  };
};

