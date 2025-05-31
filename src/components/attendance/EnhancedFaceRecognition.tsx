"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  Camera, 
  Clock,
  Loader2,
  Eye
} from 'lucide-react';
import '@tensorflow/tfjs-backend-webgl';
import * as tf from '@tensorflow/tfjs-core';
import * as faceapi from 'face-api.js';

interface EnhancedFaceRecognitionProps {
  onSuccessfulRecognition: (employeeId: string) => void;
  mode: 'checkIn' | 'checkOut';
}

interface Employee {
  id: string;
  employeeId: string;
  faceData?: string | null;
  user?: {
    name?: string;
  };
  department?: {
    name?: string;
  };
}

// Konstanta
const DETECTION_INTERVAL = 3000; // 3 detik untuk stabilitas
const MATCH_THRESHOLD = 0.6; // Threshold matching

const EnhancedFaceRecognition: React.FC<EnhancedFaceRecognitionProps> = ({
  onSuccessfulRecognition,
  mode
}) => {
  // State
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [recognizedName, setRecognizedName] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [modelsLoaded, setModelsLoaded] = useState<boolean>(false);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [detectionMessage, setDetectionMessage] = useState<string>('Memuat sistem pengenalan wajah...');
  const [tfReady, setTfReady] = useState<boolean>(false);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const isDetectingRef = useRef<boolean>(false);
  const employeeDescriptorsRef = useRef<Map<string, Float32Array>>(new Map());

  // Reset state saat mode berubah
  useEffect(() => {
    if (success) {
      setSuccess(false);
      setRecognizedName(null);
      setIsProcessing(false);
    }
  }, [mode, success]);

  // Cleanup function
  const cleanup = useCallback(() => {
    console.log('Cleaning up resources...');
    
    // Stop detection
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    
    // Stop camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log(`Camera track stopped: ${track.kind}`);
      });
      streamRef.current = null;
    }
    
    // Cleanup TensorFlow memory
    try {
      tf.engine().disposeVariables();
      console.log('TensorFlow variables disposed');
    } catch (e) {
      console.warn('Error disposing TensorFlow variables:', e);
    }
    
    setCameraActive(false);
    isDetectingRef.current = false;
  }, []);

  // 1. Inisialisasi TensorFlow.js backend dan load models
  useEffect(() => {
    let isMounted = true;
    
    async function initializeTensorFlow() {
      try {
        console.log('Initializing TensorFlow.js backend...');
        setDetectionMessage('Menginisialisasi TensorFlow.js...');
        
        // Pastikan backend WebGL tersedia, fallback ke CPU jika perlu
        try {
          await tf.setBackend('webgl');
          await tf.ready();
          console.log('TensorFlow.js WebGL backend ready');
        } catch (webglError) {
          console.warn('WebGL backend failed, falling back to CPU:', webglError);
          await tf.setBackend('cpu');
          await tf.ready();
          console.log('TensorFlow.js CPU backend ready');
        }
        
        if (!isMounted) return;
        setTfReady(true);
        
        // Load face-api models
        console.log('Loading face-api.js models...');
        setDetectionMessage('Memuat model AI...');
        
        const MODEL_URL = '/models';
        
        // Load models dengan retry mechanism
        let modelsLoaded = false;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (!modelsLoaded && retryCount < maxRetries && isMounted) {
          try {
            await Promise.all([
              faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
              faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
              faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
            ]);
            modelsLoaded = true;
            console.log('Face-api.js models loaded successfully');
          } catch (modelError) {
            retryCount++;
            console.warn(`Model loading attempt ${retryCount} failed:`, modelError);
            if (retryCount < maxRetries) {
              console.log('Retrying model loading in 2 seconds...');
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        }
        
        if (!modelsLoaded) {
          throw new Error('Gagal memuat model AI setelah beberapa percobaan');
        }
        
        if (!isMounted) return;
        setModelsLoaded(true);
        
      } catch (error) {
        console.error('Error initializing TensorFlow/Models:', error);
        if (isMounted) {
          setError(`Gagal menginisialisasi sistem AI: ${error instanceof Error ? error.message : 'Unknown error'}`);
          setIsLoading(false);
        }
      }
    }
    
    initializeTensorFlow();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Load employee data setelah models ready
  useEffect(() => {
    if (!modelsLoaded) return;
    
    async function loadEmployeeData() {
      try {
        console.log('Loading employee data...');
        setDetectionMessage('Mengambil data karyawan...');
        
        const response = await fetch('/api/employees?include_face=true', {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Error ${response.status} saat mengambil data karyawan`);
        }
        
        const employeeData = await response.json();
        
        // Handle jika response adalah object dengan success property
        let employees: Employee[] = [];
        if (employeeData.success === false) {
          throw new Error(employeeData.error || 'Gagal mengambil data karyawan');
        } else if (Array.isArray(employeeData)) {
          employees = employeeData;
        } else if (employeeData.data && Array.isArray(employeeData.data)) {
          employees = employeeData.data;
        } else if (employeeData.employees && Array.isArray(employeeData.employees)) {
          employees = employeeData.employees;
        } else {
          console.warn('Format response tidak dikenali:', employeeData);
          employees = [];
        }
        
        // Filter employees with face data
        const employeesWithFace = employees.filter(emp => 
          emp.faceData && 
          emp.faceData !== '[TERSEDIA]' && 
          emp.faceData.trim() !== '' &&
          emp.faceData !== 'null' &&
          emp.faceData !== null
        );
        
        console.log(`Total employees: ${employees.length}`);
        console.log(`Employees with face data: ${employeesWithFace.length}`);
        
        if (employeesWithFace.length === 0) {
          console.warn('Tidak ada karyawan dengan data wajah');
          // Tetap lanjutkan untuk testing, tapi tampilkan peringatan
          setDetectionMessage('Peringatan: Tidak ada data wajah karyawan. Sistem berjalan dalam mode testing.');
        }
        
        setEmployees(employeesWithFace);
        
        // Preprocess face descriptors
        await preprocessFaceDescriptors(employeesWithFace);
        
      } catch (error) {
        console.error('Error loading employee data:', error);
        setError(`Gagal memuat data karyawan: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setIsLoading(false);
      }
    }
    
    loadEmployeeData();
  }, [modelsLoaded]);

  // 3. Start camera setelah employee data loaded
  useEffect(() => {
    if (!modelsLoaded || employees.length === 0) return;
    
    let isMounted = true;
    
    async function startCamera() {
      try {
        console.log('Starting camera...');
        setDetectionMessage('Mengaktifkan kamera...');
        
        // Check browser support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Browser tidak mendukung akses kamera');
        }
        
        // Request camera access dengan fallback constraints
        let stream: MediaStream | null = null;
        
        try {
          // Coba dengan constraints ideal
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 640, min: 320 },
              height: { ideal: 480, min: 240 },
              facingMode: 'user'
            },
            audio: false
          });
        } catch (idealError) {
          console.warn('Ideal camera constraints failed, trying basic:', idealError);
          // Fallback ke constraints minimal
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: 'user'
              },
              audio: false
            });
          } catch (basicError) {
            console.warn('Basic camera constraints failed, trying any video:', basicError);
            // Fallback terakhir - video device apapun
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false
            });
          }
        }
        
        if (!isMounted) {
          stream?.getTracks().forEach(track => track.stop());
          return;
        }
        
        if (!stream) {
          throw new Error('Gagal mendapatkan stream kamera');
        }
        
        streamRef.current = stream;
        
        if (!videoRef.current) {
          throw new Error('Video element tidak ditemukan');
        }
        
        videoRef.current.srcObject = stream;
        
        // Tunggu hingga video memicu event loadeddata dengan timeout
        await new Promise<void>((resolve, reject) => {
          const video = videoRef.current!;
          
          const timeoutId = setTimeout(() => {
            video.removeEventListener('loadeddata', handler);
            video.removeEventListener('loadedmetadata', metadataHandler);
            reject(new Error('Timeout loading video'));
          }, 15000); // Increase timeout to 15 seconds
          
          const handler = () => {
            clearTimeout(timeoutId);
            video.removeEventListener('loadeddata', handler);
            video.removeEventListener('loadedmetadata', metadataHandler);
            console.log('Video loadeddata event fired');
            resolve();
          };
          
          const metadataHandler = () => {
            console.log('Video metadata loaded');
            // Jangan resolve di sini, tunggu loadeddata
          };
          
          video.addEventListener('loadeddata', handler);
          video.addEventListener('loadedmetadata', metadataHandler);
          
          // Force load jika sudah ada data
          if (video.readyState >= 2) {
            handler();
          }
        });
        
        if (!isMounted) return;
        
        // Play video dengan retry
        let playAttempts = 0;
        const maxPlayAttempts = 3;
        
        while (playAttempts < maxPlayAttempts) {
          try {
            await videoRef.current.play();
            console.log('Video started playing');
            break;
          } catch (playError) {
            playAttempts++;
            console.warn(`Video play attempt ${playAttempts} failed:`, playError);
            if (playAttempts < maxPlayAttempts) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
              throw new Error('Gagal memutar video setelah beberapa percobaan');
            }
          }
        }
        
        // Setup canvas dengan dimensi yang benar
        if (canvasRef.current && videoRef.current.videoWidth > 0) {
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
          console.log(`Canvas size set to: ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`);
        } else {
          // Fallback canvas size
          if (canvasRef.current) {
            canvasRef.current.width = 640;
            canvasRef.current.height = 480;
            console.log('Using fallback canvas size: 640x480');
          }
        }
        
        setCameraActive(true);
        setDetectionMessage('Kamera aktif. Posisikan wajah Anda di depan kamera.');
        setIsLoading(false);
        
        // Start detection loop
        startDetectionLoop();
        
      } catch (error) {
        console.error('Camera initialization failed:', error);
        if (isMounted) {
          let errorMessage = 'Gagal mengaktifkan kamera';
          
          if (error instanceof Error) {
            if (error.message.includes('Permission denied')) {
              errorMessage = 'Akses kamera ditolak. Silakan izinkan akses kamera di browser.';
            } else if (error.message.includes('not found')) {
              errorMessage = 'Kamera tidak ditemukan. Pastikan kamera terhubung.';
            } else {
              errorMessage = `Gagal mengaktifkan kamera: ${error.message}`;
            }
          }
          
          setError(errorMessage);
          setIsLoading(false);
        }
      }
    }
    
    startCamera();
    
    return () => {
      isMounted = false;
    };
  }, [modelsLoaded, employees]);

  // Preprocess face descriptors
  const preprocessFaceDescriptors = async (employees: Employee[]): Promise<void> => {
    for (const employee of employees) {
      try {
        if (employee.faceData) {
          const descriptor = parseDescriptor(employee.faceData);
          if (descriptor) {
            employeeDescriptorsRef.current.set(employee.id, descriptor);
          }
        }
      } catch (error) {
        console.warn(`Error preprocessing face data for ${employee.employeeId}:`, error);
      }
    }
    console.log(`Preprocessed ${employeeDescriptorsRef.current.size} face descriptors`);
  };

  // Parse face descriptor from string
  const parseDescriptor = (faceDataStr: string): Float32Array | null => {
    try {
      const data = JSON.parse(faceDataStr);
      if (Array.isArray(data)) {
        return new Float32Array(data);
      }
      return null;
    } catch (error) {
      console.warn('Error parsing face descriptor:', error);
      return null;
    }
  };

  // Start detection loop using requestAnimationFrame
  const startDetectionLoop = useCallback(() => {
    if (!cameraActive || !modelsLoaded) return;
    
    console.log('Starting face detection loop...');
    
    const runDetection = async () => {
      if (!videoRef.current || !canvasRef.current || isDetectingRef.current || success) {
        rafIdRef.current = requestAnimationFrame(runDetection);
        return;
      }
      
      try {
        isDetectingRef.current = true;
        setIsProcessing(true);
        setDetectionMessage('Mendeteksi wajah...');
        
        // Face detection dengan face-api.js (sudah handle memory management)
        const detection = await faceapi
          .detectSingleFace(videoRef.current!, new faceapi.TinyFaceDetectorOptions({ 
            inputSize: 320, 
            scoreThreshold: 0.5 
          }))
          .withFaceLandmarks()
          .withFaceDescriptor();
        
        if (detection) {
          console.log('Face detected');
          
          // Draw detection box and landmarks
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            faceapi.draw.drawDetections(canvasRef.current, [detection.detection]);
            faceapi.draw.drawFaceLandmarks(canvasRef.current, [detection.landmarks]);
          }
          
          // Match with employees
          setDetectionMessage('Mencocokkan wajah...');
          const matchedEmployee = await matchFaceWithEmployees(detection.descriptor);
          
          if (matchedEmployee) {
            await processAttendance(matchedEmployee);
            return; // Stop loop on successful match
          } else {
            setDetectionMessage('Wajah tidak dikenali. Coba posisikan wajah dengan lebih jelas.');
          }
        } else {
          setDetectionMessage('Tidak ada wajah terdeteksi. Posisikan wajah Anda di depan kamera.');
          
          // Clear canvas
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          }
        }
        
      } catch (error) {
        console.error('Error in face detection:', error);
        setDetectionMessage('Error saat mendeteksi wajah. Mencoba lagi...');
      } finally {
        isDetectingRef.current = false;
        setIsProcessing(false);
        
        // Continue detection loop
        setTimeout(() => {
          if (cameraActive && !success) {
            rafIdRef.current = requestAnimationFrame(runDetection);
          }
        }, DETECTION_INTERVAL);
      }
    };
    
    rafIdRef.current = requestAnimationFrame(runDetection);
    
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [cameraActive, modelsLoaded, success]);

  // Match face with employees
  const matchFaceWithEmployees = async (detectedDescriptor: Float32Array): Promise<Employee | null> => {
    let bestMatch: Employee | null = null;
    let bestDistance = 1.0;
    
    for (const employee of employees) {
      const employeeDescriptor = employeeDescriptorsRef.current.get(employee.id);
      if (!employeeDescriptor) continue;
      
      const distance = faceapi.euclideanDistance(detectedDescriptor, employeeDescriptor);
      
      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = employee;
      }
    }
    
    if (bestMatch && bestDistance < MATCH_THRESHOLD) {
      const confidence = Math.round((1 - bestDistance) * 100);
      console.log(`Face matched: ${bestMatch.user?.name} (${confidence}%)`);
      return bestMatch;
    }
    
    return null;
  };

  // Process attendance
  const processAttendance = async (employee: Employee): Promise<void> => {
    try {
      setDetectionMessage('Memproses presensi...');
      
      // Stop detection during processing
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      
      console.log(`Processing attendance for employee ID: ${employee.id}, mode: ${mode}`);
      
      let response: Response;
      
      if (mode === 'checkIn') {
        response = await fetch('/api/attendance/check-in', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            employeeId: employee.id
          })
        });
      } else {
        response = await fetch('/api/attendance/check-out', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            employeeId: employee.id
          })
        });
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        
        // Handle specific error cases
        if (response.status === 400 && errorData.message) {
          // Ini adalah error bisnis (sudah check-in, belum check-in, dll)
          console.log(`Business error: ${errorData.message}`);
          setError(errorData.message);
          return;
        }
        
        throw new Error(errorData.message || `Error status ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Response tidak berhasil');
      }
      
      // Success
      const actionType = mode === 'checkIn' ? 'masuk' : 'pulang';
      console.log(`Attendance ${actionType} berhasil untuk ${employee.user?.name || employee.employeeId}`);
      
      setSuccess(true);
      setRecognizedName(employee.user?.name || employee.employeeId || 'Karyawan');
      setDetectionMessage(`Presensi ${actionType} berhasil!`);
      
      onSuccessfulRecognition(employee.id);
      
    } catch (error) {
      console.error('Error processing attendance:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Gagal memproses presensi: ${errorMessage}`);
      
      // Restart detection on error after delay
      setTimeout(() => {
        if (!success) { // Only restart if we're not in success state
          setError(null);
          setDetectionMessage('Posisikan wajah Anda di depan kamera.');
          startDetectionLoop();
        }
      }, 3000);
    }
  };

  // Handle refresh
  const handleRefresh = (): void => {
    setError(null);
    setSuccess(false);
    setIsProcessing(false);
    setCameraActive(false);
    setModelsLoaded(false);
    setTfReady(false);
    setIsLoading(true);
    
    cleanup();
    
    // Re-initialize everything
    window.location.reload();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Loading state
  if (isLoading) {
    const progress = tfReady ? (modelsLoaded ? 80 : 40) : 20;
    
    return (
      <Card className="w-full max-w-md mx-auto overflow-hidden">
        <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
          <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
          <h3 className="text-lg font-semibold text-center">Memuat Sistem Pengenalan Wajah</h3>
          <p className="text-muted-foreground text-center mt-2">{detectionMessage}</p>
          <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="w-full max-w-md mx-auto overflow-hidden">
        <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
          <AlertCircle className="w-12 h-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold text-center">Terjadi Kesalahan</h3>
          <p className="text-muted-foreground text-center mt-2 mb-4">{error}</p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Muat Ulang Sistem
          </Button>
        </div>
      </Card>
    );
  }

  // Success state
  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto overflow-hidden">
        <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
          <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
          <h3 className="text-lg font-semibold text-center text-green-700">
            Presensi Berhasil!
          </h3>
          <p className="text-center text-muted-foreground mt-2">
            {recognizedName} - {mode === 'checkIn' ? 'Berhasil Masuk' : 'Berhasil Pulang'}
          </p>
          <Button onClick={handleRefresh} variant="outline" className="mt-6">
            <RefreshCw className="w-4 h-4 mr-2" />
            Presensi Lainnya
          </Button>
        </div>
      </Card>
    );
  }

  // Main interface
  return (
    <Card className="w-full max-w-md mx-auto overflow-hidden">
      <div className="relative">
        {/* Camera view */}
        <div className="aspect-video relative overflow-hidden bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute top-0 left-0 w-full h-full object-cover"
          />
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full z-10"
          />
          
          {/* Header overlay */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20">
            <div className="bg-black/70 text-white px-3 py-1 rounded-full text-sm flex items-center">
              <Camera className="w-4 h-4 mr-2" />
              <span>{mode === 'checkIn' ? 'Check In' : 'Check Out'}</span>
            </div>
            <div className="bg-black/70 text-white px-3 py-1 rounded-full text-sm flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              <span>{new Date().toLocaleTimeString('id-ID')}</span>
            </div>
          </div>
          
          {/* Status overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent text-white p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Eye className="w-5 h-5 mr-2" />
              )}
              <span className="text-sm">{detectionMessage}</span>
            </div>
            
            {cameraActive && (
              <div className="flex items-center justify-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                <span className="text-xs text-green-400">Kamera Aktif • TensorFlow.js Ready</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Control panel */}
        <div className="p-4">
          <Button onClick={handleRefresh} variant="outline" className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Muat Ulang Sistem
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default EnhancedFaceRecognition; 