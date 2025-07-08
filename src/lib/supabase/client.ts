import { createBrowserClient } from '@supabase/ssr';

// Client untuk digunakan di sisi browser dengan enhanced cookie handling
export const supabaseClient = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
); 