import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Client untuk digunakan di sisi browser
export const supabaseClient = createClientComponentClient(); 