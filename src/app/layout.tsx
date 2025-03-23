import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import AuthProvider from '@/lib/auth-context';
import { Toaster } from 'react-hot-toast';
import { SupabaseProvider } from '@/lib/supabase-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Employee Management System',
  description: 'Sistem Pengelolaan Karyawan Terintegrasi',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <SupabaseProvider>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
