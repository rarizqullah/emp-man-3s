"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  RefreshCw,
  UserCheck,
  X,
  Users
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
  faceRecognitionService, 
  type EmployeeFaceData
} from '@/lib/face-recognition';
import { useBrowserCapabilities } from '@/hooks/useBrowserCapabilities';
import SimpleCameraTest from './SimpleCameraTest';

// Local configuration to avoid import issues
const FACE_API_CONFIG = {
  MODEL_PATH: '/models',
  THRESHOLDS: {
    FACE_DETECTION: 0.5,
    FACE_RECOGNITION: 0.5,
    FACE_MATCHING: 0.6,
  },
  DETECTION: {
    INPUT_SIZE: 512,
    SCORE_THRESHOLD: 0.5,
    NMS_THRESHOLD: 0.3,
  },
  VIDEO: {
    WIDTH: 640,
    HEIGHT: 480,
    FACING_MODE: 'user' as const,
  },
  AUTO_DETECTION_INTERVAL: 2000,
  RETRY: {
    MAX_ATTEMPTS: 3,
    DELAY: 5000,
  },
  CACHE: {
    EMPLOYEE_DATA_REFRESH: 30000,
  }
} as const;

interface BasicFaceRecognitionProps {
  onSuccessfulRecognition: (employeeId: string) => void;
  mode: 'checkIn' | 'checkOut';
}

