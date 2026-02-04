import { NextRequest, NextResponse } from 'next/server';
import { checkTouristUsage, completeTouristTrip, reserveTouristTrip } from '@/lib/usageTracking';
import { createLogger } from '@/lib/logger';
import crypto from 'crypto';

const log = createLogger({ component: 'api/tourist/check' });

const IP_HASH_SALT = process.env.IP_HASH_SALT;

const hashWithSalt = (value: string, salt: string): string =>
  crypto.createHash('sha256').update(value + salt).digest('hex');

/**
 * Get client IP from request
 */
function getClientIP(req: NextRequest): string | null {
  // Check various headers for the real IP
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { deviceFingerprint, action, sessionId } = await req.json();

    if (!deviceFingerprint || typeof deviceFingerprint !== 'string') {
      return NextResponse.json(
        { error: 'Device fingerprint required' },
        { status: 400 }
      );
    }

    if (!IP_HASH_SALT) {
      log.error('Missing IP_HASH_SALT');
      return NextResponse.json(
        { error: 'Server misconfigured' },
        { status: 500 }
      );
    }

    const clientIP = getClientIP(req);
    const ipHash = clientIP
      ? hashWithSalt(clientIP, IP_HASH_SALT)
      : hashWithSalt(deviceFingerprint, IP_HASH_SALT);

    // Check existing tourist usage
    const existingUsage = await checkTouristUsage(deviceFingerprint, ipHash);

    if (action === 'check' || !action) {
      // Just checking if they can use free trip
      if (existingUsage?.tripUsed || existingUsage?.tripCompleted) {
        return NextResponse.json({
          allowed: false,
          reason: 'free_trip_used',
          message: 'You\'ve already used your free trip. Create an account to continue exploring!',
        });
      }

      if (existingUsage?.tripStarted) {
        return NextResponse.json({
          allowed: false,
          reason: 'active_trip',
          message: 'You already have a trip in progress. Resume it to continue.',
          activeTrip: {
            sessionId: existingUsage.activeSessionId,
            startedAt: existingUsage.startedAt,
          },
        });
      }

      return NextResponse.json({
        allowed: true,
        message: 'Free trip available',
      });
    }

    if (action === 'start') {
      if (!sessionId || typeof sessionId !== 'string') {
        return NextResponse.json(
          { error: 'Session ID required to start trip' },
          { status: 400 }
        );
      }

      const reservation = await reserveTouristTrip(deviceFingerprint, ipHash, sessionId);

      if (!reservation.ok) {
        if (reservation.reason === 'free_trip_used') {
          return NextResponse.json({
            allowed: false,
            reason: 'free_trip_used',
            message: 'You\'ve already used your free trip. Create an account to continue exploring!',
          });
        }
        if (reservation.reason === 'active_trip') {
          return NextResponse.json({
            allowed: false,
            reason: 'active_trip',
            message: 'You already have a trip in progress. Resume it to continue.',
            activeTrip: {
              sessionId: reservation.record?.activeSessionId,
              startedAt: reservation.record?.startedAt,
            },
          });
        }
        return NextResponse.json(
          { allowed: false, error: 'Unable to start trip. Please try again.' },
          { status: 503 }
        );
      }

      return NextResponse.json({
        allowed: true,
        status: reservation.status,
        activeTrip: {
          sessionId: reservation.record?.activeSessionId || sessionId,
          startedAt: reservation.record?.startedAt,
        },
      });
    }

    if (action === 'complete' || action === 'use') {
      const completion = await completeTouristTrip(deviceFingerprint, ipHash, sessionId);

      if (!completion.ok) {
        return NextResponse.json(
          { success: false, error: completion.reason || 'Unable to complete trip' },
          { status: completion.reason === 'session_mismatch' ? 409 : 503 }
        );
      }

      return NextResponse.json({
        success: true,
        message: completion.alreadyCompleted ? 'Trip already completed' : 'Trip completed',
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "check", "start", or "complete".' },
      { status: 400 }
    );
  } catch (err) {
    log.error('Tourist check failed', undefined, err);
    return NextResponse.json(
      {
        allowed: false,
        success: false,
        error: 'Unable to verify usage. Please try again.',
      },
      { status: 503 }
    );
  }
}
