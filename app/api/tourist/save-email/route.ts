import { NextRequest, NextResponse } from 'next/server';
import { updateTouristEmail } from '@/lib/usageTracking';
import { createLogger } from '@/lib/logger';

const log = createLogger({ component: 'api/tourist/save-email' });

export async function POST(req: NextRequest) {
  try {
    const { deviceFingerprint, email } = await req.json();

    if (!deviceFingerprint || typeof deviceFingerprint !== 'string') {
      return NextResponse.json(
        { error: 'Device fingerprint required' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email required' },
        { status: 400 }
      );
    }

    const success = await updateTouristEmail(deviceFingerprint, email);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to save email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Email saved. We\'ll send your trip summary!',
    });
  } catch (err) {
    log.error('Tourist email save failed', undefined, err);
    return NextResponse.json(
      { success: false, error: 'Internal error' },
      { status: 500 }
    );
  }
}
