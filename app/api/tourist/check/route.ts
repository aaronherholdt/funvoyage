import { NextRequest, NextResponse } from 'next/server';
import { checkTouristUsage, markTouristTripUsed } from '@/lib/usageTracking';
import { createLogger } from '@/lib/logger';
import crypto from 'crypto';

const log = createLogger({ component: 'api/tourist/check' });

/**
 * Hash an IP address for privacy
 */
function hashIP(ip: string): string {
  return crypto.createHash('sha256').update(ip + process.env.IP_HASH_SALT || 'fv-salt').digest('hex');
}

/**
 * Get client IP from request
 */
function getClientIP(req: NextRequest): string {
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
  return 'unknown';
}

export async function POST(req: NextRequest) {
  try {
    const { deviceFingerprint, action } = await req.json();

    if (!deviceFingerprint || typeof deviceFingerprint !== 'string') {
      return NextResponse.json(
        { error: 'Device fingerprint required' },
        { status: 400 }
      );
    }

    const clientIP = getClientIP(req);
    const ipHash = hashIP(clientIP);

    // Check existing tourist usage
    const existingUsage = await checkTouristUsage(deviceFingerprint, ipHash);

    if (action === 'check') {
      // Just checking if they can use free trip
      if (existingUsage?.tripUsed) {
        return NextResponse.json({
          allowed: false,
          reason: 'free_trip_used',
          message: 'You\'ve already used your free trip. Create an account to continue exploring!',
        });
      }

      return NextResponse.json({
        allowed: true,
        message: 'Free trip available',
      });
    }

    if (action === 'use') {
      // Mark the free trip as used
      if (existingUsage?.tripUsed) {
        return NextResponse.json({
          success: false,
          error: 'Free trip already used',
        });
      }

      const success = await markTouristTripUsed(deviceFingerprint, ipHash);

      return NextResponse.json({
        success,
        message: success ? 'Free trip started' : 'Failed to record trip',
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "check" or "use".' },
      { status: 400 }
    );
  } catch (err) {
    log.error('Tourist check failed', undefined, err);
    // Fail open for check, fail closed for use
    return NextResponse.json({
      allowed: true,
      success: true,
      message: 'Unable to verify - proceeding',
    });
  }
}
