"use client";

import React, { Component, ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

class FaceRecognitionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Face Recognition Error Boundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    // Refresh the page to restart everything
    window.location.reload();
  };

  getBrowserCompatibilityInfo = () => {
    if (typeof window === 'undefined') return { checks: [], isCompatible: false };

    const checks = [
      {
        name: 'Akses Kamera',
        status: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
        description: 'getUserMedia API'
      },
      {
        name: 'WebGL',
        status: (() => {
          try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            return !!gl;
          } catch {
            return false;
          }
        })(),
        description: 'Diperlukan untuk face-api.js'
      },
      {
        name: 'Canvas API',
        status: !!(document.createElement('canvas').getContext),
        description: 'Untuk manipulasi gambar'
      },
      {
        name: 'Secure Context',
        status: window.isSecureContext || 
               location.protocol === 'https:' || 
               location.hostname === 'localhost' ||
               location.hostname === '127.0.0.1',
        description: 'HTTPS atau localhost'
      }
    ];

    const isCompatible = checks.every(check => check.status);
    return { checks, isCompatible };
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { checks, isCompatible } = this.getBrowserCompatibilityInfo();
      const error = this.state.error;

      return (
        <Card className="w-full max-w-2xl mx-auto">
          <div className="p-6">
            <div className="text-center mb-6">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <h3 className="text-xl font-semibold text-red-600 mb-2">
                Error Sistem Pengenalan Wajah
              </h3>
              <p className="text-sm text-gray-600">
                Terjadi kesalahan saat memuat sistem pengenalan wajah.
              </p>
            </div>

            {/* Browser Compatibility Check */}
            <div className="mb-6">
              <h4 className="font-medium mb-3 flex items-center">
                Status Kompatibilitas Browser
                {isCompatible ? (
                  <CheckCircle className="w-4 h-4 text-green-500 ml-2" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500 ml-2" />
                )}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {checks.map((check, index) => (
                  <div 
                    key={index}
                    className={`p-3 rounded-lg border ${
                      check.status 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-sm">{check.name}</span>
                        <p className="text-xs text-gray-500">{check.description}</p>
                      </div>
                      {check.status ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Error Details */}
            {error && (
              <div className="mb-6">
                <h4 className="font-medium mb-2">Detail Error:</h4>
                <div className="p-3 bg-gray-100 rounded-lg">
                  <p className="text-sm font-mono text-gray-700 mb-2">
                    {error.name}: {error.message}
                  </p>
                  {this.state.errorInfo && (
                    <details className="text-xs text-gray-500">
                      <summary className="cursor-pointer">Stack Trace</summary>
                      <pre className="mt-2 p-2 bg-gray-50 rounded overflow-auto text-xs">
                        {error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            )}

            {/* Troubleshooting */}
            <div className="mb-6">
              <h4 className="font-medium mb-2">Solusi yang Dapat Dicoba:</h4>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  Pastikan Anda menggunakan browser modern (Chrome, Firefox, Safari, Edge)
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  Izinkan akses kamera saat diminta oleh browser
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  Pastikan koneksi internet stabil untuk memuat model AI
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  Coba refresh halaman atau restart browser
                </li>
                {!isCompatible && (
                  <li className="flex items-start">
                    <span className="text-red-500 mr-2">•</span>
                    Browser Anda tidak mendukung semua fitur yang diperlukan
                  </li>
                )}
              </ul>
            </div>
            
            <div className="space-y-3">
              <Button onClick={this.handleRetry} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Muat Ulang Halaman
              </Button>
              
              <p className="text-xs text-center text-gray-500">
                Jika masalah berlanjut, silakan hubungi administrator IT
              </p>
            </div>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default FaceRecognitionErrorBoundary; 