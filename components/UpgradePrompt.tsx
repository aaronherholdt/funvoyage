import React from 'react';
import { Crown, Sparkles, X, Check } from 'lucide-react';
import { Button } from './Button';
import { UserTier } from '../types';
import { TIER_DISPLAY_NAMES, TIER_FEATURES } from '../constants';

interface UpgradePromptProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: UserTier;
  suggestedTier: UserTier;
  message: string;
  onUpgrade: (tier: UserTier) => void;
}

const TIER_PRICES: Record<UserTier, string> = {
  [UserTier.GUEST]: 'Free',
  [UserTier.FREE]: 'Free',
  [UserTier.STARTER]: '$4.99/mo',
  [UserTier.PRO]: '$9.99/mo',
  [UserTier.ADVENTURER]: '$19.99/mo',
};

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  isOpen,
  onClose,
  currentTier,
  suggestedTier,
  message,
  onUpgrade,
}) => {
  if (!isOpen) return null;

  const suggestedFeatures = TIER_FEATURES[suggestedTier];
  const currentFeatures = TIER_FEATURES[currentTier];

  const getFeatureComparison = () => {
    const features = [];

    if (suggestedFeatures.maxTrips > currentFeatures.maxTrips) {
      const period = suggestedFeatures.tripPeriod === 'daily' ? 'day' : 'month';
      features.push(`${suggestedFeatures.maxTrips} trips per ${period}`);
    }

    if (suggestedFeatures.maxChildren > currentFeatures.maxChildren) {
      features.push(
        suggestedFeatures.maxChildren > 10
          ? 'Unlimited children profiles'
          : `${suggestedFeatures.maxChildren} children profiles`
      );
    }

    if (suggestedFeatures.badges && !currentFeatures.badges) {
      features.push('Achievement badges');
    }

    if (suggestedFeatures.mediaSaving && !currentFeatures.mediaSaving) {
      features.push('Save drawings & photos');
    }

    if (suggestedFeatures.pdfReports && !currentFeatures.pdfReports) {
      features.push('PDF trip reports');
    }

    if (suggestedFeatures.prioritySupport && !currentFeatures.prioritySupport) {
      features.push('Priority support');
    }

    return features;
  };

  const features = getFeatureComparison();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors"
          >
            <X size={20} />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-full">
              <Crown size={24} />
            </div>
            <h2 className="text-xl font-bold">Unlock More Adventures!</h2>
          </div>
          <p className="text-white/90 text-sm">{message}</p>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-sand-500">Upgrade to</p>
              <p className="text-xl font-bold text-sand-800">
                {TIER_DISPLAY_NAMES[suggestedTier]}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-violet-600">
                {TIER_PRICES[suggestedTier]}
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-3 mb-6">
            {features.map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="p-1 bg-green-100 rounded-full">
                  <Check size={14} className="text-green-600" />
                </div>
                <span className="text-sand-700">{feature}</span>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3">
            <Button
              onClick={() => onUpgrade(suggestedTier)}
              className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg"
            >
              <Sparkles size={18} className="mr-2" />
              Upgrade Now
            </Button>
            <button
              onClick={onClose}
              className="w-full text-sm text-sand-500 hover:text-sand-700 py-2 transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
