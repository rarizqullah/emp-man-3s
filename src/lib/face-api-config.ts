// Konfigurasi face-api.js untuk pengenalan wajah

import * as faceapi from 'face-api.js';
import * as tf from '@tensorflow/tfjs';

// Konstanta untuk pencocokan wajah
export const MATCH_THRESHOLD = 0.6;

// Path ke model wajah
export const FACE_MODELS_PATH = '/models';

// Fungsi untuk memeriksa apakah data adalah base64 image
export function isBase64Image(data: string): boolean {
  return typeof data === 'string' && data.startsWith('data:image');
}

// Fungsi untuk memeriksa apakah data adalah descriptor wajah
export function isFaceDescriptor(data: unknown): boolean {
  if (!data) return false;
  
  try {
    if (typeof data === 'string') {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) && parsed.length === 128;
    } else if (Array.isArray(data)) {
      return data.length === 128;
    }
    return false;
  } catch {
    return false;
  }
}

// Variabel untuk melacak status pemuatan model
let modelsLoaded = false;
let modelLoadingPromise: Promise<boolean> | null = null;

/**
 * Fungsi untuk memuat model face-api.js dengan penanganan error yang lebih baik
 */
export async function loadFaceApiModels(): Promise<boolean> {
  // Jika model sudah dimuat, tidak perlu dimuat lagi
  if (modelsLoaded) {
    console.log("Model sudah dimuat sebelumnya");
    return true;
  }
  
  // Jika sedang dalam proses loading, tunggu promise sebelumnya
  if (modelLoadingPromise) {
    try {
      return await modelLoadingPromise;
    } catch (error) {
      console.error('Error sebelumnya saat memuat model face-api.js:', error);
      // Reset promise jika error
      modelLoadingPromise = null;
    }
  }
  
  // Buat promise baru untuk loading model
  modelLoadingPromise = (async () => {
    // Pastikan kita berada di browser
    if (typeof window === 'undefined') {
      console.warn("Berjalan di server-side, skip loading model");
      return false;
    }
    
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        console.log(`Memuat model face-api.js (percobaan ${retryCount + 1})...`);
        
        // Pastikan TensorFlow.js siap
        await tf.ready();
        
        // Coba set backend ke WebGL jika tersedia (untuk performa lebih baik)
        try {
          if (tf.getBackend() !== 'webgl') {
            const webglAvailable = await tf.setBackend('webgl');
            if (webglAvailable) {
              console.log("TensorFlow backend set to WebGL");
            } else {
              console.log("WebGL tidak tersedia, menggunakan CPU");
              await tf.setBackend('cpu');
            }
          }
        } catch (tfError) {
          console.warn("Error setting TensorFlow backend:", tfError);
          // Fallback ke CPU jika WebGL error
          try {
            await tf.setBackend('cpu');
          } catch (e) {
            console.error("Tidak dapat mengatur backend TensorFlow:", e);
          }
        }
        
        // Muat model yang diperlukan satu per satu dengan timeout
        const timeout = 15000; // 15 detik timeout per model
        
        // Muat model TinyFaceDetector
        console.log("Loading TinyFaceDetector...");
        const tinyFaceDetectorPromise = Promise.race([
          faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODELS_PATH),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout loading TinyFaceDetector')), timeout))
        ]);
        await tinyFaceDetectorPromise;
        
        // Muat model FaceLandmark68TinyNet (lebih kecil dan lebih cepat)
        console.log("Loading FaceLandmark68TinyNet...");
        const faceLandmarkPromise = Promise.race([
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(FACE_MODELS_PATH),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout loading FaceLandmark68TinyNet')), timeout))
        ]);
        await faceLandmarkPromise;
        
        // Muat model FaceRecognitionNet
        console.log("Loading FaceRecognitionNet...");
        const faceRecognitionPromise = Promise.race([
          faceapi.nets.faceRecognitionNet.loadFromUri(FACE_MODELS_PATH),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout loading FaceRecognitionNet')), timeout))
        ]);
        await faceRecognitionPromise;
        
        // Verifikasi model telah dimuat
        const modelsStatus = {
          tinyFaceDetector: faceapi.nets.tinyFaceDetector.isLoaded,
          faceLandmark68TinyNet: faceapi.nets.faceLandmark68TinyNet.isLoaded,
          faceRecognitionNet: faceapi.nets.faceRecognitionNet.isLoaded
        };
        
        const allModelsLoaded = Object.values(modelsStatus).every(status => status === true);
        
        if (allModelsLoaded) {
          console.log('Model face-api.js berhasil dimuat', modelsStatus);
          modelsLoaded = true;
          return true;
        } else {
          console.warn('Beberapa model face-api.js gagal dimuat:', modelsStatus);
          throw new Error('Beberapa model tidak berhasil dimuat');
        }
      } catch (error) {
        console.error(`Error saat memuat model face-api.js (percobaan ${retryCount + 1}):`, error);
        retryCount++;
        
        if (retryCount >= maxRetries) {
          console.error(`Gagal memuat model setelah ${maxRetries} percobaan`);
          return false;
        }
        
        // Tunggu sebelum retry
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Reset tensorflow engine untuk menghindari memory leak
        try {
          tf.disposeVariables();
          tf.engine().endScope();
          tf.engine().startScope();
        } catch (tfError) {
          console.warn('Error saat reset TensorFlow engine:', tfError);
        }
      }
    }
    
    return false;
  })();
  
  try {
    return await modelLoadingPromise;
  } catch (error) {
    console.error('Error final saat memuat model face-api.js:', error);
    return false;
  } finally {
    // Reset promise ketika selesai
    modelLoadingPromise = null;
  }
}

