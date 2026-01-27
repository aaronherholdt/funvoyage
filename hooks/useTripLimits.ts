import { useState, useCallback } from 'react';
import { UserTier } from '../types';
import { getDeviceFingerprint } from '../lib/deviceFingerprint';

interface TripLimitStatus {
  allowed: boolean;
  currentUsage?: number;
  limit?: number;
  period?: string;
  remainingTrips?: number;
  message: string;
  upgrade?: {
    suggestedTier: UserTier;
    message: string;
  };
}

interface UseTripLimitsReturn {
  checkTripLimit: (isAuthenticated: boolean) => Promise<TripLimitStatus>;
  recordTripComplete: (isAuthenticated: boolean) => Promise<boolean>;
  isChecking: boolean;
}

export function useTripLimits(): UseTripLimitsReturn {
  const [isChecking, setIsChecking] = useState(false);

  const checkTripLimit = useCallback(async (isAuthenticated: boolean): Promise<TripLimitStatus> => {
    setIsChecking(true);

    try {
      if (isAuthenticated) {
        // Check authenticated user's trip limit
        const res = await fetch('/api/trips/check-limit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!res.ok) {
          return { allowed: true, message: 'Unable to verify limits' };
        }

        return await res.json();
      } else {
        // Check tourist trip limit via fingerprint
        const fingerprint = await getDeviceFingerprint();

        const res = await fetch('/api/tourist/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceFingerprint: fingerprint,
            action: 'check',
          }),
        });

        if (!res.ok) {
          return { allowed: true, message: 'Unable to verify' };
        }

        const data = await res.json();

        if (!data.allowed) {
          return {
            allowed: false,
            message: data.message || "You've used your free trip",
            upgrade: {
              suggestedTier: UserTier.STARTER,
              message: "You've already enjoyed your free trip! Create an account to continue exploring the world with your kids.",
            },
          };
        }

        return {
          allowed: true,
          remainingTrips: 1,
          message: 'Free trip available',
        };
      }
    } catch (err) {
      console.error('Trip limit check failed:', err);
      return { allowed: true, message: 'Proceeding offline' };
    } finally {
      setIsChecking(false);
    }
  }, []);

  const recordTripComplete = useCallback(async (isAuthenticated: boolean): Promise<boolean> => {
    try {
      const fingerprint = await getDeviceFingerprint();

      if (isAuthenticated) {
        const res = await fetch('/api/trips/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceFingerprint: fingerprint }),
        });

        return res.ok;
      } else {
        // Mark tourist trip as used
        const res = await fetch('/api/tourist/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceFingerprint: fingerprint,
            action: 'use',
          }),
        });

        return res.ok;
      }
    } catch (err) {
      console.error('Failed to record trip completion:', err);
      return false;
    }
  }, []);

  return {
    checkTripLimit,
    recordTripComplete,
    isChecking,
  };
}
