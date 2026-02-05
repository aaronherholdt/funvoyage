
import React from 'react';
import { ParentUser, UserTier, KidProfile, Session, Badge } from '../../types';
import { TIER_LIMITS, TIER_CHILD_LIMITS, BADGES, getFlagEmoji } from '../../constants';
import { Button } from '../Button';
import { Map, Award, Calendar, Lock, CheckCircle, Crown, LogOut, Plus, Users, Compass } from 'lucide-react';

interface DashboardProps {
  user: ParentUser;
  onUpgrade: () => void;
  onViewPassport: (kidId: string) => void;
  onLogout: () => void;
  onAddChild: () => void;
  onEditChild?: (kid: KidProfile) => void;
  onRemoveChild?: (kidId: string) => void;
  onAddTrip?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onUpgrade, onViewPassport, onLogout, onAddChild, onEditChild, onRemoveChild, onAddTrip }) => {
  const totalTripsUsed = user.kids.reduce((sum, kid) => sum + kid.sessions.length, 0);
  const countTripsThisMonth = () => {
    const now = new Date();
    return user.kids.reduce((sum, kid) => {
      const monthlyTrips = kid.sessions.filter(session => {
        const date = new Date(session.date);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }).length;
      return sum + monthlyTrips;
    }, 0);
  };

  const tripsUsed = user.tier === UserTier.STARTER ? countTripsThisMonth() : totalTripsUsed;
  const limit = TIER_LIMITS[user.tier];
  const isUnlimited = user.tier === UserTier.ADVENTURER;
  const isPaid = user.tier === UserTier.PRO || user.tier === UserTier.ADVENTURER;
  const isGuestUser = !user.email || user.tier === UserTier.GUEST;
  const isLimitReached = !isUnlimited && tripsUsed >= limit;
  const freeLimit = TIER_LIMITS[UserTier.FREE];
  const showUpgradeCta = user.tier !== UserTier.ADVENTURER && (
    user.tier === UserTier.PRO ||
    user.tier === UserTier.STARTER ||
    totalTripsUsed >= freeLimit
  );
  const tripsLabel = user.tier === UserTier.STARTER ? 'Trips Saved (this month)' : 'Trips Saved';
  const stampedTrips = user.kids.reduce(
    (sum, kid) => sum + kid.sessions.filter(session => session.analysisStatus === 'complete' || !!session.analysis).length,
    0
  );
  const pendingTrips = Math.max(0, totalTripsUsed - stampedTrips);
  
  // Child limits
  const childLimit = TIER_CHILD_LIMITS[user.tier];
  const isChildLimitUnlimited = childLimit >= 9999;
  const isChildLimitReached = !isChildLimitUnlimited && user.kids.length >= childLimit;

  const getTierColor = () => {
    switch (user.tier) {
      case UserTier.ADVENTURER: return 'text-orange-600';
      case UserTier.PRO: return 'text-teal-600';
      case UserTier.STARTER: return 'text-slate-700';
      default: return 'text-slate-700';
    }
  };

  return (
    <div className="p-4 md:p-6 px-safe pb-safe max-w-5xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Family Dashboard</h1>
          <p className="text-slate-600">Welcome back, {user.name}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-sm flex items-center gap-2">
              <span className="text-slate-500">Plan: </span>
              <span className={`font-bold flex items-center gap-1 ${getTierColor()}`}>
                {user.tier === UserTier.ADVENTURER && <Crown size={14} />}
                {user.tier.replace('_', ' ')}
              </span>
            </div>
            {showUpgradeCta && (
              <Button size="sm" variant="accent" onClick={onUpgrade}>
                Upgrade
              </Button>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onLogout} className="text-slate-600 hover:text-slate-900">
            <LogOut size={16} className="mr-2" /> Log out
          </Button>
        </div>
      </div>

      {/* Usage Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
        <div className="bg-gradient-to-br from-teal-600 to-teal-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/3 -translate-y-1/3">
             <Map size={120} />
          </div>
          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className="text-teal-100 text-sm font-medium uppercase tracking-wide">{tripsLabel}</p>
              <h3 className="text-3xl font-bold mt-1">{tripsUsed} / {isUnlimited ? 'Unlimited' : limit}</h3>
            </div>
            <Map className="text-teal-200 opacity-50" size={32} />
          </div>
          <div className="mt-4 w-full bg-black/20 rounded-full h-2 relative z-10">
             <div 
               className="bg-white/90 h-2 rounded-full transition-all" 
               style={{ width: `${isUnlimited ? 100 : Math.min((tripsUsed / limit) * 100, 100)}%` }} 
             />
          </div>
          {isLimitReached && (
            <p className="mt-2 text-xs bg-white/20 inline-block px-2 py-1 rounded text-white font-bold relative z-10">
              Limit reached. Upgrade to add more.
            </p>
          )}
        </div>
        
        {/* Badges or Passport Status */}
        {isGuestUser ? (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="text-emerald-500" size={24} />
              <h3 className="font-bold text-slate-800">Passport Status</h3>
            </div>
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>Visa stamped</span>
                <span className="font-semibold text-slate-900">{stampedTrips}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Pending analysis</span>
                <span className="font-semibold text-amber-600">{pendingTrips}</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">Stamps appear after analysis completes.</p>
            </div>
          </div>
        ) : (
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
        )}

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
             <h3 className="font-bold text-slate-800 mb-2">Next Destination?</h3>
             <Button variant="outline" size="sm">Browse Recommendations</Button>
             <span className="text-xs text-slate-400 mt-2">(Coming in Phase 2)</span>
        </div>
      </div>

      {/* Kids List */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users size={20} className="text-slate-400" />
            Your Travelers
          </h2>
          <p className="text-sm text-slate-500">
            {user.kids.length} of {isChildLimitUnlimited ? 'Unlimited' : childLimit} profile{childLimit !== 1 ? 's' : ''}
          </p>
        </div>
        <Button 
          onClick={isChildLimitReached ? onUpgrade : onAddChild}
          variant={isChildLimitReached ? "outline" : "primary"}
          size="sm"
        >
          {isChildLimitReached ? (
            <>
              <Lock size={16} className="mr-2" /> Upgrade to Add More
            </>
          ) : (
            <>
              <Plus size={16} className="mr-2" /> Add Child
            </>
          )}
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {user.kids.map(kid => (
          <div key={kid.id} className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 shadow-sm hover:shadow-md transition-shadow">
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
            
            <div className="flex-1 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scroll-touch">
               <div className="flex gap-3">
                  {kid.sessions.map(session => {
                    return (
                      <div key={session.id} className="flex-shrink-0 bg-slate-50 border border-slate-100 rounded-lg p-2 w-48">
                         <div className="flex items-center gap-2 mb-1">
                           <span className="text-xl">{getFlagEmoji(session.countryCode)}</span>
                           <span className="font-bold text-sm text-slate-700 truncate">{session.countryName}</span>
                         </div>
                         <p className="text-xs text-slate-500 line-clamp-2">
                           {session.analysisStatus === 'pending'
                             ? 'Analysis pending - retry from the trip report.'
                             : (session.analysis?.summary || 'No summary yet.')}
                         </p>
                         <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
                            <Calendar size={10} />
                            {new Date(session.date).toLocaleDateString()}
                         </div>
                      </div>
                    )
                  })}
               </div>
            </div>

            <div className="flex flex-wrap gap-2 w-full md:w-auto">
               {kid.sessions.length === 0 && onAddTrip ? (
                 <Button variant="primary" onClick={onAddTrip}>
                   <Compass size={16} className="mr-2" /> Start New Adventure
                 </Button>
               ) : (
                 <>
                   <Button onClick={() => onViewPassport(kid.id)}>
                     Open Passport
                   </Button>
                   {onAddTrip && (
                     <Button variant="outline" onClick={onAddTrip}>
                       <Compass size={16} className="mr-2" /> New Trip
                     </Button>
                   )}
                 </>
               )}
               {onEditChild && (
                 <Button variant="ghost" size="sm" onClick={() => onEditChild(kid)} className="text-slate-400 hover:text-slate-600">
                   Edit
                 </Button>
               )}
               {onRemoveChild && user.kids.length > 1 && (
                 <Button variant="ghost" size="sm" onClick={() => onRemoveChild(kid.id)} className="text-red-400 hover:text-red-600">
                   Remove
                 </Button>
               )}
            </div>
          </div>
        ))}
        
        {/* Empty state if no kids */}
        {user.kids.length === 0 && (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users size={32} className="text-slate-400" />
            </div>
            <h3 className="font-bold text-slate-700 mb-2">No travelers yet</h3>
            <p className="text-slate-500 text-sm mb-4">Add your first child to start their travel journey!</p>
            <Button onClick={onAddChild}>
              <Plus size={16} className="mr-2" /> Add Your First Traveler
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
