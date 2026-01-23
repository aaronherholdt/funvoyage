// lib/supabase/admin.ts
// ⚠️ Server-only helper. Never import this in client components.

import { createClient } from '@supabase/supabase-js';
// If you have a generated Database type, import it:
// import type { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export function createAdminClient() {
  // If you have Database type, do:
  // return createClient<Database>(supabaseUrl, serviceRoleKey, { ... });
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
