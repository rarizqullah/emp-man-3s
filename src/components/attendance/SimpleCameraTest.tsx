"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, CheckCircle } from 'lucide-react';

const SimpleCameraTest: React.FC = () => {
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const testCameraAccess = async () => {
    setIsLoading(true);
    setTestResult('');
    
    try {
      // Test basic camera access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });
      
      setTestResult('✅ Kamera dapat diakses! Stream berhasil diperoleh.');
      
      // Get video track info
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        setTestResult(prev => prev + `\n📹 Resolusi: ${settings.width}x${settings.height}`);
        setTestResult(prev => prev + `\n🎥 Device: ${videoTrack.label || 'Unknown'}`);
      }
      
      // Stop the test stream
      stream.getTracks().forEach(track => track.stop());
      
    } catch (error) {
      let errorMsg = '❌ Kamera tidak dapat diakses: ';
      
      if (error instanceof Error) {
        switch (error.name) {
          case 'NotAllowedError':
            errorMsg += 'Izin kamera ditolak. Klik tombol allow pada browser.';
            break;
          case 'NotFoundError':
            errorMsg += 'Kamera tidak ditemukan. Pastikan kamera terhubung.';
            break;
          case 'NotReadableError':
            errorMsg += 'Kamera sedang digunakan aplikasi lain.';
            break;
          case 'OverconstrainedError':
            errorMsg += 'Resolusi yang diminta tidak didukung.';
            break;
          case 'SecurityError':
            errorMsg += 'Akses kamera diblokir karena alasan keamanan.';
            break;
          default:
            errorMsg += error.message;
        }
      }
      
      setTestResult(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const checkBrowserSupport = () => {
    const support = {
      getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      webGL: (() => {
        try {
          const canvas = document.createElement('canvas');
          return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch {
          return false;
        }
      })(),
      secureContext: window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost'
    };

    const supportMsg = `Browser Support:
📱 getUserMedia: ${support.getUserMedia ? '✅' : '❌'}
🎮 WebGL: ${support.webGL ? '✅' : '❌'} 
🔒 Secure Context: ${support.secureContext ? '✅' : '❌'}

${!support.secureContext ? '⚠️ HTTPS diperlukan untuk akses kamera di production!' : ''}`;

    setTestResult(supportMsg);
  };

  return (
    <Card className="p-4 mb-4">
      <div className="space-y-3">
        <h4 className="font-medium text-sm">Camera Diagnostics</h4>
        
        <div className="flex gap-2">
          <Button 
            onClick={testCameraAccess}
            disabled={isLoading}
            size="sm"
            variant="outline"
          >
            <Camera className="w-4 h-4 mr-2" />
            {isLoading ? 'Testing...' : 'Test Camera'}
          </Button>
          
          <Button 
            onClick={checkBrowserSupport}
            size="sm"
            variant="outline"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Check Support
          </Button>
        </div>
        
        {testResult && (
          <div className="bg-gray-50 p-3 rounded text-xs whitespace-pre-line">
            {testResult}
          </div>
        )}
      </div>
    </Card>
  );
};

export default SimpleCameraTest; 