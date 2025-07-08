/**
 * Log Optimizer untuk mencegah log yang membengkak
 * Mengoptimalkan ukuran log dengan filtering, truncation, dan throttling
 */

import { logMonitor } from './log-monitor';

// Environment check
const isDev = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Log level configuration
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
const LOG_LEVEL = (process.env.LOG_LEVEL as LogLevel) || (isDev ? 'debug' : 'error');

// Log size limits
const MAX_LOG_STRING_LENGTH = 1000; // Max 1KB per log entry
const MAX_ARRAY_LOG_ITEMS = 5; // Max 5 items in array logs
const MAX_OBJECT_DEPTH = 3; // Max depth for object logs

// Throttling configuration
const logThrottleMap = new Map<string, { count: number; lastLogged: number }>();
const THROTTLE_WINDOW = 60000; // 1 minute
const MAX_LOGS_PER_WINDOW = 10;

/**
 * Check if logging is enabled for the given level
 */
function shouldLog(level: LogLevel): boolean {
  const levels = ['debug', 'info', 'warn', 'error'];
  const currentLevelIndex = levels.indexOf(LOG_LEVEL);
  const requestedLevelIndex = levels.indexOf(level);
  
  return requestedLevelIndex >= currentLevelIndex;
}

/**
 * Check if log should be throttled
 */
function shouldThrottle(key: string): boolean {
  const now = Date.now();
  const throttleData = logThrottleMap.get(key);
  
  if (!throttleData) {
    logThrottleMap.set(key, { count: 1, lastLogged: now });
    return false;
  }
  
  // Reset counter if window expired
  if (now - throttleData.lastLogged > THROTTLE_WINDOW) {
    logThrottleMap.set(key, { count: 1, lastLogged: now });
    return false;
  }
  
  // Check if over limit
  if (throttleData.count >= MAX_LOGS_PER_WINDOW) {
    return true;
  }
  
  // Increment counter
  throttleData.count++;
  return false;
}

/**
 * Safely stringify data with size limits
 */
function safeStringify(data: any, maxLength: number = MAX_LOG_STRING_LENGTH): string {
  if (data === null || data === undefined) {
    return String(data);
  }
  
  if (typeof data === 'string') {
    return data.length > maxLength ? data.substring(0, maxLength) + '...[truncated]' : data;
  }
  
  if (typeof data === 'object') {
    return truncateObject(data, maxLength);
  }
  
  const str = String(data);
  return str.length > maxLength ? str.substring(0, maxLength) + '...[truncated]' : str;
}

/**
 * Truncate object to prevent large logs
 */
function truncateObject(obj: any, maxLength: number = MAX_LOG_STRING_LENGTH): string {
  try {
    // Handle arrays specially
    if (Array.isArray(obj)) {
      const truncatedArray = obj.slice(0, MAX_ARRAY_LOG_ITEMS);
      const summary = {
        items: truncatedArray.map(item => 
          typeof item === 'object' && item !== null 
            ? `{${Object.keys(item).join(', ')}}` 
            : item
        ),
        totalCount: obj.length,
        truncated: obj.length > MAX_ARRAY_LOG_ITEMS
      };
      return JSON.stringify(summary);
    }
    
    // Handle objects with depth limit
    const truncated = truncateByDepth(obj, MAX_OBJECT_DEPTH);
    const str = JSON.stringify(truncated, null, 0);
    
    return str.length > maxLength 
      ? str.substring(0, maxLength) + '...[truncated]'
      : str;
      
  } catch (error) {
    return `[Circular reference or error: ${String(error)}]`;
  }
}

/**
 * Truncate object by depth
 */
function truncateByDepth(obj: any, maxDepth: number, currentDepth: number = 0): any {
  if (currentDepth >= maxDepth) {
    return '[Max depth reached]';
  }
  
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.slice(0, MAX_ARRAY_LOG_ITEMS).map(item => 
      truncateByDepth(item, maxDepth, currentDepth + 1)
    );
  }
  
  const truncated: any = {};
  const keys = Object.keys(obj).slice(0, 10); // Max 10 keys
  
  for (const key of keys) {
    // Skip large fields that shouldn't be logged
    if (key === 'faceData' || key === 'password' || key === 'token') {
      truncated[key] = '[Hidden for security/size]';
      continue;
    }
    
    truncated[key] = truncateByDepth(obj[key], maxDepth, currentDepth + 1);
  }
  
  if (Object.keys(obj).length > 10) {
    truncated['...'] = `${Object.keys(obj).length - 10} more fields`;
  }
  
  return truncated;
}

/**
 * Optimized logger with throttling and size limits
 */
