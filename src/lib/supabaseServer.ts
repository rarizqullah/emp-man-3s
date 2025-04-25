import { createServerComponentClient, createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

// Client untuk digunakan di server components
export const supabaseServerComponent = async () => {
  const cookieStore = cookies();
  return createServerComponentClient({ cookies: () => cookieStore });
};

// Client untuk digunakan di API routes dengan await pada cookies
export const supabaseRouteHandler = async () => {
  try {
    const cookieStore = cookies();
    return createRouteHandlerClient({ cookies: () => cookieStore });
  } catch (error) {
    console.error('Error creating Supabase route handler client:', error);
    throw error;
  }
};

// Client dengan service role key untuk operasi admin
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