const BasicFaceRecognition: React.FC<BasicFaceRecognitionProps> = ({
  onSuccessfulRecognition,
  mode
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [employeeData, setEmployeeData] = useState<EmployeeFaceData[]>([]);
  const [recognizedEmployee, setRecognizedEmployee] = useState<EmployeeFaceData | null>(null);
  const [isRecognizing, setIsRecognizing] = useState<boolean>(false);
  const [dataLoadTime, setDataLoadTime] = useState<string>('');
  const [isAutoDetecting, setIsAutoDetecting] = useState<boolean>(false);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check browser capabilities
  const browserCapabilities = useBrowserCapabilities();

  // Auto-reload employee data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isRecognizing && employeeData.length > 0) {
        console.log('Auto-reloading employee data...');
        loadEmployeeFaceData();
      }
    }, FACE_API_CONFIG.CACHE.EMPLOYEE_DATA_REFRESH);

    return () => clearInterval(interval);
  }, [isRecognizing, employeeData.length]);

  // Initialize face recognition system
  useEffect(() => {
    let mounted = true;
    let initializationTimeout: NodeJS.Timeout | null = null;
    
    const initializeFaceRecognition = async () => {
      try {
        if (!mounted) return;
        
        setIsLoading(true);
        setError(null);
        
        console.log('🔄 Initializing face recognition system...');
        
        // Check if we're in browser environment
        if (typeof window === 'undefined') {
          console.log('❌ Not in browser environment');
          return;
        }

        // Wait for browser capabilities to be fully loaded
        let retryCount = 0;
        const maxRetries = 10;
        
        while (browserCapabilities.isCompatible === undefined && retryCount < maxRetries) {
          console.log(`⏳ Waiting for browser capabilities check... (${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 200));
          retryCount++;
        }

        // Check browser capabilities after waiting
        if (!browserCapabilities.isCompatible) {
          const errorMessage = browserCapabilities.errors.length > 0 
            ? browserCapabilities.errors.join('. ') 
            : 'Browser tidak mendukung face recognition';
          throw new Error(errorMessage);
        }

        // Check if getUserMedia is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera access not supported in this browser');
        }

        if (!mounted) return;

        // Initialize face recognition service with timeout
        initializationTimeout = setTimeout(() => {
          if (mounted) {
            throw new Error('Face recognition initialization timeout');
          }
        }, 45000); // 45 second timeout

        try {
          await faceRecognitionService.initialize();
          if (initializationTimeout) {
            clearTimeout(initializationTimeout);
            initializationTimeout = null;
          }
        } catch (initError) {
          if (initializationTimeout) {
            clearTimeout(initializationTimeout);
            initializationTimeout = null;
          }
          throw initError;
        }

        if (!mounted) return;

        // Load employee face data
        await loadEmployeeFaceData();
        
        if (!mounted) return;
        
        // Start webcam
        await startWebcam();
        
      } catch (error) {
        console.error("❌ Error initializing face recognition:", error);
        
        if (!mounted) return;
        
        // Clear timeout if it exists
        if (initializationTimeout) {
          clearTimeout(initializationTimeout);
          initializationTimeout = null;
        }
        
        // Set appropriate error message based on error type
        let errorMessage = "Gagal memuat sistem pengenalan wajah.";
        
        if (error instanceof Error) {
          if (error.message.includes('Camera access not supported')) {
            errorMessage = "Browser tidak mendukung akses kamera.";
          } else if (error.message.includes('timeout')) {
            errorMessage = "Timeout saat memuat model AI. Silakan refresh halaman.";
          } else if (error.message.includes('getUserMedia')) {
            errorMessage = "Tidak dapat mengakses kamera. Pastikan izin kamera diberikan.";
          } else if (error.message.includes('models') || error.message.includes('Failed to load models')) {
            errorMessage = "Gagal memuat model AI. Periksa koneksi internet Anda dan pastikan file model tersedia.";
          } else if (error.message.includes('WebGL')) {
            errorMessage = "Browser tidak mendukung WebGL yang diperlukan untuk face recognition.";
          } else if (error.message.includes('HTTPS')) {
            errorMessage = "Face recognition memerlukan HTTPS atau localhost.";
          } else if (error.message.includes('Browser tidak mendukung')) {
            errorMessage = error.message;
          } else {
            errorMessage = `Error inisialisasi: ${error.message}`;
          }
        }
        
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
        // Clean up timeout
        if (initializationTimeout) {
          clearTimeout(initializationTimeout);
        }
      }
    };

    // Only initialize when browser capabilities are determined (not undefined)
    if (browserCapabilities.isCompatible !== undefined) {
      // Add small delay to ensure DOM is fully ready
      const timer = setTimeout(() => {
        if (mounted) {
          initializeFaceRecognition();
        }
      }, 100);

      return () => {
        mounted = false;
        clearTimeout(timer);
      };
    }

    // Return cleanup function even if initialization is not triggered
    return () => {
      mounted = false;
      if (initializationTimeout) {
        clearTimeout(initializationTimeout);
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [browserCapabilities.isCompatible, browserCapabilities.errors]);

  // Load employee face data from API
  const loadEmployeeFaceData = async () => {
    try {
      console.log('🔄 Loading employee face data...');
      
      const response = await fetch('/api/face-recognition/descriptors', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch employee face data');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        setEmployeeData(result.data);
        setDataLoadTime(new Date().toLocaleTimeString());
        
        console.log(`✅ Loaded ${result.data.length} employees:`);
        result.data.forEach((emp: EmployeeFaceData) => {
          console.log(`  - ${emp.name} (${emp.employeeId}): descriptor length ${emp.descriptor.length}`);
        });
        
        toast.success(`${result.data.length} karyawan berhasil dimuat untuk pengenalan wajah`);
        
        if (result.testing) {
          toast.success(result.note || 'Mode testing aktif', { duration: 3000 });
        }
      } else {
        throw new Error(result.error || 'Invalid response format');
      }
    } catch (error) {
      console.error("❌ Error loading employee face data:", error);
      setError("Gagal mengambil data wajah karyawan");
      toast.error("Gagal mengambil data wajah karyawan - akan retry otomatis");
      
      // Auto retry after configured delay
      setTimeout(() => {
        if (!isRecognizing) {
          console.log('🔄 Auto-retrying employee data load...');
          loadEmployeeFaceData();
        }
      }, FACE_API_CONFIG.RETRY.DELAY);
    }
  };

  // Start webcam
  const startWebcam = async () => {
    // Check if video element is mounted
    if (!videoRef.current) {
      console.error('❌ Video element not mounted yet');
      toast.error("Video element belum tersedia");
      return;
    }

    try {
      console.log('📷 Starting webcam...');
      
      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          facingMode: FACE_API_CONFIG.VIDEO.FACING_MODE,
          width: { ideal: FACE_API_CONFIG.VIDEO.WIDTH },
          height: { ideal: FACE_API_CONFIG.VIDEO.HEIGHT },
          frameRate: { ideal: 30, max: 60 }
        },
        audio: false
      });
      
      console.log('📷 Camera stream obtained:', {
        active: stream.active,
        tracks: stream.getVideoTracks().length,
        settings: stream.getVideoTracks()[0]?.getSettings()
      });
      
      // Store stream reference
      streamRef.current = stream;
      
      // Set video source
      videoRef.current.srcObject = stream;

      // Wait until metadata/video is ready
      await new Promise<void>((resolve, reject) => {
        if (!videoRef.current) {
          reject(new Error('Video element not available'));
          return;
        }

        const video = videoRef.current;
        const timeout = setTimeout(() => {
          reject(new Error('Timeout loading video'));
        }, 5000);

        video.onloadedmetadata = () => {
          clearTimeout(timeout);
          console.log('📷 Video metadata loaded');
          resolve();
        };

        video.onerror = (error) => {
          clearTimeout(timeout);
          console.error('❌ Video error:', error);
          reject(new Error('Video loading error'));
        };
      });

      // Now play the video
      await videoRef.current.play();
      
      console.log('✅ Webcam started successfully');
      console.log('📷 Video dimensions:', {
        videoWidth: videoRef.current.videoWidth,
        videoHeight: videoRef.current.videoHeight,
        clientWidth: videoRef.current.clientWidth,
        clientHeight: videoRef.current.clientHeight
      });
      
      toast.success("🎥 Kamera berhasil dimulai");
      
    } catch (error) {
      console.error('❌ Failed to start webcam:', error);
      
      // Cleanup on error
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      let errorMessage = "Tidak dapat mengakses kamera.";
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = "Akses kamera ditolak. Silakan izinkan akses kamera di browser.";
        } else if (error.name === 'NotFoundError') {
          errorMessage = "Kamera tidak ditemukan. Pastikan kamera terhubung.";
        } else if (error.name === 'NotReadableError') {
          errorMessage = "Kamera sedang digunakan aplikasi lain.";
        } else if (error.name === 'OverconstrainedError') {
          errorMessage = "Resolusi kamera tidak didukung.";
        } else if (error.message.includes('Timeout')) {
          errorMessage = "Timeout saat memuat kamera. Coba lagi.";
        } else {
          errorMessage = `Error kamera: ${error.message}`;
        }
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  // Start auto detection
  const startAutoDetection = () => {
    if (detectionIntervalRef.current) return;
    
    setIsAutoDetecting(true);
    detectionIntervalRef.current = setInterval(() => {
      if (!isRecognizing && employeeData.length > 0) {
        performFaceRecognition();
      }
    }, FACE_API_CONFIG.AUTO_DETECTION_INTERVAL);
    
    toast.success("Deteksi otomatis dimulai");
  };

  // Stop auto detection
  const stopAutoDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    setIsAutoDetecting(false);
    toast.success("Deteksi otomatis dihentikan");
  };

  // Perform face recognition
  const performFaceRecognition = async () => {
    if (!videoRef.current || !faceRecognitionService.isInitialized() || employeeData.length === 0) {
      return;
    }

    setIsRecognizing(true);
    setRecognizedEmployee(null);

    try {
      console.log('🔍 Detecting face...');
      
      const detection = await faceRecognitionService.detectFace(videoRef.current);
      
      if (!detection) {
        console.log('❌ No face detected');
        toast.error("Tidak ada wajah terdeteksi. Posisikan wajah di depan kamera.");
        return;
      }

      console.log('✅ Face detected, comparing with employees...');
      
      // Find best match
      const bestMatch = faceRecognitionService.findBestMatch(
        detection.descriptor, 
        employeeData, 
        0.5 // threshold
      );

      if (bestMatch) {
        console.log(`✅ Employee recognized: ${bestMatch.name}`);
        setRecognizedEmployee(bestMatch);
        toast.success(`Wajah dikenali: ${bestMatch.name}`);
        
        // Auto proceed after 2 seconds
        setTimeout(() => {
          onSuccessfulRecognition(bestMatch.employeeId);
        }, 2000);
      } else {
        console.log('❌ No matching employee found');
        toast.error("Wajah tidak dikenali. Pastikan Anda terdaftar di sistem.");
      }

    } catch (error) {
      console.error("❌ Error during face recognition:", error);
      toast.error("Error saat mengenali wajah");
    } finally {
      setIsRecognizing(false);
    }
  };

  // Toggle face recognition
  const toggleFaceRecognition = () => {
    if (isAutoDetecting) {
      stopAutoDetection();
    } else {
      startAutoDetection();
    }
  };

  // Handle retry
  const handleRetry = async () => {
    setError(null);
    setRecognizedEmployee(null);
    
    try {
      if (!faceRecognitionService.isInitialized()) {
        await faceRecognitionService.initialize();
      }
      await loadEmployeeFaceData();
      toast.success("Sistem berhasil di-reset");
    } catch {
      setError("Gagal me-reset sistem");
      toast.error("Gagal me-reset sistem");
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    stopAutoDetection();
    toast.success("Kamera dihentikan");
  };

  // Auto-start webcam when component mounts and employee data is ready
  useEffect(() => {
    const initializeCamera = async () => {
      if (employeeData.length > 0 && !streamRef.current && !error) {
        console.log('🚀 Employee data ready, starting camera...');
        await startWebcam();
        
        // Auto-start face detection after camera is ready
        setTimeout(() => {
          if (streamRef.current && !isAutoDetecting) {
            startAutoDetection();
          }
        }, 2000);
      }
    };

    initializeCamera();

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up camera resources...');
      
      // Stop auto detection
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
      
      // Stop camera stream
      const stream = videoRef.current?.srcObject as MediaStream;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [employeeData.length, error]);

  if (isLoading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <div className="p-6 text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-sm text-gray-600 mb-2">Memuat sistem pengenalan wajah...</p>
          <p className="text-xs text-gray-500 mb-4">Mohon tunggu, sedang memuat model AI...</p>
          
          {/* Browser Capabilities Status */}
          <div className="text-xs text-left bg-gray-50 p-3 rounded mb-3">
            <div className="font-medium mb-2">Status Browser:</div>
            <div className="space-y-1">
              <div className={`flex items-center justify-between ${browserCapabilities.supportsGetUserMedia ? 'text-green-600' : 'text-red-600'}`}>
                <span>Kamera</span>
                <span>{browserCapabilities.supportsGetUserMedia ? '✅' : '❌'}</span>
              </div>
              <div className={`flex items-center justify-between ${browserCapabilities.supportsWebGL ? 'text-green-600' : 'text-red-600'}`}>
                <span>WebGL</span>
                <span>{browserCapabilities.supportsWebGL ? '✅' : '❌'}</span>
              </div>
              <div className={`flex items-center justify-between ${browserCapabilities.supportsCanvas ? 'text-green-600' : 'text-red-600'}`}>
                <span>Canvas</span>
                <span>{browserCapabilities.supportsCanvas ? '✅' : '❌'}</span>
              </div>
              <div className={`flex items-center justify-between ${browserCapabilities.isSecureContext ? 'text-green-600' : 'text-red-600'}`}>
                <span>Secure Context</span>
                <span>{browserCapabilities.isSecureContext ? '✅' : '❌'}</span>
              </div>
            </div>
            
            {!browserCapabilities.isCompatible && browserCapabilities.errors.length > 0 && (
              <div className="mt-2 p-2 bg-red-50 border-l-2 border-red-200">
                <div className="text-red-600 font-medium text-xs">Issues:</div>
                <ul className="text-red-500 text-xs mt-1 space-y-1">
                  {browserCapabilities.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <div className="p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <Button onClick={handleRetry} size="sm" variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Coba Lagi
          </Button>
        </div>
      </Card>
    );
  }

  if (recognizedEmployee) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <div className="p-6 text-center">
          <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-3" />
          <p className="text-lg font-medium text-green-600">
            {recognizedEmployee.name} dikenali!
          </p>
          <p className="text-sm text-gray-600 mt-2">
            {mode === 'checkIn' ? 'Check-in' : 'Check-out'} sedang diproses...
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            Pengenalan Wajah - {mode === 'checkIn' ? 'Check In' : 'Check Out'}
          </h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={stopCamera}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Video Container */}
        <div className="relative bg-gray-900 rounded-lg overflow-hidden mb-4" style={{ aspectRatio: '4/3', minHeight: '240px' }}>
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            muted
            playsInline
            controls={false}
            style={{ 
              background: '#000',
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
          
          {/* Video Loading Indicator */}
          {!streamRef.current && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              <div className="text-center text-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-3"></div>
                <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Memuat kamera...</p>
                <p className="text-xs opacity-75 mt-1">Pastikan akses kamera diizinkan</p>
              </div>
            </div>
          )}
          
          {/* Black Screen Indicator */}
          {streamRef.current && videoRef.current?.videoWidth === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-lg">
              <div className="text-center text-white">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
                <p className="text-sm">Kamera tidak menampilkan gambar</p>
                <p className="text-xs opacity-75 mt-1">Klik tombol &quot;Restart Kamera&quot; untuk memperbaiki</p>
              </div>
            </div>
          )}
          
          {/* Status Overlay */}
          <div className="absolute bottom-2 left-2 right-2">
            {isAutoDetecting && (
              <div className="bg-green-500/90 text-white px-3 py-1 rounded text-sm">
                <Camera className="w-4 h-4 inline mr-2" />
                Sistem aktif mendeteksi wajah...
              </div>
            )}
            {isRecognizing && (
              <div className="bg-blue-500/90 text-white px-3 py-1 rounded text-sm">
                <Camera className="w-4 h-4 inline mr-2" />
                Memproses wajah...
              </div>
            )}
          </div>
          
          {/* Camera Status Indicator */}
          <div className="absolute top-2 right-2">
            {streamRef.current && (
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            )}
          </div>
        </div>

        {/* Info Panel */}
        <div className="text-center text-sm text-gray-600 mb-4">
          <div className="flex items-center justify-center mb-2">
            <Users className="w-4 h-4 mr-1" />
            <span className="font-medium">{employeeData.length} karyawan terdaftar</span>
          </div>
          
          {/* Employee List */}
          {employeeData.length > 0 && (
            <div className="text-xs text-gray-500 mb-2">
              Karyawan terdaftar: {employeeData.map(emp => emp.name).join(', ')}
            </div>
          )}
          
          <p>Posisikan wajah Anda di dalam frame</p>
          {dataLoadTime && (
            <p className="text-xs mt-1 text-gray-500">
              Data dimuat: {dataLoadTime}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-2">
          <Button 
            onClick={toggleFaceRecognition}
            disabled={employeeData.length === 0}
            className="flex-1"
            variant={isAutoDetecting ? "destructive" : "default"}
          >
            <UserCheck className="w-4 h-4 mr-2" />
            {isAutoDetecting ? 'Hentikan Deteksi' : 'Mulai Deteksi Wajah'}
          </Button>
          
          <Button 
            onClick={handleRetry} 
            variant="outline" 
            size="sm"
            title="Refresh data karyawan dan restart kamera"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Camera Control Buttons */}
        <div className="flex gap-2 mb-4">
          <Button 
            onClick={startWebcam} 
            variant="outline" 
            size="sm"
            className="flex-1"
            title="Test dan restart kamera"
          >
            <Camera className="w-4 h-4 mr-2" />
            {streamRef.current ? 'Restart Kamera' : 'Mulai Kamera'}
          </Button>
          
          <Button 
            onClick={stopCamera} 
            variant="outline" 
            size="sm"
            className="flex-1"
            title="Hentikan kamera"
          >
            <X className="w-4 h-4 mr-2" />
            Stop Kamera
          </Button>
        </div>

        {/* Camera Debug Info */}
        <SimpleCameraTest />

        {/* Auto-detection info */}
        <div className="text-xs text-gray-500 text-center mt-2 space-y-1">
          <div>Sistem akan mendeteksi wajah secara otomatis setiap 2 detik</div>
          {employeeData.length > 0 && (
            <div className="bg-gray-50 p-2 rounded text-left">
              <div className="font-medium">Status Sistem:</div>
              <div>• API: Connected</div>
              <div>• Karyawan: {employeeData[0]?.name}</div>
              <div>• Employee ID: {employeeData[0]?.employeeId}</div>
              <div>• Mode: {mode === 'checkIn' ? 'Check In' : 'Check Out'}</div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default BasicFaceRecognition; 