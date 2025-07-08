'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import Link from 'next/link';

export default function AuthFallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  const error = searchParams.get('error');
  const redirectTo = searchParams.get('redirect_to') || '/dashboard';

  // Monitor connection status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getErrorMessage = () => {
    switch (error) {
      case 'timeout':
        return {
          title: 'Authentication Timeout',
          description: 'Authentication took too long to complete. This might be due to network issues.',
          icon: <RefreshCw className="h-4 w-4" />,
          variant: 'destructive' as const
        };
      case 'middleware_error':
        return {
          title: 'Authentication Error',
          description: 'An unexpected error occurred during authentication.',
          icon: <AlertCircle className="h-4 w-4" />,
          variant: 'destructive' as const
        };
      case 'auth_timeout':
        return {
          title: 'Connection Timeout',
          description: 'Unable to verify your authentication status. Please try again.',
          icon: <RefreshCw className="h-4 w-4" />,
          variant: 'destructive' as const
        };
      default:
        return {
          title: 'Authentication Required',
          description: 'Please log in to access this page.',
          icon: <AlertCircle className="h-4 w-4" />,
          variant: 'default' as const
        };
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    // Add delay for better UX
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      // Clear any cached auth state
      if (typeof window !== 'undefined') {
        localStorage.removeItem('supabase.auth.token');
        sessionStorage.clear();
      }

      // Redirect to intended page
      router.push(redirectTo);
    } catch (error) {
      console.error('Retry failed:', error);
      // Fallback to login
      router.push(`/login?redirect_to=${encodeURIComponent(redirectTo)}&error=retry_failed`);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleLoginRedirect = () => {
    router.push(`/login?redirect_to=${encodeURIComponent(redirectTo)}`);
  };

  const errorInfo = getErrorMessage();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Authentication Issue
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            We encountered a problem while verifying your session
          </p>
        </div>

        <Alert variant={errorInfo.variant}>
          {errorInfo.icon}
          <AlertTitle>{errorInfo.title}</AlertTitle>
          <AlertDescription className="mt-2">
            {errorInfo.description}
            {!isOnline && (
              <div className="flex items-center mt-2 text-amber-600">
                <WifiOff className="h-4 w-4 mr-1" />
                <span className="text-sm">No internet connection detected</span>
              </div>
            )}
          </AlertDescription>
        </Alert>

        {/* Connection Status */}
        <div className="flex items-center justify-center space-x-2 text-sm">
          {isOnline ? (
            <>
              <Wifi className="h-4 w-4 text-green-500" />
              <span className="text-green-600">Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-red-500" />
              <span className="text-red-600">Offline</span>
            </>
          )}
        </div>

        <div className="space-y-4">
          {/* Retry Button */}
          <Button
            onClick={handleRetry}
            disabled={isRetrying || !isOnline}
            className="w-full"
            variant="outline"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again {retryCount > 0 && `(${retryCount})`}
              </>
            )}
          </Button>

          {/* Login Button */}
          <Button
            onClick={handleLoginRedirect}
            className="w-full"
          >
            Go to Login
          </Button>

          {/* Direct Access (for development) */}
          {process.env.NODE_ENV === 'development' && (
            <Button
              onClick={() => router.push(redirectTo)}
              variant="ghost"
              className="w-full text-xs"
            >
              Force Access (Dev Only)
            </Button>
          )}
        </div>

        {/* Help Text */}
        <div className="text-center text-sm text-gray-500">
          <p>If the problem persists:</p>
          <ul className="mt-2 space-y-1 text-xs">
            <li>• Check your internet connection</li>
            <li>• Clear your browser cache</li>
            <li>• Try using a different browser</li>
            <li>• Contact support if the issue continues</li>
          </ul>
        </div>

        {/* Back to Home */}
        <div className="text-center">
          <Link 
            href="/"
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
} 