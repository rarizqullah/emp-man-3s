import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './config';
import { classifySupabaseError } from './error-handler';

/**
 * Client Supabase dengan service role key untuk operasi admin
 * Gunakan ini untuk operasi yang memerlukan akses administratif
 */
export const supabaseAdmin = () => {
  try {
    const config = getSupabaseConfig();
    
    if (!config.isValid) {
      throw new Error(`Supabase configuration invalid: ${config.errors.join(', ')}`);
    }
    
    if (!config.serviceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing in environment variables');
    }

    return createClient(config.url, config.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  } catch (error) {
    const errorInfo = classifySupabaseError(error);
    console.error('❌ Error creating Supabase admin client:', {
      type: errorInfo.type,
      message: errorInfo.message
    });
    throw error;
  }
}; 