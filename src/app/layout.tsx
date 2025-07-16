import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import SupabaseProvider from '@/providers/supabase-provider';
import SWRProvider from '@/providers/SWRProvider';
import SocketProvider from '@/providers/SocketProvider';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial'],
});

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
          <SWRProvider>
            <SocketProvider>
              {children}
              <Toaster />
            </SocketProvider>
          </SWRProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
