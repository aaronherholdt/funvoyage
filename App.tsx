
import React, { useState, useEffect, useRef } from 'react';
import { UserTier, ParentUser, KidProfile, Session, SessionEntry, ConversationStage, SessionAnalysis, Badge, SessionMedia } from './types';
import { TIER_LIMITS, COUNTRIES, APP_NAME, STAGE_PROMPTS, BADGES, getFlagEmoji, getAgeTheme } from './constants';
import { generateNiaResponse, analyzeSession } from './services/geminiService';
import { VoiceInterface } from './components/kid/VoiceInterface';
import { DrawingCanvas } from './components/kid/DrawingCanvas';
import { LocationPicker } from './components/kid/LocationPicker';
import { Dashboard } from './components/parent/Dashboard';
import { LandingPage } from './components/LandingPage';
import { Button } from './components/Button';
import { Plane, Mic, Lock, LogOut, Plus, ChevronLeft, Check, Star, ArrowRight, Loader2, Award, Crown, CheckCircle, Cloud, Map as MapIcon, Globe, Sparkles, Zap, Heart, BookOpen, ChevronRight } from 'lucide-react';

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: any) => void) | null;
  onend: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
}

const App: React.FC = () => {
  // --- GLOBAL STATE ---
  const [user, setUser] = useState<ParentUser | null>(null);
  const [view, setView] = useState<'landing' | 'onboarding' | 'dashboard' | 'passport' | 'add_trip' | 'session' | 'completion' | 'upgrade' | 'memory_detail'>('landing');
  const [activeKidId, setActiveKidId] = useState<string | null>(null);
  
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
  const [drawingMode, setDrawingMode] = useState(false);
  const [transcript, setTranscript] = useState(''); 

  // --- COMPLETION STATE ---
  const [sessionAnalysis, setSessionAnalysis] = useState<SessionAnalysis | null>(null);
  const [newBadges, setNewBadges] = useState<Badge[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // --- MEMORY DETAIL STATE ---
  const [viewingSession, setViewingSession] = useState<Session | null>(null);

  // --- REFS ---
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(window.speechSynthesis);
  const transcriptBufferRef = useRef(''); 

  // --- INITIALIZATION ---
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
    if (!recognitionRef.current) return;

    recognitionRef.current.onresult = (event: any) => {
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
    
    recognitionRef.current.onerror = (event: any) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setIsListening(false);
      }
    };

  }, [stage, activeSession, history]); 

  // --- ACTIONS ---

  const handleStartOnboarding = () => {
      setView('onboarding');
  };

  const handleCompleteOnboarding = () => {
      const kidId = 'k1';
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
          id: 'u1',
          name: 'Parent',
          email: null,
          tier: UserTier.GUEST,
          kids: [newKid]
      };
      
      setUser(newUser);
      setActiveKidId(kidId);
      setView('passport'); // Go straight to kid mode for "Try Now" flow
  };

  const handleAddTripClick = () => {
    if (!user) return;
    const kid = user.kids.find(k => k.id === activeKidId);
    const limit = TIER_LIMITS[user.tier];
    const totalCountries = kid?.sessions.length || 0;

    if (user.tier !== UserTier.ADVENTURER && totalCountries >= limit && user.tier !== UserTier.GUEST) {
      setView('upgrade');
      return;
    }
    setNewTripData({ countryCode: COUNTRIES[0].code, city: '' });
    setView('add_trip');
  };

  const handleStartSession = (countryCode: string, city: string, countryName: string) => {
    const country = COUNTRIES.find(c => c.code === countryCode);
    const finalCountryName = countryName || country?.name || countryCode;

    const newSession: Partial<Session> = {
      id: Date.now().toString(),
      countryCode,
      countryName: finalCountryName,
      city: city,
      date: new Date().toISOString(),
      entries: [],
      completed: false
    };
    setActiveSession(newSession);
    setHistory([]);
    setStage('intro');
    setView('session');
    
    setTimeout(() => {
      const kid = user?.kids.find(k => k.id === activeKidId);
      processAIStage(finalCountryName, city, [], 'intro', kid?.age || 8);
    }, 1000);
  };

  const processAIStage = async (
    countryName: string, 
    cityName: string | undefined,
    currentHistory: SessionEntry[], 
    currentStage: ConversationStage, 
    kidAge: number,
    userText?: string
  ) => {
    if (currentStage === 'summary') return; // Handled by backend analysis

    const locationContext = cityName ? `${cityName}, ${countryName}` : countryName;
    let prompt = STAGE_PROMPTS[currentStage].replace(/{country}/g, locationContext);
    if (userText) prompt += ` The child just said: "${userText}".`;

    const responseText = await generateNiaResponse(currentHistory, prompt, kidAge);
    
    const aiEntry: SessionEntry = { role: 'model', text: responseText, timestamp: Date.now() };
    setHistory(prev => [...prev, aiEntry]);
    speak(responseText);
  };

  const speak = (text: string) => {
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
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

    let nextStage: ConversationStage = stage;
    switch (stage) {
      case 'intro': nextStage = 'likes'; break;
      case 'likes': nextStage = 'culture'; break;
      case 'culture': nextStage = 'problems_country'; break;
      case 'problems_country': nextStage = 'problems_family'; break;
      case 'problems_family': 
        setStage('drawing');
        setDrawingMode(true);
        speak("That was great sharing! Now, you can capture a memory. Draw a picture or upload a photo! Tap the button when you're done!");
        return; 
      case 'drawing': nextStage = 'summary'; break;
      case 'summary': break;
    }

    setStage(nextStage);
    if (activeSession && nextStage !== 'summary') {
        await processAIStage(activeSession.countryName!, activeSession.city, newHistory, nextStage, kidAge, text);
    }
  };

  const handleMediaSave = (mediaData: { dataUrl: string, type: 'drawing' | 'photo' }) => {
    setDrawingMode(false);
    const mediaItem: SessionMedia = { 
        id: Date.now().toString(), 
        dataUrl: mediaData.dataUrl, 
        type: mediaData.type,
        createdAt: Date.now() 
    };
    // Update state for UI consistency, but pass explicit media to save function to avoid race condition
    setActiveSession(prev => ({ ...prev, media: [mediaItem] }));
    handleFinishAndAnalyze([...history], [mediaItem]);
  };

  const handleFinishAndAnalyze = async (finalHistory: SessionEntry[], finalMedia?: SessionMedia[]) => {
    setView('completion'); 
    setIsAnalyzing(true);
    
    const kid = user!.kids.find(k => k.id === activeKidId)!;

    // 1. Analyze Session
    const analysis = await analyzeSession(
        finalHistory, 
        activeSession?.countryName || '', 
        activeSession?.city,
        kid.age
    );
    
    if (!analysis) {
        setIsAnalyzing(false);
        setView('passport');
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
      earnedBadges: newlyUnlockedBadges,
      media: finalMedia || activeSession?.media || []
    };

    setUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        kids: prev.kids.map(k => {
          if (k.id === activeKidId) {
            return {
                ...k,
                sessions: [completedSession, ...k.sessions],
                totalPoints: (prev.tier === UserTier.PRO || prev.tier === UserTier.ADVENTURER) ? newPoints : k.totalPoints,
                badges: [...k.badges, ...newlyUnlockedBadges]
            };
          }
          return k;
        })
      };
    });

    setIsAnalyzing(false);
    speak(analysis.summary);
  };

  const handleUpgrade = (tier: UserTier) => {
    setUser(prev => prev ? ({ ...prev, tier: tier }) : null);
    setView('dashboard');
  };

  // --- RENDER HELPERS ---

  const renderOnboarding = () => (
      <div className="min-h-screen bg-indigo-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full border border-indigo-100">
              <h2 className="text-2xl font-bold text-slate-800 mb-2 text-center">Welcome Aboard!</h2>
              <p className="text-slate-500 text-center mb-8">Tell us a bit about the traveler.</p>
              
              <div className="space-y-4">
                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">First Name</label>
                      <input 
                        type="text" 
                        value={onboardingData.name}
                        onChange={(e) => setOnboardingData({...onboardingData, name: e.target.value})}
                        className="w-full p-3 border border-slate-200 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                        placeholder="e.g. Maya"
                      />
                  </div>
                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Age</label>
                      <input 
                        type="number" 
                        value={onboardingData.age}
                        onChange={(e) => setOnboardingData({...onboardingData, age: e.target.value})}
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
                  Let's Go! <ArrowRight size={18} className="ml-2"/>
              </Button>
          </div>
      </div>
  );

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

                                   {/* Main Visual - Stamp/Photo */}
                                   <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
                                       {session.media?.[0] ? (
                                            <div className="w-full aspect-square bg-slate-100 p-2 shadow-md transform rotate-1 relative">
                                                {/* Tape Effect */}
                                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-24 h-8 bg-yellow-200/60 rotate-[-2deg] backdrop-blur-sm"></div>
                                                <img src={session.media[0].dataUrl} alt="memory" className="w-full h-full object-cover filter sepia-[0.2]" />
                                            </div>
                                       ) : (
                                            <div className="w-48 h-48 rounded-full border-4 border-double border-teal-200 flex items-center justify-center opacity-50">
                                                <MapIcon size={64} className="text-teal-200" />
                                            </div>
                                       )}
                                       
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
                            <div className="w-full h-full bg-white/10 backdrop-blur-sm border-2 border-dashed border-white/30 rounded-[20px] flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:bg-white/20 transition-colors group"
                                 onClick={handleAddTripClick}>
                                <div className="w-20 h-20 rounded-full bg-teal-500 flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform">
                                    <Plus className="text-white" size={40} />
                                </div>
                                <h3 className="font-bold text-2xl text-white mb-2">New Adventure</h3>
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
                  <Button variant="ghost" onClick={() => setView('passport')} className="text-slate-600">
                      <ChevronLeft className="mr-2" /> Back
                  </Button>
                  <h2 className="flex-1 text-center font-bold text-xl text-slate-800">
                      {viewingSession.city || viewingSession.countryName}
                  </h2>
                  <div className="w-10"></div>
              </header>
              <div className="p-6 max-w-3xl mx-auto w-full space-y-8">
                   {/* Image/Drawing Hero */}
                   {viewingSession.media?.[0] && (
                       <div className="w-full aspect-video bg-black rounded-2xl shadow-lg overflow-hidden relative">
                           <img src={viewingSession.media[0].dataUrl} className="w-full h-full object-contain" alt="Memory" />
                       </div>
                   )}
                   
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
           <Button variant="ghost" size="sm" onClick={() => setView('passport')} className="text-red-400 hover:bg-red-50">
              <LogOut size={18} />
           </Button>
        </header>

        <div className="flex-1 relative flex flex-col overflow-hidden">
           {drawingMode ? (
             <div className="flex-1 p-4 flex items-center justify-center bg-indigo-50">
                <div className="w-full max-w-3xl">
                   <DrawingCanvas 
                      onSave={(dataUrl) => handleMediaSave({ dataUrl, type: 'drawing' })} 
                      onCancel={() => handleFinishAndAnalyze(history)}
                   />
                </div>
             </div>
           ) : (
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
           )}
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

                    <Button fullWidth size="lg" variant="primary" onClick={() => {
                        setActiveSession(null);
                        setView('dashboard');
                    }}>
                        Finish & Go to Dashboard <ArrowRight size={18} className="ml-2" />
                    </Button>
                </div>
            </div>
        </div>
     )
  };

  const renderUpgrade = () => (
      <div className="min-h-screen bg-slate-900/60 flex items-center justify-center p-4 absolute inset-0 z-50 backdrop-blur-sm font-sans">
          <div className="bg-white rounded-3xl p-8 max-w-4xl w-full text-center shadow-2xl relative">
              <button onClick={() => setView('dashboard')} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600">
                  <LogOut size={24} />
              </button>
              
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Choose Your Journey</h2>
              <p className="text-slate-600 mb-10 max-w-lg mx-auto">
                  Unlock the full FunVoyage experience. Save more memories and build your portfolio.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Pro Plan */}
                  <div className="border border-teal-100 rounded-2xl p-6 bg-teal-50/30 hover:shadow-lg transition-shadow flex flex-col">
                      <h3 className="text-teal-800 font-bold text-xl mb-2">Explorer Pro</h3>
                      <div className="text-3xl font-bold text-slate-900 mb-4">$10<span className="text-sm font-normal text-slate-500">/mo</span></div>
                      <ul className="space-y-3 text-left mb-8 flex-1">
                          <li className="flex items-center gap-2 text-slate-700">
                              <Check size={18} className="text-teal-500" /> Up to 10 Trips
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
                              disabled={user?.tier === UserTier.PRO}>
                          {user?.tier === UserTier.PRO ? "Current Plan" : "Upgrade to Pro"}
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
                              disabled={user?.tier === UserTier.ADVENTURER}>
                          {user?.tier === UserTier.ADVENTURER ? "Current Plan" : "Become an Adventurer"}
                      </Button>
                  </div>
              </div>
          </div>
      </div>
  );

  return (
    <div className="font-sans text-slate-900 antialiased">
      {view === 'landing' && <LandingPage onStart={handleStartOnboarding} />}
      {view === 'onboarding' && renderOnboarding()}
      {view === 'dashboard' && user && (
        <Dashboard 
          user={user} 
          onUpgrade={() => setView('upgrade')}
          onViewPassport={(kidId) => {
            setActiveKidId(kidId);
            setView('passport');
          }}
        />
      )}
      {view === 'passport' && renderPassport()}
      {view === 'add_trip' && (
         <LocationPicker 
             onLocationSelect={(countryCode, city, countryName) => handleStartSession(countryCode, city, countryName)}
             onCancel={() => setView('passport')}
         />
      )}
      {view === 'session' && renderSession()}
      {view === 'completion' && renderCompletion()}
      {view === 'upgrade' && renderUpgrade()}
      {view === 'memory_detail' && renderMemoryDetail()}
    </div>
  );
};

export default App;
