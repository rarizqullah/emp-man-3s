import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseStats, getConnectionPoolStats, ensureDatabaseConnection } from '@/lib/db/connection';

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();
    
    // Test database connection
    const isDbHealthy = await ensureDatabaseConnection();
    
    // Get database statistics
    const [dbStats, poolStats] = await Promise.all([
      getDatabaseStats(),
      getConnectionPoolStats()
    ]);
    
    const totalResponseTime = Date.now() - startTime;
    
    // Basic system metrics
    const systemMetrics = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    };
    
    const healthStatus = {
      overall: isDbHealthy ? 'healthy' : 'unhealthy',
      database: isDbHealthy,
      responseTime: `${totalResponseTime}ms`,
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json({
      status: 'success',
      health: healthStatus,
      database: dbStats,
      connectionPool: poolStats,
      system: systemMetrics,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasPoolingUrl: !!process.env.DATABASE_POOLING_URL,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
      }
    });
    
  } catch (error) {
    console.error('Error getting auth metrics:', error);
    
    return NextResponse.json({
      status: 'error',
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 