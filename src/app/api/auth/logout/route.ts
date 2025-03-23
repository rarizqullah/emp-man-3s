import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function POST() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Lakukan logout pada Supabase
    await supabase.auth.signOut();
    
    return NextResponse.json({ 
      success: true,
      message: "Berhasil logout" 
    });
  } catch (error) {
    console.error('Error saat logout:', error);
    
    return NextResponse.json({ 
      success: false, 
      message: 'Gagal melakukan logout' 
    }, { status: 500 });
  }
} 