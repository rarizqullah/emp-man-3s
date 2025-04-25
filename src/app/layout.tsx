import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import Script from 'next/script';
import SupabaseProvider from '@/providers/supabase-provider';
import ClientErrorHandler from '@/components/ClientErrorHandler';

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
          <ClientErrorHandler>
            {children}
          </ClientErrorHandler>
          <Toaster />
        </SupabaseProvider>
        <Script id="extension-error-handler" strategy="afterInteractive">
          {`
            // Fungsi untuk mengecek apakah error berasal dari ekstensi
            function isExtensionError(errorInfo) {
              // Cek apakah ada properti yang menunjukkan error dari ekstensi browser
              if (typeof errorInfo === 'string') {
                return errorInfo.includes('chrome-extension://') || 
                       errorInfo.includes('binanceInjectedProvider');
              }
              
              // Cek berdasarkan filename, message, atau stack trace
              return (errorInfo.filename && errorInfo.filename.includes('chrome-extension://')) ||
                     (errorInfo.message && (
                        errorInfo.message.includes('chrome-extension://') || 
                        errorInfo.message.includes('binanceInjectedProvider') ||
                        errorInfo.message.includes('Cannot read properties of null (reading \\'type\\')')
                     )) ||
                     (errorInfo.error && errorInfo.error.stack && (
                        errorInfo.error.stack.includes('chrome-extension://') ||
                        errorInfo.error.stack.includes('binanceInjectedProvider')
                     )) ||
                     (errorInfo.reason && errorInfo.reason.stack && (
                        errorInfo.reason.stack.includes('chrome-extension://') ||
                        errorInfo.reason.stack.includes('binanceInjectedProvider')
                     ));
            }

            // Mencegah error dari ekstensi browser
            window.addEventListener('error', function(e) {
              // Filter error dari ekstensi atau khusus untuk Binance
              if (isExtensionError(e)) {
                // Mencegah error muncul di konsol
                e.stopPropagation();
                console.log('Error dari ekstensi browser diblokir:', e.message || '(No message)');
                return true;
              }
            }, true);

            // Mencegah unhandled promise rejection dari ekstensi browser
            window.addEventListener('unhandledrejection', function(e) {
              // Filter promise rejection dari ekstensi
              if (e.reason && isExtensionError(e.reason)) {
                // Mencegah rejection muncul di konsol
                e.stopPropagation();
                e.preventDefault();
                console.log('Promise rejection dari ekstensi browser diblokir');
                return true;
              }
            }, true);
          `}
        </Script>
      </body>
    </html>
  );
}
