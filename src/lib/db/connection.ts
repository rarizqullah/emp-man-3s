import { PrismaClient } from '@prisma/client';

// Enhanced database connection configuration untuk production-ready performance
const createPrismaClient = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    errorFormat: 'pretty',
    datasources: {
      db: {
        url: process.env.DATABASE_POOLING_URL || process.env.DATABASE_URL,
      },
    },
    // Enhanced configuration for better performance - commented out for compatibility
    // __internal: {
    //   engine: {
    //     // Connection pool configuration
    //     pool_timeout: 30, // 30 seconds pool timeout
    //     connection_limit: 20, // Max 20 connections
    //     // Query timeout
    //     query_timeout: 60, // 60 seconds query timeout
    //   },
    // },
  });
};

// Global singleton pattern for Prisma client
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Only create new instance in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Enhanced connection monitoring dengan retry mechanism
export const ensureDatabaseConnection = async (maxRetries: number = 3): Promise<boolean> => {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Test connection dengan timeout
      await Promise.race([
        prisma.$executeRaw`SELECT 1`,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection check timeout')), 10000)
        )
      ]);
      
      if (attempt > 1) {
        console.log(`✅ Database connection restored on attempt ${attempt}`);
      }
      
      return true;
    } catch (error) {
      lastError = error as Error;
      console.warn(`⚠️ Database connection attempt ${attempt}/${maxRetries} failed:`, error);
      
      if (attempt < maxRetries) {
        // Progressive backoff
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`🔄 Retrying database connection in ${backoffMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        
        // Try to disconnect and reconnect
        try {
          await prisma.$disconnect();
        } catch (disconnectError) {
          console.warn('Warning during disconnect:', disconnectError);
        }
      }
    }
  }
  
  console.error('❌ Database connection failed after all retries:', lastError);
  return false;
};

// Legacy health check for backward compatibility
export const checkDatabaseHealth = async (): Promise<boolean> => {
  return ensureDatabaseConnection(1);
};

// Enhanced graceful shutdown dengan connection cleanup
let disconnectInProgress = false;
let disconnectNotified = false;

export const disconnectDatabase = async (): Promise<void> => {
  try {
    // Prevent multiple disconnection attempts and excessive logging
    if (disconnectInProgress) return;
    disconnectInProgress = true;
    
    // Only log first disconnect attempt
    if (!disconnectNotified) {
      console.log('🔄 Disconnecting from database...');
      disconnectNotified = true;
    }
    
    // Set timeout untuk disconnect
    await Promise.race([
      prisma.$disconnect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Disconnect timeout')), 10000)
      )
    ]);
    
    // Only log success once
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Database disconnected successfully');
    }
  } catch (error) {
    console.error('❌ Error disconnecting from database:', error);
  } finally {
    disconnectInProgress = false;
  }
};

// Enhanced performance monitoring dengan connection pool stats
export const getDatabaseStats = async () => {
  try {
    const startTime = Date.now();
    
    const [
      userCount,
      employeeCount,
      attendanceCount,
      connectionTest
    ] = await Promise.all([
      prisma.user.count(),
      prisma.employee.count(),
      prisma.attendance.count(),
      prisma.$executeRaw`SELECT 1 as connection_test`
    ]);

    const queryDuration = Date.now() - startTime;

    return {
      users: userCount,
      employees: employeeCount,
      attendances: attendanceCount,
      queryDuration: `${queryDuration}ms`,
      connectionStatus: 'healthy',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting database stats:', error);
    return {
      connectionStatus: 'error',
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    };
  }
};

// Connection pool monitoring
export const getConnectionPoolStats = async () => {
  try {
    // This is a simple connection test
    const startTime = Date.now();
    await prisma.$executeRaw`SELECT 1`;
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'active',
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'error',
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    };
  }
};

// Safe query wrapper dengan retry mechanism
export const safeQuery = async <T>(
  queryFn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> => {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Ensure connection is healthy
      if (!(await ensureDatabaseConnection())) {
        throw new Error('Database connection not available');
      }
      
      // Execute query with timeout
      const result = await Promise.race([
        queryFn(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), 30000)
        )
      ]);
      
      return result;
    } catch (error) {
      lastError = error as Error;
      
      // Check if error is retryable
      const isRetryable = isRetryableError(error as Error);
      
      if (!isRetryable || attempt >= maxRetries) {
        throw error;
      }
      
      console.warn(`⚠️ Query attempt ${attempt}/${maxRetries} failed, retrying:`, error);
      
      // Progressive backoff
      const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }
  
  throw lastError;
};

// Helper untuk determine retryable errors
function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  
  // Prisma connection errors that are retryable
  const retryableErrors = [
    'p1017', // Server has closed the connection
    'p1008', // Operations timed out
    'p1001', // Can't reach database server
    'p1002', // Database server not reachable
    'connection', // General connection errors
    'timeout', // Timeout errors
    'econnreset', // Connection reset
    'enotfound', // DNS resolution issues
  ];
  
  return retryableErrors.some(errorType => message.includes(errorType));
}

// Enhanced connection optimization untuk production
if (process.env.NODE_ENV === 'production') {
  // Set connection pool dengan enhanced monitoring
  prisma.$connect().then(async () => {
    console.log('✅ Database connected with optimized pool');
    
    // Test initial connection
    const isHealthy = await ensureDatabaseConnection();
    if (isHealthy) {
      console.log('✅ Database health check passed');
    } else {
      console.error('❌ Database health check failed');
    }
  }).catch((error) => {
    console.error('❌ Database connection failed:', error);
  });
}

// Cleanup pada process termination
process.on('beforeExit', async () => {
  await disconnectDatabase();
});

process.on('SIGINT', async () => {
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDatabase();
  process.exit(0);
});

export default prisma; 