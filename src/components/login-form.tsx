'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { GalleryVerticalEnd } from "lucide-react";
import { supabaseClient } from '@/lib/supabase/client';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from '@/components/ui/use-toast';

const formSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

type FormValues = z.infer<typeof formSchema>;

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams?.get('redirect_to') || '/dashboard';

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      console.log('🔐 Login attempt for:', data.email);
      
      const { data: authData, error } = await supabaseClient.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        console.error('❌ Login failed:', error.message);
        
        // Berikan pesan error yang lebih jelas untuk user
        let errorMessage = error.message;
        
        // Handle pesan error spesifik dari Supabase
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Email atau password yang Anda masukkan salah. Silakan coba lagi.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Email Anda belum dikonfirmasi. Silakan cek email untuk konfirmasi.';
        } else if (error.message.includes('too_many_requests')) {
          errorMessage = 'Terlalu banyak percobaan login. Silakan tunggu beberapa menit dan coba lagi.';
        } else if (!errorMessage || errorMessage.trim() === '') {
          errorMessage = 'Terjadi kesalahan saat login. Silakan periksa email dan password Anda.';
        }
        
        toast({
          title: 'Gagal Masuk',
          description: errorMessage,
          variant: 'destructive',
        });
        return;
      }

      console.log('✅ Login successful for:', authData.user?.email);
      
      // Tunggu sebentar untuk memastikan session tersimpan
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verifikasi bahwa user sudah terautentikasi
      const { data: { user } } = await supabaseClient.auth.getUser();
      
      if (user) {
        console.log('✅ User authentication verified:', user.email);
        
        // Login berhasil, arahkan ke dashboard atau halaman tujuan
        toast({
          title: 'Login Berhasil',
          description: `Selamat datang kembali, ${user.email}!`,
        });
        
        // Tunggu toast selesai ditampilkan
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Redirect ke halaman yang dituju
        console.log('🔄 Redirecting to:', redirectUrl);
        router.push(redirectUrl);
      } else {
        console.error('❌ User authentication verification failed');
        toast({
          title: 'Masalah Autentikasi',
          description: 'Login berhasil tapi tidak dapat memverifikasi sesi. Silakan coba lagi.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      toast({
        title: 'Terjadi Kesalahan',
        description: 'Gagal masuk ke akun. Silakan coba lagi nanti.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("space-y-6", className)} {...props}>
      {/* Login Card */}
      <div className="bg-white py-8 px-6 shadow-lg rounded-xl border border-gray-200">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-col items-center gap-2">
              <div className="flex size-12 items-center justify-center rounded-full bg-blue-100">
                <GalleryVerticalEnd className="size-6 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-center text-gray-900">
                Employee Management System
              </h1>
              <p className="text-sm text-gray-600 text-center">
                Sistem Pengelolaan Karyawan Terintegrasi
              </p>
            </div>
            
            <div className="text-center text-sm">
              Belum punya akun?{" "}
              <Link href="/signup" className="underline underline-offset-4 text-blue-600 hover:text-blue-800">
                Daftar akun
              </Link>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@perusahaan.com"
                required
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Masukkan password"
                required
                {...form.register('password')}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Masuk...' : 'Masuk'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 