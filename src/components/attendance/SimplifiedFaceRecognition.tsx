"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  Camera, 
  Clock,
  Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import * as faceapi from 'face-api.js';

interface SimplifiedFaceRecognitionProps {
  onSuccessfulRecognition: (employeeId: string) => void;
  mode: 'checkIn' | 'checkOut';
}

interface Employee {
  id: string;
  employeeId: string;
  faceData?: string;
  faceImage?: string;
  user?: {
    name?: string;
  };
}

// Path ke model wajah
const FACE_MODELS_PATH = '/models';

// Interval deteksi (ms)
const DETECTION_INTERVAL = 1000;

// Threshold untuk pencocokan wajah
const MATCH_THRESHOLD = 0.6;

const SimplifiedFaceRecognition: React.FC<SimplifiedFaceRecognitionProps> = ({
  onSuccessfulRecognition,
  mode
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [recognizedName, setRecognizedName] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [modelsLoaded, setModelsLoaded] = useState<boolean>(false);
  const [detectionMessage, setDetectionMessage] = useState<string>('Memulai pengenalan wajah...');
  const [showManualInput, setShowManualInput] = useState<boolean>(false);
  const [manualEmployeeId, setManualEmployeeId] = useState<string>('');
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const processingRef = useRef<boolean>(false);

  // Effect untuk reset state ketika mode berubah
  useEffect(() => {
    if (success) {
      setSuccess(false);
      setRecognizedName(null);
    }
  }, [mode]);

  // Effect untuk inisialisasi
  useEffect(() => {
    initFaceDetection();

    return () => {
      // Cleanup
      stopDetection();
      stopCamera();
    };
  }, []);

  // Inisialisasi pendeteksi wajah
  const initFaceDetection = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Muat model face-api
      await loadModels();
      
      // Muat data karyawan
      await fetchEmployees();
      
      // Mulai kamera
      await startCamera();
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error saat inisialisasi:', error);
      setError('Terjadi kesalahan saat memulai sistem pengenalan wajah. Silakan coba lagi.');
      setIsLoading(false);
      setShowManualInput(true);
    }
  };

  // Memuat model face-api
  const loadModels = async () => {
    try {
      setDetectionMessage('Memuat model pengenalan wajah...');
      
      // Cek apakah model bisa diakses
      try {
        const response = await fetch(`${FACE_MODELS_PATH}/tiny_face_detector_model-weights_manifest.json`, { method: 'HEAD' });
        if (!response.ok) {
          throw new Error('Model face detection tidak tersedia');
        }
      } catch {
        throw new Error('Tidak dapat mengakses file model. Periksa koneksi internet Anda.');
      }
      
      // Load models with timeout protection
      const modelPromise = Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODELS_PATH),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(FACE_MODELS_PATH),
        faceapi.nets.faceRecognitionNet.loadFromUri(FACE_MODELS_PATH)
      ]);
      
      // Set timeout untuk load model (20 detik)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Model loading timeout')), 20000);
      });
      
      // Race antara loading model dan timeout
      await Promise.race([modelPromise, timeoutPromise]);
      
      console.log('Model berhasil dimuat');
      setModelsLoaded(true);
      return true;
    } catch (error) {
      console.error('Error saat memuat model:', error);
      setError('Gagal memuat model pengenalan wajah. Silakan coba lagi atau gunakan input manual.');
      setShowManualInput(true);
      return false;
    }
  };

  // Mengambil data karyawan dari API
  const fetchEmployees = async () => {
    try {
      setDetectionMessage('Mengambil data karyawan...');
      
      const response = await fetch('/api/employees?withFaceData=true', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status} saat mengambil data karyawan`);
      }
      
      const data = await response.json();
      
      if (!data.employees || !Array.isArray(data.employees)) {
        throw new Error('Format data karyawan tidak valid');
      }
      
      // Filter karyawan yang memiliki data wajah
      const employeesWithFace = data.employees.filter(
        (emp: Employee) => emp.faceData || emp.faceImage
      );
      
      console.log(`Berhasil memuat ${employeesWithFace.length} data karyawan dengan data wajah`);
      setEmployees(employeesWithFace);
      
      return employeesWithFace.length > 0;
    } catch (error) {
      console.error('Error saat mengambil data karyawan:', error);
      toast.error('Gagal memuat data karyawan');
      return false;
    }
  };

  // Memulai kamera
  const startCamera = async () => {
    try {
      setDetectionMessage('Mengaktifkan kamera...');
      
      if (streamRef.current) {
        // Kamera sudah berjalan
        return true;
      }
      
      // Cek dukungan getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser Anda tidak mendukung akses kamera');
      }
      
      // Minta akses kamera dengan resolusi medium
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Tunggu video siap
        await new Promise<void>((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
              resolve();
            };
          } else {
            resolve();
          }
        });
        
        await videoRef.current.play();
        
        // Set ukuran canvas sesuai video
        if (canvasRef.current) {
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
        }
        
        // Mulai deteksi
        startDetection();
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error saat memulai kamera:', error);
      setError('Gagal mengakses kamera. Pastikan Anda telah memberikan izin kamera.');
      setShowManualInput(true);
      return false;
    }
  };

  // Menghentikan kamera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Memulai deteksi wajah
  const startDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
    
    setDetectionMessage('Posisikan wajah Anda di depan kamera');
    
    detectionIntervalRef.current = setInterval(() => {
      if (!isProcessing && !success && videoRef.current && videoRef.current.readyState === 4) {
        detectFace();
      }
    }, DETECTION_INTERVAL);
  };

  // Menghentikan deteksi wajah
  const stopDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
  };

  // Deteksi wajah dari video
  const detectFace = async () => {
    if (processingRef.current || !videoRef.current || !canvasRef.current || !modelsLoaded) {
      return;
    }
    
    processingRef.current = true;
    setIsProcessing(true);
    
    try {
      setDetectionMessage('Mendeteksi wajah...');
      
      // Deteksi wajah dengan TinyFaceDetector (lebih ringan dan cepat)
      const options = new faceapi.TinyFaceDetectorOptions({ 
        inputSize: 320, 
        scoreThreshold: 0.5 
      });
      
      // Dapatkan deteksi dari frame video
      const result = await faceapi
        .detectSingleFace(videoRef.current, options)
        .withFaceLandmarks(true)  // gunakan tiny model dengan parameter true
        .withFaceDescriptor();
      
      if (!result) {
        setDetectionMessage('Tidak ada wajah terdeteksi');
        setIsProcessing(false);
        processingRef.current = false;
        return;
      }
      
      // Gambar hasil deteksi ke canvas
      const dims = faceapi.matchDimensions(canvasRef.current, videoRef.current);
      const resizedResult = faceapi.resizeResults(result, dims);
      
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        faceapi.draw.drawDetections(canvasRef.current, resizedResult);
        faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedResult);
      }
      
      // Dapatkan descriptor wajah yang terdeteksi
      const detectedDescriptor = result.descriptor;
      
      // Pencocokan dengan database karyawan
      await matchWithEmployees(detectedDescriptor);
      
    } catch (error) {
      console.error('Error saat deteksi wajah:', error);
      setDetectionMessage('Error saat memproses. Coba lagi.');
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
    }
  };

  // Pencocokan wajah dengan database karyawan
  const matchWithEmployees = async (detectedDescriptor: Float32Array) => {
    try {
      setDetectionMessage('Mencocokkan wajah...');
      
      if (employees.length === 0) {
        setDetectionMessage('Tidak ada data karyawan tersedia');
        return;
      }
      
      let bestMatch = null;
      let bestDistance = 1.0;
      
      // Loop semua karyawan untuk mencari kecocokan terbaik
      for (const employee of employees) {
        try {
          let faceDescriptor: Float32Array | null = null;
          
          // Ekstrak descriptor dari data karyawan
          if (employee.faceData) {
            // Data descriptor dari database
            try {
              const descriptorData = JSON.parse(employee.faceData);
              faceDescriptor = new Float32Array(Object.values(descriptorData));
            } catch (e) {
              console.warn(`Error parsing face data for ${employee.employeeId}:`, e);
              continue;
            }
          } else if (employee.faceImage) {
            // Ekstrak descriptor dari gambar
            try {
              const img = await createImageElement(employee.faceImage);
              const detection = await faceapi
                .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks(true)
                .withFaceDescriptor();
                
              if (detection) {
                faceDescriptor = detection.descriptor;
              }
            } catch (e) {
              console.warn(`Error extracting descriptor from image for ${employee.employeeId}:`, e);
              continue;
            }
          }
          
          if (!faceDescriptor) {
            continue;
          }
          
          // Hitung jarak euclidean
          const distance = faceapi.euclideanDistance(detectedDescriptor, faceDescriptor);
          
          // Update best match jika lebih baik
          if (distance < bestDistance) {
            bestDistance = distance;
            bestMatch = employee;
          }
        } catch (e) {
          console.warn(`Error processing employee ${employee.employeeId}:`, e);
        }
      }
      
      // Jika ada kecocokan di bawah threshold
      if (bestMatch && bestDistance < MATCH_THRESHOLD) {
        const name = bestMatch.user?.name || 'Karyawan';
        const matchScore = Math.round((1 - bestDistance) * 100);
        
        console.log(`Wajah terdeteksi: ${name} (${matchScore}%)`);
        setDetectionMessage(`Terdeteksi: ${name} (${matchScore}%)`);
        
        // Proses presensi
        await processAttendance(bestMatch);
      } else {
        if (bestMatch) {
          const matchScore = Math.round((1 - bestDistance) * 100);
          console.log(`Kecocokan terbaik: ${bestMatch.user?.name || 'Karyawan'} (${matchScore}%), tapi di bawah threshold`);
        }
        setDetectionMessage('Wajah tidak dikenali. Coba lagi.');
      }
    } catch (error) {
      console.error('Error saat pencocokan wajah:', error);
      setDetectionMessage('Error saat pencocokan wajah');
    }
  };

  // Helper untuk membuat elemen gambar dari URL atau data
  const createImageElement = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  // Proses presensi setelah wajah dikenali
  const processAttendance = async (employee: Employee) => {
    try {
      setDetectionMessage('Memproses presensi...');
      
      // Hentikan deteksi
      stopDetection();
      
      // Cek status presensi hari ini (jika perlu)
      // Di sini bisa ditambahkan logic untuk menentukan apakah karyawan sudah melakukan presensi masuk/pulang
      
      // Catat presensi ke API
      const response = await fetch('/api/attendance/record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          employeeId: employee.id,
          type: mode
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status} saat mencatat presensi`);
      }
      
      // Tampilkan pesan sukses
      const actionType = mode === 'checkIn' ? 'masuk' : 'pulang';
      toast.success(`Presensi ${actionType} berhasil`);
      
      // Set state sukses
      setSuccess(true);
      setRecognizedName(employee.user?.name || 'Karyawan');
      
      // Callback ke parent component
      onSuccessfulRecognition(employee.id);
      
    } catch (error) {
      console.error('Error saat proses presensi:', error);
      setError(`Gagal memproses presensi: ${error instanceof Error ? error.message : 'Error tidak diketahui'}`);
      
      // Mulai deteksi lagi jika gagal
      startDetection();
    }
  };

  // Handler presensi manual
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!manualEmployeeId || manualEmployeeId.trim() === '') {
      toast.error('Masukkan ID karyawan yang valid');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Cari karyawan berdasarkan ID
      const response = await fetch(`/api/employees/by-employee-id/${manualEmployeeId}`, {
        method: 'GET'
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status} saat mencari karyawan`);
      }
      
      const employee = await response.json();
      
      if (!employee || !employee.id) {
        toast.error('ID karyawan tidak ditemukan');
        setIsProcessing(false);
        return;
      }
      
      // Proses presensi
      await processAttendance(employee);
      
    } catch (error) {
      console.error('Error saat presensi manual:', error);
      setError('Gagal memproses presensi manual. Silakan coba lagi.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleRefresh = () => {
    setError(null);
    setSuccess(false);
    setIsProcessing(false);
    stopDetection();
    stopCamera();
    initFaceDetection();
  };

  // Tampilan loading
  if (isLoading) {
    return (
      <Card className="w-full max-w-md mx-auto overflow-hidden">
        <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
          <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
          <h3 className="text-lg font-semibold text-center">Memuat sistem pengenalan wajah</h3>
          <p className="text-muted-foreground text-center mt-2">Mohon tunggu sebentar...</p>
        </div>
      </Card>
    );
  }

  // Tampilan error
  if (error) {
    return (
      <Card className="w-full max-w-md mx-auto overflow-hidden">
        <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
          <AlertCircle className="w-12 h-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold text-center">Terjadi Kesalahan</h3>
          <p className="text-muted-foreground text-center mt-2">{error}</p>
          <Button 
            variant="outline" 
            className="mt-4" 
            onClick={handleRefresh}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Coba Lagi
          </Button>
        </div>
      </Card>
    );
  }

  // Tampilan sukses
  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto overflow-hidden">
        <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
          <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
          <h3 className="text-lg font-semibold text-center">
            {recognizedName} {mode === 'checkIn' ? 'Berhasil Masuk' : 'Berhasil Pulang'}
          </h3>
          <p className="text-center text-muted-foreground mt-2">
            {mode === 'checkIn' 
              ? 'Presensi masuk berhasil dicatat' 
              : 'Presensi pulang berhasil dicatat'}
          </p>
          <Button 
            variant="outline" 
            className="mt-6" 
            onClick={handleRefresh}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Presensi Lainnya
          </Button>
        </div>
      </Card>
    );
  }

  // Tampilan utama
  return (
    <Card className="w-full max-w-md mx-auto overflow-hidden">
      <div className="relative">
        <div className="aspect-video relative overflow-hidden bg-black">
          {/* Video dan Canvas */}
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
          
          {/* Overlay status */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20">
            <div className="bg-black/50 text-white px-3 py-1 rounded-full text-sm flex items-center">
              <Camera className="w-4 h-4 mr-2" />
              <span>{mode === 'checkIn' ? 'Presensi Masuk' : 'Presensi Pulang'}</span>
            </div>
            <div className="bg-black/50 text-white px-3 py-1 rounded-full text-sm flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              <span>{new Date().toLocaleTimeString('id-ID')}</span>
            </div>
          </div>
          
          {/* Status deteksi */}
          <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-3 text-center">
            {isProcessing ? (
              <div className="flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span>{detectionMessage}</span>
              </div>
            ) : (
              <div>
                <span>{detectionMessage}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="p-4">
          <div className="flex flex-col gap-3">
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Muat Ulang Kamera
            </Button>
            
            {showManualInput && (
              <form onSubmit={handleManualSubmit} className="mt-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualEmployeeId}
                    onChange={(e) => setManualEmployeeId(e.target.value)}
                    placeholder="Masukkan ID Karyawan"
                    className="px-3 py-2 border rounded flex-1"
                  />
                  <Button 
                    type="submit" 
                    disabled={isProcessing}
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Kirim'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default SimplifiedFaceRecognition; 