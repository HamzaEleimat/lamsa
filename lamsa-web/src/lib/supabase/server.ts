import { createClient } from '@supabase/supabase-js';

export async function createServerClient() {
  // For server-side, we can use the service key for admin operations
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

  return createClient(supabaseUrl, supabaseServiceKey);
}