'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Periksa apakah ada token reset password di URL
    const hasResetToken = searchParams.has('token');
    if (!hasResetToken) {
      setError('Token reset password tidak valid atau telah kedaluwarsa.');
    }
  }, [searchParams]);

  const validateForm = () => {
    if (password.length < 6) {
      setError('Password harus minimal 6 karakter');
      return false;
    }
    
    if (password !== confirmPassword) {
      setError('Password dan konfirmasi password tidak cocok');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);

    try {
      // Update password dengan Supabase
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        throw updateError;
      }

      setSuccessMessage('Password berhasil diubah! Anda akan dialihkan ke halaman login.');
      
      // Redirect ke halaman login setelah 3 detik
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err) {
      console.error('Reset password error:', err);
      if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError('Terjadi kesalahan saat mengubah password. Silakan coba lagi.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Reset Password</h1>
            <p className="text-gray-500 text-sm">
              Masukkan password baru Anda
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700 border border-red-100">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 rounded-md bg-green-50 p-4 text-sm text-green-700 border border-green-100">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password Baru
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-gray-500 focus:outline-none focus:ring-0 text-sm"
                style={{ backgroundColor: 'white' }}
                placeholder="Minimal 6 karakter"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Konfirmasi Password Baru
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-gray-500 focus:outline-none focus:ring-0 text-sm"
                style={{ backgroundColor: 'white' }}
                placeholder="Masukkan password yang sama"
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={isLoading || !!error}
                className="w-full bg-black hover:bg-gray-800 text-white font-medium py-2.5 rounded-md"
              >
                {isLoading ? 'Memproses...' : 'Reset Password'}
              </Button>
            </div>
          </form>

          <div className="mt-8 text-center text-sm">
            <p className="text-gray-600">
              <Link href="/login" className="font-medium text-gray-800 hover:text-gray-600 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Kembali ke halaman login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 