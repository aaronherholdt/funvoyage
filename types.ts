
export enum UserTier {
  GUEST = 'GUEST',
  FREE = 'FREE',
  STARTER = 'STARTER',
  PRO = 'PRO',
  ADVENTURER = 'ADVENTURER'
}

export interface SessionEntry {
  role: 'model' | 'user';
  text: string;
  timestamp: number;
}

export interface SessionMedia {
  id: string;
  type: 'drawing' | 'photo';
  dataUrl: string; // Base64 or URL
  createdAt: number;
}

export type TraitCategory = 'curiosity' | 'empathy' | 'resilience' | 'problem_solving';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: TraitCategory;
  threshold: number;
}

export interface SessionAnalysis {
  summary: string;
  keyInsight: string;
  points: {
    curiosity: number;
    empathy: number;
    resilience: number;
    problem_solving: number;
  };
}

export interface Session {
  id: string;
  countryCode: string;
  countryName: string;
  city?: string;
  date: string;
  entries: SessionEntry[];
  // Journaling & Problem-Solving data
  journalEntry: string;
  identifiedProblems: string[]; // Max 3 items
  // Analysis data
  analysis?: SessionAnalysis;
  earnedBadges?: Badge[];

  media: SessionMedia[];
  completed: boolean;
}

export interface KidProfile {
  id: string;
  name: string;
  age: number;
  avatar: string;
  sessions: Session[];
  // Progression
  totalPoints: {
    curiosity: number;
    empathy: number;
    resilience: number;
    problem_solving: number;
  };
  badges: Badge[];
}

export interface ParentUser {
  id: string;
  name: string;
  email: string | null;
  tier: UserTier;
  kids: KidProfile[];
}

export type ConversationStage =
  | 'intro'
  | 'brainstorm'
  | 'explore'
  | 'celebrate'
  | 'summary'; // summary is now a transition state to completion

export interface Country {
  code: string;
  name: string;
  flag: string;
}
