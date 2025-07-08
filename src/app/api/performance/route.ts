import { NextResponse } from 'next/server';
import { performanceMonitor } from '@/lib/utils/performance-monitor';
import { apiCache } from '@/lib/utils/cache';

export async function GET() {
  try {
    const report = performanceMonitor.getPerformanceReport();
    const cacheStats = apiCache.getStats();
    const slowestEndpoints = performanceMonitor.getSlowestEndpoints(10);
    
    return NextResponse.json({
      report,
      cacheStats,
      slowestEndpoints,
      averageResponseTime: performanceMonitor.getAverageResponseTime(),
      cacheHitRate: performanceMonitor.getCacheHitRate(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting performance data:', error);
    return NextResponse.json(
      { error: 'Failed to get performance data' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    performanceMonitor.clearMetrics();
    apiCache.clear();
    
    return NextResponse.json({ 
      message: 'Performance metrics and cache cleared successfully' 
    });
  } catch (error) {
    console.error('Error clearing performance data:', error);
    return NextResponse.json(
      { error: 'Failed to clear performance data' },
      { status: 500 }
    );
  }
} 