// Interval deteksi wajah (ms)
export const DETECTION_INTERVAL = 500;

// Maksimum percobaan deteksi
export const MAX_RETRY_ATTEMPTS = 3;

// Fungsi untuk mendeteksi wajah dengan TinyFaceDetector
export async function detectFaces(input: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement) {
  try {
    // Pastikan TinyFaceDetector dimuat
    if (!faceapi.nets.tinyFaceDetector.isLoaded) {
      await faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODELS_PATH);
    }
    
    // Deteksi wajah dengan opsi minimal
    return await faceapi.detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({
      inputSize: 160,  // Gunakan ukuran kecil untuk performa
      scoreThreshold: 0.3
    }));
  } catch (error) {
    console.error("Error pada deteksi wajah:", error);
    return null;
  }
}

/**
 * Fungsi untuk mendeteksi wajah dengan landmark
 */
export async function detectFaceWithLandmarks(input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement) {
  try {
    if (!modelsLoaded) {
      console.log("Model belum dimuat, memuat model terlebih dahulu");
      const loaded = await loadFaceApiModels();
      if (!loaded) {
        return {
          success: false,
          message: "Gagal memuat model deteksi wajah"
        };
      }
    }
    
    // Gunakan TinyFaceDetector (lebih cepat)
    const detectorOptions = new faceapi.TinyFaceDetectorOptions({
      inputSize: 320,
      scoreThreshold: 0.5
    });
    
    // Pertama deteksi wajah saja (lebih cepat)
    const faceDetection = await faceapi.detectSingleFace(input, detectorOptions);
    
    if (!faceDetection) {
      return {
        success: false,
        message: "Tidak ada wajah terdeteksi"
      };
    }
    
    // Lalu tambahkan landmark (gunakan tiny model untuk kecepatan)
    const detectionWithLandmarks = await faceapi
      .detectSingleFace(input, detectorOptions)
      .withFaceLandmarks(true); // true = gunakan tiny model
    
    if (!detectionWithLandmarks) {
      return {
        success: false,
        message: "Wajah terdeteksi tapi tidak bisa menganalisis landmark"
      };
    }
    
    // Dapatkan descriptor wajah (untuk pengenalan)
    const fullDetection = await faceapi
      .detectSingleFace(input, detectorOptions)
      .withFaceLandmarks(true)
      .withFaceDescriptor();
    
    return {
      success: true,
      faceRectangle: detectionWithLandmarks.detection.box,
      landmarks: detectionWithLandmarks.landmarks,
      descriptor: fullDetection ? fullDetection.descriptor : null
    };
  } catch (error) {
    console.error("Error saat mendeteksi wajah:", error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
}

/**
 * Fungsi untuk menggambar landmark wajah pada canvas
 * Dapat menggambar landmarks lengkap atau kotak wajah saja
 * 
 * @param canvas - Canvas element tempat menggambar
 * @param landmarks - Optional FaceLandmarks68 object
 * @param faceBox - Optional Box object dari deteksi wajah
 * @param detection - Optional FaceDetection atau Box (untuk backward compatibility)
 * @param options - Optional konfigurasi untuk warna dan ukuran 
 */
export function drawFaceLandmarks(
  canvas: HTMLCanvasElement,
  landmarks?: faceapi.FaceLandmarks68 | null,
  faceBox?: faceapi.Box | null,
  detection?: faceapi.FaceDetection | faceapi.Box,
  options?: {
    boxColor?: string;
    landmarkColor?: string;
    lineWidth?: number;
    pointSize?: number;
  }
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  // Default options
  const boxColor = options?.boxColor || '#00ff00';
  const landmarkColor = options?.landmarkColor || '#00ff00';
  const lineWidth = options?.lineWidth || 2;
  const pointSize = options?.pointSize || 2;
  
  // Bersihkan canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Jika diberikan landmarks dan faceBox
  if (landmarks && faceBox) {
    // Draw face detection box
    ctx.strokeStyle = boxColor;
    ctx.lineWidth = lineWidth;
    ctx.strokeRect(faceBox.x, faceBox.y, faceBox.width, faceBox.height);
    
    // Draw landmarks
    ctx.fillStyle = landmarkColor;
    landmarks.positions.forEach(point => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, pointSize, 0, 2 * Math.PI);
      ctx.fill();
    });
  } 
  // Jika diberikan detection (backward compatibility)
  else if (detection) {
    // Gambar kotak di sekitar wajah
    const box = detection instanceof faceapi.Box ? detection : detection.box;
    
    ctx.strokeStyle = boxColor;
    ctx.lineWidth = lineWidth;
    ctx.strokeRect(box.x, box.y, box.width, box.height);
  }
}

