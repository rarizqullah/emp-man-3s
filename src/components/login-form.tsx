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
      const { error } = await supabaseClient.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
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

      // Login berhasil, arahkan ke dashboard atau halaman tujuan
      toast({
        title: 'Login Berhasil',
        description: 'Selamat datang kembali!',
      });
      router.push(redirectUrl);
    } catch (error) {
      console.error('Kesalahan saat login:', error);
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
      {/* Header */}
      <div className="text-center">
        <h2 className="typography-h1 leading-tight">
          Employee Management<br />
          System
        </h2>
        <p className="mt-2 text-sm text-gray-600">Sistem Pengelolaan Karyawan Terintegrasi</p>
      </div>

      {/* Login Card */}
      <div className="bg-white py-8 px-6 shadow-sm rounded-lg border border-gray-200">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex flex-col items-center gap-3">
            <a
              href="#"
              className="flex flex-col items-center gap-2 font-medium"
            >
              <div className="flex size-8 items-center justify-center rounded-md">
                <GalleryVerticalEnd className="size-6" />
              </div>
              <span className="sr-only">Sistem Pengelolaan Karyawan</span>
            </a>
            <h1 className="text-xl font-bold text-center">Sistem Pengelolaan Karyawan</h1>
            <div className="text-center text-sm">
              Belum punya akun?{" "}
              <Link href="/signup" className="underline underline-offset-4">
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
              {isLoading ? 'Masuk...' : 'Masuk dengan Email'}
            </Button>
          </div>
        </form>
        
        <div className="text-muted-foreground text-center text-xs text-balance mt-6">
          Dengan melanjutkan, Anda menyetujui{" "}
          <Link href="#" className="underline underline-offset-4 hover:text-primary">
            Syarat Layanan
          </Link>{" "}
          dan{" "}
          <Link href="#" className="underline underline-offset-4 hover:text-primary">
            Kebijakan Privasi
          </Link>{" "}
          kami.
        </div>
      </div>
    </div>
  );
} 