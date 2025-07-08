export const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  info: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.log(`ℹ️ ${message}`, ...args);
    }
  },
  
  success: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.log(`✅ ${message}`, ...args);
    }
  },
  
  warning: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.warn(`⚠️ ${message}`, ...args);
    }
  },
  
  error: (message: string, ...args: any[]) => {
    // Errors should always be logged
    console.error(`❌ ${message}`, ...args);
  },
  
  debug: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.log(`🔍 ${message}`, ...args);
    }
  },
  
  api: (method: string, endpoint: string, data?: any) => {
    if (isDevelopment) {
      console.log(`🔗 ${method} ${endpoint}`, data ? data : '');
    }
  },
  
  performance: (operation: string, duration: number) => {
    if (isDevelopment) {
      console.log(`⏱️ ${operation} completed in ${duration}ms`);
    }
  }
};

// Performance measurement utility
export const measurePerformance = async <T>(
  operation: string, 
  fn: () => Promise<T>
): Promise<T> => {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    logger.performance(operation, duration);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error(`${operation} failed after ${duration}ms`, error);
    throw error;
  }
}; 