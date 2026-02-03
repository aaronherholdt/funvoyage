// lib/tripLimits.ts
// Server-side trip limit enforcement for tier-based usage

import { UserTier } from '@/types';
import { TRIP_LIMITS, TripLimitPeriod } from '@/constants';
import { getUserUsage, getMonthlyTripCount, incrementUserTrips } from './usageTracking';
import { createLogger } from './logger';

const log = createLogger({ component: 'tripLimits' });

export interface TripLimitResult {
  allowed: boolean;
  currentUsage: number;
  limit: number;
  period: TripLimitPeriod;
  remainingTrips: number;
  upgradeRequired?: boolean;
}

/**
 * Check if a user can start a new trip based on their tier limits
 */
export async function checkTripLimit(
  userId: string,
  tier: UserTier
): Promise<TripLimitResult> {
  const tierConfig = TRIP_LIMITS[tier];
  const { limit, period } = tierConfig;

  let currentUsage = 0;

  try {
    switch (period) {
      case 'daily': {
        const usage = await getUserUsage(userId);
        if (!usage) {
          throw new Error('Failed to load daily usage');
        }
        currentUsage = usage.tripCount;
        break;
      }
      case 'monthly': {
        const monthlyUsage = await getMonthlyTripCount(userId);
        if (monthlyUsage === null) {
          throw new Error('Failed to load monthly usage');
        }
        currentUsage = monthlyUsage;
        break;
      }
      case 'lifetime': {
        // For lifetime limits, we need to sum all usage ever
        // For simplicity, we use monthly count (assumes account created this month)
        // In production, you'd query total trips from all time
        const lifetimeUsage = await getMonthlyTripCount(userId);
        if (lifetimeUsage === null) {
          throw new Error('Failed to load lifetime usage');
        }
        currentUsage = lifetimeUsage;
        break;
      }
    }
  } catch (err) {
    log.error('Failed to check trip limit', { userId, tier }, err);
    throw err;
  }

  const allowed = currentUsage < limit;
  const remainingTrips = Math.max(0, limit - currentUsage);

  return {
    allowed,
    currentUsage,
    limit,
    period,
    remainingTrips,
    upgradeRequired: !allowed,
  };
}

/**
 * Record a trip completion and increment usage
 */
export async function recordTripCompletion(
  userId: string,
  deviceFingerprint?: string
): Promise<boolean> {
  return incrementUserTrips(userId, deviceFingerprint);
}

/**
 * Get user-friendly message for trip limit status
 */
export function getTripLimitMessage(result: TripLimitResult): string {
  if (result.allowed) {
    if (result.remainingTrips === 1) {
      return `This is your last trip for this ${result.period === 'daily' ? 'day' : 'month'}!`;
    }
    return `You have ${result.remainingTrips} trip${result.remainingTrips === 1 ? '' : 's'} remaining.`;
  }

  switch (result.period) {
    case 'daily':
      return "You've reached your daily trip limit. Trips reset at midnight!";
    case 'monthly':
      return "You've reached your monthly trip limit. Upgrade for more trips!";
    case 'lifetime':
      return "You've used your free trip. Sign up to continue exploring!";
  }
}

/**
 * Get upgrade suggestion based on current tier
 */
export function getUpgradeSuggestion(currentTier: UserTier): {
  suggestedTier: UserTier;
  message: string;
} {
  switch (currentTier) {
    case UserTier.GUEST:
    case UserTier.FREE:
      return {
        suggestedTier: UserTier.STARTER,
        message: 'Upgrade to Starter for 3 trips per month!',
      };
    case UserTier.STARTER:
      return {
        suggestedTier: UserTier.PRO,
        message: 'Upgrade to Explorer Pro for 10 trips per month and 3 kids!',
      };
    case UserTier.PRO:
      return {
        suggestedTier: UserTier.ADVENTURER,
        message: 'Upgrade to Adventurer for unlimited daily trips!',
      };
    case UserTier.ADVENTURER:
      return {
        suggestedTier: UserTier.ADVENTURER,
        message: "You're already on our best plan!",
      };
  }
}
