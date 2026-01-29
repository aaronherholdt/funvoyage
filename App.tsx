
import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { UserTier, ParentUser, KidProfile, Session, SessionEntry, ConversationStage, SessionAnalysis, Badge } from './types';
import { TIER_LIMITS, TIER_CHILD_LIMITS, APP_NAME, STAGE_PROMPTS, BADGES, getFlagEmoji, getAgeTheme, UNLIMITED_LIMIT, MIN_CHILD_AGE, MAX_CHILD_AGE, getTurnLimit } from './constants';
import { generateNiaResponse, analyzeSession, AiRateLimitError, AI_RATE_LIMIT } from './services/geminiService';
import { supabase } from './src/lib/supabaseClient';
import { useAuthSession } from './src/hooks/useAuthSession';
import { VoiceInterface } from './components/kid/VoiceInterface';
import { LocationPicker } from './components/kid/LocationPicker';
import { JournalStep } from './components/kid/JournalStep';
import { ProblemSpottingStep } from './components/kid/ProblemSpottingStep';
import { LandingPage } from './components/LandingPage';
import { Button } from './components/Button';
import { AddChildModal } from './components/AddChildModal';
import { KidSelectorModal } from './components/KidSelectorModal';
import { Plane, Mic, Lock, LogOut, Plus, ChevronLeft, Check, Star, ArrowRight, Loader2, Award, Crown, CheckCircle, Cloud, Map as MapIcon, Globe, Sparkles, Zap, Heart, BookOpen, ChevronRight, AlertTriangle } from 'lucide-react';
import { createLogger, setLogContext } from './lib/logger';
import { ErrorBoundary } from './components/ErrorBoundary';
import { UpgradePrompt } from './components/UpgradePrompt';
import { useTripLimits } from './hooks/useTripLimits';

const log = createLogger({ component: 'App' });

// Dynamic imports for heavy components (loaded on demand)
const Dashboard = dynamic(() => import('./components/parent/Dashboard').then(m => m.Dashboard));

// --- SpeechRecognition Types ---
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: ((event: Event) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
}

type AppView = 'landing' | 'auth' | 'onboarding' | 'dashboard' | 'passport' | 'add_trip' | 'journaling' | 'problem_spotting' | 'session' | 'completion' | 'upgrade' | 'memory_detail';

