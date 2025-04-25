"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from 'next/link';
import { Loader2 } from "lucide-react";
import { useSupabase } from "@/providers/supabase-provider";

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading } = useSupabase();
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const redirectUser = () => {
      try {
        // Jika proses autentikasi selesai
        if (!isLoading) {
          // Jika user sudah login, arahkan ke dashboard
          if (user) {
            try {
              router.push('/dashboard');
            } catch (routerError) {
              console.error('Router navigation error:', routerError);
              // Fallback jika router.push gagal
              window.location.href = '/dashboard';
            }
          } else {
            // Hentikan proses pengecekan agar tampilan homepage muncul
            setChecking(false);
          }
        }
      } catch (err) {
        console.error('Error redirecting user:', err);
        setError('Terjadi kesalahan saat mengalihkan halaman.');
        setChecking(false);
      }
    };

    redirectUser();
  }, [user, isLoading, router]);

  // Tampilkan pesan error jika ada
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-3xl font-bold">Error</h1>
          <p className="text-red-500">{error}</p>
          <div className="mt-4">
            <Link 
              href="/login"
              className="px-4 py-2 bg-blue-600 text-white rounded-md"
            >
              Coba Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Tampilkan loader saat masih mengecek status autentikasi
  if (isLoading || checking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-3xl font-bold">Employee Management System</h1>
          <p className="text-muted-foreground">Memuat...</p>
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Tampilkan homepage untuk user yang belum login
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900">
            Sistem Pengelolaan Karyawan
          </h1>
          <p className="mt-3 text-xl text-gray-600">
            Aplikasi manajemen karyawan terintegrasi
          </p>
        </div>
        
        <div className="mt-10 space-y-4">
          <Link 
            href="/login"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Login
          </Link>
          
          <Link 
            href="/register"
            className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Daftar Akun Baru
          </Link>
        </div>
        
        <div className="mt-6 text-center text-sm">
          <p className="text-gray-500">
            Sistem Pengelolaan Karyawan dengan fitur lengkap untuk manajemen karyawan,
            termasuk manajemen pengguna, presensi, dan banyak lagi.
          </p>
        </div>
      </div>
    </div>
  );
}
