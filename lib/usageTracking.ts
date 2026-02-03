// lib/usageTracking.ts
// Server-side usage tracking for AI cost protection

import { createAdminClient } from './supabase/admin';
import { createLogger } from './logger';

const log = createLogger({ component: 'usageTracking' });

export interface UsageRecord {
  userId: string;
  date: string;
  tripCount: number;
  lastDeviceFingerprint?: string;
}

export interface TouristUsageRecord {
  deviceFingerprint: string;
  ipHash: string;
  email?: string;
  tripUsed: boolean;
}

/**
 * Get or create usage record for a user on a specific date
 */
export async function getUserUsage(userId: string, date?: string): Promise<UsageRecord | null> {
  const supabase = createAdminClient();
  const targetDate = date || new Date().toISOString().split('T')[0];

  try {
    const { data, error } = await supabase
      .from('usage_tracking')
      .select('user_id, date, trip_count, last_device_fingerprint')
      .eq('user_id', userId)
      .eq('date', targetDate)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is fine
      log.error('Failed to get user usage', { userId }, error);
      return null;
    }

    if (!data) {
      return {
        userId,
        date: targetDate,
        tripCount: 0,
      };
    }

    return {
      userId: data.user_id,
      date: data.date,
      tripCount: data.trip_count,
      lastDeviceFingerprint: data.last_device_fingerprint,
    };
  } catch (err) {
    log.error('Unexpected error getting user usage', { userId }, err);
    return null;
  }
}

/**
 * Increment trip count for a user
 */
export async function incrementUserTrips(
  userId: string,
  deviceFingerprint?: string
): Promise<boolean> {
  const supabase = createAdminClient();
  const targetDate = new Date().toISOString().split('T')[0];

  try {
    const { error } = await supabase
      .from('usage_tracking')
      .upsert(
        {
          user_id: userId,
          date: targetDate,
          trip_count: 1,
          last_device_fingerprint: deviceFingerprint,
        },
        {
          onConflict: 'user_id,date',
        }
      )
      .select();

    if (error) {
      // If upsert failed, try incrementing existing row
      const { error: updateError } = await supabase.rpc('increment_trip_count', {
        p_user_id: userId,
        p_date: targetDate,
        p_fingerprint: deviceFingerprint,
      });

      if (updateError) {
        log.error('Failed to increment user trips', { userId }, updateError);
        return false;
      }
    }

    return true;
  } catch (err) {
    log.error('Unexpected error incrementing user trips', { userId }, err);
    return false;
  }
}

/**
 * Get monthly trip count for a user
 */
export async function getMonthlyTripCount(userId: string): Promise<number | null> {
  const supabase = createAdminClient();
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  try {
    const { data, error } = await supabase
      .from('usage_tracking')
      .select('trip_count')
      .eq('user_id', userId)
      .gte('date', firstDayOfMonth)
      .lte('date', lastDayOfMonth);

    if (error) {
      log.error('Failed to get monthly trip count', { userId }, error);
      return null;
    }

    return data?.reduce((sum, row) => sum + row.trip_count, 0) || 0;
  } catch (err) {
    log.error('Unexpected error getting monthly trip count', { userId }, err);
    return null;
  }
}

/**
 * Check if a tourist (unauthenticated user) has already used their free trip
 */
export async function checkTouristUsage(
  deviceFingerprint: string,
  ipHash: string
): Promise<TouristUsageRecord | null> {
  const supabase = createAdminClient();

  try {
    // Check by device fingerprint first (more reliable)
    const { data, error } = await supabase
      .from('tourist_usage')
      .select('device_fingerprint, ip_hash, email, trip_used')
      .eq('device_fingerprint', deviceFingerprint)
      .single();

    if (error && error.code !== 'PGRST116') {
      log.error('Failed to check tourist usage', { deviceFingerprint }, error);
      return null;
    }

    if (data) {
      return {
        deviceFingerprint: data.device_fingerprint,
        ipHash: data.ip_hash,
        email: data.email,
        tripUsed: data.trip_used,
      };
    }

    // Also check by IP hash (backup check)
    const { data: ipData, error: ipError } = await supabase
      .from('tourist_usage')
      .select('device_fingerprint, ip_hash, email, trip_used')
      .eq('ip_hash', ipHash)
      .eq('trip_used', true)
      .limit(1);

    if (ipError) {
      log.error('Failed to check tourist usage by IP', { ipHash }, ipError);
    }

    if (ipData && ipData.length > 0) {
      return {
        deviceFingerprint: ipData[0].device_fingerprint,
        ipHash: ipData[0].ip_hash,
        email: ipData[0].email,
        tripUsed: ipData[0].trip_used,
      };
    }

    return null;
  } catch (err) {
    log.error('Unexpected error checking tourist usage', { deviceFingerprint }, err);
    return null;
  }
}

/**
 * Mark a tourist's free trip as used
 */
export async function markTouristTripUsed(
  deviceFingerprint: string,
  ipHash: string,
  email?: string
): Promise<boolean> {
  const supabase = createAdminClient();

  try {
    const { error } = await supabase
      .from('tourist_usage')
      .upsert(
        {
          device_fingerprint: deviceFingerprint,
          ip_hash: ipHash,
          email,
          trip_used: true,
        },
        {
          onConflict: 'device_fingerprint',
        }
      );

    if (error) {
      log.error('Failed to mark tourist trip used', { deviceFingerprint }, error);
      return false;
    }

    return true;
  } catch (err) {
    log.error('Unexpected error marking tourist trip used', { deviceFingerprint }, err);
    return false;
  }
}

/**
 * Update tourist email (for saving trip data)
 */
export async function updateTouristEmail(
  deviceFingerprint: string,
  email: string
): Promise<boolean> {
  const supabase = createAdminClient();

  try {
    const { error } = await supabase
      .from('tourist_usage')
      .update({ email })
      .eq('device_fingerprint', deviceFingerprint);

    if (error) {
      log.error('Failed to update tourist email', { deviceFingerprint }, error);
      return false;
    }

    return true;
  } catch (err) {
    log.error('Unexpected error updating tourist email', { deviceFingerprint }, err);
    return false;
  }
}
