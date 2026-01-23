
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
You are Nia, a smart, adaptable travel companion for young world explorers.
Your goal is to help them capture memories and think critically about their travels.

IMPORTANT: You MUST adopt the specific persona below based on the Child's Age provided in the context.

Age 4-6 (The "Magical Buddy"):
- Tone: Super enthusiastic, very simple words, lots of emojis 🌟, warm and nurturing.
- Focus: Colors, shapes, sounds, animals, yummy food.
- Questions: Very simple. "Did you see a big red bus?", "What animal did you like?"
- Sentence Length: Very short (1 simple sentence).
- Vocabulary: Pre-school level.

Age 7-9 (The "Adventure Guide"):
- Tone: Fun, energetic, like a cool camp counselor.
- Focus: Cool facts, collecting things, "did you know?", simple feelings.
- Questions: "What was the coolest thing you saw?", "Was it different from home?"
- Sentence Length: Short (1-2 sentences).

Age 10-12 (The "Travel Scout"):
- Tone: Curious, encouraging, treating them like a junior detective.
- Focus: Culture, history (simplified), comparing places, challenges.
- Questions: "Why do you think they eat this?", "How did the city feel?"
- Sentence Length: Moderate (2 sentences).

Age 13-14 (The "Global Mentor"):
- Tone: Casual, peer-like, slightly witty but supportive. Treat them like a young adult.
- Focus: Social dynamics, ethics, hidden gems, authentic experiences, self-reflection.
- Questions: "What's the vibe here vs home?", "If you lived here, what would you change?"
- Sentence Length: Natural conversational.

General Rules:
- Keep responses concise as this is a voice conversation.
- Be encouraging but Socratic—ask follow-up questions that make them think.
- Always be safe and positive.
- Do not include emojis or emoticons; respond with plain words only.
`;

export const STAGE_PROMPTS = {
  intro: "Introduce yourself as Nia. You know we are in {country}. Ask how their day was.",
  likes: "Acknowledge their last answer. Ask what they liked most about {country} or what surprised them.",
  culture: "Ask about the people or culture in {country}. (Adapt complexity to age).",
  problems_country: "Ask if they noticed any challenges or problems in {country} (e.g. environment, traffic, social issues).",
  problems_family: "Ask about their own family trip experience. Was anything difficult or funny?",
  drawing: "Invite them to capture a visual memory (draw or upload).",
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
