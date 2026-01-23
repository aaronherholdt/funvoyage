
import { UserTier, Badge } from './types';

export const APP_NAME = "FunVoyage";

export const TIER_LIMITS = {
  [UserTier.GUEST]: 1,
  [UserTier.FREE]: 1,
  [UserTier.STARTER]: 3,
  [UserTier.PRO]: 10,
  [UserTier.ADVENTURER]: 9999
};

export const TIER_CHILD_LIMITS = {
  [UserTier.GUEST]: 1,
  [UserTier.FREE]: 1,
  [UserTier.STARTER]: 1,
  [UserTier.PRO]: 3,
  [UserTier.ADVENTURER]: 9999
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
      containerBg: 'bg-yellow-50',
      bubbleAi: 'bg-yellow-200 text-yellow-900 border-yellow-300 text-2xl rounded-[2rem]',
      bubbleUser: 'bg-orange-200 text-orange-900 border-orange-300 text-2xl rounded-[2rem]',
      button: 'bg-orange-500 hover:bg-orange-600 text-white shadow-xl scale-110',
      visualizer: 'bg-orange-500',
      micIconSize: 40,
      micButtonSize: 'w-24 h-24',
      showText: false,
      aiAvatar: '🦄',
      navColor: 'text-orange-600',
      prompt: "Tap the big button and tell me!"
    };
  }
  if (age <= 9) {
    return {
      font: 'font-kid',
      containerBg: 'bg-indigo-50',
      bubbleAi: 'bg-white text-slate-800 border-indigo-100 text-xl rounded-3xl',
      bubbleUser: 'bg-indigo-100 text-indigo-900 border-indigo-200 text-xl rounded-3xl',
      button: 'bg-teal-600 hover:bg-teal-500 text-white shadow-lg',
      visualizer: 'bg-teal-500',
      micIconSize: 32,
      micButtonSize: 'w-20 h-20',
      showText: true,
      aiAvatar: '🤖',
      navColor: 'text-teal-600',
      prompt: "Tap to Answer"
    };
  }
  if (age <= 12) {
    return {
      font: 'font-sans',
      containerBg: 'bg-slate-50',
      bubbleAi: 'bg-white text-slate-800 border-slate-200 text-lg rounded-2xl shadow-sm',
      bubbleUser: 'bg-blue-100 text-blue-900 border-blue-200 text-lg rounded-2xl shadow-sm',
      button: 'bg-blue-600 hover:bg-blue-700 text-white shadow-md',
      visualizer: 'bg-blue-500',
      micIconSize: 28,
      micButtonSize: 'w-16 h-16',
      showText: true,
      aiAvatar: '🧭',
      navColor: 'text-blue-600',
      prompt: "Tap to Speak"
    };
  }
  // 13-14+
  return {
    font: 'font-sans',
    containerBg: 'bg-gray-50',
    bubbleAi: 'bg-white text-gray-800 border-gray-200 text-base rounded-xl shadow-sm',
    bubbleUser: 'bg-violet-600 text-white border-violet-700 text-base rounded-xl shadow-sm',
    button: 'bg-violet-600 hover:bg-violet-700 text-white shadow-md',
    visualizer: 'bg-violet-500',
    micIconSize: 24,
    micButtonSize: 'w-16 h-16',
    showText: true,
    aiAvatar: '⚡',
    navColor: 'text-violet-600',
    prompt: "Record Response"
  };
};
