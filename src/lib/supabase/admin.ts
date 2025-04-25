import { createClient } from '@supabase/supabase-js';

/**
 * Client Supabase dengan service role key untuk operasi admin
 * Gunakan ini untuk operasi yang memerlukan akses administratif
 */
export const supabaseAdmin = () => {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase URL or Service Role Key is missing in environment variables');
    }

    return createClient(supabaseUrl, supabaseServiceKey);
  } catch (error) {
    console.error('Error creating Supabase admin client:', error);
    throw error;
  }
}; 