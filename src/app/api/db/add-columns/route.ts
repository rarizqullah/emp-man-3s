import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Koneksi ke Supabase
    const supabase = await createServerSupabaseClient();

    // Periksa apakah tabel users ada
    const { data: tableExists } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (tableExists === null) {
      return NextResponse.json(
        { error: "Tabel users tidak ditemukan" },
        { status: 404 }
      );
    }

    // Solusi workaround: gunakan SQL via REST API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/add_columns_to_users`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          'apiKey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        },
        body: JSON.stringify({})
      }
    );

    if (!response.ok) {
      console.error("Error response:", await response.text());
      return NextResponse.json(
        { error: "Gagal menambahkan kolom ke tabel users", status: response.status },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Silakan ikuti langkah berikut untuk menambahkan kolom:",
      steps: [
        "1. Buka dashboard Supabase",
        "2. Buka menu SQL Editor",
        "3. Jalankan SQL berikut:",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_signup VARCHAR(255);",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);",
        "ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS users_email_signup_key UNIQUE (email_signup);"
      ]
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
} 