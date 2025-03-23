import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { syncUserWithDatabase } from '@/lib/user-service';

export async function POST() {
  try {
    // Buat Supabase client untuk route handler
    const supabase = createRouteHandlerClient({ cookies });
    
    // Cek session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Tidak ada sesi user aktif' }, { status: 401 });
    }
    
    // Sinkronisasi user dari Supabase ke database lokal
    const syncedUser = await syncUserWithDatabase(session.user);
    
    // Return hasil sinkronisasi
    return NextResponse.json({ 
      success: true, 
      user: {
        id: syncedUser.id,
        email: syncedUser.email,
        name: syncedUser.name,
        role: syncedUser.role,
      }
    });
  } catch (error) {
    console.error('Error API sync user:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Gagal sinkronisasi data pengguna' 
    }, { status: 500 });
  }
} 