const App: React.FC = () => {
  // --- GLOBAL STATE ---
  const [user, setUser] = useState<ParentUser | null>(null);
  const [view, setView] = useState<AppView>('landing');
  const [postAuthView, setPostAuthView] = useState<AppView | null>(null);
  const [activeKidId, setActiveKidId] = useState<string | null>(null);
  const [hasHydratedUser, setHasHydratedUser] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [authData, setAuthData] = useState({ parentName: '', email: '', password: '', confirmPassword: '' });
  const [authError, setAuthError] = useState('');
  const [oauthLoading, setOauthLoading] = useState(false);
  const { session: supabaseSession, loading: supabaseSessionLoading } = useAuthSession();

  // --- PASSPORT STATE ---
  const [passportPage, setPassportPage] = useState(0);

  // --- ONBOARDING STATE ---
  const [onboardingData, setOnboardingData] = useState({ name: '', age: '' });

  // --- NEW TRIP STATE ---
  const [newTripData, setNewTripData] = useState({ countryCode: '', city: '' });

  // --- SESSION STATE ---
  const [activeSession, setActiveSession] = useState<Partial<Session> | null>(null);
  const [stage, setStage] = useState<ConversationStage>('intro');
  const [history, setHistory] = useState<SessionEntry[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiRateLimitMessage, setAiRateLimitMessage] = useState<string | null>(null);
  const [aiRateLimitUntil, setAiRateLimitUntil] = useState<number | null>(null);

  // --- JOURNALING & PROBLEM-SOLVING STATE ---
  const [journalEntry, setJournalEntry] = useState('');
  const [identifiedProblems, setIdentifiedProblems] = useState<string[]>([]);

  // --- COMPLETION STATE ---
  const [sessionAnalysis, setSessionAnalysis] = useState<SessionAnalysis | null>(null);
  const [newBadges, setNewBadges] = useState<Badge[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // --- MEMORY DETAIL STATE ---
  const [viewingSession, setViewingSession] = useState<Session | null>(null);

  // --- MULTI-CHILD STATE ---
  const [showAddChildModal, setShowAddChildModal] = useState(false);
  const [showKidSelector, setShowKidSelector] = useState(false);
  const [editingKidId, setEditingKidId] = useState<string | null>(null);
  const [addChildData, setAddChildData] = useState({ name: '', age: '' });

  // --- BILLING STATE ---
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [upgradeLoadingTier, setUpgradeLoadingTier] = useState<UserTier | null>(null);

  // --- TRIP LIMITS STATE ---
  const { checkTripLimit, recordTripComplete, isChecking: isCheckingTripLimit } = useTripLimits();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradePromptData, setUpgradePromptData] = useState<{
    suggestedTier: UserTier;
    message: string;
  } | null>(null);

  // --- REFS ---
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      synthesisRef.current = window.speechSynthesis;
    }
  }, []);

  const transcriptBufferRef = useRef('');
  const aiCallTimestampsRef = useRef<number[]>([]);
  const aiSessionIdRef = useRef<string>('');

  // --- AUTH HELPERS ---
  const bufferToBase64 = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach(b => binary += String.fromCharCode(b));
    return btoa(binary);
  };

  const generateSalt = () => bufferToBase64(window.crypto.getRandomValues(new Uint8Array(16)).buffer);

  const hashPassword = async (password: string, salt: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return bufferToBase64(digest);
  };

  // --- AI RATE LIMITING HELPERS ---
  const setRateLimitWarning = (retryAfterMs?: number) => {
    const waitMs = retryAfterMs && retryAfterMs > 0 ? retryAfterMs : AI_RATE_LIMIT.windowMs;
    setAiRateLimitMessage(`Nia needs a quick breather. Try again in ${Math.ceil(waitMs / 1000)}s.`);
    setAiRateLimitUntil(Date.now() + waitMs);
  };

  const canInvokeAi = () => {
    const now = Date.now();
    if (aiRateLimitUntil && aiRateLimitUntil > now) {
      setRateLimitWarning(aiRateLimitUntil - now);
      return false;
    }

    const windowStart = now - AI_RATE_LIMIT.windowMs;
    aiCallTimestampsRef.current = aiCallTimestampsRef.current.filter(ts => ts >= windowStart);
    if (aiCallTimestampsRef.current.length >= AI_RATE_LIMIT.maxRequestsPerMinute) {
      const oldest = aiCallTimestampsRef.current[0];
      const retryAfterMs = AI_RATE_LIMIT.windowMs - (now - oldest);
      setRateLimitWarning(retryAfterMs);
      return false;
    }

    aiCallTimestampsRef.current.push(now);
    setAiRateLimitMessage(null);
    setAiRateLimitUntil(null);
    return true;
  };

  const fetchRemoteTier = async (userId: string): Promise<UserTier | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('tier')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Failed to fetch remote tier', error);
        return null;
      }

      const remoteTier = data?.tier as UserTier | undefined;
      return remoteTier && Object.values(UserTier).includes(remoteTier) ? remoteTier : null;
    } catch (err) {
      console.warn('Unexpected error fetching remote tier', err);
      return null;
    }
  };

  // --- SUPABASE KIDS SYNC ---
  const fetchRemoteKids = async (userId: string): Promise<KidProfile[] | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('kids')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Failed to fetch remote kids', error);
        return null;
      }

      if (data?.kids && Array.isArray(data.kids)) {
        return data.kids as KidProfile[];
      }
      return null;
    } catch (err) {
      console.warn('Unexpected error fetching remote kids', err);
      return null;
    }
  };

  const syncKidsToSupabase = async (userId: string, kids: KidProfile[]) => {
    try {
      // Fetch current tier & kids from Supabase to enforce server-side limits
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tier,kids')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        log.warn('Failed to fetch profile before syncing kids', undefined, profileError);
      }

      const remoteTier = (profile?.tier as UserTier) || UserTier.FREE;
      const childLimit = TIER_CHILD_LIMITS[remoteTier];
      const isUnlimited = childLimit >= UNLIMITED_LIMIT;
      const existingKids = Array.isArray(profile?.kids) ? (profile!.kids as KidProfile[]) : [];

      // Merge to preserve remote source of truth, then enforce limit
      const mergedKids = mergeKids(existingKids, kids);
      const kidsToPersist = isUnlimited ? mergedKids : mergedKids.slice(0, childLimit);
      const wasTrimmed = !isUnlimited && mergedKids.length > childLimit;
      if (wasTrimmed) {
        log.warn('Child limit exceeded for tier, trimming before upsert', { childLimit, attempted: mergedKids.length });
      }

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          tier: remoteTier,
          kids: kidsToPersist,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (error) {
        log.warn('Failed to sync kids to Supabase', undefined, error);
        return false;
      }
      return true;
    } catch (err) {
      log.warn('Unexpected error syncing kids', undefined, err);
      return false;
    }
  };

  // Merge remote and local kids - remote takes precedence for existing IDs
  const mergeKids = (localKids: KidProfile[], remoteKids: KidProfile[]): KidProfile[] => {
    const kidMap = new Map<string, KidProfile>();

    // Add local kids first
    localKids.forEach(kid => kidMap.set(kid.id, kid));

    // Remote kids override local (they're the source of truth)
    remoteKids.forEach(kid => kidMap.set(kid.id, kid));

    return Array.from(kidMap.values());
  };

  // --- INITIALIZATION ---
  useEffect(() => {
    if (hasHydratedUser || supabaseSessionLoading) return;

    const storedUser = localStorage.getItem('funvoyage_user');
    const storedKidId = localStorage.getItem('funvoyage_activeKid');
    const storedAiSession = localStorage.getItem('funvoyage_ai_session');

    const newAiSessionId = storedAiSession || (crypto.randomUUID ? crypto.randomUUID() : `anon-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    aiSessionIdRef.current = newAiSessionId;
    localStorage.setItem('funvoyage_ai_session', newAiSessionId);

    // Skip local hydration when a Supabase session exists so the server stays the source of truth; keep local storage for guests/offline users.
    if (!supabaseSession && storedUser) {
      try {
        const parsedUser: ParentUser = JSON.parse(storedUser);
        const sanitizedTier = parsedUser.tier === UserTier.GUEST ? UserTier.GUEST : UserTier.FREE;
        const sanitizedUser = { ...parsedUser, tier: sanitizedTier };
        setUser(sanitizedUser);
        setActiveKidId(storedKidId || sanitizedUser.kids?.[0]?.id || null);
        setView('dashboard');
      } catch (err) {
        console.error('Failed to hydrate stored user', err);
      }
    }

    setHasHydratedUser(true);
  }, [supabaseSession, supabaseSessionLoading, hasHydratedUser]);

  useEffect(() => {
    if (!hasHydratedUser) return;
    if (user) {
      localStorage.setItem('funvoyage_user', JSON.stringify(user));
      if (user.email) {
        const accountsRaw = localStorage.getItem('funvoyage_accounts');
        const accounts = accountsRaw ? JSON.parse(accountsRaw) : {};
        const existing = accounts[user.email.toLowerCase()] || {};
        accounts[user.email.toLowerCase()] = { ...existing, user };
        localStorage.setItem('funvoyage_accounts', JSON.stringify(accounts));
      }
    }
  }, [user, hasHydratedUser]);

  useEffect(() => {
    if (!hasHydratedUser) return;
    if (activeKidId) {
      localStorage.setItem('funvoyage_activeKid', activeKidId);
    }
  }, [activeKidId, hasHydratedUser]);

  useEffect(() => {
    if (!aiRateLimitUntil) return;
    const remaining = aiRateLimitUntil - Date.now();
    if (remaining <= 0) {
      setAiRateLimitMessage(null);
      setAiRateLimitUntil(null);
      return;
    }
    const timeout = setTimeout(() => {
      setAiRateLimitMessage(null);
      setAiRateLimitUntil(null);
    }, remaining);
    return () => clearTimeout(timeout);
  }, [aiRateLimitUntil]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      if (recognitionRef.current) {
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';
      }
    }
  }, []);

  useEffect(() => {
    if (view === 'upgrade') {
      setUpgradeError(null);
      setUpgradeLoadingTier(null);
    }
  }, [view]);

  useEffect(() => {
    if (!recognitionRef.current) return;

    recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
      let finalChunk = '';
      let interimChunk = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalChunk += event.results[i][0].transcript;
        } else {
          interimChunk += event.results[i][0].transcript;
        }
      }
      transcriptBufferRef.current += finalChunk;
      setTranscript(transcriptBufferRef.current + interimChunk);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
      const finalParams = transcriptBufferRef.current.trim();
      if (finalParams) {
        handleUserResponse(finalParams);
      }
      transcriptBufferRef.current = '';
      setTranscript('');
    };

    recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setIsListening(false);
      }
    };

  }, [stage, activeSession, history]);

  useEffect(() => {
    const syncSupabaseUser = async () => {
      if (!supabaseSession?.user) return;
      const email = supabaseSession.user.email?.toLowerCase();
      if (!email) return;

      const accountsRaw = localStorage.getItem('funvoyage_accounts');
      const accounts = accountsRaw ? JSON.parse(accountsRaw) : {};
      const existing = accounts[email]?.user as ParentUser | undefined;
      const guestUser = user && !user.email ? user : null;
      const currentUser = user?.email === email ? user : existing;

      // Fetch remote data (tier and kids)
      const [supabaseTier, remoteKids] = await Promise.all([
        fetchRemoteTier(supabaseSession.user.id),
        fetchRemoteKids(supabaseSession.user.id)
      ]);

      const guestTier = guestUser ? (guestUser.tier === UserTier.GUEST ? UserTier.FREE : guestUser.tier) : null;

      const metadata = supabaseSession.user
        .user_metadata as { full_name?: string; name?: string } | null;
      const resolvedTier = supabaseTier || currentUser?.tier || guestTier || UserTier.FREE;

      // Merge kids: remote > local > guest > default
      const localKids = currentUser?.kids || guestUser?.kids || [];
      const defaultKid: KidProfile = {
        id: `k-${Date.now()}`,
        name: 'Traveler',
        age: 8,
        avatar: '🧑‍🚀',
        sessions: [],
        totalPoints: { curiosity: 0, empathy: 0, resilience: 0, problem_solving: 0 },
        badges: []
      };

      let resolvedKids: KidProfile[];
      if (remoteKids && remoteKids.length > 0) {
        // Remote exists - merge with local (remote takes precedence)
        resolvedKids = mergeKids(localKids, remoteKids);
      } else if (localKids.length > 0) {
        // No remote, use local
        resolvedKids = localKids;
      } else {
        // No kids anywhere, create default
        resolvedKids = [defaultKid];
      }

      // Enforce child limits based on tier (drop extras for under-tier users)
      const childLimit = TIER_CHILD_LIMITS[resolvedTier];
      const isChildUnlimited = childLimit >= UNLIMITED_LIMIT;
      const enforcedKids = isChildUnlimited ? resolvedKids : resolvedKids.slice(0, childLimit);
      const wasChildListTrimmed = !isChildUnlimited && resolvedKids.length > childLimit;

      const syncedUser: ParentUser = {
        id: supabaseSession.user.id,
        name: currentUser?.name || metadata?.full_name || metadata?.name || supabaseSession.user.email || 'Parent Explorer',
        email,
        tier: resolvedTier,
        kids: enforcedKids
      };

      // Sync kids to Supabase if local has data that remote doesn't
      if (!remoteKids || remoteKids.length === 0 || localKids.length > remoteKids.length) {
        await syncKidsToSupabase(supabaseSession.user.id, enforcedKids);
      }

      accounts[email] = { ...(accounts[email] || {}), user: syncedUser };
      localStorage.setItem('funvoyage_accounts', JSON.stringify(accounts));
      setUser(syncedUser);
      setActiveKidId(enforcedKids[0]?.id || null);
      setView(wasChildListTrimmed ? 'upgrade' : (postAuthView || 'dashboard'));
      setPostAuthView(null);
    };

    syncSupabaseUser();
  }, [supabaseSession, postAuthView]);

  // --- ACTIONS ---

  const handleStartAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setAuthError('');
    setPostAuthView(null);
    setAuthData(prev => ({ ...prev, password: '', confirmPassword: '' }));
    if (mode === 'signup') {
      setOnboardingData({ name: '', age: '' });
    }
    setView('auth');
  };

  const handleStartOnboarding = () => {
    setAuthMode('signup');
    setAuthError('');
    setPostAuthView(null);
    setAuthData({ parentName: '', email: '', password: '', confirmPassword: '' });
    setOnboardingData({ name: '', age: '' });
    setView('onboarding');
  };

  const handleCompleteOnboarding = () => {
    const kidId = `k-${Date.now()}`;
    const newKid: KidProfile = {
      id: kidId,
      name: onboardingData.name,
      age: parseInt(onboardingData.age) || 8,
      avatar: '🧑‍🚀',
      sessions: [],
      totalPoints: { curiosity: 0, empathy: 0, resilience: 0, problem_solving: 0 },
      badges: []
    };

    const newUser: ParentUser = {
      id: authData.email ? `u-${authData.email}` : `u-${Date.now()}`,
      name: authData.parentName || 'Parent Explorer',
      email: authData.email || null,
      tier: authData.email ? UserTier.FREE : UserTier.GUEST,
      kids: [newKid]
    };

    if (newUser.email) {
      const accountsRaw = localStorage.getItem('funvoyage_accounts');
      const accounts = accountsRaw ? JSON.parse(accountsRaw) : {};
      const salt = accounts[newUser.email]?.passwordSalt || generateSalt();
      const passwordHash = accounts[newUser.email]?.passwordHash || '';
      accounts[newUser.email] = { user: newUser, passwordSalt: salt, passwordHash };
      localStorage.setItem('funvoyage_accounts', JSON.stringify(accounts));
    }
    setUser(newUser);
    setActiveKidId(kidId);
    if (!authData.email) {
      setNewTripData({ countryCode: '', city: '' });
      setView('add_trip'); // Guests jump straight into trying the experience
      return;
    }
    setView('passport'); // Go straight to kid mode for signed-in flow
  };

  const handleAuthSubmit = async () => {
    const email = authData.email.trim().toLowerCase();
    if (!email) {
      setAuthError('Please enter your email to continue.');
      return;
    }
    setAuthData(prev => ({ ...prev, email }));
    const accountsRaw = localStorage.getItem('funvoyage_accounts');
    const accounts = accountsRaw ? JSON.parse(accountsRaw) : {};
    if (authMode === 'login') {
      const existing = accounts[email];
      if (!existing) {
        setAuthError('No account found for that email. Sign up to start fresh.');
        return;
      }
      if (!authData.password) {
        setAuthError('Enter your password to continue.');
        return;
      }
      if (existing.passwordSalt && existing.passwordHash) {
        const computed = await hashPassword(authData.password, existing.passwordSalt);
        if (computed !== existing.passwordHash) {
          setAuthError('Incorrect password. Try again.');
          return;
        }
        setAuthError('');
        const resolvedUser: ParentUser = existing.user || existing;
        setUser(resolvedUser);
        setActiveKidId(resolvedUser.kids?.[0]?.id || null);
        setView(postAuthView || 'dashboard');
        setPostAuthView(null);
        return;
      }
      if (authData.password.length < 8) {
        setAuthError('Set a new password (min 8 characters) to secure your account.');
        return;
      }
      const salt = generateSalt();
      const passwordHash = await hashPassword(authData.password, salt);
      accounts[email] = { ...existing, user: existing.user || existing, passwordSalt: salt, passwordHash };
      localStorage.setItem('funvoyage_accounts', JSON.stringify(accounts));
      setAuthError('');
      const resolvedUser: ParentUser = existing.user || existing;
      setUser(resolvedUser);
      setActiveKidId(resolvedUser.kids?.[0]?.id || null);
      setView(postAuthView || 'dashboard');
      setPostAuthView(null);
      return;
    }
    if (authData.password.length < 8) {
      setAuthError('Password must be at least 8 characters.');
      return;
    }
    if (authData.password !== authData.confirmPassword) {
      setAuthError('Passwords do not match.');
      return;
    }
    const salt = generateSalt();
    const passwordHash = await hashPassword(authData.password, salt);
    let nextUser: ParentUser;
    if (user && !user.email) {
      nextUser = {
        ...user,
        email,
        name: authData.parentName || user.name,
        tier: user.tier === UserTier.GUEST ? UserTier.FREE : user.tier
      };
    } else if (accounts[email]?.user) {
      nextUser = { ...(accounts[email].user as ParentUser) };
    } else {
      nextUser = {
        id: `u-${email}`,
        name: authData.parentName || 'Parent Explorer',
        email,
        tier: UserTier.FREE,
        kids: []
      };
    }
    accounts[email] = { ...(accounts[email] || {}), passwordSalt: salt, passwordHash, user: nextUser };
    localStorage.setItem('funvoyage_accounts', JSON.stringify(accounts));
    setAuthError('');
    setUser(nextUser);
    setActiveKidId(nextUser.kids?.[0]?.id || null);
    const hasKids = nextUser.kids && nextUser.kids.length > 0;
    if (hasKids) {
      setView(postAuthView || 'dashboard');
      setPostAuthView(null);
    } else {
      setView('onboarding');
      setPostAuthView(null);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase sign out failed', err);
    }
    setUser(null);
    setActiveKidId(null);
    setActiveSession(null);
    setSessionAnalysis(null);
    setHistory([]);
    setStage('intro');
    setPassportPage(0);
    setNewBadges([]);
    setJournalEntry('');
    setIdentifiedProblems([]);
    setIsAnalyzing(false);
    setPostAuthView(null);
    setAuthData({ parentName: '', email: '', password: '', confirmPassword: '' });
    setOnboardingData({ name: '', age: '' });
    setView('landing');
    localStorage.removeItem('funvoyage_user');
    localStorage.removeItem('funvoyage_activeKid');
  };

  const handleGoogleSignIn = async () => {
    try {
      setAuthError('');
      setOauthLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        setOauthLoading(false);
      }
    } catch (err: any) {
      setAuthError(err.message ?? 'Google sign-in failed. Try again.');
      setOauthLoading(false);
    }
  };

  // --- MULTI-CHILD HANDLERS ---
  const getRandomAvatar = () => {
    const avatars = ['🧒', '👦', '👧', '🧒🏻', '👦🏻', '👧🏻', '🧒🏽', '👦🏽', '👧🏽', '🧑‍🚀', '🧑‍🎨', '🧑‍🔬'];
    return avatars[Math.floor(Math.random() * avatars.length)];
  };

  const handleAddChildClick = () => {
    if (!user) return;

    const childLimit = TIER_CHILD_LIMITS[user.tier];

    if (user.kids.length >= childLimit) {
      setView('upgrade');
      return;
    }

    setAddChildData({ name: '', age: '' });
    setEditingKidId(null);
    setShowAddChildModal(true);
  };

  const handleEditChildClick = (kid: KidProfile) => {
    setAddChildData({ name: kid.name, age: kid.age.toString() });
    setEditingKidId(kid.id);
    setShowAddChildModal(true);
  };

  const handleAddChildSubmit = async () => {
    if (!user || !addChildData.name.trim() || !addChildData.age) return;

    const age = parseInt(addChildData.age);
    if (age < MIN_CHILD_AGE || age > MAX_CHILD_AGE) return;

    // Defensive: enforce tier child limit at submit time
    const childLimit = TIER_CHILD_LIMITS[user.tier];
    const isUnlimited = childLimit >= UNLIMITED_LIMIT;
    const isAddingNewKid = !editingKidId;
    if (!isUnlimited && isAddingNewKid && user.kids.length >= childLimit) {
      setShowAddChildModal(false);
      setView('upgrade');
      return;
    }

    let updatedKids: KidProfile[];
    let newKidId: string | null = null;

    if (editingKidId) {
      // Edit existing child
      updatedKids = user.kids.map(k =>
        k.id === editingKidId
          ? { ...k, name: addChildData.name.trim(), age }
          : k
      );
    } else {
      // Add new child
      newKidId = `k-${Date.now()}`;
      const newKid: KidProfile = {
        id: newKidId,
        name: addChildData.name.trim(),
        age,
        avatar: getRandomAvatar(),
        sessions: [],
        totalPoints: { curiosity: 0, empathy: 0, resilience: 0, problem_solving: 0 },
        badges: []
      };
      updatedKids = [...user.kids, newKid];
    }

    // Update local state
    const updatedUser = { ...user, kids: updatedKids };
    setUser(updatedUser);

    if (newKidId) {
      setActiveKidId(newKidId);
    }

    // Sync to Supabase if user is authenticated
    if (supabaseSession?.user?.id) {
      await syncKidsToSupabase(supabaseSession.user.id, updatedKids);
    }

    setShowAddChildModal(false);
    setAddChildData({ name: '', age: '' });
    setEditingKidId(null);
  };

  const handleRemoveChild = async (kidId: string) => {
    if (!user || user.kids.length <= 1) {
      alert("You must have at least one traveler profile.");
      return;
    }

    if (!confirm(`Are you sure you want to remove this traveler? Their trips will be deleted.`)) {
      return;
    }

    const updatedKids = user.kids.filter(k => k.id !== kidId);

    // Update local state
    setUser(prev => {
      if (!prev) return null;
      return { ...prev, kids: updatedKids };
    });

    if (activeKidId === kidId) {
      setActiveKidId(updatedKids[0]?.id || null);
    }

    // Sync to Supabase if user is authenticated
    if (supabaseSession?.user?.id) {
      await syncKidsToSupabase(supabaseSession.user.id, updatedKids);
    }
  };

  const handleKidSelectedForTrip = (kidId: string) => {
    setActiveKidId(kidId);
    setShowKidSelector(false);
    setNewTripData({ countryCode: '', city: '' });
    setView('add_trip');
  };

  const countTripsThisMonth = (kids: KidProfile[]) => {
    const now = new Date();
    return kids.reduce((sum, kid) => {
      const monthlyTrips = kid.sessions.filter(session => {
        const date = new Date(session.date);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }).length;
      return sum + monthlyTrips;
    }, 0);
  };

  const getTripsUsedForTier = (currentUser: ParentUser) => {
    if (currentUser.tier === UserTier.STARTER) {
      return countTripsThisMonth(currentUser.kids);
    }
    return currentUser.kids.reduce((sum, k) => sum + k.sessions.length, 0);
  };

  const requireAuthForPassport = (kidId?: string) => {
    if (kidId) setActiveKidId(kidId);
    if (user?.email) {
      setPostAuthView(null);
      setView('passport');
      return;
    }
    setAuthMode('signup');
    setAuthError('');
    setPostAuthView('passport');
    setView('auth');
  };

  const handleAddTripClick = async () => {
    if (!user) return;

    // Check trip limits via API (uses Supabase tracking)
    const isAuthenticated = !!user.email;
    const limitStatus = await checkTripLimit(isAuthenticated);

    if (!limitStatus.allowed) {
      // Show upgrade prompt
      if (limitStatus.upgrade) {
        setUpgradePromptData(limitStatus.upgrade);
        setShowUpgradePrompt(true);
      } else {
        setView('upgrade');
      }
      return;
    }

    // If multiple kids, show selector first
    if (user.kids.length > 1) {
      setShowKidSelector(true);
      return;
    }

    // Single kid - proceed directly
    const kid = user.kids[0];
    if (!kid) return;

    setActiveKidId(kid.id);
    setNewTripData({ countryCode: '', city: '' });
    setView('add_trip');
  };

  const handleLocationSelected = (countryCode: string, city: string, countryName: string) => {
    const finalCountryName = countryName || countryCode || 'Unknown location';

    const newSession: Partial<Session> = {
      id: Date.now().toString(),
      countryCode,
      countryName: finalCountryName,
      city: city,
      date: new Date().toISOString(),
      entries: [],
      journalEntry: '',
      identifiedProblems: [],
      completed: false
    };
    setActiveSession(newSession);
    setJournalEntry('');
    setIdentifiedProblems([]);
    setView('journaling');
  };

  const handleJournalComplete = (entry: string) => {
    setJournalEntry(entry);
    setActiveSession(prev => ({ ...prev, journalEntry: entry }));
    setView('problem_spotting');
  };

  const handleProblemsComplete = (problems: string[]) => {
    setIdentifiedProblems(problems);
    setActiveSession(prev => ({ ...prev, identifiedProblems: problems }));
    setHistory([]);
    setStage('intro');
    setAiRateLimitMessage(null);
    setAiRateLimitUntil(null);
    aiCallTimestampsRef.current = [];
    setView('session');

    // Start Nia conversation with the identified problems
    setTimeout(() => {
      const kid = user?.kids.find(k => k.id === activeKidId);
      processAIStage(
        activeSession?.countryName || '',
        activeSession?.city,
        [],
        'intro',
        kid?.age || 8,
        undefined,
        problems
      );
    }, 1000);
  };

  const handleExitSession = () => {
    recognitionRef.current?.stop();
    recognitionRef.current?.abort?.();
    setIsListening(false);
    setIsSpeaking(false);
    setActiveSession(null);
    setHistory([]);
    setStage('intro');
    setJournalEntry('');
    setIdentifiedProblems([]);
    setSessionAnalysis(null);
    setNewBadges([]);
    setIsAnalyzing(false);
    setAiRateLimitMessage(null);
    setAiRateLimitUntil(null);
    aiCallTimestampsRef.current = [];
    transcriptBufferRef.current = '';
    setTranscript('');
    if (user?.email) {
      requireAuthForPassport();
    } else {
      setView('add_trip');
    }
  };

  const processAIStage = async (
    countryName: string,
    cityName: string | undefined,
    currentHistory: SessionEntry[],
    currentStage: ConversationStage,
    kidAge: number,
    userText?: string,
    problems?: string[]
  ) => {
    if (currentStage === 'summary') return; // Handled by backend analysis

    const locationContext = cityName ? `${cityName}, ${countryName}` : countryName;
    let prompt = STAGE_PROMPTS[currentStage];

    // Replace placeholders in prompt
    prompt = prompt.replace(/{country}/g, locationContext);

    // Include problems context for the intro stage
    const sessionProblems = problems || identifiedProblems;
    if (sessionProblems.length > 0) {
      prompt = prompt.replace(/{problems}/g, sessionProblems.join(', '));
      prompt = prompt.replace(/{problem}/g, sessionProblems[0]);
    }

    if (userText) prompt += ` The child just said: "${userText}".`;

    if (!canInvokeAi()) return;

    try {
      const responseText = await generateNiaResponse(currentHistory, prompt, kidAge, aiSessionIdRef.current);
      const aiEntry: SessionEntry = { role: 'model', text: responseText, timestamp: Date.now() };
      setHistory(prev => [...prev, aiEntry]);
      speak(responseText);
    } catch (err) {
      if (err instanceof AiRateLimitError) {
        setRateLimitWarning(err.retryAfterMs);
        return;
      }
      console.error('Nia respond error:', err);
      setAiRateLimitMessage("Nia's taking a short pause. Try again in a moment.");
    }
  };

  const speak = (text: string) => {
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
      const cleanForSpeech = (input: string) => {
        // Strip emoji and collapse whitespace so TTS doesn't spell them out
        const noEmoji = input.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F]/gu, '');
        return noEmoji.replace(/\s{2,}/g, ' ').trim();
      };
      const utterance = new SpeechSynthesisUtterance(cleanForSpeech(text));
      const voices = synthesisRef.current.getVoices();
      const preferredVoice = voices.find(v => v.name.includes('Female') || v.name.includes('Google US English'));
      if (preferredVoice) utterance.voice = preferredVoice;
      utterance.rate = 1.1;
      utterance.pitch = 1.1;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      synthesisRef.current.speak(utterance);
    }
  };

  const handleUserResponse = async (text: string) => {
    setIsListening(false);
    const userEntry: SessionEntry = { role: 'user', text, timestamp: Date.now() };
    const newHistory = [...history, userEntry];
    setHistory(newHistory);

    const kid = user?.kids.find(k => k.id === activeKidId);
    const kidAge = kid?.age || 8;

    // Check turn limit - count user turns in history
    const userTurns = newHistory.filter(h => h.role === 'user').length;
    const turnLimit = getTurnLimit(kidAge);
    const isAtTurnLimit = userTurns >= turnLimit;

    // New stage transitions for problem-solving flow
    let nextStage: ConversationStage = stage;

    // Force wrap-up if turn limit reached
    if (isAtTurnLimit) {
      nextStage = 'summary';
    } else {
      switch (stage) {
        case 'intro': nextStage = 'brainstorm'; break;
        case 'brainstorm': nextStage = 'explore'; break;
        case 'explore': nextStage = 'celebrate'; break;
        case 'celebrate':
          // Check if there are more problems to discuss or wrap up
          nextStage = 'summary';
          break;
        case 'summary': break;
      }
    }

    if (nextStage === 'summary') {
      // Wrap up and analyze
      handleFinishAndAnalyze(newHistory);
      return;
    }

    setStage(nextStage);
    if (activeSession) {
      await processAIStage(activeSession.countryName!, activeSession.city, newHistory, nextStage, kidAge, text);
    }
  };

  const handleFinishSession = () => {
    // Allow user to end session early
    handleFinishAndAnalyze([...history]);
  };

  const handleFinishAndAnalyze = async (finalHistory: SessionEntry[]) => {
    if (!canInvokeAi()) return;

    setView('completion');
    setIsAnalyzing(true);

    const kid = user!.kids.find(k => k.id === activeKidId)!;

    // 1. Analyze Session
    let analysis: SessionAnalysis | null = null;
    try {
      analysis = await analyzeSession(
        finalHistory,
        activeSession?.countryName || '',
        activeSession?.city,
        kid.age,
        aiSessionIdRef.current
      );
    } catch (err) {
      if (err instanceof AiRateLimitError) {
        setRateLimitWarning(err.retryAfterMs);
        setIsAnalyzing(false);
        setView('session');
        return;
      }
      console.error('Nia analyze error:', err);
      setIsAnalyzing(false);
      if (user?.email) {
        setView('passport');
      } else {
        setView('dashboard');
      }
      return;
    }

    if (!analysis) {
      setIsAnalyzing(false);
      if (user?.email) {
        setView('passport');
      } else {
        setView('dashboard');
      }
      return;
    }

    setSessionAnalysis(analysis);

    // 2. Calculate Points & Badges
    const newPoints = {
      curiosity: kid.totalPoints.curiosity + analysis.points.curiosity,
      empathy: kid.totalPoints.empathy + analysis.points.empathy,
      resilience: kid.totalPoints.resilience + analysis.points.resilience,
      problem_solving: kid.totalPoints.problem_solving + analysis.points.problem_solving,
    };

    const newlyUnlockedBadges: Badge[] = [];
    if (user!.tier === UserTier.PRO || user!.tier === UserTier.ADVENTURER) {
      BADGES.forEach(badge => {
        const hasBadge = kid.badges.some(b => b.id === badge.id);
        if (!hasBadge) {
          const score = newPoints[badge.category];
          if (score >= badge.threshold) {
            newlyUnlockedBadges.push(badge);
          }
        }
      });
    }
    setNewBadges(newlyUnlockedBadges);

    // 3. Update User State
    const completedSession: Session = {
      ...(activeSession as Session),
      entries: finalHistory,
      analysis: analysis,
      completed: true,
      earnedBadges: newlyUnlockedBadges
    };

    const updatedKids = user!.kids.map(k => {
      if (k.id === activeKidId) {
        return {
          ...k,
          sessions: [completedSession, ...k.sessions],
          totalPoints: (user!.tier === UserTier.PRO || user!.tier === UserTier.ADVENTURER) ? newPoints : k.totalPoints,
          badges: [...k.badges, ...newlyUnlockedBadges]
        };
      }
      return k;
    });

    setUser(prev => {
      if (!prev) return null;
      return { ...prev, kids: updatedKids };
    });

    // Sync to Supabase if user is authenticated
    if (supabaseSession?.user?.id) {
      await syncKidsToSupabase(supabaseSession.user.id, updatedKids);
    }

    // Record trip completion for usage tracking
    const isAuthenticated = !!user?.email;
    await recordTripComplete(isAuthenticated);

    setIsAnalyzing(false);
    speak(analysis.summary);
  };

  const handleUpgrade = async (tier: UserTier) => {
    // Only paid tiers are upgradable via PayPal
    if (![UserTier.STARTER, UserTier.PRO, UserTier.ADVENTURER].includes(tier)) {
      return;
    }

    if (user?.tier === tier) {
      setView('dashboard');
      return;
    }

    if (supabaseSessionLoading) {
      setUpgradeError('Hold on while we verify your account...');
      return;
    }

    if (!supabaseSession?.user?.id) {
      setPostAuthView('upgrade');
      setUpgradeError('Please sign in to upgrade your plan.');
      setView('auth');
      return;
    }

    try {
      setUpgradeError(null);
      setUpgradeLoadingTier(tier);
      window.location.href = `/api/paypal/checkout?tier=${tier}`;
    } catch (err) {
      console.error('Failed to start upgrade checkout', err);
      setUpgradeError('Could not start PayPal checkout. Please try again.');
      setUpgradeLoadingTier(null);
    }
  };

  // --- RENDER HELPERS ---

  const renderOnboarding = () => (
    <div className="min-h-screen bg-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full border border-indigo-100 relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setView('landing')}
          className="absolute left-4 top-4 text-slate-500 hover:text-slate-800"
        >
          <ChevronLeft size={16} className="mr-2" /> Return to homepage
        </Button>
        <h2 className="text-2xl font-bold text-slate-800 mb-2 text-center mt-4">Welcome Aboard!</h2>
        <p className="text-slate-500 text-center mb-8">Tell us a bit about the traveler.</p>
        {authData.email && (
          <p className="text-center text-xs text-teal-600 font-semibold mb-4">Signed in as {authData.email}</p>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">First Name</label>
            <input
              type="text"
              value={onboardingData.name}
              onChange={(e) => setOnboardingData({ ...onboardingData, name: e.target.value })}
              className="w-full p-3 border border-slate-200 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
              placeholder="e.g. Maya"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Age</label>
            <input
              type="number"
              value={onboardingData.age}
              onChange={(e) => setOnboardingData({ ...onboardingData, age: e.target.value })}
              className="w-full p-3 border border-slate-200 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
              placeholder="e.g. 10"
            />
            <p className="text-xs text-slate-400 mt-1">Nia adapts her questions and style based on age.</p>
          </div>
        </div>

        <Button
          fullWidth
          size="lg"
          className="mt-8"
          disabled={!onboardingData.name || !onboardingData.age}
          onClick={handleCompleteOnboarding}
        >
          Let's Go! <ArrowRight size={18} className="ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderAuth = () => {
    const isLogin = authMode === 'login';
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 flex items-center justify-center p-4">
        <div className="max-w-5xl w-full grid md:grid-cols-2 gap-6 items-stretch">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-white shadow-2xl flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wider mb-4">
                <Sparkles size={14} /> First Trip Is Free
              </div>
              <h2 className="text-3xl font-bold leading-tight mb-4">Your family's travel journal, ready in 60 seconds.</h2>
              <p className="text-white/80 text-sm leading-relaxed mb-6">
                Take your first free trip with zero sign-up. After you finish, create your passport to save it and unlock more adventures.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-300"><Check size={16} /></div>
                  <p className="text-sm text-white">Try one trip with no account. Create your passport to continue.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-200"><Heart size={16} /></div>
                  <p className="text-sm text-white">Parents stay in control. Kids just explore.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-200"><Zap size={16} /></div>
                  <p className="text-sm text-white">Voice-first, memory-rich journeys, saved forever.</p>
                </div>
              </div>
            </div>
            <div className="pt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">Conversion Ready</p>
              <p className="font-semibold text-white">Beautiful onboarding. Zero friction.</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-2xl border border-slate-100 flex flex-col">
            <div className="flex items-center gap-2 mb-6 bg-slate-100 p-1 rounded-full">
              <button
                onClick={() => { setAuthMode('signup'); setAuthError(''); }}
                className={`flex-1 py-2 px-3 rounded-full text-sm font-bold transition-all ${!isLogin ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
              >
                Create account
              </button>
              <button
                onClick={() => { setAuthMode('login'); setAuthError(''); }}
                className={`flex-1 py-2 px-3 rounded-full text-sm font-bold transition-all ${isLogin ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
              >
                Log in
              </button>
            </div>

            {postAuthView === 'passport' && (
              <div className="mb-4 text-sm text-teal-700 bg-teal-50 border border-teal-100 rounded-xl px-3 py-2">
                We saved your test trip. Create your passport to keep it and unlock your next adventures.
              </div>
            )}

            {!isLogin && (
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wide">Parent Name</label>
                <input
                  type="text"
                  value={authData.parentName}
                  onChange={(e) => setAuthData(prev => ({ ...prev, parentName: e.target.value }))}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  placeholder="Alex Parker"
                />
              </div>
            )}

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={authData.email}
                onChange={(e) => setAuthData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full p-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                placeholder="you@example.com"
              />
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wide">Password</label>
              <input
                type="password"
                value={authData.password}
                onChange={(e) => setAuthData(prev => ({ ...prev, password: e.target.value }))}
                className="w-full p-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                placeholder={isLogin ? "Enter your password" : "At least 8 characters"}
              />
              {!isLogin && (
                <p className="text-[11px] text-slate-500 mt-1">We hash + salt on your device. Needed if you lose this device.</p>
              )}
            </div>

            {!isLogin && (
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wide">Confirm Password</label>
                <input
                  type="password"
                  value={authData.confirmPassword}
                  onChange={(e) => setAuthData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  placeholder="Re-enter password"
                />
              </div>
            )}

            {authError && (
              <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                {authError}
              </div>
            )}

            <Button fullWidth size="lg" onClick={handleAuthSubmit} className="mb-3">
              {isLogin ? 'Log in and continue' : 'Start your free test trip'}
            </Button>
            <div className="flex items-center gap-2 my-3">
              <div className="flex-1 h-px bg-slate-200"></div>
              <span className="text-xs uppercase tracking-wide text-slate-400">or</span>
              <div className="flex-1 h-px bg-slate-200"></div>
            </div>

            <Button
              fullWidth
              variant="outline"
              disabled={oauthLoading || supabaseSessionLoading}
              onClick={handleGoogleSignIn}
              className="mb-3 flex items-center justify-center gap-2"
            >
              <svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 24 24" className="w-5 h-5">
                <path fill="#EA4335" d="M12 10.2v3.6h5.1a4.4 4.4 0 0 1-1.9 2.9l3 2.3c1.8-1.6 2.8-4 2.8-6.9 0-.7-.1-1.3-.2-1.9H12z" />
                <path fill="#34A853" d="M6.6 14.3l-.9.7-2.4 1.8A9.8 9.8 0 0 0 12 22c2.7 0 5-.9 6.7-2.5l-3-2.3c-.8.5-1.8.8-2.9.8-2.2 0-4-1.5-4.7-3.5z" />
                <path fill="#4A90E2" d="M3.3 7.2A9.8 9.8 0 0 0 2 12c0 1.5.3 2.9.9 4.1l3.7-2.8a5.8 5.8 0 0 1 0-2.8z" />
                <path fill="#FBBC05" d="M12 5.2c1.5 0 2.9.5 3.9 1.4l2.9-2.9A9.8 9.8 0 0 0 12 2a9.8 9.8 0 0 0-8.7 5.2l3.7 2.8A5.8 5.8 0 0 1 12 5.2z" />
              </svg>
              {oauthLoading ? 'Connecting…' : 'Continue with Google'}
            </Button>
            {!isLogin && (
              <p className="text-xs text-center text-slate-400 mt-3">
                Already have an account? <button className="text-teal-600 font-bold" onClick={() => { setAuthMode('login'); setAuthError(''); }}>Log in</button>
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderPassport = () => {
    const kid = user?.kids.find(k => k.id === activeKidId);
    const sessions = kid?.sessions || [];
    const totalPages = sessions.length + 1; // Sessions + Add Trip Page

    const goToPage = (index: number) => {
      if (index >= 0 && index < totalPages) {
        setPassportPage(index);
      }
    };

    return (
      <div className="min-h-screen bg-slate-800 flex flex-col font-sans overflow-hidden relative">
        {/* Decorative Background */}
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cartographer.png')] pointer-events-none"></div>

        {/* Header */}
        <header className="p-4 flex items-center justify-between relative z-10 bg-slate-900/50 backdrop-blur-md border-b border-white/10">
          <Button variant="ghost" onClick={() => setView('dashboard')} className="text-white/70 hover:bg-white/10 hover:text-white">
            <ChevronLeft className="mr-2" /> Family Dashboard
          </Button>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <h2 className="text-white font-bold text-sm tracking-wide uppercase">{kid?.name}'s Passport</h2>
              <p className="text-teal-400 text-xs font-medium">World Traveler</p>
            </div>
            <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-xl border-2 border-teal-500 shadow-lg">
              {kid?.avatar}
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white/80 hover:text-white">
              <LogOut size={16} className="mr-2" /> Log out
            </Button>
          </div>
        </header>

        {/* Slider Container */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">

          <div className="w-full max-w-5xl flex items-center justify-center gap-4 md:gap-12">
            {/* Prev Button */}
            <button
              onClick={() => goToPage(passportPage - 1)}
              disabled={passportPage === 0}
              className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-0 disabled:pointer-events-none transition-all"
            >
              <ChevronLeft size={32} />
            </button>

            {/* Passport Viewport */}
            <div className="relative w-full max-w-[380px] aspect-[3/4.5] perspective-1000">

              {/* The Sliding Track */}
              <div
                className="absolute top-0 left-0 h-full w-full flex transition-transform duration-500 ease-in-out"
                style={{ width: `${totalPages * 100}%`, transform: `translateX(-${passportPage * (100 / totalPages)}%)` }}
              >
                {/* Render Session Pages */}
                {sessions.map((session, index) => (
                  <div key={session.id} className="h-full p-2" style={{ width: `${100 / totalPages}%` }}>
                    <div className="w-full h-full bg-[#fffdf5] rounded-[20px] shadow-2xl overflow-hidden relative flex flex-col border-r-4 border-b-4 border-orange-100/50">
                      {/* Paper Texture */}
                      <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#dac497 1px, transparent 0)', backgroundSize: '20px 20px' }}></div>

                      {/* Header Stamp */}
                      <div className="p-6 border-b border-dashed border-slate-300 flex justify-between items-start relative">
                        <div className="absolute top-4 right-4 w-20 h-20 rounded-full border-4 border-red-800/30 flex items-center justify-center rotate-12 opacity-40 pointer-events-none">
                          <div className="w-16 h-16 rounded-full border border-red-800/30"></div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Entry Visa</div>
                          <h2 className="text-2xl font-serif font-bold text-slate-800">{session.countryName.toUpperCase()}</h2>
                          <p className="text-slate-500 font-mono text-xs">{session.city?.toUpperCase()}</p>
                        </div>
                        <div className="w-16 h-16 bg-red-900/10 rounded-lg flex items-center justify-center transform -rotate-6 border-2 border-red-800/50 text-3xl">
                          {getFlagEmoji(session.countryCode)}
                        </div>
                      </div>

                      {/* Date Stamp */}
                      <div className="absolute top-24 right-6 transform rotate-[-12deg] opacity-80">
                        <div className="border-2 border-indigo-600 text-indigo-600 px-2 py-1 font-mono text-xs font-bold rounded uppercase shadow-sm">
                          {new Date(session.date).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Main Visual */}
                      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
                        <div className="w-48 h-48 rounded-full border-4 border-double border-teal-200 flex items-center justify-center opacity-50">
                          <MapIcon size={64} className="text-teal-200" />
                        </div>

                        {/* Insight Text - "Handwritten" */}
                        <div className="mt-6 w-full">
                          <p className="font-kid text-slate-600 text-center text-lg leading-tight">
                            "{session.analysis?.keyInsight || 'An amazing journey!'}"
                          </p>
                        </div>
                      </div>

                      {/* Badges Footer */}
                      <div className="bg-orange-50/50 p-4 border-t border-orange-100">
                        <h4 className="text-[10px] font-bold text-orange-800/60 uppercase tracking-wider mb-2 text-center">Achievements</h4>
                        <div className="flex flex-wrap justify-center gap-2 min-h-[60px]">
                          {session.earnedBadges?.map((b, i) => (
                            <div key={i} className="relative group cursor-help">
                              <div className="w-10 h-10 bg-white rounded-full shadow-sm border border-slate-100 flex items-center justify-center text-xl transform hover:scale-110 transition-transform">
                                {b.icon}
                              </div>
                              {/* Tooltip */}
                              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                                {b.name}
                              </div>
                            </div>
                          ))}
                          {(!session.earnedBadges || session.earnedBadges.length === 0) && (
                            <span className="text-xs text-slate-400 italic">No badges collected yet.</span>
                          )}
                        </div>
                      </div>

                      <div className="p-2 bg-white border-t border-slate-100">
                        <button
                          onClick={() => { setViewingSession(session); setView('memory_detail'); }}
                          className="w-full py-3 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
                        >
                          Enter Trip <ArrowRight size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add Trip Page */}
                <div className="h-full p-2" style={{ width: `${100 / totalPages}%` }}>
                  <div className={`w-full h-full bg-white/10 backdrop-blur-sm border-2 border-dashed border-white/30 rounded-[20px] flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:bg-white/20 transition-colors group ${isCheckingTripLimit ? 'opacity-75 pointer-events-none' : ''}`}
                    onClick={handleAddTripClick}>
                    <div className="w-20 h-20 rounded-full bg-teal-500 flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform">
                      {isCheckingTripLimit ? (
                        <Loader2 className="text-white animate-spin" size={40} />
                      ) : (
                        <Plus className="text-white" size={40} />
                      )}
                    </div>
                    <h3 className="font-bold text-2xl text-white mb-2">
                      {isCheckingTripLimit ? 'Checking...' : 'New Adventure'}
                    </h3>
                    <p className="text-white/60 text-sm max-w-[200px]">Ready to explore somewhere new? Turn the page to begin.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Button */}
            <button
              onClick={() => goToPage(passportPage + 1)}
              disabled={passportPage === totalPages - 1}
              className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-0 disabled:pointer-events-none transition-all"
            >
              <ChevronRight size={32} />
            </button>
          </div>

          {/* Page Indicators */}
          <div className="flex gap-2 mt-8">
            {Array.from({ length: totalPages }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${i === passportPage ? 'bg-white w-6' : 'bg-white/30'}`}
              />
            ))}
          </div>

        </div>
      </div>
    );
  };

  const renderMemoryDetail = () => {
    if (!viewingSession) return null;
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <header className="bg-white p-4 flex items-center shadow-sm sticky top-0 z-10 border-b border-slate-200">
          <Button variant="ghost" onClick={() => requireAuthForPassport()} className="text-slate-600">
            <ChevronLeft className="mr-2" /> Back
          </Button>
          <h2 className="flex-1 text-center font-bold text-xl text-slate-800">
            {viewingSession.city || viewingSession.countryName}
          </h2>
          <div className="w-10"></div>
        </header>
        <div className="p-6 max-w-3xl mx-auto w-full space-y-8">
          {/* Summary Card */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
            <h3 className="text-teal-600 font-bold uppercase tracking-wider text-xs mb-4">Travel Log Summary</h3>
            <p className="text-xl font-serif text-slate-800 leading-relaxed">"{viewingSession.analysis?.summary}"</p>
          </div>

          {/* Insight & Badges */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-orange-50/50 rounded-2xl p-6 border border-orange-100">
              <h3 className="text-orange-700 font-bold uppercase tracking-wider text-xs mb-3">Key Insight</h3>
              <p className="text-slate-800 font-medium">{viewingSession.analysis?.keyInsight}</p>
            </div>
            <div className="bg-teal-50/50 rounded-2xl p-6 border border-teal-100">
              <h3 className="text-teal-700 font-bold uppercase tracking-wider text-xs mb-3">Badges Earned</h3>
              <div className="flex flex-wrap gap-2">
                {viewingSession.earnedBadges && viewingSession.earnedBadges.length > 0 ? (
                  viewingSession.earnedBadges.map(b => (
                    <div key={b.id} className="bg-white px-3 py-1.5 rounded-lg border border-teal-200 text-sm font-bold text-slate-700 flex items-center gap-2 shadow-sm">
                      <span className="text-lg">{b.icon}</span> {b.name}
                    </div>
                  ))
                ) : (
                  <span className="text-sm text-slate-500 italic">No new badges this trip.</span>
                )}
              </div>
            </div>
          </div>

          {/* Chat Transcript */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h3 className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-6">Interview Transcript</h3>
            <div className="space-y-6">
              {viewingSession.entries.map((entry, i) => (
                <div key={i} className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 rounded-2xl text-base leading-relaxed ${entry.role === 'user' ? 'bg-indigo-50 text-indigo-900 rounded-br-none' : 'bg-slate-50 text-slate-800 rounded-bl-none border border-slate-100'}`}>
                    <span className="font-bold text-xs block mb-1 opacity-40 uppercase tracking-wide">{entry.role === 'user' ? 'Me' : 'Nia'}</span>
                    {entry.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSession = () => {
    if (!activeSession) return null;
    const kid = user?.kids.find(k => k.id === activeKidId);

    return (
      <div className="min-h-screen bg-white flex flex-col font-sans">
        <header className="bg-white p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{getFlagEmoji(activeSession.countryCode!)}</span>
            <div>
              <h2 className="font-bold text-lg text-slate-800 leading-none">{activeSession.city || activeSession.countryName}</h2>
              <p className="text-xs text-slate-400 mt-1">Recording Session • Nia is listening</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleExitSession} className="text-red-400 hover:bg-red-50">
            <LogOut size={18} />
          </Button>
        </header>

        {aiRateLimitMessage && (
          <div className="mx-4 mt-3 mb-1 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800 text-sm">
            <AlertTriangle size={16} className="mt-0.5 text-amber-500" />
            <span>{aiRateLimitMessage}</span>
          </div>
        )}

        <div className="flex-1 relative flex flex-col overflow-hidden">
          <VoiceInterface
            isSpeaking={isSpeaking}
            isListening={isListening}
            onStartListening={() => { setIsListening(true); recognitionRef.current?.start(); }}
            onStopListening={() => { recognitionRef.current?.stop(); }}
            transcript={transcript}
            history={history}
            onSendTextFallback={handleUserResponse}
            age={kid?.age || 8}
          />

          {/* Finish Session Button */}
          <div className="absolute bottom-24 left-0 right-0 flex justify-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleFinishSession}
              className="bg-white/90 backdrop-blur-sm shadow-lg"
            >
              Finish & Review
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderCompletion = () => {
    if (isAnalyzing) {
      return (
        <div className="min-h-screen bg-teal-600 flex flex-col items-center justify-center text-white font-sans">
          <div className="bg-white/20 p-6 rounded-full mb-6 backdrop-blur-sm animate-pulse">
            <Loader2 size={48} className="animate-spin" />
          </div>
          <h2 className="text-2xl font-bold">Analyzing your journey...</h2>
          <p className="text-teal-100 mt-2 opacity-80">Identifying key insights and badges</p>
        </div>
      );
    }

    if (!sessionAnalysis) return null;

    const isPaidTier = user!.tier === UserTier.PRO || user!.tier === UserTier.ADVENTURER;
    const isGuestUser = !user?.email;

    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-600 to-teal-800 flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
          {/* Hero */}
          <div className="bg-orange-400 p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            <h2 className="text-3xl font-bold text-white relative z-10">Session Complete</h2>
            <div className="flex justify-center -mb-12 mt-6 relative z-10">
              <div className="bg-white p-4 rounded-2xl shadow-lg text-4xl">
                🎉
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 pt-14 flex-1 overflow-y-auto">
            {/* Summary */}
            <div className="bg-indigo-50 rounded-xl p-5 mb-6 border border-indigo-100">
              <p className="text-indigo-900 font-medium text-center italic leading-relaxed">"{sessionAnalysis.summary}"</p>
            </div>

            {/* Points Grid */}
            <h3 className="font-bold text-slate-400 mb-3 text-center uppercase text-xs tracking-widest">Skill Points Gained</h3>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {Object.entries(sessionAnalysis.points).map(([key, score]) => (
                <div key={key} className="bg-slate-50 rounded-xl p-3 flex items-center justify-between border border-slate-100">
                  <span className="capitalize text-slate-600 font-medium text-sm">{key.replace('_', ' ')}</span>
                  <div className="flex items-center gap-1 font-bold text-orange-500">
                    +{score} <Star size={14} fill="currentColor" />
                  </div>
                </div>
              ))}
            </div>

            {/* Badges or Lock */}
            {isPaidTier ? (
              newBadges.length > 0 ? (
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 mb-6 animate-in slide-in-from-bottom-5 fade-in">
                  <h4 className="font-bold text-orange-800 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                    <Award size={16} /> New Badge Unlocked!
                  </h4>
                  {newBadges.map(b => (
                    <div key={b.id} className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm mb-2 last:mb-0">
                      <span className="text-3xl">{b.icon}</span>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{b.name}</p>
                        <p className="text-xs text-slate-500">{b.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-400 text-sm mb-6">Keep exploring to unlock new badges!</p>
              )
            ) : (
              <div className="bg-slate-100 rounded-2xl p-4 mb-6 relative overflow-hidden border border-slate-200">
                <div className="flex items-center gap-2 opacity-50 filter blur-[2px]">
                  <div className="w-10 h-10 bg-slate-300 rounded-full"></div>
                  <div className="flex-1 h-4 bg-slate-300 rounded"></div>
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60">
                  <Lock className="text-slate-500 mb-1" size={24} />
                  <p className="text-xs font-bold text-slate-600">Badges are a Pro Feature</p>
                  <p className="text-[10px] text-slate-500">Upgrade to collect them!</p>
                </div>
              </div>
            )}

            {isGuestUser ? (
              <div className="space-y-3">
                <Button
                  fullWidth
                  size="lg"
                  variant="primary"
                  onClick={() => {
                    setActiveSession(null);
                    requireAuthForPassport();
                  }}
                  className="flex items-center justify-center"
                >
                  Create your passport to view this trip <Lock size={18} className="ml-2" />
                </Button>
                <Button
                  fullWidth
                  variant="secondary"
                  onClick={() => {
                    setActiveSession(null);
                    setView('add_trip');
                  }}
                >
                  Keep exploring without signing in
                </Button>
                <p className="text-xs text-center text-slate-400">
                  This was your free test trip. Create your passport to keep it and unlock more adventures.
                </p>
              </div>
            ) : (
              <Button fullWidth size="lg" variant="primary" onClick={() => {
                setActiveSession(null);
                setView('dashboard');
              }}>
                Finish & Go to Dashboard <ArrowRight size={18} className="ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  };

  const renderUpgrade = () => {
    const currentTier = user?.tier || UserTier.FREE;
    const tripsUsed = user ? getTripsUsedForTier(user) : 0;
    const limit = TIER_LIMITS[currentTier];
    const freeLimit = TIER_LIMITS[UserTier.FREE];
    const freeTripLabel = freeLimit === 1 ? 'free trip' : 'free trips';
    const cappedFreeUsage = Math.min(tripsUsed, freeLimit);

    let usageCopy = `You have used ${cappedFreeUsage} of your ${freeLimit} ${freeTripLabel}.`;
    if (currentTier === UserTier.STARTER) {
      usageCopy = `You have used ${tripsUsed} of your ${limit} trips this month.`;
    } else if (currentTier === UserTier.PRO) {
      usageCopy = `You have used ${tripsUsed} of your ${limit} trips.`;
    }

    return (
      <div className="min-h-screen bg-slate-900/60 flex items-center justify-center p-4 absolute inset-0 z-50 backdrop-blur-sm font-sans">
        <div className="bg-white rounded-3xl p-8 max-w-4xl w-full text-center shadow-2xl relative">
          <button onClick={() => setView('dashboard')} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600">
            <LogOut size={24} />
          </button>

          <h2 className="text-3xl font-bold text-slate-900 mb-2">Choose Your Journey</h2>
          <p className="text-slate-600 mb-2 max-w-lg mx-auto">
            {usageCopy} Upgrade to keep adding adventures without limits.
          </p>
          <p className="text-slate-500 mb-8 max-w-lg mx-auto">
            Unlock the full FunVoyage experience. Save more memories and build your portfolio.
          </p>

          {upgradeError && (
            <div className="mb-6 inline-flex items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              <AlertTriangle size={16} />
              <span>{upgradeError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Starter Plan */}
            <div className="border border-slate-200 rounded-2xl p-6 bg-white hover:shadow-lg transition-shadow flex flex-col">
              <h3 className="text-slate-900 font-bold text-xl mb-2">Starter</h3>
              <div className="text-3xl font-bold text-slate-900 mb-4">$5<span className="text-sm font-normal text-slate-500">/mo</span></div>
              <ul className="space-y-3 text-left mb-8 flex-1">
                <li className="flex items-center gap-2 text-slate-700">
                  <Check size={18} className="text-slate-500" /> 3 trips per month
                </li>
                <li className="flex items-center gap-2 text-slate-700">
                  <Check size={18} className="text-slate-500" /> 1 Child Profile
                </li>
                <li className="flex items-center gap-2 text-slate-700">
                  <Check size={18} className="text-slate-500" /> No badges
                </li>
              </ul>
              <Button fullWidth variant={user?.tier === UserTier.STARTER ? "outline" : "secondary"}
                onClick={() => handleUpgrade(UserTier.STARTER)}
                disabled={user?.tier === UserTier.STARTER || upgradeLoadingTier === UserTier.STARTER || supabaseSessionLoading}>
                {upgradeLoadingTier === UserTier.STARTER ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Redirecting...
                  </span>
                ) : user?.tier === UserTier.STARTER ? "Current Plan" : "Upgrade to Starter"}
              </Button>
            </div>

            {/* Pro Plan */}
            <div className="border border-teal-100 rounded-2xl p-6 bg-teal-50/30 hover:shadow-lg transition-shadow flex flex-col">
              <h3 className="text-teal-800 font-bold text-xl mb-2">Explorer Pro</h3>
              <div className="text-3xl font-bold text-slate-900 mb-4">$10<span className="text-sm font-normal text-slate-500">/mo</span></div>
              <ul className="space-y-3 text-left mb-8 flex-1">
                <li className="flex items-center gap-2 text-slate-700">
                  <Check size={18} className="text-teal-500" /> Up to 10 Trips
                </li>
                <li className="flex items-center gap-2 text-slate-700">
                  <Check size={18} className="text-teal-500" /> Up to 3 Child Profiles
                </li>
                <li className="flex items-center gap-2 text-slate-700">
                  <Check size={18} className="text-teal-500" /> Earn Learning Badges
                </li>
                <li className="flex items-center gap-2 text-slate-700">
                  <Check size={18} className="text-teal-500" /> Save Drawings & Photos
                </li>
              </ul>
              <Button fullWidth variant={user?.tier === UserTier.PRO ? "outline" : "primary"}
                onClick={() => handleUpgrade(UserTier.PRO)}
                disabled={user?.tier === UserTier.PRO || upgradeLoadingTier === UserTier.PRO || supabaseSessionLoading}>
                {upgradeLoadingTier === UserTier.PRO ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Redirecting...
                  </span>
                ) : user?.tier === UserTier.PRO ? "Current Plan" : "Upgrade to Pro"}
              </Button>
            </div>

            {/* Adventurer Plan */}
            <div className="border-2 border-orange-400 rounded-2xl p-6 bg-white shadow-xl relative flex flex-col">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                Best Value
              </div>
              <h3 className="text-orange-800 font-bold text-xl mb-2 flex items-center justify-center gap-2">
                <Crown size={20} /> World Adventurer
              </h3>
              <div className="text-3xl font-bold text-slate-900 mb-4">$25<span className="text-sm font-normal text-slate-500">/mo</span></div>
              <ul className="space-y-3 text-left mb-8 flex-1">
                <li className="flex items-center gap-2 text-slate-700 font-medium">
                  <CheckCircle size={18} className="text-orange-500" /> Unlimited Trips
                </li>
                <li className="flex items-center gap-2 text-slate-700 font-medium">
                  <CheckCircle size={18} className="text-orange-500" /> Unlimited Child Profiles
                </li>
                <li className="flex items-center gap-2 text-slate-700 font-medium">
                  <CheckCircle size={18} className="text-orange-500" /> All Badges & Rewards
                </li>
                <li className="flex items-center gap-2 text-slate-700 font-medium">
                  <CheckCircle size={18} className="text-orange-500" /> Priority AI Features
                </li>
                <li className="flex items-center gap-2 text-slate-700 font-medium">
                  <CheckCircle size={18} className="text-orange-500" /> Future: Smart Matching
                </li>
              </ul>
              <Button fullWidth variant="accent"
                onClick={() => handleUpgrade(UserTier.ADVENTURER)}
                disabled={user?.tier === UserTier.ADVENTURER || upgradeLoadingTier === UserTier.ADVENTURER || supabaseSessionLoading}>
                {upgradeLoadingTier === UserTier.ADVENTURER ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Redirecting...
                  </span>
                ) : user?.tier === UserTier.ADVENTURER ? "Current Plan" : "Become an Adventurer"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <ErrorBoundary>
      <div className="font-sans text-slate-900 antialiased">
        {view === 'landing' && <LandingPage onStart={handleStartOnboarding} onLogin={() => handleStartAuth('login')} />}
        {view === 'auth' && renderAuth()}
        {view === 'onboarding' && renderOnboarding()}
        {view === 'dashboard' && user && (
          <Dashboard
            user={user}
            onUpgrade={() => setView('upgrade')}
            onViewPassport={(kidId) => requireAuthForPassport(kidId)}
            onLogout={handleLogout}
            onAddChild={handleAddChildClick}
            onEditChild={handleEditChildClick}
            onRemoveChild={handleRemoveChild}
            onAddTrip={handleAddTripClick}
          />
        )}
        {view === 'passport' && renderPassport()}
        {view === 'add_trip' && (
          <LocationPicker
            onLocationSelect={(countryCode, city, countryName) => handleLocationSelected(countryCode, city, countryName)}
            onCancel={() => {
              if (user?.email) {
                requireAuthForPassport();
              } else {
                setView('dashboard');
              }
            }}
          />
        )}
        {view === 'journaling' && activeSession && (
          <JournalStep
            city={activeSession.city || ''}
            countryName={activeSession.countryName || ''}
            age={user?.kids.find(k => k.id === activeKidId)?.age || 8}
            onComplete={handleJournalComplete}
            onBack={() => setView('add_trip')}
          />
        )}
        {view === 'problem_spotting' && activeSession && (
          <ProblemSpottingStep
            city={activeSession.city || ''}
            countryName={activeSession.countryName || ''}
            age={user?.kids.find(k => k.id === activeKidId)?.age || 8}
            onComplete={handleProblemsComplete}
            onBack={() => setView('journaling')}
          />
        )}
        {view === 'session' && renderSession()}
        {view === 'completion' && renderCompletion()}
        {view === 'upgrade' && renderUpgrade()}
        {view === 'memory_detail' && renderMemoryDetail()}

        {/* Modals */}
        <AddChildModal
          isOpen={showAddChildModal}
          onClose={() => {
            setShowAddChildModal(false);
            setAddChildData({ name: '', age: '' });
            setEditingKidId(null);
          }}
          onSubmit={handleAddChildSubmit}
          data={addChildData}
          onChange={setAddChildData}
          editMode={!!editingKidId}
        />

        {user && (
          <KidSelectorModal
            isOpen={showKidSelector}
            onClose={() => setShowKidSelector(false)}
            kids={user.kids}
            onSelect={handleKidSelectedForTrip}
          />
        )}

        {/* Upgrade Prompt Modal */}
        <UpgradePrompt
          isOpen={showUpgradePrompt}
          onClose={() => {
            setShowUpgradePrompt(false);
            setUpgradePromptData(null);
          }}
          currentTier={user?.tier || UserTier.GUEST}
          suggestedTier={upgradePromptData?.suggestedTier || UserTier.STARTER}
          message={upgradePromptData?.message || "You've reached your trip limit!"}
          onUpgrade={(tier) => {
            setShowUpgradePrompt(false);
            setUpgradePromptData(null);
            handleUpgrade(tier);
          }}
        />
      </div>
    </ErrorBoundary>
  );
};

export default App;
