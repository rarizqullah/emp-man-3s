/**
 * Log Monitor untuk tracking dan analisis penggunaan log
 * Membantu mengidentifikasi bottleneck dan optimize logging
 */

interface LogStats {
  totalLogs: number;
  logsByLevel: Record<string, number>;
  logsByEndpoint: Record<string, number>;
  largeLogsCount: number;
  throttledLogsCount: number;
  averageLogSize: number;
  lastResetTime: Date;
}

interface LogEntry {
  level: string;
  message: string;
  data?: any;
  timestamp: Date;
  size: number;
  endpoint?: string;
  throttled?: boolean;
}

class LogMonitor {
  private stats: LogStats = {
    totalLogs: 0,
    logsByLevel: {},
    logsByEndpoint: {},
    largeLogsCount: 0,
    throttledLogsCount: 0,
    averageLogSize: 0,
    lastResetTime: new Date()
  };

  private recentLogs: LogEntry[] = [];
  private readonly MAX_RECENT_LOGS = 100;
  private readonly LARGE_LOG_THRESHOLD = 1000; // 1KB

  /**
   * Record a log entry untuk analysis
   */
  recordLog(level: string, message: string, data?: any, endpoint?: string, throttled = false): void {
    const size = this.calculateLogSize(message, data);
    
    const logEntry: LogEntry = {
      level,
      message,
      data,
      timestamp: new Date(),
      size,
      endpoint,
      throttled
    };

    // Update statistics
    this.stats.totalLogs++;
    this.stats.logsByLevel[level] = (this.stats.logsByLevel[level] || 0) + 1;
    
    if (endpoint) {
      this.stats.logsByEndpoint[endpoint] = (this.stats.logsByEndpoint[endpoint] || 0) + 1;
    }
    
    if (size > this.LARGE_LOG_THRESHOLD) {
      this.stats.largeLogsCount++;
    }
    
    if (throttled) {
      this.stats.throttledLogsCount++;
    }

    // Update average size
    this.updateAverageLogSize(size);

    // Keep recent logs
    this.recentLogs.push(logEntry);
    if (this.recentLogs.length > this.MAX_RECENT_LOGS) {
      this.recentLogs.shift();
    }
  }

  /**
   * Calculate log size in bytes
   */
  private calculateLogSize(message: string, data?: any): number {
    let size = message.length;
    
    if (data) {
      try {
        size += JSON.stringify(data).length;
      } catch {
        size += String(data).length;
      }
    }
    
    return size;
  }

  /**
   * Update average log size
   */
  private updateAverageLogSize(newSize: number): void {
    const currentAverage = this.stats.averageLogSize;
    const totalLogs = this.stats.totalLogs;
    
    this.stats.averageLogSize = ((currentAverage * (totalLogs - 1)) + newSize) / totalLogs;
  }

  /**
   * Get current statistics
   */
  getStats(): LogStats {
    return { ...this.stats };
  }

  /**
   * Get recent logs for analysis
   */
  getRecentLogs(limit?: number): LogEntry[] {
    const logs = this.recentLogs.slice();
    return limit ? logs.slice(-limit) : logs;
  }

  /**
   * Get top endpoints by log volume
   */
  getTopEndpoints(limit = 10): Array<{ endpoint: string; count: number }> {
    return Object.entries(this.stats.logsByEndpoint)
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Get large logs for optimization
   */
  getLargeLogs(limit = 10): LogEntry[] {
    return this.recentLogs
      .filter(log => log.size > this.LARGE_LOG_THRESHOLD)
      .sort((a, b) => b.size - a.size)
      .slice(0, limit);
  }

  /**
   * Generate log optimization report
   */
  generateReport(): string {
    const stats = this.getStats();
    const topEndpoints = this.getTopEndpoints(5);
    const largeLogs = this.getLargeLogs(5);
    
    const report = `
📊 LOG OPTIMIZATION REPORT
========================

📈 Overall Statistics:
  • Total logs: ${stats.totalLogs.toLocaleString()}
  • Average log size: ${Math.round(stats.averageLogSize)} bytes
  • Large logs (>${this.LARGE_LOG_THRESHOLD}B): ${stats.largeLogsCount}
  • Throttled logs: ${stats.throttledLogsCount}
  • Time period: ${this.getTimePeriod()}

📊 Logs by Level:
${Object.entries(stats.logsByLevel)
  .map(([level, count]) => `  • ${level}: ${count} (${((count / stats.totalLogs) * 100).toFixed(1)}%)`)
  .join('\n')}

🔥 Top Endpoints by Log Volume:
${topEndpoints.map((item, i) => `  ${i + 1}. ${item.endpoint}: ${item.count} logs`).join('\n')}

🐘 Largest Recent Logs:
${largeLogs.map((log, i) => `  ${i + 1}. ${log.message.substring(0, 50)}... (${log.size}B)`).join('\n')}

💡 Optimization Suggestions:
${this.generateOptimizationSuggestions()}

🕒 Generated: ${new Date().toLocaleString()}
`;

    return report;
  }

  /**
   * Generate optimization suggestions
   */
  private generateOptimizationSuggestions(): string {
    const suggestions: string[] = [];
    const stats = this.getStats();
    
    if (stats.largeLogsCount > stats.totalLogs * 0.1) {
      suggestions.push('  • Consider implementing data truncation for large logs');
    }
    
    if (stats.throttledLogsCount < stats.totalLogs * 0.05) {
      suggestions.push('  • Log throttling could be more aggressive');
    }
    
    if (stats.averageLogSize > 500) {
      suggestions.push('  • Average log size is high, consider using log summaries');
    }
    
    if (stats.logsByLevel.debug > stats.totalLogs * 0.5) {
      suggestions.push('  • Too many debug logs, consider increasing log level in production');
    }
    
    const topEndpoint = this.getTopEndpoints(1)[0];
    if (topEndpoint && topEndpoint.count > stats.totalLogs * 0.3) {
      suggestions.push(`  • Endpoint ${topEndpoint.endpoint} generates excessive logs`);
    }
    
    if (suggestions.length === 0) {
      suggestions.push('  • Log usage appears optimal! 🎉');
    }
    
    return suggestions.join('\n');
  }

  /**
   * Get time period covered by stats
   */
  private getTimePeriod(): string {
    const now = new Date();
    const duration = now.getTime() - this.stats.lastResetTime.getTime();
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalLogs: 0,
      logsByLevel: {},
      logsByEndpoint: {},
      largeLogsCount: 0,
      throttledLogsCount: 0,
      averageLogSize: 0,
      lastResetTime: new Date()
    };
    
    this.recentLogs = [];
  }

  /**
   * Export stats to JSON
   */
  exportStats(): string {
    return JSON.stringify({
      stats: this.stats,
      recentLogs: this.recentLogs.slice(-20), // Last 20 logs
      topEndpoints: this.getTopEndpoints(),
      largeLogs: this.getLargeLogs(),
      report: this.generateReport()
    }, null, 2);
  }
}

// Global instance
export const logMonitor = new LogMonitor();

// Auto-generate report every 30 minutes in development (only in Node.js runtime)
if (typeof window === 'undefined' && typeof setInterval !== 'undefined' && process.env.NODE_ENV === 'development') {
  try {
    setInterval(() => {
      const stats = logMonitor.getStats();
      if (stats.totalLogs > 100) { // Only if we have meaningful data
        console.log('\n' + logMonitor.generateReport());
      }
    }, 30 * 60 * 1000); // 30 minutes
  } catch (error) {
    // Silently fail in Edge Runtime
  }
}

// Export types for external use
export type { LogStats, LogEntry }; 