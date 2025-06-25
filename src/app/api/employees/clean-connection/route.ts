import { NextResponse } from 'next/server';
import { ensureDatabaseConnection, refreshDatabaseConnection } from '@/lib/db/prisma';
import { getAllEmployees } from '@/lib/db/employee.service';

// GET: Test database connection health
export async function GET() {
  try {
    console.log('🔍 Testing database connection health...');
    
    const startTime = Date.now();
    const isConnected = await ensureDatabaseConnection();
    const connectionTime = Date.now() - startTime;
    
    if (!isConnected) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database connection failed',
          connectionTime: connectionTime
        },
        { status: 503 }
      );
    }
    
    // Test with actual query
    try {
      const queryStartTime = Date.now();
      const employees = await getAllEmployees();
      const queryTime = Date.now() - queryStartTime;
      
      return NextResponse.json({
        success: true,
        message: 'Database connection is healthy',
        employeeCount: employees.length,
        connectionTime: connectionTime,
        queryTime: queryTime,
        totalTime: connectionTime + queryTime
      });
    } catch (queryError) {
      console.error('❌ Query test failed:', queryError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database query failed',
          connectionTime: connectionTime,
          queryError: queryError instanceof Error ? queryError.message : String(queryError)
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ Connection health check failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Connection health check failed',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// POST: Force refresh database connection
export async function POST() {
  try {
    console.log('🔄 Forcing database connection refresh...');
    
    const startTime = Date.now();
    const refreshed = await refreshDatabaseConnection();
    const refreshTime = Date.now() - startTime;
    
    if (!refreshed) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to refresh database connection',
          refreshTime: refreshTime
        },
        { status: 503 }
      );
    }
    
    // Test the refreshed connection
    try {
      const queryStartTime = Date.now();
      const employees = await getAllEmployees();
      const queryTime = Date.now() - queryStartTime;
      
      return NextResponse.json({
        success: true,
        message: 'Database connection refreshed successfully',
        employeeCount: employees.length,
        refreshTime: refreshTime,
        queryTime: queryTime,
        totalTime: refreshTime + queryTime
      });
    } catch (queryError) {
      console.error('❌ Post-refresh query test failed:', queryError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Connection refreshed but query failed',
          refreshTime: refreshTime,
          queryError: queryError instanceof Error ? queryError.message : String(queryError)
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ Connection refresh failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Connection refresh failed',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 