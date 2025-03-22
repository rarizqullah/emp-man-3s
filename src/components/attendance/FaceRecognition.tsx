"use client";

import React, { useState, useEffect, useRef } from 'react';
import * as faceapi from 'face-api.js';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  RefreshCw,
  UserCheck
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface FaceRecognitionProps {
  onSuccessfulRecognition: (employeeId: string) => void;
  mode: 'checkIn' | 'checkOut';
}

interface EmployeeFaceData {
  id: string;
  name: string;
  descriptor: number[];
  userId?: string;
  employeeId?: string;
}

// Konstanta untuk konfigurasi pengenalan wajah
const MATCH_THRESHOLD = 0.6; // Nilai minimal untuk menganggap wajah cocok
const DETECTION_INTERVAL = 500; // Interval deteksi dalam milidetik

const FaceRecognition: React.FC<FaceRecognitionProps> = ({
  onSuccessfulRecognition,
  mode
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [employeeData, setEmployeeData] = useState<{[key: string]: EmployeeFaceData}>({});
  const [recognizedEmployee, setRecognizedEmployee] = useState<EmployeeFaceData | null>(null);
  const [recognitionStatus, setRecognitionStatus] = useState<'idle' | 'recognizing' | 'success' | 'failed'>('idle');
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Efek untuk memuat model face-api.js dan menyiapkan pengenalan wajah
  useEffect(() => {
    const loadModels = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Muat model face-api.js
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        ]);

        console.log("Face API models loaded!");

        // Ambil data descriptor wajah karyawan
        await loadEmployeeFaceData();

        // Mulai webcam
        await startWebcam();
      } catch (error) {
        console.error("Error loading face recognition models:", error);
        setError("Gagal memuat model pengenalan wajah. Silakan refresh halaman.");
      } finally {
        setIsLoading(false);
      }
    };

    loadModels();

    // Cleanup
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (recognitionIntervalRef.current) {
        clearInterval(recognitionIntervalRef.current);
      }
    };
  }, []);

  // Fungsi untuk mengambil data descriptor wajah karyawan
  const loadEmployeeFaceData = async () => {
    try {
      // Gunakan endpoint baru untuk mendapatkan data descriptor wajah
      const response = await fetch('/api/face-recognition/descriptors');
      if (!response.ok) {
        throw new Error('Gagal mengambil data wajah karyawan');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Terjadi kesalahan pada server');
      }

      // Transform the data for easy lookup
      const descriptors: { [key: string]: EmployeeFaceData } = {};

      // Process the standardized data
      result.data.forEach((employee: EmployeeFaceData) => {
        if (employee && employee.descriptor) {
          descriptors[employee.id] = {
            id: employee.id,
            name: employee.name,
            descriptor: employee.descriptor,
            userId: employee.userId,
            employeeId: employee.employeeId
          };
        }
      });

      setEmployeeData(descriptors);
      console.log("Employee face data loaded for", Object.keys(descriptors).length, "employees");
    } catch (error) {
      console.error("Error loading employee face data:", error);
      setError("Gagal mengambil data wajah karyawan dari server.");
    }
  };

  // Fungsi untuk memulai webcam
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 640, height: 480 }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) videoRef.current.play();
          
          // Mulai deteksi wajah setelah video dimulai
          startFaceRecognition();
        };
      }
    } catch (error) {
      console.error("Error starting webcam:", error);
      setError("Tidak dapat mengakses kamera. Pastikan izin kamera diberikan.");
    }
  };

  // Fungsi untuk memulai pengenalan wajah secara berkala
  const startFaceRecognition = () => {
    if (recognitionIntervalRef.current) {
      clearInterval(recognitionIntervalRef.current);
    }
    
    // Mulai pengenalan wajah setiap DETECTION_INTERVAL milidetik
    recognitionIntervalRef.current = setInterval(async () => {
      if (
        videoRef.current && 
        canvasRef.current && 
        videoRef.current.readyState === 4 && 
        Object.keys(employeeData).length > 0
      ) {
        // Sesuaikan ukuran canvas dengan video
        const videoWidth = videoRef.current.videoWidth;
        const videoHeight = videoRef.current.videoHeight;
        
        canvasRef.current.width = videoWidth;
        canvasRef.current.height = videoHeight;
        
        // Deteksi wajah dalam frame video
        const detection = await faceapi.detectSingleFace(videoRef.current, 
          new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
        
        if (detection) {
          // Gambar kotak di sekitar wajah yang terdeteksi
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, videoWidth, videoHeight);
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#00ff00';
            
            const box = detection.detection.box;
            ctx.strokeRect(box.x, box.y, box.width, box.height);
            
            // Tambahkan label "Mengenali..."
            ctx.font = "18px Arial";
            ctx.fillStyle = "#00ff00";
            ctx.fillText("Mengenali...", box.x, box.y - 10);
          }
          
          // Bandingkan dengan descriptor karyawan yang tersimpan
          let bestMatch = null;
          let bestDistance = Infinity;
          
          const detectionDescriptor = detection.descriptor;
          
          for (const employeeId in employeeData) {
            const employee = employeeData[employeeId];
            const distance = faceapi.euclideanDistance(
              detectionDescriptor, 
              new Float32Array(employee.descriptor)
            );
            
            // Update best match jika jarak lebih kecil
            if (distance < bestDistance) {
              bestDistance = distance;
              bestMatch = employee;
            }
          }
          
          // Jika jarak di bawah threshold, anggap cocok
          if (bestMatch && bestDistance < MATCH_THRESHOLD) {
            setRecognizedEmployee(bestMatch);
            setRecognitionStatus('success');
            
            // Hentikan interval deteksi
            if (recognitionIntervalRef.current) {
              clearInterval(recognitionIntervalRef.current);
            }
            
            // Panggil callback keberhasilan pengenalan
            console.log(`Karyawan dikenali: ${bestMatch.name} (${bestMatch.id})`);
            onSuccessfulRecognition(bestMatch.id);
            
            // Tampilkan notifikasi
            toast.success(`Berhasil mengenali ${bestMatch.name}`);
          } else {
            // Jika wajah terdeteksi tapi tidak dikenali
            setRecognitionStatus('recognizing');
          }
        } else {
          // Jika tidak ada wajah terdeteksi
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, videoWidth, videoHeight);
          }
          setRecognitionStatus('idle');
        }
      }
    }, DETECTION_INTERVAL);
  };

  // Fungsi untuk menghentikan webcam dan memulai ulang pengenalan
  const handleRetry = async () => {
    setError(null);
    setRecognizedEmployee(null);
    setRecognitionStatus('idle');
    
    // Hentikan webcam saat ini
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (recognitionIntervalRef.current) {
      clearInterval(recognitionIntervalRef.current);
    }
    
    // Mulai ulang proses pengenalan
    try {
      await startWebcam();
    } catch (error) {
      console.error("Error restarting webcam:", error);
      setError("Gagal memuat ulang kamera. Silakan refresh halaman.");
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center w-full">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-8">
          <RefreshCw className="w-12 h-12 animate-spin text-primary" />
          <p className="mt-4 text-lg">Memuat sistem pengenalan wajah...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center p-8 text-red-500">
          <AlertCircle className="w-12 h-12" />
          <p className="mt-4 text-lg">{error}</p>
          <Button className="mt-4" onClick={handleRetry}>
            Coba Lagi
          </Button>
        </div>
      ) : recognitionStatus === 'success' ? (
        <div className="flex flex-col items-center justify-center p-8 text-green-500">
          <CheckCircle2 className="w-12 h-12" />
          <p className="mt-4 text-lg">
            Berhasil mengenali {recognizedEmployee?.name}
          </p>
          <p className="text-gray-600">
            {mode === 'checkIn' ? 'Check in' : 'Check out'} sedang diproses...
          </p>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="relative">
            <video
              ref={videoRef}
              className="w-full h-auto block transform -scale-x-100"
              muted
              playsInline
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full transform -scale-x-100"
            />
            <div className="absolute top-4 left-4 flex items-center bg-black/50 text-white px-3 py-1 rounded-full">
              <Camera className="w-4 h-4 mr-2" />
              <span className="text-sm">
                {recognitionStatus === 'recognizing' 
                  ? 'Mengenali wajah...' 
                  : 'Posisikan wajah Anda di depan kamera'}
              </span>
            </div>
          </div>
          
          <div className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium">
                  {mode === 'checkIn' ? 'Check In' : 'Check Out'}
                </p>
                <p className="text-xs text-gray-500">
                  {Object.keys(employeeData).length} karyawan terdaftar
                </p>
              </div>
              
              <Button size="sm" variant="outline" onClick={handleRetry}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Mulai Ulang
              </Button>
            </div>
            
            {Object.keys(employeeData).length === 0 && (
              <div className="mt-3 text-amber-500 text-sm flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                Tidak ada data wajah karyawan yang tersedia
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default FaceRecognition; 