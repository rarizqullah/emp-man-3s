"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'react-hot-toast';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  RefreshCw,
  UserCheck,
  X,
  Users,
  Eye,
  Clock
} from 'lucide-react';
import {
  faceRecognitionService,
  type EmployeeFaceData,
  type FaceDetectionResult,
  FACE_CONFIG
} from '@/lib/face-recognition-service';

interface OptimizedFaceRecognitionProps {
  onSuccessfulRecognition: (employeeId: string) => void;
  mode: 'checkIn' | 'checkOut';
}

// Konstanta untuk video dan deteksi
const VIDEO_CONSTRAINTS = {
  width: { ideal: 640, min: 320 },
  height: { ideal: 480, min: 240 },
  facingMode: 'user' as const,
  frameRate: { ideal: 30, max: 60 }
};

const DETECTION_INTERVAL = 2000; // 2 detik interval
const AUTO_RECOGNITION_DELAY = 2000; // 2 detik sebelum otomatis proceed

const OptimizedFaceRecognition: React.FC<OptimizedFaceRecognitionProps> = ({
  onSuccessfulRecognition,
  mode
}) => {
  // State management
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [employeeData, setEmployeeData] = useState<EmployeeFaceData[]>([]);
  const [recognizedEmployee, setRecognizedEmployee] = useState<EmployeeFaceData | null>(null);
  const [lastDetectionTime, setLastDetectionTime] = useState<string>('');
  const [detectionMetrics, setDetectionMetrics] = useState<{
    accuracy: number;
    latency: number;
    confidence: number;
  } | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isDetectingRef = useRef(false);

  // Cleanup function
  const cleanup = useCallback(() => {
    console.log('🧹 Cleaning up face recognition resources...');
    
    // Stop detection
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    
    if (recognitionTimeoutRef.current) {
      clearTimeout(recognitionTimeoutRef.current);
      recognitionTimeoutRef.current = null;
    }
    
    // Stop camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setCameraActive(false);
    setIsDetecting(false);
    isDetectingRef.current = false;
  }, []);

  // Initialize face recognition system
  useEffect(() => {
    let mounted = true;
    
    const initializeSystem = async () => {
      try {
        setIsInitializing(true);
        setError(null);
        
        console.log('🚀 Initializing optimized face recognition system...');
        
        // Check browser support
        if (typeof window === 'undefined') {
          throw new Error('Browser environment required');
        }
        
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera access not supported in this browser');
        }
        
        // Initialize face recognition service
        await faceRecognitionService.initialize();
        
        if (!mounted) return;
        
        // Load employee data
        const employees = await faceRecognitionService.loadEmployeeData();
        
        if (!mounted) return;
        
        setEmployeeData(employees);
        
        if (employees.length === 0) {
          console.warn('⚠️ No employee face data available');
          setError('Tidak ada data wajah karyawan. Silakan tambahkan data wajah di menu karyawan.');
          return;
        }
        
        console.log(`✅ System initialized with ${employees.length} employees`);
        
        // Start camera
        await startCamera();
        
      } catch (error) {
        console.error('❌ Failed to initialize face recognition:', error);
        if (mounted) {
          setError(error instanceof Error ? error.message : 'Gagal menginisialisasi sistem');
        }
      } finally {
        if (mounted) {
          setIsInitializing(false);
        }
      }
    };
    
    initializeSystem();
    
    return () => {
      mounted = false;
      cleanup();
    };
  }, [cleanup]);

  // Start camera
  const startCamera = async (): Promise<void> => {
    try {
      console.log('📷 Starting optimized camera...');
      
      if (streamRef.current) {
        console.log('Camera already active');
        return;
      }
      
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: VIDEO_CONSTRAINTS,
        audio: false
      });
      
      streamRef.current = stream;
      
      if (!videoRef.current) {
        throw new Error('Video element not available');
      }
      
      videoRef.current.srcObject = stream;
      
      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        if (!videoRef.current) {
          reject(new Error('Video element lost'));
          return;
        }
        
        const video = videoRef.current;
        
        const handleLoadedData = () => {
          console.log('📷 Video loaded, dimensions:', {
            width: video.videoWidth,
            height: video.videoHeight
          });
          
          // Setup canvas dimensions
          setupCanvasElements();
          resolve();
        };
        
        const handleError = (error: Event) => {
          console.error('Video error:', error);
          reject(new Error('Failed to load video'));
        };
        
        video.addEventListener('loadeddata', handleLoadedData, { once: true });
        video.addEventListener('error', handleError, { once: true });
        
        // Fallback timeout
        setTimeout(() => {
          reject(new Error('Video loading timeout'));
        }, 10000);
      });
      
      setCameraActive(true);
      
      // Start face detection
      startFaceDetection();
      
      console.log('✅ Camera started successfully');
      
    } catch (error) {
      console.error('❌ Camera start failed:', error);
      setError('Gagal mengaktifkan kamera. Pastikan kamera tersedia dan izin diberikan.');
      throw error;
    }
  };

  // Setup canvas elements
  const setupCanvasElements = () => {
    if (!videoRef.current) return;
    
    const { videoWidth, videoHeight } = videoRef.current;
    
    if (canvasRef.current) {
      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;
    }
    
    if (overlayCanvasRef.current) {
      overlayCanvasRef.current.width = videoWidth;
      overlayCanvasRef.current.height = videoHeight;
      
      // Setup overlay canvas style
      const video = videoRef.current;
      const canvas = overlayCanvasRef.current;
      const videoRect = video.getBoundingClientRect();
      
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.pointerEvents = 'none';
    }
  };

  // Start face detection loop
  const startFaceDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
    
    console.log('🔍 Starting face detection loop...');
    
    detectionIntervalRef.current = setInterval(() => {
      if (!isDetectingRef.current && cameraActive && !recognizedEmployee) {
        detectAndRecognizeFace();
      }
    }, DETECTION_INTERVAL);
  };

  // Main face detection and recognition function
  const detectAndRecognizeFace = async () => {
    if (!videoRef.current || !cameraActive || isDetectingRef.current || recognizedEmployee) {
      return;
    }
    
    isDetectingRef.current = true;
    setIsDetecting(true);
    
    try {
      const startTime = performance.now();
      
      // Detect face using optimized service
      const detection: FaceDetectionResult | null = await faceRecognitionService.detectFaceWithDescriptor(
        videoRef.current
      );
      
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);
      
      if (detection) {
        console.log('✅ Face detected with confidence:', detection.confidence);
        
        // Draw detection overlay
        drawDetectionOverlay(detection);
        
        // Find matching employee
        const match = faceRecognitionService.findBestMatch(
          detection.descriptor,
          employeeData
        );
        
        if (match) {
          console.log(`🎉 Employee recognized: ${match.employee.name}`);
          
          setRecognizedEmployee(match.employee);
          setDetectionMetrics({
            accuracy: detection.confidence,
            latency,
            confidence: match.confidence
          });
          setLastDetectionTime(new Date().toLocaleTimeString());
          
          toast.success(`Wajah dikenali: ${match.employee.name} (${match.confidence}%)`);
          
          // Auto proceed after delay
          recognitionTimeoutRef.current = setTimeout(() => {
            handleSuccessfulRecognition(match.employee.employeeId);
          }, AUTO_RECOGNITION_DELAY);
          
        } else {
          console.log('❌ No matching employee found');
          clearDetectionOverlay();
          setDetectionMetrics({
            accuracy: detection.confidence,
            latency,
            confidence: 0
          });
        }
      } else {
        console.log('❌ No face detected');
        clearDetectionOverlay();
      }
      
    } catch (error) {
      console.error('Error in face detection:', error);
    } finally {
      setIsDetecting(false);
      isDetectingRef.current = false;
    }
  };

  // Draw detection overlay
  const drawDetectionOverlay = (detection: FaceDetectionResult) => {
    if (!overlayCanvasRef.current || !videoRef.current) return;
    
    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw face detection box
    const { x, y, width, height } = detection.detection.box;
    
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(0, 255, 0, 0.5)';
    ctx.shadowBlur = 10;
    
    ctx.strokeRect(x, y, width, height);
    
    // Draw confidence score
    ctx.fillStyle = '#00ff00';
    ctx.font = '16px Arial';
    ctx.fillText(
      `${Math.round(detection.confidence * 100)}%`,
      x,
      y - 10
    );
    
    // Draw landmarks
    if (detection.landmarks) {
      ctx.fillStyle = '#ff0000';
      const points = detection.landmarks.positions;
      
      points.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 1, 0, 2 * Math.PI);
        ctx.fill();
      });
    }
  };

  // Clear detection overlay
  const clearDetectionOverlay = () => {
    if (!overlayCanvasRef.current) return;
    
    const ctx = overlayCanvasRef.current.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
    }
  };

  // Handle successful recognition
  const handleSuccessfulRecognition = (employeeId: string) => {
    cleanup();
    onSuccessfulRecognition(employeeId);
  };

  // Manual retry
  const handleRetry = async () => {
    setError(null);
    setRecognizedEmployee(null);
    setDetectionMetrics(null);
    
    if (recognitionTimeoutRef.current) {
      clearTimeout(recognitionTimeoutRef.current);
      recognitionTimeoutRef.current = null;
    }
    
    try {
      // Refresh employee data
      const employees = await faceRecognitionService.loadEmployeeData(true);
      setEmployeeData(employees);
      
      if (!cameraActive) {
        await startCamera();
      } else {
        startFaceDetection();
      }
      
      toast.success('Sistem berhasil di-reset');
    } catch (error) {
      setError('Gagal me-reset sistem');
      toast.error('Gagal me-reset sistem');
    }
  };

  // Manual recognition trigger
  const triggerManualRecognition = () => {
    if (!isDetecting && cameraActive) {
      detectAndRecognizeFace();
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Face Recognition - {mode === 'checkIn' ? 'Check In' : 'Check Out'}
          </h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={cleanup}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Status Info */}
        {employeeData.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <Users className="w-4 h-4" />
              <span>{employeeData.length} karyawan terdaftar</span>
            </div>
            {lastDetectionTime && (
              <div className="flex items-center gap-2 text-xs text-blue-600 mt-1">
                <Clock className="w-3 h-3" />
                <span>Deteksi terakhir: {lastDetectionTime}</span>
              </div>
            )}
          </div>
        )}

        {/* Video Container */}
        <div className="relative bg-gray-900 rounded-lg overflow-hidden mb-4" 
             style={{ aspectRatio: '4/3', minHeight: '300px' }}>
          
          {/* Video Element */}
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            muted
            playsInline
            style={{ 
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
          
          {/* Overlay Canvas for Detection */}
          <canvas
            ref={overlayCanvasRef}
            className="absolute inset-0 pointer-events-none"
          />
          
          {/* Hidden Canvas for Processing */}
          <canvas
            ref={canvasRef}
            className="hidden"
          />
          
          {/* Loading State */}
          {isInitializing && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              <div className="text-center text-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-3"></div>
                <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Menginisialisasi sistem...</p>
              </div>
            </div>
          )}
          
          {/* Camera Loading */}
          {!isInitializing && !cameraActive && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              <div className="text-center text-white">
                <Camera className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">Mengaktifkan kamera...</p>
              </div>
            </div>
          )}
          
          {/* Status Overlay */}
          <div className="absolute bottom-2 left-2 right-2">
            {isDetecting && (
              <div className="bg-blue-500/90 text-white px-3 py-1 rounded text-sm">
                <Camera className="w-4 h-4 inline mr-2" />
                Mendeteksi wajah...
              </div>
            )}
            {cameraActive && !isDetecting && !recognizedEmployee && (
              <div className="bg-green-500/90 text-white px-3 py-1 rounded text-sm">
                <Eye className="w-4 h-4 inline mr-2" />
                Sistem aktif - Posisikan wajah di depan kamera
              </div>
            )}
          </div>
          
          {/* Camera Status Indicator */}
          <div className="absolute top-2 right-2">
            {cameraActive && (
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            )}
          </div>
        </div>

        {/* Detection Metrics */}
        {detectionMetrics && (
          <div className="mb-4 grid grid-cols-3 gap-2 text-xs">
            <div className="bg-gray-100 p-2 rounded text-center">
              <div className="font-medium text-gray-600">Akurasi</div>
              <div className="text-sm">{Math.round(detectionMetrics.accuracy * 100)}%</div>
            </div>
            <div className="bg-gray-100 p-2 rounded text-center">
              <div className="font-medium text-gray-600">Latensi</div>
              <div className="text-sm">{detectionMetrics.latency}ms</div>
            </div>
            <div className="bg-gray-100 p-2 rounded text-center">
              <div className="font-medium text-gray-600">Confidence</div>
              <div className="text-sm">{detectionMetrics.confidence}%</div>
            </div>
          </div>
        )}

        {/* Recognition Result */}
        {recognizedEmployee && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-medium text-green-800">
                  Wajah Dikenali: {recognizedEmployee.name}
                </p>
                <p className="text-sm text-green-600">
                  ID: {recognizedEmployee.employeeId}
                </p>
                {recognizedEmployee.department && (
                  <p className="text-sm text-green-600">
                    Dept: {recognizedEmployee.department}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {error && (
            <Button onClick={handleRetry} variant="outline" className="flex-1">
              <RefreshCw className="w-4 h-4 mr-2" />
              Coba Lagi
            </Button>
          )}
          
          {cameraActive && !recognizedEmployee && !error && (
            <Button 
              onClick={triggerManualRecognition}
              disabled={isDetecting}
              className="flex-1"
            >
              <UserCheck className="w-4 h-4 mr-2" />
              {isDetecting ? 'Memproses...' : 'Deteksi Manual'}
            </Button>
          )}
          
          {recognizedEmployee && (
            <Button 
              onClick={() => handleSuccessfulRecognition(recognizedEmployee.employeeId)}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Konfirmasi
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default OptimizedFaceRecognition; 