import { NextRequest, NextResponse } from 'next/server';
import { logMonitor } from '@/lib/utils/log-monitor';
import { optimizedLogger } from '@/lib/utils/log-optimizer';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'json'; // json, report, export
    const action = url.searchParams.get('action'); // reset, export
    
    // Handle actions
    if (action === 'reset') {
      logMonitor.resetStats();
      optimizedLogger.info('Log statistics reset', undefined, '/api/debug/log-stats');
      
      return NextResponse.json({
        success: true,
        message: 'Log statistics have been reset',
        timestamp: new Date().toISOString()
      });
    }
    
    // Get stats
    const stats = logMonitor.getStats();
    const topEndpoints = logMonitor.getTopEndpoints(10);
    const largeLogs = logMonitor.getLargeLogs(10);
    const recentLogs = logMonitor.getRecentLogs(20);
    
    // Format response based on request
    switch (format) {
      case 'report':
        const report = logMonitor.generateReport();
        return new NextResponse(report, {
          status: 200,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Disposition': 'inline; filename="log-optimization-report.txt"'
          }
        });
        
      case 'export':
        const exportData = logMonitor.exportStats();
        return new NextResponse(exportData, {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': 'attachment; filename="log-stats-export.json"'
          }
        });
        
      default: // json
        return NextResponse.json({
          success: true,
          data: {
            overview: {
              totalLogs: stats.totalLogs,
              averageLogSize: Math.round(stats.averageLogSize),
              largeLogsCount: stats.largeLogsCount,
              throttledLogsCount: stats.throttledLogsCount,
              timePeriod: getTimePeriod(stats.lastResetTime),
              lastResetTime: stats.lastResetTime
            },
            breakdown: {
              byLevel: stats.logsByLevel,
              byEndpoint: stats.logsByEndpoint,
              topEndpoints: topEndpoints,
              largeLogs: largeLogs.map(log => ({
                message: log.message.substring(0, 100) + '...',
                size: log.size,
                level: log.level,
                endpoint: log.endpoint,
                timestamp: log.timestamp
              }))
            },
            recent: recentLogs.slice(-10).map(log => ({
              level: log.level,
              message: log.message.substring(0, 50) + '...',
              size: log.size,
              endpoint: log.endpoint,
              timestamp: log.timestamp,
              throttled: log.throttled
            })),
            recommendations: generateRecommendations(stats, topEndpoints, largeLogs)
          },
          timestamp: new Date().toISOString()
        });
    }
    
  } catch (error) {
    optimizedLogger.error('Error getting log statistics', { 
      error: error instanceof Error ? error.message : String(error) 
    }, '/api/debug/log-stats');
    
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve log statistics',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// Helper method to calculate time period
function getTimePeriod(startTime: Date): string {
  const now = new Date();
  const duration = now.getTime() - startTime.getTime();
  const hours = Math.floor(duration / (1000 * 60 * 60));
  const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

// Helper method to generate recommendations
function generateRecommendations(stats: any, topEndpoints: any[], largeLogs: any[]): string[] {
  const recommendations: string[] = [];
  
  if (stats.totalLogs === 0) {
    return ['No logs recorded yet. Start using the application to see statistics.'];
  }
  
  if (stats.largeLogsCount > stats.totalLogs * 0.1) {
    recommendations.push('Consider implementing data truncation - you have many large logs');
  }
  
  if (stats.throttledLogsCount < stats.totalLogs * 0.05) {
    recommendations.push('Log throttling could be more aggressive to reduce spam');
  }
  
  if (stats.averageLogSize > 500) {
    recommendations.push('Average log size is high - consider using log summaries');
  }
  
  if (stats.logsByLevel.debug > stats.totalLogs * 0.5) {
    recommendations.push('Too many debug logs - increase log level in production');
  }
  
  const topEndpoint = topEndpoints[0];
  if (topEndpoint && topEndpoint.count > stats.totalLogs * 0.3) {
    recommendations.push(`Endpoint ${topEndpoint.endpoint} generates excessive logs`);
  }
  
  if (largeLogs.length > 5) {
    recommendations.push('Multiple large logs detected - review logging strategies');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Log usage appears optimal! Keep up the good work.');
  }
  
  return recommendations;
}

// POST method untuk manual actions
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    switch (action) {
      case 'generateReport':
        const report = logMonitor.generateReport();
        return NextResponse.json({
          success: true,
          report: report,
          timestamp: new Date().toISOString()
        });
        
      case 'resetStats':
        logMonitor.resetStats();
        optimizedLogger.info('Log statistics manually reset', undefined, '/api/debug/log-stats');
        
        return NextResponse.json({
          success: true,
          message: 'Statistics reset successfully',
          timestamp: new Date().toISOString()
        });
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action',
          availableActions: ['generateReport', 'resetStats']
        }, { status: 400 });
    }
    
  } catch (error) {
    optimizedLogger.error('Error processing log stats action', { 
      error: error instanceof Error ? error.message : String(error) 
    }, '/api/debug/log-stats');
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process action',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 