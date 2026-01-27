import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkTripLimit, getTripLimitMessage, getUpgradeSuggestion } from '@/lib/tripLimits';
import { UserTier } from '@/types';
import { createLogger } from '@/lib/logger';

const log = createLogger({ component: 'api/trips/check-limit' });

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Guest user - check if they've used their free trip
      // This will be handled by tourist usage tracking
      return NextResponse.json({
        allowed: true, // Will be checked separately via tourist tracking
        tier: 'GUEST',
        message: 'Tourist mode - 1 free trip available',
      });
    }

    // Get user's tier from their profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('tier')
      .eq('id', user.id)
      .single();

    if (error) {
      log.error('Failed to fetch user profile', { userId: user.id }, error);
      // Default to FREE tier if profile not found
    }

    const tier = (profile?.tier as UserTier) || UserTier.FREE;
    const result = await checkTripLimit(user.id, tier);

    return NextResponse.json({
      allowed: result.allowed,
      currentUsage: result.currentUsage,
      limit: result.limit,
      period: result.period,
      remainingTrips: result.remainingTrips,
      message: getTripLimitMessage(result),
      upgrade: result.upgradeRequired ? getUpgradeSuggestion(tier) : undefined,
    });
  } catch (err) {
    log.error('Trip limit check failed', undefined, err);
    // Fail open - allow the trip
    return NextResponse.json({
      allowed: true,
      message: 'Unable to verify limits - proceeding',
    });
  }
}
