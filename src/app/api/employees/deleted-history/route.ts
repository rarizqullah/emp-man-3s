import { NextResponse } from 'next/server';

// For now, return empty array since we don't have deleted employee tracking yet
// This can be implemented later when we add a deleted_employees table
export async function GET() {
  try {
    // TODO: Implement actual deleted employee tracking
    // For now, return empty array
    const deletedEmployees: unknown[] = [];

    return NextResponse.json(deletedEmployees);

  } catch (error) {
    console.error('Error fetching deleted employees:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 