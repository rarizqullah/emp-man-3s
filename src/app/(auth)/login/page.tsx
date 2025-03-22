"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { signIn, useSession } from "next-auth/react";

// Schema validasi
const loginSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const redirectedRef = useRef(false);

  useEffect(() => {
    const checkRedirectParams = () => {
      // Periksa parameter URL untuk error atau registered
      const errorParam = searchParams.get('error');
      const registeredParam = searchParams.get('registered');
      const messageParam = searchParams.get('message');

      console.log("[LoginPage] URL Params:", { error: errorParam, registered: registeredParam, message: messageParam });

      if (errorParam) {
        if (errorParam === 'session_expired') {
          setError('Sesi telah berakhir. Silakan login kembali.');
        } else if (errorParam === 'auth') {
          setError('Email atau password tidak valid.');
        } else {
          setError('Terjadi kesalahan. Silakan coba lagi.');
        }
      }

      if (messageParam) {
        setError(decodeURIComponent(messageParam));
      }

      if (registeredParam === 'success') {
        setSuccessMessage('Pendaftaran berhasil! Silakan login dengan akun Anda.');
      }
    };

    checkRedirectParams();
  }, [searchParams]);

  // Pisahkan effect untuk redirect agar tidak terjadi loop
  useEffect(() => {
    // Gunakan ref untuk memastikan redirect hanya terjadi sekali
    if (status === 'authenticated' && session && !redirectedRef.current) {
      console.log("[LoginPage] User sudah login, redirect ke dashboard");
      redirectedRef.current = true;
      
      // Set timeout untuk menghindari race condition
      setTimeout(() => {
        const redirectTo = searchParams.get('redirect_to') || '/dashboard';
        console.log(`[LoginPage] Redirecting to: ${redirectTo}`);
        window.location.href = redirectTo; // Gunakan window.location.href daripada router.push
      }, 100);
    }
  }, [status, session, searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setError("");
    console.log("Memulai proses login dengan:", data.email);

    try {
      // Gunakan signIn dari next-auth/react
      const result = await signIn('credentials', {
        redirect: false,
        email: data.email,
        password: data.password,
      });

      console.log("Respons login diterima:", result);

      if (!result?.ok) {
        throw new Error(result?.error || "Login gagal");
      }

      console.log("Login berhasil, melakukan redirect...");

      // Periksa apakah ada parameter redirect_to
      const redirectTo = searchParams.get('redirect_to') || '/dashboard';
      console.log(`[LoginPage] Login berhasil, redirecting to: ${redirectTo}`);
      
      // Gunakan window.location.href untuk hard redirect
      window.location.href = redirectTo;
    } catch (err) {
      console.error("Login gagal:", err);
      setError(err instanceof Error ? err.message : "Email atau password tidak valid");
    } finally {
      setIsLoading(false);
    }
  };

  // Render form login
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          EMS System
        </CardTitle>
        <CardDescription className="text-center">
          Masukkan kredensial Anda untuk login ke sistem
        </CardDescription>
      </CardHeader>
      <CardContent>
        {successMessage && (
          <Alert className="mb-4 bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="nama@perusahaan.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                Lupa password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sedang Masuk...
              </>
            ) : (
              "Masuk"
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col">
        <div className="text-sm text-gray-500 text-center mt-2">
          Belum memiliki akun?{" "}
          <Link href="/register" className="text-primary hover:underline">
            Daftar
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
} 