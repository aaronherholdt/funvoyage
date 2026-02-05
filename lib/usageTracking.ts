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
  tripStarted: boolean;
  tripCompleted: boolean;
  startedAt?: string | null;
  completedAt?: string | null;
  activeSessionId?: string | null;
}

export interface TouristTripReservation {
  ok: boolean;
  status?: 'started' | 'resumed';
  reason?: 'free_trip_used' | 'active_trip' | 'error';
  record?: TouristUsageRecord | null;
}

export interface TouristTripCompletion {
  ok: boolean;
  alreadyCompleted?: boolean;
  reason?: 'session_mismatch' | 'error';
  record?: TouristUsageRecord | null;
}

const GUEST_TRIP_EXPIRATION_HOURS = 12;
const GUEST_TRIP_EXPIRATION_MS = GUEST_TRIP_EXPIRATION_HOURS * 60 * 60 * 1000;

const isTripExpired = (record: TouristUsageRecord): boolean => {
  if (!record.tripStarted || record.tripCompleted || !record.startedAt) return false;
  const startedAtMs = new Date(record.startedAt).getTime();
  if (!Number.isFinite(startedAtMs)) return false;
  return Date.now() - startedAtMs > GUEST_TRIP_EXPIRATION_MS;
};

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
      .select('device_fingerprint, ip_hash, email, trip_used, trip_started, trip_completed, started_at, completed_at, active_session_id')
      .eq('device_fingerprint', deviceFingerprint)
      .single();

    if (error && error.code !== 'PGRST116') {
      log.error('Failed to check tourist usage', { deviceFingerprint }, error);
      return null;
    }

    if (data) {
      const record: TouristUsageRecord = {
        deviceFingerprint: data.device_fingerprint,
        ipHash: data.ip_hash,
        email: data.email,
        tripUsed: data.trip_used,
        tripStarted: data.trip_started ?? false,
        tripCompleted: data.trip_completed ?? data.trip_used ?? false,
        startedAt: data.started_at,
        completedAt: data.completed_at,
        activeSessionId: data.active_session_id,
      };
      if (isTripExpired(record)) {
        const { error: expireError } = await supabase
          .from('tourist_usage')
          .update({
            trip_started: false,
            started_at: null,
            active_session_id: null,
          })
          .eq('device_fingerprint', deviceFingerprint);

        if (expireError) {
          log.error('Failed to expire tourist trip', { deviceFingerprint }, expireError);
        }

        return {
          ...record,
          tripStarted: false,
          startedAt: null,
          activeSessionId: null,
        };
      }

      return record;
    }

    // Also check by IP hash (backup check)
    const { data: ipData, error: ipError } = await supabase
      .from('tourist_usage')
      .select('device_fingerprint, ip_hash, email, trip_used, trip_started, trip_completed, started_at, completed_at, active_session_id')
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
        tripStarted: ipData[0].trip_started ?? false,
        tripCompleted: ipData[0].trip_completed ?? ipData[0].trip_used ?? false,
        startedAt: ipData[0].started_at,
        completedAt: ipData[0].completed_at,
        activeSessionId: ipData[0].active_session_id,
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
          trip_started: false,
          trip_completed: true,
          completed_at: new Date().toISOString(),
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
 * Reserve a guest trip after location selection
 */
export async function reserveTouristTrip(
  deviceFingerprint: string,
  ipHash: string,
  sessionId: string,
  email?: string
): Promise<TouristTripReservation> {
  const supabase = createAdminClient();

  try {
    const existing = await checkTouristUsage(deviceFingerprint, ipHash);

    if (existing?.tripUsed || existing?.tripCompleted) {
      return { ok: false, reason: 'free_trip_used', record: existing };
    }

    if (existing?.tripStarted) {
      if (existing.activeSessionId === sessionId) {
        return { ok: true, status: 'resumed', record: existing };
      }
      return { ok: false, reason: 'active_trip', record: existing };
    }

    const startedAt = new Date().toISOString();
    const { error } = await supabase
      .from('tourist_usage')
      .upsert(
        {
          device_fingerprint: deviceFingerprint,
          ip_hash: ipHash,
          email,
          trip_used: false,
          trip_started: true,
          trip_completed: false,
          started_at: startedAt,
          active_session_id: sessionId,
        },
        {
          onConflict: 'device_fingerprint',
        }
      );

    if (error) {
      log.error('Failed to reserve tourist trip', { deviceFingerprint }, error);
      return { ok: false, reason: 'error', record: existing };
    }

    return {
      ok: true,
      status: 'started',
      record: {
        deviceFingerprint,
        ipHash,
        email,
        tripUsed: false,
        tripStarted: true,
        tripCompleted: false,
        startedAt,
        completedAt: null,
        activeSessionId: sessionId,
      },
    };
  } catch (err) {
    log.error('Unexpected error reserving tourist trip', { deviceFingerprint }, err);
    return { ok: false, reason: 'error', record: null };
  }
}

/**
 * Complete a guest trip after analysis succeeds
 */
export async function completeTouristTrip(
  deviceFingerprint: string,
  ipHash: string,
  sessionId?: string
): Promise<TouristTripCompletion> {
  const supabase = createAdminClient();

  try {
    const existing = await checkTouristUsage(deviceFingerprint, ipHash);

    if (existing?.tripCompleted || existing?.tripUsed) {
      return { ok: true, alreadyCompleted: true, record: existing };
    }

    if (
      sessionId &&
      existing?.activeSessionId &&
      existing.activeSessionId !== sessionId
    ) {
      return { ok: false, reason: 'session_mismatch', record: existing };
    }

    const completedAt = new Date().toISOString();
    const { error } = await supabase
      .from('tourist_usage')
      .upsert(
        {
          device_fingerprint: deviceFingerprint,
          ip_hash: ipHash,
          trip_used: true,
          trip_started: false,
          trip_completed: true,
          completed_at: completedAt,
          active_session_id: null,
        },
        {
          onConflict: 'device_fingerprint',
        }
      );

    if (error) {
      log.error('Failed to complete tourist trip', { deviceFingerprint }, error);
      return { ok: false, reason: 'error', record: existing };
    }

    return { ok: true, record: existing };
  } catch (err) {
    log.error('Unexpected error completing tourist trip', { deviceFingerprint }, err);
    return { ok: false, reason: 'error', record: null };
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
