import { NextRequest } from 'next/server';
import { ActivityLogger } from '@/lib/activity-logger';
import { getClientInfo } from '@/lib/utils/client-info';

// Cache untuk mencegah duplicate logging dalam waktu singkat
const sessionCache = new Map<string, number>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 menit

interface SessionUser {
  id: string;
  email?: string;
}

export class SessionActivityLogger {
  
  /**
   * Log successful session verification
   * DISABLED - We only want to log explicit logins, not session verifications
   */
  static async logSessionVerification(
    user: SessionUser, 
    req: NextRequest,
    source: 'middleware' | 'api' | 'client' = 'middleware'
  ) {
    try {
      // SKIP SESSION VERIFICATION LOGGING to prevent spam
      console.log(`🔕 Session verification for ${user.email || user.id} via ${source} - NOT LOGGED`);
      return; // Exit early without logging
      
      // Prevent duplicate logging for same user in short time period
      const cacheKey = `${user.id}_${source}`;
      const now = Date.now();
      const lastLogged = sessionCache.get(cacheKey);
      
      if (lastLogged && (now - lastLogged) < CACHE_DURATION) {
        return; // Skip logging if recently logged
      }
      
      // Update cache
      sessionCache.set(cacheKey, now);
      
      // COMMENTED OUT - Don't log session verifications
      // const { ipAddress, userAgent } = await getClientInfo(req);
      // await ActivityLogger.log({...});
      
    } catch (error) {
      console.error('❌ Error in session verification (logging disabled):', error);
    }
  }
  
  /**
   * Clean up old cache entries
   */
  static cleanupCache() {
    const now = Date.now();
    for (const [key, timestamp] of sessionCache.entries()) {
      if (now - timestamp > CACHE_DURATION) {
        sessionCache.delete(key);
      }
    }
  }
  
  /**
   * Log authentication failure from middleware
   * DISABLED - Only log explicit login failures, not session failures
   */
  static async logAuthFailure(
    req: NextRequest,
    reason: 'no_session' | 'invalid_token' | 'expired_session' | 'network_error',
    source: 'middleware' | 'api' = 'middleware'
  ) {
    try {
      // SKIP AUTH FAILURE LOGGING to prevent spam
      console.log(`🔕 Auth failure: ${reason} via ${source} - NOT LOGGED`);
      return; // Exit early without logging
      
      // COMMENTED OUT - Don't log session auth failures
      // const { ipAddress, userAgent } = await getClientInfo(req);
      // await ActivityLogger.log({...});
      
    } catch (error) {
      console.error('❌ Error in auth failure logging (disabled):', error);
    }
  }
  
  /**
   * Get cache statistics for monitoring
   */
  static getCacheStats() {
    this.cleanupCache(); // Clean up first
    return {
      size: sessionCache.size,
      entries: Array.from(sessionCache.entries()).map(([key, timestamp]) => ({
        key,
        timestamp,
        age: Date.now() - timestamp
      }))
    };
  }
}

// Auto cleanup every 15 minutes
setInterval(() => {
  SessionActivityLogger.cleanupCache();
}, 15 * 60 * 1000);
