
import React, { useState } from 'react';
import { Mic, ArrowRight, Lock, Globe, Brain, Sparkles, Shield, Users, Check, X, Crown } from 'lucide-react';
import { Button } from './Button';
import { getAgeTheme, BADGES } from '../constants';

interface LandingPageProps {
    onStart: () => void;
    onLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStart, onLogin }) => {
    const [previewAge, setPreviewAge] = useState(8);
    const [activeSection, setActiveSection] = useState<'main' | 'methodology' | 'safety' | 'pricing'>('main');
    const previewTheme = getAgeTheme(previewAge);

    const handleUpgrade = (tier: 'STARTER' | 'PRO' | 'ADVENTURER') => {
        // Simple redirect – no extra fetch needed
        window.location.href = `/api/paypal/checkout?tier=${tier}`;
    };

    const renderMethodology = () => (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="text-center max-w-3xl mx-auto mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-100 text-teal-800 font-bold text-sm uppercase tracking-wide mb-4">
                    <Brain size={16} /> The FunVoyage Way
                </div>
                <h2 className="font-kid text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-slate-900 mb-6">Don't just see the world. <br /><span className="text-teal-600">Understand it.</span></h2>
                <p className="text-xl text-slate-600 leading-relaxed">
                    Travel is the ultimate classroom. But without reflection, memories fade.
                    We combine <span className="font-bold text-sand-800">Inquiry-Based Learning</span> with digital journaling to turn every trip into a lesson in curiosity.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center text-2xl mb-6">
                        👀
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-3">1. Active Observation</h3>
                    <p className="text-slate-600">
                        Passive travel is boring. Nia gives kids "missions" based on their location, encouraging them to look closer at architecture, nature, and culture.
                    </p>
                </div>
                <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-bl-full -mr-8 -mt-8 z-0"></div>
                    <div className="relative z-10">
                        <div className="w-14 h-14 bg-teal-100 text-teal-600 rounded-2xl flex items-center justify-center text-2xl mb-6">
                            🗣️
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-3">2. Socratic Reflection</h3>
                        <p className="text-slate-600">
                            Nia doesn't just chat; she asks <em>"Why?"</em>. By verbalizing their thoughts, children move from simple recall to deep understanding and synthesis.
                        </p>
                    </div>
                </div>
                <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl mb-6">
                        🏆
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-3">3. Celebrate Growth</h3>
                    <p className="text-slate-600">
                        Every conversation builds critical thinking skills. We turn their journal into a portfolio of growth with badges and insights.
                    </p>
                </div>
            </div>

            <div className="mt-16 bg-mesh-dark rounded-bento p-6 md:p-8 lg:p-12 max-w-6xl mx-auto relative overflow-hidden">
                <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8">
                    <div className="flex-1">
                        <h3 className="text-3xl font-bold text-white mb-4">Perfect for Worldschooling</h3>
                        <p className="text-slate-400 text-lg mb-6">
                            Whether you're on a gap year, a summer vacation, or full-time nomadic living, FunVoyage provides the "School" part of worldschooling without the battles.
                        </p>
                        <Button onClick={onStart} size="lg" variant="accent">Start Your Learning Journey</Button>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 max-w-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">🦄</div>
                            <div className="text-white">
                                <div className="font-bold text-sm">Nia (AI Tutor)</div>
                                <div className="text-xs opacity-70">To 6-year-old Maya</div>
                            </div>
                        </div>
                        <p className="text-white/90 italic">"You drew the red bus perfectly! Why do you think the buses here are red, but the ones at home are yellow?"</p>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderSafety = () => (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="text-center max-w-3xl mx-auto mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-100 text-indigo-800 font-bold text-sm uppercase tracking-wide mb-4">
                    <Shield size={16} /> Parent-First Safety
                </div>
                <h2 className="font-kid text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-slate-900 mb-6">A Walled Garden for <br /><span className="text-indigo-600">Digital Nomads.</span></h2>
                <p className="text-xl text-slate-600 leading-relaxed">
                    We know the internet is scary. That's why FunVoyage is built like a fortress.
                    You hold the keys; your children just enjoy the room.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                <div className="bg-white p-8 rounded-[2rem] border border-slate-200 flex gap-6 items-start">
                    <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600">
                        <Users size={32} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Single Parent Account</h3>
                        <p className="text-slate-600">
                            Kids do <strong>not</strong> have accounts, emails, or passwords. They exist only as profiles nested within your secure Parent Account. You control access 100% of the time.
                        </p>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2rem] border border-slate-200 flex gap-6 items-start">
                    <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600">
                        <Lock size={32} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Zero External Contact</h3>
                        <p className="text-slate-600">
                            FunVoyage is a closed loop. There are no social features, no messaging other kids, and no public feeds. It's just your child and their AI guide.
                        </p>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2rem] border border-slate-200 flex gap-6 items-start">
                    <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600">
                        <Sparkles size={32} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Age-Appropriate AI</h3>
                        <p className="text-slate-600">
                            Our AI (Nia) is strictly prompted to maintain a supportive, safe, and educational tone. She refuses to engage in inappropriate topics and redirects to learning.
                        </p>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2rem] border border-slate-200 flex gap-6 items-start">
                    <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600">
                        <Globe size={32} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">No Ads, Ever.</h3>
                        <p className="text-slate-600">
                            Your child is not the product. We don't sell data, and we don't show ads. Our business model is simple: parents pay for a great tool.
                        </p>
                    </div>
                </div>
            </div>

            <div className="mt-12 text-center">
                <Button onClick={onStart} size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white">Create Parent Account</Button>
                <p className="mt-4 text-slate-400 text-sm">Compliant with COPPA & GDPR principles.</p>
            </div>
        </div>
    );

    const renderPricing = () => (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="text-center max-w-3xl mx-auto mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 text-orange-800 font-bold text-sm uppercase tracking-wide mb-4">
                    <Crown size={16} /> Simple Pricing
                </div>
                <h2 className="font-kid text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-slate-900 mb-6">Invest in their <br /><span className="text-orange-500">memories.</span></h2>
                <p className="text-xl text-slate-600 leading-relaxed">
                    Cheaper than a single museum ticket, but lasts a lifetime. Take your first trip free without an account, then move into Starter or Pro when you're ready for monthly adventures.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto items-stretch">

                {/* Free Tier */}
                <div className="bg-white rounded-[2rem] p-8 border border-slate-200 relative flex flex-col">
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Tourist</h3>
                    <div className="text-4xl font-bold text-slate-900 mb-1">Free</div>
                    <p className="text-slate-500 text-sm mb-6">Perfect for testing the waters on a weekend trip.</p>
                    <ul className="space-y-3 mb-8 flex-1">
                        <li className="flex items-center gap-2 text-slate-700 text-sm"><Check size={16} className="text-slate-400" /> 1 trip total (account optional)</li>
                        <li className="flex items-center gap-2 text-slate-700 text-sm"><Check size={16} className="text-slate-400" /> Basic AI Chat</li>
                        <li className="flex items-center gap-2 text-slate-700 text-sm"><Check size={16} className="text-slate-400" /> Journal & Problem-Solving</li>
                    </ul>
                    <Button onClick={onStart} variant="secondary" fullWidth>Try Now</Button>
                </div>

                {/* Starter Tier */}
                <div className="bg-white rounded-[2rem] p-8 border border-slate-200 relative flex flex-col">
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Starter</h3>
                    <div className="text-4xl font-bold text-slate-900 mb-1">$5<span className="text-lg text-slate-500 font-normal">/mo</span></div>
                    <p className="text-slate-500 text-sm mb-6">For families dipping into monthly adventures.</p>
                    <ul className="space-y-3 mb-8 flex-1">
                        <li className="flex items-center gap-2 text-slate-700 text-sm"><Check size={16} className="text-slate-400" /> 3 trips per month</li>
                        <li className="flex items-center gap-2 text-slate-700 text-sm"><Check size={16} className="text-slate-400" /> 1 Child Profile</li>
                        <li className="flex items-center gap-2 text-slate-700 text-sm"><Check size={16} className="text-slate-400" /> Badges not included</li>
                    </ul>
                    <Button onClick={() => handleUpgrade('STARTER')} variant="outline" fullWidth>Upgrade to Starter</Button>
                </div>

                {/* Pro Tier */}
                <div className="bg-teal-50 rounded-[2rem] p-8 border-2 border-teal-500 relative shadow-xl flex flex-col lg:-mt-4 lg:mb-4 z-10 sm:col-span-2 lg:col-span-1">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-teal-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">Most Popular</div>
                    <h3 className="text-xl font-bold text-teal-900 mb-2">Explorer Pro</h3>
                    <div className="text-4xl font-bold text-slate-900 mb-1">$10<span className="text-lg text-slate-500 font-normal">/mo</span></div>
                    <p className="text-teal-700/80 text-sm mb-6">For the annual family vacation.</p>
                    <ul className="space-y-3 mb-8 flex-1">
                        <li className="flex items-center gap-2 text-slate-800 text-sm font-medium"><Check size={16} className="text-teal-500" /> Up to 10 Trips</li>
                        <li className="flex items-center gap-2 text-slate-800 text-sm font-medium"><Check size={16} className="text-teal-500" /> Earn Learning Badges</li>
                        <li className="flex items-center gap-2 text-slate-800 text-sm font-medium"><Check size={16} className="text-teal-500" /> PDF Journey Reports</li>
                        <li className="flex items-center gap-2 text-slate-800 text-sm font-medium"><Check size={16} className="text-teal-500" /> Up to 3 Child Profiles</li>
                    </ul>
                    <Button onClick={() => handleUpgrade('PRO')} variant="primary" fullWidth>Upgrade to Pro</Button>
                </div>

                {/* Adventurer Tier */}
                <div className="bg-white rounded-[2rem] p-8 border border-slate-200 relative flex flex-col">
                    <h3 className="text-xl font-bold text-orange-900 mb-2">World Adventurer</h3>
                    <div className="text-4xl font-bold text-slate-900 mb-1">$25<span className="text-lg text-slate-500 font-normal">/mo</span></div>
                    <p className="text-slate-500 text-sm mb-6">For full-time worldschooling families.</p>
                    <ul className="space-y-3 mb-8 flex-1">
                        <li className="flex items-center gap-2 text-slate-700 text-sm"><Check size={16} className="text-orange-500" /> Unlimited Trips</li>
                        <li className="flex items-center gap-2 text-slate-700 text-sm"><Check size={16} className="text-orange-500" /> Priority AI Access</li>
                        <li className="flex items-center gap-2 text-slate-700 text-sm"><Check size={16} className="text-orange-500" /> Printable PDF Reports</li>
                        <li className="flex items-center gap-2 text-slate-700 text-sm"><Check size={16} className="text-orange-500" /> Unlimited Child Profiles</li>
                    </ul>
                    <Button onClick={() => handleUpgrade('ADVENTURER')} variant="outline" fullWidth>Upgrade to Adventurer</Button>
                </div>
            </div>
        </div>
    );

    const renderMainGrid = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 animate-in fade-in duration-500">
            {/* Hero Card */}
            <div className="col-span-1 md:col-span-2 lg:row-span-2 bg-mesh-dark rounded-bento p-8 md:p-10 lg:p-12 flex flex-col justify-between relative overflow-hidden bento-card">
                <div className="relative z-10">
                    <span className="inline-block px-4 py-1.5 rounded-full bg-coral-500/20 text-coral-200 text-xs font-bold uppercase tracking-wider mb-6 border border-coral-500/30 animate-reveal-up">
                        Voice-First Travel Companion
                    </span>
                    <h1 className="font-display text-4xl sm:text-5xl lg:text-7xl text-white leading-tight mb-6 animate-reveal-up delay-100">
                        Turns trips into <span className="text-coral-300">Core Memories.</span>
                    </h1>
                    <p className="text-sand-400 text-lg md:text-xl max-w-md leading-relaxed mb-8 animate-reveal-up delay-200">
                        The digital passport that adapts to your child's age. From toddlers to teens, FunVoyage makes travel educational.
                    </p>
                    <button
                        onClick={onStart}
                        className="bg-coral-500 text-white hover:bg-coral-400 font-bold text-lg px-8 py-4 rounded-2xl transition-all transform active:scale-95 inline-flex items-center gap-2 shadow-xl btn-magnetic animate-reveal-up delay-300"
                    >
                        Start Free Test Trip <ArrowRight size={20} />
                    </button>
                    <div className="mt-3 text-sm text-sand-400 animate-reveal-up delay-400">
                        Already have an account? <button className="text-coral-200 font-bold hover:text-coral-100" onClick={onLogin}>Log in</button>
                    </div>
                </div>
                {/* Decorative Abstract Shapes */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-coral-500 rounded-full blur-[120px] opacity-20 -translate-y-1/2 translate-x-1/3 pointer-events-none animate-float"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-ocean-500 rounded-full blur-[100px] opacity-30 translate-y-1/3 -translate-x-1/3 pointer-events-none animate-float delay-300"></div>
            </div>

            {/* 3D Interactive Passport Card */}
            <div className="col-span-1 md:col-span-1 min-h-[320px] bg-coral-50 rounded-bento relative group perspective-1000 cursor-pointer flex items-center justify-center overflow-visible bento-card">
                <div className="absolute top-6 left-6 z-0">
                    <h3 className="font-bold text-coral-700/50 text-sm uppercase tracking-wider">Collect Badges</h3>
                </div>

                <div className="relative w-40 h-56 transform-style-3d passport-container">
                    {/* The Book Structure (Cover) */}
                    <div className="absolute inset-0 w-full h-full passport-book transform-style-3d shadow-2xl">
                        {/* Front Cover */}
                        <div className="absolute inset-0 bg-[#1e3a8a] rounded-r-lg rounded-l-sm flex flex-col items-center justify-center border-l-4 border-[#172554] backface-hidden">
                            <div className="w-20 h-20 rounded-full border-2 border-yellow-500/50 flex items-center justify-center mb-2">
                                <Globe className="text-yellow-400" size={40} strokeWidth={1.5} />
                            </div>
                            <span className="text-yellow-400 font-serif font-bold tracking-widest text-sm mt-2">PASSPORT</span>
                        </div>
                        {/* Back of Front Cover (Left Page when open) */}
                        <div className="absolute inset-0 bg-white rounded-r-lg rounded-l-sm rotate-y-180 backface-hidden border-l-4 border-slate-200 flex flex-col p-4">
                            <div className="text-[8px] text-slate-400 uppercase tracking-widest text-center mb-4">Identification</div>
                            <div className="flex gap-3 mb-4 items-center">
                                <div className="w-10 h-10 bg-slate-100 rounded-full border border-slate-200 flex items-center justify-center text-lg">👤</div>
                                <div className="space-y-1.5 flex-1">
                                    <div className="h-px bg-slate-300 w-full"></div>
                                    <div className="h-px bg-slate-300 w-2/3"></div>
                                </div>
                            </div>
                            <div className="mt-auto opacity-30">
                                <div className="text-[6px] text-center text-slate-400">OFFICIAL DOCUMENT</div>
                            </div>
                        </div>
                    </div>

                    {/* The "Inside" Page (Right Page when open) - Badges */}
                    <div className="absolute inset-0 w-full h-full bg-[#fffdf5] rounded-r-lg rounded-l-sm border border-slate-200 z-10 flex flex-col p-3 shadow-inner">
                        <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-center border-b border-slate-200 pb-1">
                            My Badges
                        </div>
                        <div className="grid grid-cols-3 gap-2 justify-items-center content-start">
                            {BADGES.slice(0, 6).map((badge, i) => (
                                <div key={i} className="w-8 h-8 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center text-lg" title={badge.name}>
                                    {badge.icon}
                                </div>
                            ))}
                        </div>
                        <div className="mt-auto opacity-20">
                            <div className="border-2 border-red-500 text-red-500 text-[8px] font-bold p-1 inline-block transform -rotate-12 rounded">
                                VISITED
                            </div>
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-6 text-center w-full opacity-70 group-hover:opacity-100 transition-opacity delay-100 pointer-events-none">
                    <p className="text-coral-600 text-xs font-bold">Collect them all!</p>
                </div>
            </div>

            {/* Popping Map Card */}
            <div className="col-span-1 md:col-span-1 min-h-[320px] bg-ocean-50 rounded-bento relative group overflow-hidden flex flex-col items-center justify-center bento-card">
                <div className="absolute top-6 left-6">
                    <h3 className="font-bold text-ocean-700/50 text-sm uppercase tracking-wider">Any Destination</h3>
                </div>

                <div className="relative w-40 h-40 flex items-center justify-center">
                    {/* Center Map */}
                    <div className="relative z-10 bg-white w-20 h-20 rounded-3xl shadow-lg flex items-center justify-center text-4xl border-4 border-ocean-100 group-hover:scale-90 transition-transform duration-300">
                        🗺️
                    </div>

                    {/* Popping Elements */}
                    <div className="absolute -top-8 left-0 pop-flag" style={{ transitionDelay: '0ms' }}>
                        <div className="bg-white px-2 py-1 rounded-lg shadow-md text-xl border border-slate-100 -rotate-12">🗼</div>
                    </div>
                    <div className="absolute top-0 -right-8 pop-flag" style={{ transitionDelay: '50ms' }}>
                        <div className="bg-white px-2 py-1 rounded-lg shadow-md text-xl border border-slate-100 rotate-12">🗽</div>
                    </div>
                    <div className="absolute bottom-0 -left-6 pop-flag" style={{ transitionDelay: '100ms' }}>
                        <div className="bg-white px-2 py-1 rounded-lg shadow-md text-xl border border-slate-100 -rotate-6">🕋</div>
                    </div>
                    <div className="absolute -bottom-8 right-0 pop-flag" style={{ transitionDelay: '150ms' }}>
                        <div className="bg-white px-2 py-1 rounded-lg shadow-md text-xl border border-slate-100 rotate-6">🏯</div>
                    </div>
                </div>
                <p className="absolute bottom-8 text-ocean-600 font-bold text-sm opacity-60 group-hover:opacity-100 transition-opacity">
                    Tap to explore
                </p>
            </div>

            {/* Age Adaptive Feature Card */}
            <div className="col-span-1 md:col-span-2 bg-white border border-sand-200 rounded-bento p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 md:gap-8 bento-card">
                <div className="flex-1 space-y-6 w-full">
                    <div>
                        <h3 className="font-display font-bold text-sand-900 text-2xl mb-2">Grows with you.</h3>
                        <p className="text-sand-500">Nia adapts her personality, questions, and look based on your child's age.</p>
                    </div>

                    {/* Age Toggles */}
                    <div className="flex flex-wrap gap-2">
                        {[5, 8, 11, 14].map((age) => {
                            const isActive = previewAge === age;
                            let label = "4-6";
                            if (age === 8) label = "7-9";
                            if (age === 11) label = "10-12";
                            if (age === 14) label = "13+";

                            return (
                                <button
                                    key={age}
                                    onClick={() => setPreviewAge(age)}
                                    className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${isActive ? 'bg-sand-800 text-white shadow-md' : 'bg-sand-100 text-sand-500 hover:bg-sand-200'}`}
                                >
                                    {label}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Live Preview Bubble */}
                <div className={`w-full md:w-80 p-6 rounded-3xl transition-all duration-500 border-2 border-dashed ${previewTheme.containerBg} border-sand-200`}>
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-xl flex-shrink-0 border border-sand-100">
                            {previewTheme.aiAvatar}
                        </div>
                        <div className={`${previewTheme.bubbleAi} p-4 shadow-sm bg-white`}>
                            <p className={`${previewTheme.font} text-sm`}>
                                {previewAge <= 6 && "Wow! Look at that big red bus! 🚌 Can you draw it for me?"}
                                {previewAge > 6 && previewAge <= 9 && "That's super cool! Did you know this castle is 500 years old? 🏰"}
                                {previewAge > 9 && previewAge <= 12 && "Interesting observation. How does the food here compare to back home?"}
                                {previewAge > 12 && "The street art here is pretty intense. What do you think the artist was trying to say?"}
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white shadow-sm transition-colors ${previewAge <= 6 ? 'bg-coral-500' : previewAge <= 9 ? 'bg-ocean-500' : previewAge <= 12 ? 'bg-forest-500' : 'bg-violet-500'}`}>
                            <Mic size={14} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Privacy/Safety Card */}
            <div
                onClick={() => setActiveSection('safety')}
                className="col-span-1 md:col-span-2 bg-ocean-50 rounded-bento p-6 md:p-8 flex items-center justify-between bento-card group cursor-pointer hover:bg-ocean-100 transition-colors"
            >
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-white p-2 rounded-lg shadow-sm">
                            <Lock className="text-ocean-500" size={20} />
                        </div>
                        <span className="font-bold text-ocean-700">Parent Controlled</span>
                    </div>
                    <h3 className="text-xl text-ocean-700/80 font-medium">
                        No ads. Private data. <br />
                        <span className="font-bold text-ocean-700">100% Safe for kids.</span>
                    </h3>
                </div>
                <div className="hidden md:block opacity-50 group-hover:opacity-100 transition-opacity">
                    <div className="flex -space-x-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="w-10 h-10 rounded-full border-2 border-ocean-50 bg-white flex items-center justify-center text-xs shadow-sm">
                                {['🛡️', '🔒', '✅'][i - 1]}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-dvh bg-mesh-warm font-sans selection:bg-coral-100 pb-12 relative texture-grain px-safe">
            <style>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
        
        .passport-book {
           transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
           transform-origin: left center;
           z-index: 20;
        }
        
        .passport-container {
           transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        /* On hover, open the book to the left */
        .group:hover .passport-book {
           transform: rotateY(-170deg);
        }
        
        /* Shift the container right so the spread is centered */
        .group:hover .passport-container {
           transform: translateX(50%);
        }
        
        /* Flag Pop Animation */
        .pop-flag {
           transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s;
           opacity: 0;
           transform: scale(0) translateY(20px);
        }
        .group:hover .pop-flag {
           opacity: 1;
           transform: scale(1) translateY(0);
        }

        /* Bento Card Hover */
        .bento-card {
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .bento-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
        }
      `}</style>

            {/* Navbar */}
            <nav className="px-8 py-6 flex justify-between items-center max-w-7xl mx-auto relative z-50">
                <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => setActiveSection('main')}
                >
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-2xl">🌍</div>
                    <span className="font-kid font-bold text-2xl tracking-tight text-slate-900">FunVoyage</span>
                </div>
                <div className="hidden sm:flex gap-4 md:gap-6 text-sm font-bold text-slate-600">
                    <button onClick={() => setActiveSection('methodology')} className={`hover:text-teal-600 transition-colors ${activeSection === 'methodology' ? 'text-teal-600' : ''}`}>Methodology</button>
                    <button onClick={() => setActiveSection('safety')} className={`hover:text-teal-600 transition-colors ${activeSection === 'safety' ? 'text-teal-600' : ''}`}>Safety</button>
                    <button onClick={() => setActiveSection('pricing')} className={`hover:text-teal-600 transition-colors ${activeSection === 'pricing' ? 'text-teal-600' : ''}`}>Pricing</button>
                </div>
                <div className="flex items-center gap-4">
                    {activeSection !== 'main' && (
                        <Button variant="ghost" size="sm" onClick={() => setActiveSection('main')}>
                            <X size={20} />
                        </Button>
                    )}
                    <Button variant="primary" onClick={onLogin} className="font-bold bg-sand-800 hover:bg-sand-700 text-white shadow-lg shadow-sand-200 btn-magnetic">Sign In</Button>
                </div>
            </nav>

            {/* Main Content Switcher */}
            <div className="p-4 md:p-8 max-w-7xl mx-auto">
                {activeSection === 'main' && renderMainGrid()}
                {activeSection === 'methodology' && renderMethodology()}
                {activeSection === 'safety' && renderSafety()}
                {activeSection === 'pricing' && renderPricing()}
            </div>

            {/* Footer */}
            <footer className="mt-12 text-center text-slate-400 text-sm pb-8 max-w-7xl mx-auto border-t border-slate-200 pt-8">
                <div className="flex justify-center gap-6 mb-4 sm:hidden">
                    <button onClick={() => setActiveSection('methodology')} className="text-slate-500">Methodology</button>
                    <button onClick={() => setActiveSection('safety')} className="text-slate-500">Safety</button>
                    <button onClick={() => setActiveSection('pricing')} className="text-slate-500">Pricing</button>
                </div>
                <p>© 2024 FunVoyage Inc. Made for curious minds.</p>
            </footer>
        </div>
    );
};
