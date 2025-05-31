import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Gunakan pendekatan ini untuk menghindari masalah dengan cookies API di route handler
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  try {
    // Dapatkan URL dan parameter
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID diperlukan' }, { status: 400 });
    }
    
    console.log('Mencari data karyawan dengan userId:', userId);
    
    try {
      // Coba dapatkan data karyawan dengan cara sederhana tanpa join
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('id, name, employee_id, department_id, shift_id, face_data')
        .eq('user_id', userId)
        .maybeSingle();
      
      // Jika ada error otorisasi atau database
      if (employeeError) {
        console.error('Error mengambil data karyawan:', employeeError);
        return generateFallbackResponse(userId);
      }
      
      // Jika tidak ditemukan data karyawan
      if (!employeeData) {
        console.log('Data karyawan tidak ditemukan, memeriksa tabel users');
        
        // Coba ambil data dari users table sebagai fallback
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, full_name, email')
          .eq('id', userId)
          .single();
        
        if (userError || !userData) {
          console.log('Data user juga tidak ditemukan');
          return generateFallbackResponse(userId);
        }
        
        // Kembalikan minimal data dari user
        return NextResponse.json({
          success: true,
          employee: {
            id: userData.id,
            name: userData.full_name || userData.email || 'Unknown User',
            employeeId: 'N/A',
            departmentName: 'Unassigned',
            shiftName: 'Default',
            hasFaceData: false
          }
        });
      }
      
      // Pada titik ini, kita memiliki data karyawan
      // Dapatkan informasi tambahan jika perlu
      let departmentName = 'Unassigned';
      if (employeeData.department_id) {
        try {
          const { data: deptData } = await supabase
            .from('departments')
            .select('name')
            .eq('id', employeeData.department_id)
            .single();
          
          if (deptData) {
            departmentName = deptData.name;
          }
        } catch (deptError) {
          console.warn('Error mengambil data department:', deptError);
          // Lanjutkan dengan nilai default
        }
      }
      
      let shiftName = 'Default';
      if (employeeData.shift_id) {
        try {
          const { data: shiftData } = await supabase
            .from('shifts')
            .select('name')
            .eq('id', employeeData.shift_id)
            .single();
          
          if (shiftData) {
            shiftName = shiftData.name;
          }
        } catch (shiftError) {
          console.warn('Error mengambil data shift:', shiftError);
          // Lanjutkan dengan nilai default
        }
      }
      
      // Format data karyawan dengan benar
      const hasFaceData = employeeData.face_data !== null && typeof employeeData.face_data !== 'undefined';
      
      return NextResponse.json({
        success: true,
        employee: {
          id: employeeData.id,
          name: employeeData.name || 'No Name',
          employeeId: employeeData.employee_id || 'N/A',
          departmentName,
          shiftName,
          hasFaceData
        }
      });
    } catch (error) {
      console.error('Error umum dalam route handler:', error);
      return generateFallbackResponse(userId);
    }
  } catch (error) {
    console.error('Error fatal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Fungsi untuk menghasilkan respons fallback
function generateFallbackResponse(userId: string) {
  // Buat ID karyawan dari userId
  const shortId = userId.split('-')[0];
  
  return NextResponse.json({
    success: true,
    employee: {
      id: userId,
      name: `Karyawan ${shortId}`,
      employeeId: `EMP-${shortId}`,
      departmentName: 'Default Department',
      shiftName: 'Regular Shift',
      hasFaceData: false
    }
  });
} 