export const optimizedLogger = {
  debug: (message: string, data?: any, endpoint?: string) => {
    if (!shouldLog('debug')) return;
    
    const key = `debug:${message}`;
    const isThrottled = shouldThrottle(key);
    
    // Record in monitor
    logMonitor.recordLog('debug', message, data, endpoint, isThrottled);
    
    if (isThrottled) return;
    
    if (data !== undefined) {
      console.debug(`🔍 ${message}`, safeStringify(data));
    } else {
      console.debug(`🔍 ${message}`);
    }
  },
  
  info: (message: string, data?: any, endpoint?: string) => {
    if (!shouldLog('info')) return;
    
    const key = `info:${message}`;
    const isThrottled = shouldThrottle(key);
    
    // Record in monitor
    logMonitor.recordLog('info', message, data, endpoint, isThrottled);
    
    if (isThrottled) return;
    
    if (data !== undefined) {
      console.info(`ℹ️ ${message}`, safeStringify(data));
    } else {
      console.info(`ℹ️ ${message}`);
    }
  },
  
  warn: (message: string, data?: any, endpoint?: string) => {
    if (!shouldLog('warn')) return;
    
    // Record in monitor (warnings are not throttled)
    logMonitor.recordLog('warn', message, data, endpoint, false);
    
    if (data !== undefined) {
      console.warn(`⚠️ ${message}`, safeStringify(data));
    } else {
      console.warn(`⚠️ ${message}`);
    }
  },
  
  error: (message: string, data?: any, endpoint?: string) => {
    if (!shouldLog('error')) return;
    
    // Record in monitor (errors are not throttled)
    logMonitor.recordLog('error', message, data, endpoint, false);
    
    if (data !== undefined) {
      console.error(`❌ ${message}`, safeStringify(data));
    } else {
      console.error(`❌ ${message}`);
    }
  },
  
  // Special method for API responses with automatic optimization
  apiResponse: (method: string, endpoint: string, data: any, duration?: number) => {
    if (!shouldLog('info')) return;
    
    const key = `api:${method}:${endpoint}`;
    if (shouldThrottle(key)) return;
    
    // Create summary for large responses
    let summary: any = data;
    
    if (Array.isArray(data)) {
      summary = {
        type: 'array',
        length: data.length,
        sample: data.slice(0, 3).map(item => 
          typeof item === 'object' && item.id 
            ? { id: item.id, type: item.constructor.name }
            : item
        )
      };
    } else if (data && typeof data === 'object' && data.data && Array.isArray(data.data)) {
      // Handle pagination response
      summary = {
        type: 'paginated',
        dataLength: data.data.length,
        pagination: data.pagination,
        sample: data.data.slice(0, 2).map((item: any) => 
          typeof item === 'object' && item.id 
            ? { id: item.id, employeeId: item.employeeId }
            : item
        )
      };
    }
    
    const logMessage = duration 
      ? `🔗 ${method} ${endpoint} (${duration}ms)`
      : `🔗 ${method} ${endpoint}`;
      
    console.info(logMessage, safeStringify(summary, 500));
  },
  
  // Method for database operations
  database: (operation: string, details?: any) => {
    if (!shouldLog('debug')) return;
    
    const key = `db:${operation}`;
    if (shouldThrottle(key)) return;
    
    if (details) {
      console.debug(`🗄️ DB ${operation}`, safeStringify(details, 300));
    } else {
      console.debug(`🗄️ DB ${operation}`);
    }
  },
  
  // Method for performance metrics
  performance: (operation: string, duration: number, details?: any) => {
    if (!shouldLog('info')) return;
    
    // Only log slow operations in production
    if (isProduction && duration < 1000) return;
    
    const message = `⏱️ ${operation} completed in ${duration}ms`;
    
    if (details) {
      console.info(message, safeStringify(details, 200));
    } else {
      console.info(message);
    }
  }
};

/**
 * Replace large object fields with summaries
 */
export function createDataSummary(data: any): any {
  if (!data) return data;
  
  if (Array.isArray(data)) {
    return {
      type: 'Array',
      length: data.length,
      firstItem: data[0] ? Object.keys(data[0]) : null
    };
  }
  
  if (typeof data === 'object') {
    const summary: any = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (key === 'faceData') {
        summary[key] = value ? '[Base64 Image Data]' : null;
      } else if (Array.isArray(value)) {
        summary[key] = { type: 'Array', length: value.length };
      } else if (typeof value === 'object' && value !== null) {
        summary[key] = { type: 'Object', keys: Object.keys(value) };
      } else {
        summary[key] = value;
      }
    }
    
    return summary;
  }
  
  return data;
}

/**
 * Clean up throttle map periodically (only in Node.js runtime)
 */
if (typeof window === 'undefined' && typeof setInterval !== 'undefined') {
  try {
    setInterval(() => {
      const now = Date.now();
      for (const [key, data] of logThrottleMap.entries()) {
        if (now - data.lastLogged > THROTTLE_WINDOW * 2) {
          logThrottleMap.delete(key);
        }
      }
    }, THROTTLE_WINDOW);
  } catch (error) {
    // Silently fail in Edge Runtime
  }
}

// Export level checker for conditional logging
export { shouldLog }; 