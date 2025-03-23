"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { signIn, signInWithMagicLink } from '../actions';

export function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect_to');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [isEmailMode, setIsEmailMode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email.trim() || (!isEmailMode && !password.trim())) {
      setError(isEmailMode ? 'Email harus diisi' : 'Email dan password harus diisi');
      return;
    }
    
    setIsLoading(true);

    try {
      if (isEmailMode) {
        // Gunakan magic link
        const formData = new FormData();
        formData.append('email', email);
        if (redirectTo) formData.append('redirect', redirectTo);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await signInWithMagicLink(undefined as any, formData);
        
        if (result?.error) {
          setError(result.error);
        } else if (result?.success) {
          setMagicLinkSent(true);
        }
      } else {
        // Login dengan password
        const formData = new FormData();
        formData.append('email', email);
        formData.append('password', password);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await signIn(undefined as any, formData);
        
        if (result?.error) {
          setError(result.error);
        } else if (result?.success) {
          // Jika login berhasil, arahkan ke dashboard atau URL redirect
          if (redirectTo) {
            router.push(redirectTo);
          } else {
            router.push('/dashboard');
          }
        }
      }
    } catch (err) {
      console.error('[Login] Error:', err);
      setError('Login gagal. Silakan coba lagi nanti.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      // Gunakan URL callback yang benar
      const redirectUrl = `${window.location.origin}/auth/callback`;
      
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl
        }
      });
    } catch (err) {
      console.error('[Login] Error Google Sign In:', err);
      setError('Login dengan Google gagal. Silakan coba lagi.');
      setIsLoading(false);
    }
  };

  if (magicLinkSent) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8">
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Periksa Email Anda</h1>
              <p className="text-gray-500 text-sm">Kami telah mengirimkan magic link ke email Anda</p>
            </div>

            <div className="mb-4 rounded-md bg-blue-50 p-4 text-sm text-blue-700 border border-blue-100">
              Silakan periksa email Anda ({email}) untuk tautan login.
            </div>

            <div className="mt-8 text-center text-sm">
              <p className="text-gray-600">
                Tidak menerima email?{' '}
                <button
                  onClick={() => setMagicLinkSent(false)}
                  className="font-medium text-gray-800 hover:text-gray-600"
                >
                  Coba lagi
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Masuk</h1>
            <p className="text-gray-500 text-sm">Masuk ke Sistem Manajemen Karyawan</p>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700 border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-gray-500 focus:outline-none focus:ring-0 text-sm"
                style={{ backgroundColor: 'white' }}
                placeholder="nama@perusahaan.com"
              />
            </div>

            {!isEmailMode && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <Link href="/forgot-password" className="text-xs text-gray-600 hover:text-gray-800">
                    Lupa password?
                  </Link>
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-gray-500 focus:outline-none focus:ring-0 text-sm"
                  style={{ backgroundColor: 'white' }}
                  placeholder="********"
                />
              </div>
            )}

            <div>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-black hover:bg-gray-800 text-white font-medium py-2.5 rounded-md"
              >
                {isLoading ? 'Memproses...' : isEmailMode ? 'Kirim Magic Link' : 'Masuk'}
              </Button>
            </div>
          </form>

          <div className="mt-4 text-center">
            <button 
              onClick={() => setIsEmailMode(!isEmailMode)} 
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              {isEmailMode ? 'Masuk dengan password' : 'Masuk dengan magic link'}
            </button>
          </div>

          <div className="mt-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Atau</span>
            </div>
          </div>

          <div className="mt-6">
            <Button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 py-2.5 rounded-md"
              variant="outline"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M12 5c1.6168 0 3.1223.55656 4.3248 1.4866l3.143-3.1431C17.313 1.2455 14.7597 0 12.0001 0 7.4635 0 3.5921 2.68384 1.3885 6.58237l3.6843 2.85183C6.2482 6.28636 8.8755 5 12 5Z"
                />
                <path
                  fill="#34A853"
                  d="M23.49 12.275c0-.8513-.0771-1.4201-.3434-2.0414H12v3.8807h6.6126c-.1331.7549-.5403 1.787-1.282 2.5012l3.6338 2.829c2.1728-1.9952 3.4256-4.9319 3.4256-8.1695Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.0749 14.2535C4.8481 13.5657 4.71997 12.8344 4.71997 12c0-.8345.12813-1.5658.35493-2.2536L1.3885 6.58237C.50346 8.22274 0 10.0682 0 12c0 1.9318.50346 3.7773 1.3885 5.4176l3.6864-2.8641Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 24c3.3196 0 6.093-1.0972 8.1255-2.9707l-3.6339-2.829c-1.0045.6754-2.2872 1.0749-4.4916 1.0749-3.1245 0-5.7518-1.2864-6.9251-3.4248L1.3885 18.5855C3.5921 22.3162 7.4635 24 12 24Z"
                />
              </svg>
              Google
            </Button>
          </div>

          <div className="mt-8 text-center text-sm">
            <p className="text-gray-600">
              Belum memiliki akun?{' '}
              <Link href="/register" className="font-medium text-gray-800 hover:text-gray-600">
                Daftar di sini
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 