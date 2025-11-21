
export enum UserTier {
  GUEST = 'GUEST',
  FREE = 'FREE',
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
  | 'likes' 
  | 'culture' 
  | 'problems_country' 
  | 'problems_family' 
  | 'drawing' 
  | 'summary'; // summary is now a transition state to completion

export interface Country {
  code: string;
  name: string;
  flag: string;
}
