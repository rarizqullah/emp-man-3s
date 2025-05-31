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
import { 
  loadFaceApiModels, 
  DETECTION_INTERVAL,
  detectFaceWithLandmarks,
  drawFaceLandmarks,
  extractFaceDescriptorFromImage,
  toFloat32Array,
  calculateEuclideanDistance,
  checkModelFilesExist
} from '@/lib/face-api-config';

interface SimpleFaceRecognitionProps {
  onSuccessfulRecognition: (employeeId: string) => void;
  mode: 'checkIn' | 'checkOut';
}

// Tipe data untuk karyawan dari API
interface EmployeeWithFaceData {
  id: string;
  employeeId: string;
  user?: { 
    id: string;
    name: string;
  };
  department?: {
    id: string;
    name: string;
  };
  shift?: {
    id: string;
    name: string;
  };
  faceData?: string;
  faceImage?: string;
  descriptor?: number[] | Float32Array;
}

const SimpleFaceRecognition: React.FC<SimpleFaceRecognitionProps> = ({
  onSuccessfulRecognition,
  mode
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [recognizedName, setRecognizedName] = useState<string | null>(null);
  const [employees, setEmployees] = useState<EmployeeWithFaceData[]>([]);
  const [modelsLoaded, setModelsLoaded] = useState<boolean>(false);
  const [detectionMessage, setDetectionMessage] = useState<string>('Memulai pengenalan wajah...');
  const [failureCount, setFailureCount] = useState<number>(0);
  const [showManualInput, setShowManualInput] = useState<boolean>(false);
  const [manualEmployeeId, setManualEmployeeId] = useState<string>('');
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const apiCallInProgressRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const attendanceProcessingRef = useRef<boolean>(false);

  // Efek untuk memperbarui UI berdasarkan perubahan mode
  useEffect(() => {
    if (success) {
      // Reset state jika mode berubah saat dalam keadaan sukses
      setSuccess(false);
      setRecognizedName(null);
      setIsProcessing(false);
    }
  }, [mode, success]);

  // Efek untuk inisialisasi komponen
  useEffect(() => {
    // Fungsi untuk memuat model dan data karyawan
    const init = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Cek ketersediaan file model
        const modelsExist = await checkModelFilesExist();
        if (!modelsExist) {
          setError('File model pengenalan wajah tidak ditemukan di server');
          setIsLoading(false);
          return;
        }
        
        // Muat model face-api.js
        console.log('Memuat model face-api.js...');
        const modelsLoadSuccess = await loadFaceApiModels();
        
        if (!modelsLoadSuccess) {
          setError('Gagal memuat model pengenalan wajah. Silakan muat ulang halaman.');
          setIsLoading(false);
          return;
        }
        
        setModelsLoaded(true);
        console.log('Model face-api.js berhasil dimuat');
        
        // Ambil data karyawan dari API
        await fetchEmployeeData();
        
        // Mulai stream kamera
        await startCamera();
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error saat inisialisasi:', error);
        setError('Terjadi kesalahan saat memulai. Silakan muat ulang halaman.');
        setIsLoading(false);
      }
    };

    // Inisialisasi komponen
    init();

    // Cleanup saat komponen unmount
    return () => {
      stopDetection();
      stopCamera();
    };
  }, []);

  // Fungsi untuk mengambil data karyawan
  const fetchEmployeeData = async () => {
    try {
      console.log('Mengambil data karyawan dari API...');
      
      if (apiCallInProgressRef.current) {
        console.log('Fetch sebelumnya masih berlangsung, skip...');
        return;
      }
      
      apiCallInProgressRef.current = true;
      abortControllerRef.current = new AbortController();
      
      const response = await fetch('/api/employees?withFaceData=true', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`Error saat mengambil data karyawan: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data || !data.employees || !Array.isArray(data.employees)) {
        console.warn('Format data karyawan tidak valid:', data);
        setEmployees([]);
        return;
      }
      
      console.log(`Berhasil mengambil data ${data.employees.length} karyawan`);
      
      // Filter karyawan yang memiliki data wajah
      const employeesWithFaceData = data.employees.filter(
        (emp: EmployeeWithFaceData) => emp.faceData || emp.faceImage
      );
      
      console.log(`${employeesWithFaceData.length} karyawan memiliki data wajah`);
      setEmployees(employeesWithFaceData);
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Fetch data karyawan dibatalkan');
      } else {
        console.error('Error saat fetch data karyawan:', error);
        toast.error('Gagal memuat data karyawan');
      }
    } finally {
      apiCallInProgressRef.current = false;
      abortControllerRef.current = null;
    }
  };

  // Fungsi untuk memulai kamera
  const startCamera = async () => {
    try {
      if (streamRef.current) {
        console.log('Kamera sudah aktif');
        return;
      }
      
      // Periksa dukungan getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser tidak mendukung akses kamera');
      }
      
      console.log('Meminta izin akses kamera...');
      
      // Minta izin akses kamera dengan resolusi HD
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });
      
      // Simpan stream
      streamRef.current = stream;
      
      // Pasang stream ke elemen video
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        
        // Set ukuran canvas sesuai video
          if (canvasRef.current) {
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
        }
        
        console.log('Kamera berhasil diaktifkan');
        
        // Mulai deteksi wajah
        startDetection();
      }
    } catch (error) {
      console.error('Error saat memulai kamera:', error);
      setError('Gagal mengakses kamera. Pastikan kamera aktif dan izin diberikan.');
    }
  };
  
  // Fungsi untuk menghentikan kamera
  const stopCamera = () => {
    if (streamRef.current) {
        const tracks = streamRef.current.getTracks();
      tracks.forEach(track => track.stop());
        streamRef.current = null;
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
      
      console.log('Kamera dimatikan');
    }
  };

  // Fungsi untuk memulai deteksi wajah
  const startDetection = () => {
    if (detectionIntervalRef.current) {
      console.log('Deteksi wajah sudah berjalan');
      return;
    }
    
    console.log('Memulai deteksi wajah otomatis...');
    setDetectionMessage('Arahkan wajah Anda ke kamera');
    
    // Set interval untuk deteksi wajah secara berkala
    detectionIntervalRef.current = setInterval(() => {
      if (isProcessing || success) {
        return; // Skip jika sedang memproses atau sudah berhasil
      }
      
      if (videoRef.current && canvasRef.current && videoRef.current.readyState === 4) {
        processFrame();
      }
    }, DETECTION_INTERVAL);
  };

  // Fungsi untuk menghentikan deteksi wajah
  const stopDetection = () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      console.log('Deteksi wajah dihentikan');
    }
  };

  // Fungsi untuk memproses frame video
  const processFrame = async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing || success) {
      return;
    }

    setIsProcessing(true);
    setDetectionMessage('Mendeteksi wajah...');
    
    try {
      // Gambar frame video ke canvas
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) {
        throw new Error('Tidak dapat membuat context canvas');
      }
      
      // Set ukuran canvas sesuai video
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      
      // Gambar video ke canvas
      ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
      
      // Proses deteksi wajah
      await processFaceDetection(canvasRef.current);
      
    } catch (error) {
      console.error('Error saat memproses frame:', error);
      setError('Terjadi kesalahan saat memproses gambar. Silakan coba lagi.');
      setIsProcessing(false);
    }
  };

  // Fungsi untuk memproses deteksi wajah dari canvas
  const processFaceDetection = async (canvas: HTMLCanvasElement) => {
    try {
      // Pastikan model sudah dimuat
      if (!modelsLoaded) {
        console.warn('Model belum dimuat, mencoba memuat model terlebih dahulu');
        const loaded = await loadFaceApiModels();
        if (!loaded) {
          setError('Gagal memuat model pengenalan wajah. Silakan muat ulang halaman.');
          setIsProcessing(false);
          return;
        }
          setModelsLoaded(true);
      }
      
      console.log('Mendeteksi wajah pada frame...');
      
      // Deteksi wajah pada canvas
      const result = await detectFaceWithLandmarks(canvas);
      
      if (!result.success) {
        console.log('Tidak ada wajah terdeteksi:', result.message);
        setDetectionMessage('Posisikan wajah Anda di depan kamera');
        setIsProcessing(false);
        
        // Tambah failure count
        setFailureCount(prev => prev + 1);
        
        // Jika gagal beberapa kali berturut-turut, tampilkan opsi input manual
        if (failureCount > 5) {
          setShowManualInput(true);
        }
        
          return;
        }
      
      // Jika ada wajah terdeteksi, gambar landmark
      if (result.landmarks && displayCanvasRef.current) {
        drawFaceLandmarks(displayCanvasRef.current, result.landmarks, result.faceRectangle);
      }
      
      // Reset failure count
      setFailureCount(0);
      
      // Tampilkan pesan proses
      setDetectionMessage('Menganalisis wajah...');

      // Dapatkan descriptor wajah dari hasil deteksi
      const detectedFaceDescriptor = result.descriptor;
      
      if (!detectedFaceDescriptor) {
        setError('Tidak dapat menganalisis wajah. Silakan coba lagi dengan pencahayaan lebih baik.');
        setIsProcessing(false);
        return;
      }
      
      console.log("Mulai proses pencocokan dengan database wajah karyawan...");
      
      // Cari karyawan dengan wajah paling cocok
      let bestMatch = null;
      let bestMatchScore = 0;
      let bestMatchDistance = 1.0; // Nilai lebih rendah berarti lebih cocok (0 adalah identik)
      const MATCH_THRESHOLD = 0.6; // Batas maksimum jarak untuk dianggap cocok
      
      // Loop semua karyawan untuk mencari kecocokan terbaik
      for (const employee of employees) {
        try {
          const employeeName = employee.user?.name || employee.employeeId || 'Karyawan';
          console.log(`Mencocokkan dengan karyawan: ${employeeName}`);
          
          // Cek apakah karyawan memiliki data descriptor atau faceImage
          if (!employee.descriptor && !employee.faceData && !employee.faceImage) {
            console.log(`Karyawan ${employee.employeeId || employee.id} tidak memiliki data wajah`);
            continue;
          }
          
          let employeeFaceDescriptor: Float32Array | null = null;
          
          // Jika karyawan memiliki descriptor, konversi ke Float32Array
          if (employee.descriptor) {
            employeeFaceDescriptor = toFloat32Array(employee.descriptor);
          }
          // Jika karyawan memiliki faceData, parse dan konversi ke Float32Array
          else if (employee.faceData) {
            try {
              const faceData = JSON.parse(employee.faceData);
              employeeFaceDescriptor = toFloat32Array(faceData);
            } catch (error) {
              console.warn(`Error parsing faceData untuk ${employee.employeeId}:`, error);
            }
          }
          // Jika karyawan memiliki faceImage, ekstrak descriptor dari gambar
          else if (employee.faceImage) {
            console.log(`Ekstrak descriptor dari gambar untuk karyawan ${employee.employeeId}`);
            try {
              const extractedDescriptor = await extractFaceDescriptorFromImage(employee.faceImage);
              if (extractedDescriptor) {
                employeeFaceDescriptor = extractedDescriptor;
                // Simpan descriptor yang diekstraksi ke objek karyawan untuk penggunaan berikutnya
                employee.descriptor = Array.from(extractedDescriptor);
                console.log(`Berhasil ekstrak descriptor dari gambar untuk ${employee.employeeId}`);
              } else {
                console.warn(`Gagal ekstrak descriptor dari gambar untuk ${employee.employeeId}`);
                continue;
              }
            } catch (error) {
              console.error(`Error ekstrak descriptor dari gambar untuk ${employee.employeeId}:`, error);
              continue;
            }
          }
            
            if (!employeeFaceDescriptor) {
              console.warn(`Format data wajah karyawan ${employee.employeeId || employee.id} tidak valid`);
              continue;
          }
          
            // Hitung jarak euclidean antara descriptor terdeteksi dan descriptor karyawan
            const distance = calculateEuclideanDistance(detectedFaceDescriptor, employeeFaceDescriptor);
            
            // Konversi jarak ke skor kecocokan (0-100%)
            const matchScore = Math.max(0, 100 * (1 - distance / 2));
            
            console.log(`Karyawan ${employeeName}: skor kecocokan ${matchScore.toFixed(1)}%`);
            
            // Update best match jika ini yang terbaik sejauh ini
            if (distance < bestMatchDistance) {
              bestMatchDistance = distance;
              bestMatchScore = matchScore;
              bestMatch = employee;
          }
        } catch (matchError) {
          console.error(`Error saat mencocokkan dengan karyawan ${employee.employeeId}:`, matchError);
          continue;
        }
      }
      
      // Jika ditemukan kecocokan yang memenuhi threshold
      if (bestMatch && bestMatchDistance < MATCH_THRESHOLD) {
        const bestMatchName = bestMatch.user?.name || 'Karyawan';
        console.log(`✅ Wajah terdeteksi sebagai: ${bestMatchName} dengan skor ${bestMatchScore.toFixed(1)}%`);
        
        // Cek status presensi karyawan hari ini untuk menentukan check-in atau check-out
        try {
          console.log(`Memeriksa status presensi karyawan ${bestMatch.id}`);
          
          const attendanceCheckResponse = await fetch(`/api/attendance/today?employeeId=${bestMatch.id}`, {
            method: 'GET',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
          
          if (!attendanceCheckResponse.ok) {
            console.error(`Error status ${attendanceCheckResponse.status}`);
            throw new Error(`Error status ${attendanceCheckResponse.status}`);
          }
          
          const attendanceData = await attendanceCheckResponse.json();
          console.log('Data status presensi:', attendanceData);
          
          // Tentukan apakah ini check-in atau check-out berdasarkan data dan mode
          let actualMode = mode;
          
          if (mode === 'checkIn' && attendanceData.hasCheckedInToday) {
            console.log('Karyawan sudah check-in hari ini, mengubah ke mode check-out');
            actualMode = 'checkOut';
          } else if (mode === 'checkOut' && !attendanceData.hasCheckedInToday) {
            console.log('Karyawan belum check-in hari ini, mengubah ke mode check-in');
            actualMode = 'checkIn';
          }
          
          // Proses kehadiran karyawan
          await processAttendance(bestMatch, actualMode);
          
        } catch (attendanceError) {
          console.error('Error saat memeriksa/memproses presensi:', attendanceError);
          
          // Fallback: gunakan mode yang dipilih pengguna
          await processAttendance(bestMatch, mode);
        }
      } else {
        console.log('Tidak ada kecocokan yang memenuhi threshold');
        
        if (bestMatch) {
          console.log(`Kecocokan terbaik: ${bestMatch.user?.name || bestMatch.employeeId} (${bestMatchScore.toFixed(1)}%)`);
        }
        
        setDetectionMessage('Wajah tidak dikenali, coba lagi');
      setIsProcessing(false);
      
        // Tambah failure count
        setFailureCount(prev => prev + 1);
        
        // Jika gagal beberapa kali berturut-turut, tampilkan opsi input manual
        if (failureCount > 5) {
          setShowManualInput(true);
        }
      }
    } catch (error) {
      console.error('Error saat proses deteksi wajah:', error);
      setError('Terjadi kesalahan saat proses pengenalan. Silakan coba lagi.');
      setIsProcessing(false);
    }
  };

  // Fungsi untuk memproses kehadiran karyawan
  const processAttendance = async (employee: EmployeeWithFaceData, attendanceMode: 'checkIn' | 'checkOut') => {
    // Hindari double submit
    if (attendanceProcessingRef.current) {
      console.log('Presensi sedang diproses, menunggu...');
      return;
    }
    
    attendanceProcessingRef.current = true;
    
    try {
      console.log(`Memproses ${attendanceMode} untuk karyawan:`, employee.employeeId);
      
      const response = await fetch('/api/attendance/record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          employeeId: employee.id,
          type: attendanceMode
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `Error status ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Hasil proses presensi:', data);
      
      // Tampilkan pesan sukses
      toast.success(`${attendanceMode === 'checkIn' ? 'Presensi masuk' : 'Presensi pulang'} berhasil`);
      
      // Panggil handler untuk sukses
      handleRecognizedEmployee(employee, attendanceMode);
      
      // Notifikasi parent komponen
      onSuccessfulRecognition(employee.id);
      
    } catch (error) {
      console.error('Error saat memproses presensi:', error);
      setError(`Gagal memproses presensi: ${error instanceof Error ? error.message : 'Error tidak diketahui'}`);
      setIsProcessing(false);
    } finally {
      attendanceProcessingRef.current = false;
    }
  };

  // Handler untuk karyawan yang berhasil dikenali
  const handleRecognizedEmployee = (employee: EmployeeWithFaceData, attendanceMode: 'checkIn' | 'checkOut' = mode) => {
    setRecognizedName(employee.user?.name || 'Karyawan');
    setSuccess(true);
    setIsProcessing(false);
    setError(null);
    setFailureCount(0); // Reset failure count
    
    // Berhenti deteksi otomatis
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    
    // Simpan data karyawan ke localStorage
    try {
      const employeeInfoData = {
        id: employee.id,
        employeeId: employee.employeeId,
        name: employee.user?.name,
        departmentName: employee.department?.name || '-',
        shiftName: employee.shift?.name || '-'
      };
      
      localStorage.setItem('lastRecognizedEmployee', JSON.stringify(employeeInfoData));
      
      // Juga simpan untuk komponen lain yang mungkin membutuhkan
      localStorage.setItem('currentEmployeeData', JSON.stringify(employeeInfoData));
    } catch (error) {
      console.warn('Error saving recognized employee data:', error);
    }
    
    // Ambil snapshot wajah saat presensi untuk bukti kehadiran
    try {
      if (canvasRef.current && videoRef.current) {
        captureAttendanceSnapshot(employee.id, attendanceMode);
      }
    } catch (snapshotError) {
      console.warn('Gagal mengambil snapshot wajah:', snapshotError);
    }
  };

  // Handler untuk refresh
  const handleRefresh = async () => {
    setError(null);
            setSuccess(false);
    setIsProcessing(false);
    setShowManualInput(false);
    setFailureCount(0);
    
    // Matikan kamera dahulu
    stopCamera();
    stopDetection();
    
    // Fetch data karyawan kembali
    await fetchEmployeeData();
    
    // Mulai kamera lagi
    await startCamera();
  };
  
  // Fungsi untuk mengambil snapshot wajah saat presensi
  const captureAttendanceSnapshot = (employeeId: string, type: 'checkIn' | 'checkOut') => {
    try {
      if (!canvasRef.current || !videoRef.current) {
        console.warn('Video atau canvas tidak tersedia untuk snapshot');
        return;
      }
      
      // Setup canvas untuk mengambil gambar wajah
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) {
        console.warn('Tidak bisa mendapatkan context canvas');
        return;
      }
      
      // Set ukuran canvas sesuai video
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      
      // Gambar frame video ke canvas
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      // Konversi canvas ke data URL
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      
      // Simpan ke storage lokal untuk ditampilkan nanti
      const today = new Date().toISOString().split('T')[0];
      const timestamp = new Date().toISOString();
      const snapshotKey = `attendance-snapshot-${employeeId}-${today}-${type}`;
      
      try {
        localStorage.setItem(snapshotKey, JSON.stringify({
          timestamp,
          imageData: imageDataUrl,
          type
        }));
        console.log(`Snapshot ${type} berhasil disimpan`);
      } catch (storageError) {
        console.warn('Error menyimpan snapshot ke localStorage:', storageError);
      }
      
      // Di implementasi lengkap, snapshot bisa dikirim ke server sebagai bukti kehadiran
      // Tetapi untuk saat ini kita hanya simpan lokal
    } catch (error) {
      console.error('Error mengambil snapshot:', error);
    }
  };

  // Handler untuk input manual ID karyawan
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
        throw new Error(`Error status ${response.status}`);
      }
      
      const employee = await response.json();
      
      if (!employee || !employee.id) {
        toast.error('ID karyawan tidak ditemukan');
        setIsProcessing(false);
        return;
      }
      
      // Proses kehadiran karyawan
      await processAttendance(employee, mode);
      
    } catch (error) {
      console.error('Error saat input manual:', error);
      setError('Gagal memproses presensi manual. Silakan coba lagi.');
    setIsProcessing(false);
    }
  };

  // Render state loading
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

  // Render state error
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

  // Render state sukses
  if (success) {
  return (
      <Card className="w-full max-w-md mx-auto overflow-hidden">
        <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
          <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
          <h3 className="text-lg font-semibold text-center">
            {recognizedName || 'Karyawan'} {mode === 'checkIn' ? 'Berhasil Masuk' : 'Berhasil Pulang'}
        </h3>
          <p className="text-center text-muted-foreground mt-2">
            {mode === 'checkIn' 
              ? 'Presensi masuk berhasil dicatat' 
              : 'Presensi pulang berhasil dicatat'}
          </p>
          <div className="mt-6 flex gap-2">
            <Button 
              variant="outline"
              onClick={handleRefresh}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Presensi Lainnya
            </Button>
      </div>
        </div>
      </Card>
    );
  }

  // Render UI utama pengenalan wajah
  return (
    <Card className="w-full max-w-md mx-auto overflow-hidden">
      <div className="relative">
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
          className="hidden"
        />
        <canvas
          ref={displayCanvasRef}
            className="absolute top-0 left-0 w-full h-full z-10"
          />
          
          {/* Overlay dengan informasi */}
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
          
          {/* Overlay status deteksi */}
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

export default SimpleFaceRecognition; 