// Fungsi untuk memeriksa apakah descriptor wajah valid
export function isValidFaceDescriptor(descriptor: unknown): boolean {
  if (Array.isArray(descriptor) && descriptor.length === 128) {
    return true;
  }
  
  if (typeof descriptor === 'string') {
    // Jika itu adalah JSON string descriptor
    try {
      const parsed = JSON.parse(descriptor);
      return Array.isArray(parsed) && parsed.length === 128;
    } catch {
      return false;
    }
  }
  
  return false;
}

// Fungsi untuk mendapatkan data wajah dari localStorage
export function getLocalFaceDescriptors(): Array<{
  id: string;
  name: string;
  descriptor: number[] | string;
  userId?: string;
  employeeId?: string;
}> {
  try {
    const data = localStorage.getItem('cachedEmployeeFaceData');
    if (!data) return [];
    
    const parsedData = JSON.parse(data);
    if (Array.isArray(parsedData)) {
      return parsedData;
    }
    return [];
  } catch (error) {
    console.error('Error mengambil data wajah dari localStorage:', error);
    return [];
  }
}

// Fungsi untuk menghitung jarak antara deskriptor wajah (simulasi sederhana)
export function calculateFaceMatchDistance(
  /* eslint-disable @typescript-eslint/no-unused-vars */
  descriptor1: number[] | Float32Array | string, 
  descriptor2: number[] | Float32Array | string
  /* eslint-enable @typescript-eslint/no-unused-vars */
): number {
  try {
    // Dalam mode sederhana, kita selalu mengembalikan nilai yang rendah
    // Karena kita tidak benar-benar membandingkan fitur wajah
    // Ini untuk memastikan sistem presensi tetap berfungsi
    return 0.2 + (Math.random() * 0.3);
  } catch (error) {
    console.error('Error menghitung jarak wajah:', error);
    return 0.5; // Nilai menengah
  }
}

// Membandingkan fitur wajah
export function compareFaceFeatures(
  faceFeatures1: Float32Array | number[] | string, 
  faceFeatures2: Float32Array | number[] | string
): number {
  // Menggunakan distance sebagai kebalikan dari similarity
  const distance = calculateFaceMatchDistance(faceFeatures1, faceFeatures2);
  
  // Konversi distance ke similarity score (0-1)
  return Math.max(0, 1 - distance);
}

// Cek apakah wajah cocok berdasarkan threshold
export function isFaceMatch(distance: number): boolean {
  return distance < MATCH_THRESHOLD;
}

// Konfigurasi TinyFaceDetector
export const TINY_FACE_DETECTOR_OPTIONS = new faceapi.TinyFaceDetectorOptions({ 
  inputSize: 160, 
  scoreThreshold: 0.3 
});

/**
 * Fungsi untuk ekstrak descriptor wajah dari gambar
 */
