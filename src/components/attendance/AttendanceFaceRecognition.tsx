'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, AlertCircle, CheckCircle, Scan } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Face API types
interface FaceAPI {
  nets: {
    tinyFaceDetector: { loadFromUri: (url: string) => Promise<void> };
    faceLandmark68Net: { loadFromUri: (url: string) => Promise<void> };
    faceRecognitionNet: { loadFromUri: (url: string) => Promise<void> };
  };
  detectSingleFace: (input: HTMLVideoElement, options: any) => any;
  TinyFaceDetectorOptions: new () => any;
  euclideanDistance: (a: Float32Array, b: Float32Array) => number;
}

// TensorFlow types
interface TensorFlow {
  ready: () => Promise<void>;
  setBackend: (backend: string) => Promise<boolean>;
  getBackend: () => string;
}

// Global instances
let faceapi: FaceAPI | null = null;
let tf: TensorFlow | null = null;

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  departmentName: string;
  faceData: string;
}

interface AttendanceFaceRecognitionProps {
  mode: 'checkIn' | 'checkOut';
  onSuccessfulRecognition: (employeeId: string, employeeName: string) => void;
}

const AttendanceFaceRecognition: React.FC<AttendanceFaceRecognitionProps> = ({
  mode,
  onSuccessfulRecognition
}) => {
  // States
  const [isLoading, setIsLoading] = useState(true);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeDescriptors, setEmployeeDescriptors] = useState<Map<string, Float32Array>>(new Map());
  const [isScanning, setIsScanning] = useState(false);
  const [message, setMessage] = useState('Memuat sistem pengenalan wajah...');
  const [recognizedEmployee, setRecognizedEmployee] = useState<Employee | null>(null);
  const [isDetectionRunning, setIsDetectionRunning] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Constants
  const MATCH_THRESHOLD = 0.6;
  const DETECTION_INTERVAL = 100; // 100ms untuk smooth tracking

  // Load TensorFlow.js and face-api.js dynamically
  const loadFaceApi = async (): Promise<boolean> => {
    try {
      if (typeof window === 'undefined') {
        console.warn('⚠️ Not in browser environment');
        return false;
      }
      
      // Load TensorFlow.js first
      if (!tf) {
        console.log('🔄 Loading TensorFlow.js...');
        try {
          const tfModule = await import('@tensorflow/tfjs');
          tf = tfModule as unknown as TensorFlow;
          console.log('✅ TensorFlow.js loaded successfully');
        } catch (error) {
          console.error('❌ Failed to load TensorFlow.js:', error);
          return false;
        }
      }

      // Initialize TensorFlow backend
      console.log('🔄 Initializing TensorFlow backend...');
      try {
        // Set backend to webgl first, fallback to cpu
        try {
          await tf.setBackend('webgl');
          console.log('✅ WebGL backend set successfully');
        } catch {
          console.log('⚠️ WebGL not available, falling back to CPU backend');
          await tf.setBackend('cpu');
          console.log('✅ CPU backend set successfully');
        }
        
        // Wait for TensorFlow to be ready
        await tf.ready();
        console.log('✅ TensorFlow backend ready:', tf.getBackend());
      } catch (error) {
        console.error('❌ Failed to initialize TensorFlow backend:', error);
        return false;
      }
      
      // Load face-api.js after TensorFlow is ready
      if (!faceapi) {
        console.log('🔄 Loading face-api.js...');
        try {
          const faceApiModule = await import('@vladmandic/face-api');
          faceapi = faceApiModule as unknown as FaceAPI;
          console.log('✅ Loaded @vladmandic/face-api successfully');
        } catch {
          try {
            const faceApiModule = await import('face-api.js');
            faceapi = faceApiModule as unknown as FaceAPI;
            console.log('✅ Loaded face-api.js successfully');
          } catch (error) {
            console.error('❌ Failed to load face-api library:', error);
            return false;
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error in loadFaceApi:', error);
      return false;
    }
  };

  // Load face-api.js models
  const loadModels = async () => {
    try {
      setMessage('Memuat library face-api.js...');
      
      const faceApiLoaded = await loadFaceApi();
      if (!faceApiLoaded) {
        throw new Error('Gagal memuat library face-api.js');
      }
      
      // Wait a bit for TensorFlow to fully initialize
      setMessage('Menunggu TensorFlow siap...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setMessage('Memuat model AI...');
      console.log('🔄 Loading face recognition models from /models...');
      
      const MODEL_URL = '/models';
      
      // Load models sequentially with error handling
      try {
        setMessage('Memuat tiny face detector...');
        await faceapi!.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        console.log('✅ Tiny face detector loaded');
        
        setMessage('Memuat face landmark model...');
        await faceapi!.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        console.log('✅ Face landmark model loaded');
        
        setMessage('Memuat face recognition model...');
        await faceapi!.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        console.log('✅ Face recognition model loaded');
        
      } catch (modelError) {
        console.error('❌ Error loading specific model:', modelError);
        throw new Error(`Gagal memuat model: ${modelError}`);
      }
      
      // Verify models are loaded
      console.log('🔍 Verifying models are ready...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('✅ All face-api.js models loaded successfully');
      setModelsLoaded(true);
      setMessage('Model AI berhasil dimuat - Kamera siap');
      
    } catch (error) {
      console.error('❌ Error loading face-api.js models:', error);
      setMessage('Gagal memuat model AI - Refresh halaman');
      toast.error(`Gagal memuat model AI: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Load employee face data dengan enhanced error handling
  const loadEmployeeData = async (retryCount = 0, maxRetries = 3) => {
    try {
      setMessage('Mengambil data karyawan...');
      console.log(`Loading employee data (attempt ${retryCount + 1}/${maxRetries + 1})`);
      
      // Enhanced fetch dengan timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      try {
        const response = await fetch('/api/attendance/face-recognition-data', {
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          // Enhanced error handling berdasarkan status code
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          let shouldRetry = false;
          
          if (response.status === 503) {
            errorMessage = 'Database tidak tersedia saat ini';
            shouldRetry = true;
          } else if (response.status === 408) {
            errorMessage = 'Permintaan timeout, server membutuhkan waktu terlalu lama';
            shouldRetry = true;
          } else if (response.status === 500) {
            errorMessage = 'Terjadi kesalahan pada server';
            shouldRetry = true;
          }
          
          // Coba parse response untuk mendapatkan detail error
          try {
            const errorData = await response.json();
            if (errorData.error) {
              errorMessage = errorData.error;
            }
            if (errorData.retryable !== undefined) {
              shouldRetry = errorData.retryable;
            }
          } catch {
            // Fallback ke error message default
          }
          
          // Retry logic untuk retryable errors
          if (shouldRetry && retryCount < maxRetries) {
            const waitTime = Math.min(2000 * Math.pow(2, retryCount), 10000);
            console.log(`Retrying loadEmployeeData in ${waitTime}ms due to ${response.status} error`);
            setMessage(`${errorMessage}. Mencoba lagi dalam ${waitTime/1000} detik...`);
            
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return loadEmployeeData(retryCount + 1, maxRetries);
          }
          
          throw new Error(errorMessage);
        }
        
        const result = await response.json();
        
        // Validate response structure
        if (!result || typeof result !== 'object') {
          throw new Error('Format respons tidak valid dari server');
        }
        
        if (!result.success) {
          const errorMsg = result.error || 'Gagal mengambil data face recognition';
          
          // Check if retryable dari response
          if (result.retryable && retryCount < maxRetries) {
            const waitTime = Math.min(2000 * Math.pow(2, retryCount), 8000);
            console.log(`API returned retryable error, retrying in ${waitTime}ms`);
            setMessage(`${errorMsg}. Mencoba lagi dalam ${waitTime/1000} detik...`);
            
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return loadEmployeeData(retryCount + 1, maxRetries);
          }
          
          throw new Error(errorMsg);
        }
        
        // Process successful response
        const employees = result.data || [];
        console.log(`Received ${employees.length} employees from API`);
        
        setEmployees(employees);
        
        if (employees.length > 0) {
          await processFaceDescriptors(employees);
          console.log(`✅ Loaded ${employees.length} employees with face data`);
          setMessage(`Siap mengenali ${employees.length} karyawan`);
          toast.success(`Berhasil memuat data ${employees.length} karyawan`);
        } else {
          setMessage('Tidak ada karyawan dengan data wajah');
          toast.error('Tidak ada karyawan dengan data wajah yang tersedia.', {
            description: 'Hubungi admin untuk menambahkan data wajah karyawan'
          });
        }
        
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error loading employee data:', errorMessage);
      
      // Enhanced error categorization
      const isNetworkError = error instanceof TypeError || errorMessage.includes('fetch');
      const isTimeoutError = errorMessage.includes('timeout') || errorMessage.includes('aborted');
      const isConnectionError = errorMessage.includes('database') || errorMessage.includes('connection');
      
      // Retry logic untuk network/timeout errors
      const shouldRetry = (
        retryCount < maxRetries && 
        (isNetworkError || isTimeoutError || isConnectionError) &&
        !errorMessage.includes('tidak tersedia') // Don't retry if explicitly unavailable
      );
      
      if (shouldRetry) {
        const waitTime = Math.min(3000 * Math.pow(1.5, retryCount), 12000);
        console.log(`Network/timeout error, retrying in ${waitTime}ms`);
        
        let errorType = 'Network';
        if (isTimeoutError) errorType = 'Timeout';
        else if (isConnectionError) errorType = 'Database';
        
        setMessage(`${errorType} error. Mencoba lagi dalam ${Math.round(waitTime/1000)} detik...`);
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return loadEmployeeData(retryCount + 1, maxRetries);
      }
      
      // Final error - no more retries
      let userFriendlyError = errorMessage;
      
      if (isNetworkError) {
        userFriendlyError = 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
      } else if (isTimeoutError) {
        userFriendlyError = 'Permintaan timeout. Server membutuhkan waktu terlalu lama.';
      } else if (isConnectionError) {
        userFriendlyError = 'Masalah koneksi database. Silakan coba lagi nanti.';
      }
      
      setMessage(`Gagal memuat data: ${userFriendlyError}`);
      toast.error(`Gagal memuat data karyawan: ${userFriendlyError}`, {
        description: retryCount > 0 ? `Gagal setelah ${retryCount + 1} percobaan` : undefined
      });
    }
  };

  // Process face descriptors
  const processFaceDescriptors = async (employeeData: Employee[]) => {
    if (!faceapi) return;
    
    const descriptorMap = new Map<string, Float32Array>();
    let successCount = 0;
    
    for (const employee of employeeData) {
      try {
        if (!employee.faceData) continue;
        
        let descriptor: Float32Array | null = null;
        
        // Parse face data - support multiple formats
        if (employee.faceData.startsWith('{') || employee.faceData.startsWith('[')) {
          // JSON format
          try {
            const parsedData = JSON.parse(employee.faceData);
            if (Array.isArray(parsedData) && parsedData.length === 128) {
              descriptor = new Float32Array(parsedData);
            } else if (parsedData.descriptor && Array.isArray(parsedData.descriptor)) {
              descriptor = new Float32Array(parsedData.descriptor);
            }
          } catch {
            console.warn(`⚠️ Failed to parse JSON face data for ${employee.name}`);
          }
        } else if (employee.faceData.startsWith('data:image/')) {
          // Base64 image format - extract descriptor
          descriptor = await extractDescriptorFromImage(employee.faceData);
        } else if (employee.faceData.includes(',')) {
          // Comma separated values
          try {
            const values = employee.faceData.split(',').map(v => parseFloat(v.trim()));
            if (values.length === 128 && values.every(v => !isNaN(v))) {
              descriptor = new Float32Array(values);
            }
          } catch {
            console.warn(`⚠️ Failed to parse CSV face data for ${employee.name}`);
          }
        }
        
        if (descriptor && descriptor.length === 128) {
          descriptorMap.set(employee.id, descriptor);
          successCount++;
          console.log(`✅ Processed face data for ${employee.name}`);
        } else {
          console.warn(`⚠️ Invalid face descriptor for ${employee.name}`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing face data for ${employee.name}:`, error);
      }
    }
    
    setEmployeeDescriptors(descriptorMap);
    setMessage(`Siap mengenali ${successCount} karyawan`);
    console.log(`✅ Successfully processed ${successCount} face descriptors`);
  };

  // Extract descriptor from base64 image
  const extractDescriptorFromImage = async (base64Image: string): Promise<Float32Array | null> => {
    if (!faceapi) return null;
    
    try {
      return new Promise<Float32Array | null>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = async () => {
          try {
            const detection = await faceapi
              .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
              .withFaceLandmarks()
              .withFaceDescriptor();
            
            if (detection && detection.descriptor) {
              resolve(detection.descriptor);
            } else {
              console.warn('⚠️ No face detected in image');
              resolve(null);
            }
          } catch (error) {
            console.error('❌ Error extracting descriptor:', error);
            resolve(null);
          }
        };
        
        img.onerror = () => {
          console.error('❌ Failed to load image');
          resolve(null);
        };
        
        img.src = base64Image;
      });
    } catch (error) {
      console.error('❌ Error creating image element:', error);
      return null;
    }
  };

  // Start camera automatically
  const startCamera = async () => {
    try {
      setMessage('Mengaktifkan kamera...');
      console.log('🔄 Starting camera...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });
      
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        streamRef.current = stream;
        
        video.onloadedmetadata = () => {
          video.play().then(() => {
            console.log('✅ Camera started successfully');
            setMessage('Kamera aktif - Real-time face detection dimulai');
            toast.success('Kamera berhasil diaktifkan');
            
            // Start real-time face detection
            startRealTimeDetection();
          }).catch((error) => {
            console.error('❌ Video play failed:', error);
            setMessage('Gagal memulai video');
          });
        };
      }
      
    } catch (error) {
      console.error('❌ Error accessing camera:', error);
      setMessage('Gagal mengakses kamera - Berikan izin akses kamera');
      toast.error('Gagal mengakses kamera. Berikan izin akses kamera.');
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    stopRealTimeDetection();
  };

  // Start real-time face detection and tracking
  const startRealTimeDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
    
    setIsDetectionRunning(true);
    console.log('🔄 Starting real-time face detection...');
    
    detectionIntervalRef.current = setInterval(() => {
      detectAndDrawFace();
    }, DETECTION_INTERVAL);
  };

  // Stop real-time detection
  const stopRealTimeDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    setIsDetectionRunning(false);
    setFaceDetected(false);
    clearCanvas();
    console.log('🛑 Real-time face detection stopped');
  };

  // Detect and draw face continuously
  const detectAndDrawFace = async () => {
    if (!videoRef.current || !faceapi || !modelsLoaded || recognizedEmployee) {
      return;
    }
    
    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks();
      
      if (detection) {
        setFaceDetected(true);
        drawDetection(detection);
        
        // Update message based on face detection
        if (!isScanning && !recognizedEmployee) {
          setMessage('Wajah terdeteksi - Klik Scan untuk memulai pengenalan');
        }
      } else {
        setFaceDetected(false);
        clearCanvas();
        
        // Update message when no face detected
        if (!isScanning && !recognizedEmployee) {
          setMessage('Hadapkan wajah Anda ke kamera');
        }
      }
    } catch (error) {
      // Silent error handling for real-time detection
      console.debug('Detection error:', error);
    }
  };

  // Clear canvas
  const clearCanvas = () => {
    if (!canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  // Scan face - main function
  const scanFace = async () => {
    if (!videoRef.current || !faceapi || isScanning) return;
    
    setIsScanning(true);
    setMessage('Scanning wajah...');
    
    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();
      
      if (detection && detection.descriptor) {
        console.log('👤 Face detected, matching...');
        
        // Draw detection box
        drawDetection(detection);
        
        // Find matching employee
        const matchedEmployee = findBestMatch(detection.descriptor);
        
        if (matchedEmployee) {
          setRecognizedEmployee(matchedEmployee);
          setMessage(`${matchedEmployee.name} berhasil dikenali!`);
          toast.success(`Selamat datang, ${matchedEmployee.name}!`);
          
          // Call success callback
          setTimeout(() => {
            onSuccessfulRecognition(matchedEmployee.id, matchedEmployee.name);
          }, 1500);
        } else {
          setMessage('Wajah tidak dikenali. Coba lagi.');
          toast.error('Wajah tidak dikenali. Pastikan Anda terdaftar.');
          setTimeout(() => {
            setMessage('Klik tombol Scan Wajah untuk memulai');
          }, 3000);
        }
      } else {
        setMessage('Tidak ada wajah terdeteksi. Coba lagi.');
        setTimeout(() => {
          setMessage('Klik tombol Scan Wajah untuk memulai');
        }, 2000);
      }
      
    } catch (error) {
      console.error('❌ Error in face scanning:', error);
      setMessage('Error dalam scan wajah');
      toast.error('Error dalam scan wajah');
    } finally {
      setIsScanning(false);
    }
  };

  // Find best matching employee
  const findBestMatch = (detectedDescriptor: Float32Array): Employee | null => {
    if (!faceapi) return null;
    
    let bestMatch: Employee | null = null;
    let bestDistance = Infinity;
    
    for (const employee of employees) {
      const employeeDescriptor = employeeDescriptors.get(employee.id);
      if (!employeeDescriptor) continue;
      
      const distance = faceapi.euclideanDistance(detectedDescriptor, employeeDescriptor);
      
      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = employee;
      }
    }
    
    if (bestMatch && bestDistance < MATCH_THRESHOLD) {
      const confidence = Math.round((1 - bestDistance) * 100);
      console.log(`✅ Face matched: ${bestMatch.name} (confidence: ${confidence}%)`);
      return bestMatch;
    }
    
    console.log(`❌ No match found (best distance: ${bestDistance.toFixed(3)})`);
    return null;
  };

  // Draw detection box on canvas
  const drawDetection = (detection: any) => {
    if (!canvasRef.current || !videoRef.current) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw detection box
    const box = detection.detection.box;
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 3;
    ctx.strokeRect(box.x, box.y, box.width, box.height);
    
    // Draw landmarks
    if (detection.landmarks) {
      ctx.fillStyle = '#ff0000';
      detection.landmarks.positions.forEach((point: { x: number; y: number }) => {
        ctx.fillRect(point.x - 2, point.y - 2, 4, 4);
      });
    }
  };

  // Initialize system
  useEffect(() => {
    const initializeSystem = async () => {
      console.log('🚀 Initializing face recognition system...');
      
      try {
        // Load models first
        await loadModels();
        
        // Load employee data
        await loadEmployeeData();
        
        // Auto start camera
        await startCamera();
        
        console.log('✅ Face recognition system ready');
      } catch (error) {
        console.error('❌ Error initializing system:', error);
        setMessage('Gagal menginisialisasi sistem');
        toast.error('Gagal menginisialisasi sistem pengenalan wajah');
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeSystem();
    
    // Cleanup
    return () => {
      console.log('🧹 Cleaning up...');
      stopRealTimeDetection();
      stopCamera();
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Face Recognition - {mode === 'checkIn' ? 'Check In' : 'Check Out'}
        </h3>
        <p className="text-sm text-gray-600">
          Hadapkan wajah Anda ke kamera dan klik tombol scan
        </p>
      </div>

      {/* Status */}
      <div className={`p-4 rounded-lg border ${
        recognizedEmployee 
          ? 'bg-green-50 border-green-200' 
          : isScanning 
            ? 'bg-blue-50 border-blue-200'
            : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center space-x-3">
          {isLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          ) : recognizedEmployee ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : isScanning ? (
            <div className="animate-pulse"><Scan className="h-5 w-5 text-blue-500" /></div>
          ) : modelsLoaded ? (
            <Camera className="h-5 w-5 text-blue-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-500" />
          )}
          <span className="text-sm font-medium text-gray-700">
            {message}
          </span>
        </div>
      </div>

      {/* Camera Section */}
      {!isLoading && modelsLoaded && (
        <div className="space-y-4">
          {/* Video Preview */}
          <div className="relative bg-black rounded-lg overflow-hidden" style={{ minHeight: '400px' }}>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
              style={{ 
                minHeight: '400px',
                maxHeight: '500px'
              }}
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
            />
            
            {/* Recognition Overlay */}
            {recognizedEmployee && (
              <div className="absolute bottom-4 left-4 right-4 bg-green-500 bg-opacity-90 text-white p-4 rounded-lg text-center">
                <h4 className="font-bold text-lg">{recognizedEmployee.name}</h4>
                <p className="text-sm">{recognizedEmployee.departmentName}</p>
                <p className="text-xs mt-1">
                  {mode === 'checkIn' ? 'Processing Check In...' : 'Processing Check Out...'}
                </p>
              </div>
            )}
          </div>

                     {/* Scan Button */}
           <div className="flex justify-center">
             <button
               onClick={scanFace}
               disabled={isScanning || !modelsLoaded || recognizedEmployee !== null}
               className={`flex items-center space-x-3 px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 ${
                 isScanning
                   ? 'bg-blue-500 text-white cursor-not-allowed'
                   : recognizedEmployee
                     ? 'bg-green-500 text-white cursor-not-allowed'
                     : faceDetected
                       ? 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                       : 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-lg'
               } disabled:opacity-50 disabled:transform-none disabled:shadow-none`}
             >
               {isScanning ? (
                 <>
                   <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                   <span>Scanning...</span>
                 </>
               ) : recognizedEmployee ? (
                 <>
                   <CheckCircle className="h-6 w-6" />
                   <span>Berhasil Dikenali</span>
                 </>
               ) : faceDetected ? (
                 <>
                   <Scan className="h-6 w-6" />
                   <span>Scan Wajah (Wajah Terdeteksi)</span>
                 </>
               ) : (
                 <>
                   <Scan className="h-6 w-6" />
                   <span>Hadapkan Wajah ke Kamera</span>
                 </>
               )}
             </button>
           </div>
        </div>
      )}

      {/* Error State */}
      {!isLoading && !modelsLoaded && (
        <div className="text-center py-8">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Gagal memuat sistem pengenalan wajah</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
          >
            Muat Ulang
          </button>
        </div>
      )}
    </div>
  );
};

export default AttendanceFaceRecognition; 