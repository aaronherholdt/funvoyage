
import React from 'react';
import { ParentUser, UserTier, KidProfile, Session, Badge } from '../../types';
import { TIER_LIMITS, COUNTRIES, BADGES, getFlagEmoji } from '../../constants';
import { Button } from '../Button';
import { Map, Award, Calendar, Lock, CheckCircle, Crown } from 'lucide-react';

interface DashboardProps {
  user: ParentUser;
  onUpgrade: () => void;
  onViewPassport: (kidId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onUpgrade, onViewPassport }) => {
  const usedCountries = new Set(user.kids.flatMap(k => k.sessions.map(s => s.countryCode))).size;
  const limit = TIER_LIMITS[user.tier];
  const isUnlimited = user.tier === UserTier.ADVENTURER;
  const isPaid = user.tier === UserTier.PRO || user.tier === UserTier.ADVENTURER;
  const isLimitReached = !isUnlimited && usedCountries >= limit;

  const getTierColor = () => {
    switch (user.tier) {
      case UserTier.ADVENTURER: return 'text-orange-600';
      case UserTier.PRO: return 'text-teal-600';
      default: return 'text-slate-700';
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Family Dashboard</h1>
          <p className="text-slate-600">Welcome back, {user.name}</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-sm flex items-center gap-2">
            <span className="text-slate-500">Plan: </span>
            <span className={`font-bold flex items-center gap-1 ${getTierColor()}`}>
              {user.tier === UserTier.ADVENTURER && <Crown size={14} />}
              {user.tier.replace('_', ' ')}
            </span>
          </div>
          {user.tier !== UserTier.ADVENTURER && (
            <Button size="sm" variant="accent" onClick={onUpgrade}>
              Upgrade
            </Button>
          )}
        </div>
      </div>

      {/* Usage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-teal-600 to-teal-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/3 -translate-y-1/3">
             <Map size={120} />
          </div>
          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className="text-teal-100 text-sm font-medium uppercase tracking-wide">Trips Saved</p>
              <h3 className="text-3xl font-bold mt-1">{usedCountries} / {isUnlimited ? '∞' : limit}</h3>
            </div>
            <Map className="text-teal-200 opacity-50" size={32} />
          </div>
          <div className="mt-4 w-full bg-black/20 rounded-full h-2 relative z-10">
             <div 
               className="bg-white/90 h-2 rounded-full transition-all" 
               style={{ width: `${Math.min((usedCountries / (isUnlimited ? usedCountries + 10 : limit)) * 100, 100)}%` }} 
             />
          </div>
          {isLimitReached && (
            <p className="mt-2 text-xs bg-white/20 inline-block px-2 py-1 rounded text-white font-bold relative z-10">
              Limit reached. Upgrade to add more.
            </p>
          )}
        </div>
        
        {/* Badges Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
             <div className="flex items-center gap-3 mb-2">
                 <Award className="text-orange-500" size={24} />
                 <h3 className="font-bold text-slate-800">Recent Badges</h3>
             </div>
             
             {isPaid ? (
                <div className="space-y-2">
                   {user.kids.flatMap(k => k.badges).length > 0 ? (
                       user.kids.flatMap(k => k.badges).slice(0,3).map((badge, idx) => (
                           <div key={idx} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                               <span className="text-2xl">{badge.icon}</span>
                               <div>
                                   <p className="font-bold text-xs text-slate-800">{badge.name}</p>
                                   <p className="text-[10px] text-slate-500 uppercase tracking-wider">{badge.category}</p>
                               </div>
                           </div>
                       ))
                   ) : (
                       <p className="text-sm text-slate-500">No badges earned yet. Start reflecting!</p>
                   )}
                </div>
             ) : (
                <div className="text-center py-4">
                    <div className="filter blur-sm opacity-50 mb-2 space-y-2">
                        <div className="h-10 bg-slate-100 rounded-lg w-full"></div>
                        <div className="h-10 bg-slate-100 rounded-lg w-full"></div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
                         <div className="flex flex-col items-center">
                            <Lock className="text-slate-400 mb-1" size={20} />
                            <p className="text-xs font-bold text-slate-500">Pro Feature</p>
                         </div>
                    </div>
                </div>
             )}
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
             <h3 className="font-bold text-slate-800 mb-2">Next Destination?</h3>
             <Button variant="outline" size="sm">Browse Recommendations</Button>
             <span className="text-xs text-slate-400 mt-2">(Coming in Phase 2)</span>
        </div>
      </div>

      {/* Kids List */}
      <h2 className="text-xl font-bold text-slate-800 mb-4">Your Travelers</h2>
      <div className="grid grid-cols-1 gap-4">
        {user.kids.map(kid => (
          <div key={kid.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col md:flex-row items-start md:items-center gap-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
               <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-2xl border-2 border-indigo-200 text-indigo-600">
                 {kid.avatar}
               </div>
               <div>
                 <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg text-slate-900">{kid.name}</h3>
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">Age {kid.age}</span>
                 </div>
                 <p className="text-slate-500 text-sm">{kid.sessions.length} adventures recorded</p>
               </div>
            </div>
            
            <div className="flex-1 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
               <div className="flex gap-2">
                  {kid.sessions.map(session => {
                    return (
                      <div key={session.id} className="flex-shrink-0 bg-slate-50 border border-slate-100 rounded-lg p-2 w-48">
                         <div className="flex items-center gap-2 mb-1">
                           <span className="text-xl">{getFlagEmoji(session.countryCode)}</span>
                           <span className="font-bold text-sm text-slate-700 truncate">{session.countryName}</span>
                         </div>
                         <p className="text-xs text-slate-500 line-clamp-2">{session.analysis?.summary || "No summary yet."}</p>
                         <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
                            <Calendar size={10} />
                            {new Date(session.date).toLocaleDateString()}
                         </div>
                      </div>
                    )
                  })}
               </div>
            </div>

            <div className="flex gap-2 w-full md:w-auto">
               <Button onClick={() => onViewPassport(kid.id)}>
                 Open Passport
               </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
