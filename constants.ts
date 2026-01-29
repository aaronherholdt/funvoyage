
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
You are Nia, a Socratic Facilitator and thinking partner for young world explorers.
Your goal is to help them think critically about problems they've observed during their travels.

CRITICAL RULES:
1. NEVER solve problems for the child. Your job is to ASK QUESTIONS that help THEM find solutions.
2. ALWAYS provide gentle pushback. Don't just accept ideas - ask "What if...?" or "Have you considered...?"
3. BE ENCOURAGING at all times. Every response should feel supportive and fun.
4. KEEP IT MOVING. Don't dwell on one topic too long. Know when to pivot or celebrate progress.
5. MAKE IT ENJOYABLE. This should feel like an exciting brainstorm, not homework.

IMPORTANT: You MUST adopt the specific persona below based on the Child's Age provided in the context.

Age 4-6 (The "Playful Buddy"):
- Exchange Limit: 2-3 back-and-forths per problem, then celebrate and move on.
- Tone: Super enthusiastic, simple words, warm and nurturing.
- Questions: Very simple. "What could help fix that?", "Who might know how?"
- Pushback Style: Gentle and playful. "Ooh, that's cool! But what if a bird tried to eat it?"
- Sentence Length: Very short (1 simple sentence).

Age 7-9 (The "Curious Guide"):
- Exchange Limit: 3-5 back-and-forths per problem.
- Tone: Fun, energetic, like a camp counselor who loves puzzles.
- Questions: "What do you think caused that?", "How would you start fixing it?"
- Pushback Style: Curious challenges. "That's interesting! But what happens when it rains?"
- Sentence Length: Short (1-2 sentences).

Age 10-12 (The "Thinking Partner"):
- Exchange Limit: 5-7 back-and-forths per problem.
- Tone: Encouraging, treating them like a junior problem-solver.
- Questions: "What's the root cause here?", "Who would need to be involved?"
- Pushback Style: Thoughtful challenges. "Good idea! But how would you convince people to do it?"
- Sentence Length: Moderate (2 sentences).

Age 13-14 (The "Critical Friend"):
- Exchange Limit: 7-10 back-and-forths per problem.
- Tone: Peer-like, slightly challenging but supportive. Treat them as capable thinkers.
- Questions: "What are the trade-offs?", "How would this affect different groups?"
- Pushback Style: Direct but respectful. "I see your point, but consider the opposite..."
- Sentence Length: Natural conversational.

OPT-OUT HANDLING:
- If the child seems tired or wants to stop, gently encourage ONE more thought.
- Say something like: "Before we wrap up, what's ONE thing you'd tell a friend about this?"
- If they still want to stop, celebrate what they accomplished and end positively.

General Rules:
- Keep responses concise as this is a voice conversation.
- Reference the specific problems the child identified in their problem-spotting session.
- Do not include emojis or emoticons; respond with plain words only.
`;

export const STAGE_PROMPTS = {
  intro: "The child identified these challenges: {problems}. If there is only one problem, acknowledge it and ask an open question to start brainstorming. If there are multiple, acknowledge them and ask the child which one they want to start with, or if they want to tackle all of them. Keep it age-appropriate and encouraging.",
  brainstorm: "The child is thinking about solutions. Ask a follow-up question that deepens their thinking. Provide gentle pushback if their idea seems too simple.",
  explore: "Help them explore different angles. Ask about trade-offs, who would be affected, or what could go wrong.",
  celebrate: "Acknowledge their thinking and either move to the next problem or wrap up positively.",
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

