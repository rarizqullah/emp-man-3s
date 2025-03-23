"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get('registered') === 'true';
  const confirmationRequired = searchParams.get('confirmation') === 'required';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResendButton, setShowResendButton] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email.trim() || !password.trim()) {
      setError('Email dan password harus diisi');
      return;
    }
    
    setIsLoading(true);

    try {
      // Login with Supabase
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // Display resend confirmation button if the error is about email confirmation
        if (signInError.message.includes('Email not confirmed')) {
          setShowResendButton(true);
        }
        throw signInError;
      }

      // Success - redirect to dashboard
      if (data.user) {
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('Login error:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Login gagal. Silakan periksa email dan password Anda.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      setError('Masukkan email Anda terlebih dahulu');
      return;
    }

    setResendLoading(true);
    setResendSuccess(false);
    setError('');

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (resendError) {
        throw resendError;
      }

      setResendSuccess(true);
    } catch (err) {
      console.error('Resend confirmation error:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Gagal mengirim ulang email konfirmasi. Silakan coba lagi.');
      }
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Masuk</h1>
            <p className="text-gray-500 text-sm">Masuk ke Sistem Manajemen Karyawan</p>
          </div>

          {registered && confirmationRequired && (
            <div className="mb-4 rounded-md bg-blue-50 p-4 text-sm text-blue-700 border border-blue-100">
              Pendaftaran berhasil! Silakan periksa email Anda untuk konfirmasi akun sebelum masuk.
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700 border border-red-100">
              {error}
            </div>
          )}

          {resendSuccess && (
            <div className="mb-4 rounded-md bg-green-50 p-4 text-sm text-green-700 border border-green-100">
              Email konfirmasi berhasil dikirim ulang. Silakan periksa kotak masuk Anda.
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

            <div className="pt-2">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-black hover:bg-gray-800 text-white font-medium py-2.5 rounded-md"
              >
                {isLoading ? 'Memproses...' : 'Masuk'}
              </Button>
            </div>
          </form>

          {showResendButton && (
            <div className="mt-4">
              <Button
                type="button"
                onClick={handleResendConfirmation}
                disabled={resendLoading}
                variant="outline"
                className="w-full border-gray-300 text-gray-700 py-2 rounded-md text-sm"
              >
                {resendLoading ? 'Mengirim...' : 'Kirim Ulang Email Konfirmasi'}
              </Button>
            </div>
          )}

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