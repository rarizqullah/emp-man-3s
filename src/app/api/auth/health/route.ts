import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  
  try {
    // Test Supabase connection
    const supabase = await createServerSupabaseClient();
    
    // Quick auth check
    const { data: { user }, error } = await Promise.race([
      supabase.auth.getUser(),
      new Promise<{ data: { user: null }, error: Error }>((_, reject) => 
        setTimeout(() => reject(new Error('Health check timeout')), 2000)
      )
    ]);
    
    const duration = Date.now() - startTime;
    
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      authDuration: duration,
      supabaseConnection: 'ok',
      hasActiveSession: !!user,
      environment: process.env.NODE_ENV,
      checks: {
        authCheck: duration < 1000 ? 'pass' : 'slow',
        timeout: duration < 2000 ? 'pass' : 'fail'
      }
    };

    return NextResponse.json(healthData, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Duration': duration.toString()
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    
    const errorData = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      authDuration: duration,
      error: error instanceof Error ? error.message : 'Unknown error',
      supabaseConnection: 'error',
      environment: process.env.NODE_ENV,
      checks: {
        authCheck: 'fail',
        timeout: duration >= 2000 ? 'timeout' : 'error'
      }
    };

    return NextResponse.json(errorData, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Duration': duration.toString()
      }
    });
  }
} 