import { PrismaClient } from '@prisma/client';

// Enhanced database connection configuration untuk production-ready performance
const createPrismaClient = () => {
  const connectionUrl = process.env.DATABASE_POOLING_URL || process.env.DATABASE_URL;
  
  // Add connection pool parameters to URL if not already present
  const url = new URL(connectionUrl!);
  if (!url.searchParams.has('pool_timeout')) {
    url.searchParams.set('pool_timeout', '20'); // Increased from 15 to 20 for more stability
  }
  if (!url.searchParams.has('connection_limit')) {
    url.searchParams.set('connection_limit', '12'); // Increased from 8 to 12 for higher concurrency
  }
  if (!url.searchParams.has('connect_timeout')) {
    url.searchParams.set('connect_timeout', '15'); // Increased from 10 to 15
  }
  
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    errorFormat: 'pretty',
    datasources: {
      db: {
        url: url.toString(),
      },
    },
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
          setTimeout(() => reject(new Error('Connection check timeout')), 12000) // Increased from 10s to 12s
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
      attendanceCount
    ] = await Promise.all([
      prisma.user.count(),
      prisma.employee.count(),
      prisma.attendance.count(),
      // Test connection
      prisma.$executeRaw`SELECT 1 as connection_test`.then(() => true).catch(() => false)
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
  maxRetries: number = 2, // Reduced dari 3 ke 2 untuk faster response
  timeoutMs: number = 12000 // Reduced dari 18000 ke 12000 (12s)
): Promise<T> => {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Optimized connection check - skip untuk speed jika connection pool sudah ada
      if (attempt === 1) {
        // Quick connection check hanya pada attempt pertama
        const connectionPromise = prisma.$executeRaw`SELECT 1`;
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Connection check timeout')), 3000) // Quick 3s check
        );
        
        try {
          await Promise.race([connectionPromise, timeoutPromise]);
        } catch {
          console.warn(`⚠️ Connection check failed on attempt ${attempt}, proceeding with query...`);
          // Don't fail here, proceed with query yang mungkin masih bisa sukses
        }
      }
      
      // Execute query with timeout - reduced timeout untuk faster failure detection
      const result = await Promise.race([
        queryFn(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
        )
      ]);
      
      // Success - log hanya jika ada retry sebelumnya
      if (attempt > 1) {
        console.log(`✅ Query succeeded on attempt ${attempt}`);
      }
      
      return result;
    } catch (error) {
      lastError = error as Error;
      
      // Check if error is retryable
      const isRetryable = isRetryableError(error as Error);
      
      if (!isRetryable || attempt >= maxRetries) {
        console.error(`❌ Query failed after ${attempt} attempts:`, lastError.message);
        throw error;
      }
      
      console.warn(`⚠️ Query attempt ${attempt}/${maxRetries} failed, retrying:`, lastError.message);
      
      // Reduced progressive backoff untuk faster retries
      const backoffMs = Math.min(500 * Math.pow(1.5, attempt - 1), 2000); // Faster backoff
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
  }).catch((error: Error) => {
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