import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { recordTripCompletion } from '@/lib/tripLimits';
import { createLogger } from '@/lib/logger';

const log = createLogger({ component: 'api/trips/complete' });

export async function POST(req: NextRequest) {
  try {
    const { deviceFingerprint } = await req.json();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Guest user - handled by tourist tracking separately
      return NextResponse.json({
        success: true,
        message: 'Tourist trip recorded separately',
      });
    }

    const success = await recordTripCompletion(user.id, deviceFingerprint);

    if (!success) {
      log.error('Failed to record trip completion', { userId: user.id });
      return NextResponse.json(
        { success: false, error: 'Failed to record trip' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Trip recorded successfully',
    });
  } catch (err) {
    log.error('Trip completion recording failed', undefined, err);
    return NextResponse.json(
      { success: false, error: 'Internal error' },
      { status: 500 }
    );
  }
}