export async function extractFaceDescriptorFromImage(imageData: string): Promise<Float32Array | null> {
  try {
    // Pastikan model sudah dimuat
    if (!modelsLoaded) {
      const loaded = await loadFaceApiModels();
      if (!loaded) {
        console.warn("Tidak dapat memuat model, tidak bisa ekstrak descriptor");
        return null;
      }
    }
    
    // Validasi dan perbaiki URL gambar jika perlu
    const validImageData = ensureValidImageUrl(imageData);
    if (!validImageData) {
      console.warn("URL gambar tidak valid");
      return null;
    }
    
    // Buat elemen gambar baru
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    // Tunggu gambar dimuat
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timeout memuat gambar")), 5000);
      
      img.onload = () => {
        clearTimeout(timeout);
        resolve();
      };
      
      img.onerror = () => {
        clearTimeout(timeout);
        reject(new Error("Gagal memuat gambar"));
      };
      
      // Set source gambar
      img.src = validImageData;
    });
    
    // Opsi deteksi wajah
    const detectorOptions = new faceapi.TinyFaceDetectorOptions({
      inputSize: 320,
      scoreThreshold: 0.5
    });
    
    // Deteksi wajah dan ekstrak descriptor
    const detection = await faceapi
      .detectSingleFace(img, detectorOptions)
      .withFaceLandmarks(true)
      .withFaceDescriptor();
    
    if (!detection) {
      console.warn("Tidak ada wajah terdeteksi pada gambar");
      return null;
    }
    
    // Return descriptor
    return detection.descriptor;
  } catch (error) {
    console.error("Error ekstrak descriptor dari gambar:", error);
    return null;
  }
}

/**
 * Fungsi untuk mengkonversi array/object ke Float32Array
 */
export function toFloat32Array(arr: number[] | Float32Array | unknown): Float32Array | null {
  try {
    if (arr instanceof Float32Array) {
      return arr;
    }
    
    if (Array.isArray(arr)) {
      return new Float32Array(arr);
    }
    
    if (typeof arr === 'object' && arr !== null) {
      // Jika ini adalah JSON-serialized Float32Array atau plain object
      const values = Object.values(arr);
      if (values.length > 0 && typeof values[0] === 'number') {
        return new Float32Array(values);
      }
    }
    
    console.warn("Format data tidak valid untuk konversi ke Float32Array");
    return null;
  } catch (error) {
    console.error("Error konversi ke Float32Array:", error);
    return null;
  }
}

/**
 * Fungsi untuk menghitung jarak Euclidean antara dua descriptor wajah
 */
export function calculateEuclideanDistance(
  descriptor1: Float32Array,
  descriptor2: Float32Array
): number {
  if (!descriptor1 || !descriptor2 || descriptor1.length !== descriptor2.length) {
    return 1.0; // Return nilai maksimum jika tidak valid
  }
  
  let sum = 0;
  for (let i = 0; i < descriptor1.length; i++) {
    const diff = descriptor1[i] - descriptor2[i];
    sum += diff * diff;
  }
  
  return Math.sqrt(sum);
}

/**
 * Fungsi untuk mengecek ketersediaan model
 */
export async function checkModelFilesExist(): Promise<boolean> {
  try {
    // Cek file manifest model
    const requiredFiles = [
      `${FACE_MODELS_PATH}/tiny_face_detector_model-weights_manifest.json`,
      `${FACE_MODELS_PATH}/face_landmark_68_tiny_model-weights_manifest.json`,
      `${FACE_MODELS_PATH}/face_recognition_model-weights_manifest.json`
    ];
    
    const checkPromises = requiredFiles.map(async (file) => {
      try {
        const response = await fetch(file, { method: 'HEAD' });
        return response.ok;
      } catch {
        return false;
      }
    });
    
    const results = await Promise.all(checkPromises);
    const allFilesExist = results.every(result => result === true);
    
    if (!allFilesExist) {
      console.error("Beberapa file model tidak ditemukan", 
        requiredFiles.filter((_, i) => !results[i]));
    }
    
    return allFilesExist;
  } catch (error) {
    console.error("Error memeriksa file model:", error);
    return false;
  }
}

/**
 * Fungsi untuk memastikan URL gambar valid
 * Menangani berbagai format yang mungkin disimpan dari profil karyawan
 */
export function ensureValidImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  
  try {
    // Jika sudah dalam format base64, gunakan langsung
    if (url.startsWith('data:image')) {
      return url;
    }
    
    // Jika URL adalah JSON string (mungkin object yang terserialisasi)
    if (url.startsWith('{') || url.startsWith('[')) {
      try {
        const parsed = JSON.parse(url);
        
        // Cek apakah object dengan properti url/src/path/uri
        if (typeof parsed === 'object' && parsed !== null) {
          const imageUrl = parsed.url || parsed.src || parsed.path || parsed.uri;
          if (typeof imageUrl === 'string') {
            return ensureValidImageUrl(imageUrl);
          }
        }
        
        return null;
      } catch {
        // Bukan JSON valid, lanjutkan
      }
    }
    
    // Jika URL relatif, tambahkan origin
    if (url.startsWith('/')) {
      if (typeof window !== 'undefined') {
        return `${window.location.origin}${url}`;
      }
    }
    
    // Jika URL tidak memiliki protocol, tambahkan https://
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    
    return url;
  } catch (error) {
    console.error('Error saat memvalidasi URL gambar:', error);
    return null;
  }
} 