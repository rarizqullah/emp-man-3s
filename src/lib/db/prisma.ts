import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// https://www.prisma.io/docs/guides/other/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Fungsi untuk membuat instance Prisma dengan penanganan error yang enhanced
function createPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    errorFormat: 'pretty',
    // Enhanced connection configuration
    datasources: {
      db: {
        url: process.env.DATABASE_URL || '',
      },
    },
  });

  // Enhanced middleware untuk connection handling
  client.$use(async (params, next) => {
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount <= maxRetries) {
      try {
        const result = await next(params);
        return result;
      } catch (error: any) {
        console.error(`Prisma operation failed (attempt ${retryCount + 1}/${maxRetries + 1}):`, error?.code || error?.message);
        
        // Check if it's a connection error that can be retried
        if (isRetryableConnectionError(error) && retryCount < maxRetries) {
          retryCount++;
          const waitTime = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
          
          console.log(`Retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          
          // Force disconnect and reconnect for connection errors
          if (error?.code === 'P1017') {
            try {
              await client.$disconnect();
              await new Promise(resolve => setTimeout(resolve, 1000));
              await client.$connect();
            } catch (reconnectError) {
              console.error('Reconnection failed:', reconnectError);
            }
          }
          
          continue;
        }
        
        throw error;
      }
    }
  });

  return client;
}

// Enhanced function to check retryable connection errors
function isRetryableConnectionError(error: any): boolean {
  if (!error) return false;
  
  // Check Prisma error codes
  if (error.code) {
    const retryableCodes = ['P1017', 'P1008', 'P1001', 'P1002'];
    if (retryableCodes.includes(error.code)) {
      return true;
    }
  }
  
  const errorMessage = String(error).toLowerCase();
  return (
    errorMessage.includes('connection') &&
    (errorMessage.includes('reset') || 
     errorMessage.includes('closed') || 
     errorMessage.includes('terminated') ||
     errorMessage.includes('timeout') ||
     errorMessage.includes('refused') ||
     errorMessage.includes('could not connect') ||
     errorMessage.includes('server has closed'))
  );
}

// Enhanced connection retry function
async function connectWithRetry(maxRetries = 3, baseDelay = 2000) {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      // Ensure fresh connection
      await prisma.$disconnect();
      await new Promise(resolve => setTimeout(resolve, 500));
      await prisma.$connect();
      
      // Test connection with simple query
      await prisma.$executeRaw`SELECT 1 as result`;
      console.log('✅ Database connection established successfully');
      return true;
    } catch (error: any) {
      retries++;
      console.error(`❌ Database connection failed (attempt ${retries}/${maxRetries}):`, error?.code || error?.message);
      
      if (retries >= maxRetries) {
        console.error('🚫 Max connection retries reached. Database unavailable.');
        return false;
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, retries - 1) + Math.random() * 1000;
      console.log(`⏳ Retrying connection in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return false;
}

// Create or get existing instance
export const prisma = globalForPrisma.prisma || createPrismaClient();

// Enhanced function to ensure database connection before operations
export async function ensureDatabaseConnection(): Promise<boolean> {
  try {
    // Quick connection test with timeout
    await Promise.race([
      prisma.$executeRaw`SELECT 1 as result`,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection test timeout')), 3000)
      )
    ]);
    
    return true;
  } catch (error: any) {
    console.error('⚠️ Database connection test failed:', error?.message);
    
    // If it's a connection error, try to reconnect
    if (isRetryableConnectionError(error)) {
      console.log('🔄 Attempting to restore database connection...');
      return await connectWithRetry();
    }
    
    return false;
  }
}

// Enhanced function for forced connection refresh
export async function refreshDatabaseConnection(): Promise<boolean> {
  try {
    console.log('🔄 Refreshing database connection...');
    await prisma.$disconnect();
    await new Promise(resolve => setTimeout(resolve, 1000));
    return await connectWithRetry();
  } catch (error) {
    console.error('❌ Failed to refresh database connection:', error);
    return false;
  }
}

// Graceful connection initialization
(async () => {
  try {
    const connected = await ensureDatabaseConnection();
    if (!connected) {
      console.warn('⚠️ Initial database connection failed, but application will continue');
    }
  } catch (error) {
    console.error('❌ Database initialization error:', error);
  }
})();

// Graceful shutdown handling
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    try {
      await prisma.$disconnect();
    } catch (error) {
      console.error('Error during database disconnect:', error);
    }
  });
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma; 