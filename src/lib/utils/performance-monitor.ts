import { logger } from './logger';
import { apiCache } from './cache';

interface PerformanceMetrics {
  endpoint: string;
  method: string;
  duration: number;
  cacheHit: boolean;
  timestamp: Date;
  memoryUsage?: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxMetrics = 1000; // Keep last 1000 metrics

  recordMetric(metric: PerformanceMetrics) {
    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log slow requests in development
    if (process.env.NODE_ENV === 'development' && metric.duration > 1000) {
      logger.warning(`Slow request detected: ${metric.method} ${metric.endpoint} took ${metric.duration}ms`);
    }
  }

  getMetrics(endpoint?: string): PerformanceMetrics[] {
    if (endpoint) {
      return this.metrics.filter(m => m.endpoint === endpoint);
    }
    return [...this.metrics];
  }

  getAverageResponseTime(endpoint?: string): number {
    const relevantMetrics = endpoint 
      ? this.metrics.filter(m => m.endpoint === endpoint)
      : this.metrics;

    if (relevantMetrics.length === 0) return 0;

    const total = relevantMetrics.reduce((sum, m) => sum + m.duration, 0);
    return Math.round(total / relevantMetrics.length);
  }

  getCacheHitRate(endpoint?: string): number {
    const relevantMetrics = endpoint 
      ? this.metrics.filter(m => m.endpoint === endpoint)
      : this.metrics;

    if (relevantMetrics.length === 0) return 0;

    const cacheHits = relevantMetrics.filter(m => m.cacheHit).length;
    return Math.round((cacheHits / relevantMetrics.length) * 100);
  }

  getSlowestEndpoints(limit: number = 5): Array<{endpoint: string, avgDuration: number}> {
    const endpointStats = new Map<string, {total: number, count: number}>();

    this.metrics.forEach(metric => {
      const key = `${metric.method} ${metric.endpoint}`;
      const existing = endpointStats.get(key) || {total: 0, count: 0};
      endpointStats.set(key, {
        total: existing.total + metric.duration,
        count: existing.count + 1
      });
    });

    return Array.from(endpointStats.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        avgDuration: Math.round(stats.total / stats.count)
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, limit);
  }

  getPerformanceReport(): string {
    const report = [
      '📊 Performance Report',
      '==================',
      `Total requests tracked: ${this.metrics.length}`,
      `Average response time: ${this.getAverageResponseTime()}ms`,
      `Cache hit rate: ${this.getCacheHitRate()}%`,
      '',
      '🐌 Slowest endpoints:',
      ...this.getSlowestEndpoints().map(e => `  ${e.endpoint}: ${e.avgDuration}ms`),
      '',
      '📈 Cache statistics:',
      `  Cache size: ${apiCache.getStats().size} items`,
      `  Cache max size: ${apiCache.getStats().maxSize} items`,
      '',
      `Report generated at: ${new Date().toISOString()}`
    ];

    return report.join('\n');
  }

  clearMetrics() {
    this.metrics = [];
    logger.info('Performance metrics cleared');
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Middleware wrapper for measuring API performance
export function withPerformanceMonitoring<T>(
  endpoint: string,
  method: string = 'GET'
) {
  return async function(operation: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;
    
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      const endMemory = process.memoryUsage().heapUsed;
      
      performanceMonitor.recordMetric({
        endpoint,
        method,
        duration,
        cacheHit: false, // Will be set by cache layer
        timestamp: new Date(),
        memoryUsage: endMemory - startMemory
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      performanceMonitor.recordMetric({
        endpoint,
        method,
        duration,
        cacheHit: false,
        timestamp: new Date(),
        memoryUsage: 0
      });

      throw error;
    }
  };
}

// Cache-aware performance tracking
export function recordCacheHit(endpoint: string, method: string = 'GET') {
  performanceMonitor.recordMetric({
    endpoint,
    method,
    duration: 0, // Cache hits are instant
    cacheHit: true,
    timestamp: new Date()
  });
}

// Performance debugging helpers
export const debugPerformance = {
  report: () => console.log(performanceMonitor.getPerformanceReport()),
  clear: () => performanceMonitor.clearMetrics(),
  metrics: (endpoint?: string) => performanceMonitor.getMetrics(endpoint),
  slowest: (limit?: number) => performanceMonitor.getSlowestEndpoints(limit)
}; 