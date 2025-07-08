import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseConfig } from './config';
import { classifySupabaseError } from './error-handler';

/**
 * Validate and create browser client
 */
const createValidatedBrowserClient = () => {
  try {
    const config = getSupabaseConfig();
    
    if (!config.isValid) {
      console.error('❌ Supabase configuration errors:', config.errors);
      throw new Error(`Supabase configuration invalid: ${config.errors.join(', ')}`);
    }
    
    return createBrowserClient(config.url, config.anonKey);
  } catch (error) {
    const errorInfo = classifySupabaseError(error);
    console.error('❌ Error creating Supabase browser client:', {
      type: errorInfo.type,
      message: errorInfo.message
    });
    throw error;
  }
};

// Client untuk digunakan di sisi browser dengan enhanced error handling
export const supabaseClient = createValidatedBrowserClient(); 