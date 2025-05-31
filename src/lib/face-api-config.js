import * as faceapi from 'face-api.js';

// Path ke model
export const MODEL_URL = '/models';

// Interval deteksi default (ms)
export const DETECTION_INTERVAL = 1000;

// Flag untuk mengecek apakah model sudah dimuat
let modelsLoaded = false;
let loadAttempted = false;

// Fungsi untuk memuat model face-api.js
export const loadFaceApiModels = async () => {
  // Jika sudah pernah berhasil dimuat, gunakan cache
  if (modelsLoaded) {
    console.log("Model sudah dimuat sebelumnya, skip loading");
    return true;
  }
  
  // Jika sudah pernah mencoba dimuat tapi gagal, jangan coba lagi
  if (loadAttempted) {
    console.log("Sudah pernah mencoba memuat model sebelumnya dan gagal");
    return false;
  }
  
  loadAttempted = true;
  
  try {
    console.log("Memulai pemuatan model face-api.js...");
    
    // Tambahkan penanganan untuk mode SSR/server-side rendering
    if (typeof window === 'undefined') {
      console.warn("Berjalan di server-side, skip loading model");
      return false;
    }
    
    // Karena kita berjalan di browser, cek apakah dalam lingkungan yang mendukung
    if (!navigator || !navigator.mediaDevices) {
      console.warn("Browser tidak mendukung API MediaDevices");
      return false;
    }

    // Verifikasi bahwa model ada sebelum mencoba memuat
    const modelFilesAvailable = await checkModelFilesExist();
    if (!modelFilesAvailable) {
      console.error("File model tidak tersedia di server");
      return false;
    }
    
    // Coba set backend TensorFlow
    try {
      // Pastikan TensorFlow.js dimuat terlebih dahulu
      await faceapi.tf.ready();
      
      // Coba gunakan WebGL untuk performa lebih baik
      if (faceapi.tf.backend() !== 'webgl') {
        const webglAvailable = await faceapi.tf.setBackend('webgl');
        if (webglAvailable) {
          console.log("TensorFlow backend set to WebGL");
        } else {
          console.warn("WebGL tidak tersedia, menggunakan CPU");
          await faceapi.tf.setBackend('cpu');
        }
      }
    } catch (tfError) {
      console.warn("Error setting TensorFlow backend:", tfError);
      try {
        await faceapi.tf.setBackend('cpu');
        console.log("TensorFlow fallback to CPU");
      } catch (cpuError) {
        console.error("TensorFlow backend setup failed:", cpuError);
        return false;
      }
    }

    // Load model dengan penanganan timeout
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Model loading timeout')), 10000);
      });
      
      // Muat model TinyFaceDetector (lebih ringan)
      console.log("Loading face detection model...");
      const detectorPromise = faceapi.nets.tinyFaceDetector.load(MODEL_URL);
      await Promise.race([detectorPromise, timeoutPromise]);
      
      // Muat model landmark wajah
      console.log("Loading face landmark model...");
      const landmarkPromise = faceapi.nets.faceLandmark68Net.load(MODEL_URL);
      await Promise.race([landmarkPromise, timeoutPromise]);
      
      // Muat model rekognisi wajah
      console.log("Loading face recognition model...");
      const recognitionPromise = faceapi.nets.faceRecognitionNet.load(MODEL_URL);
      await Promise.race([recognitionPromise, timeoutPromise]);
      
      console.log("Semua model face-api.js berhasil dimuat");
      modelsLoaded = true;
      return true;
    } catch (loadError) {
      console.error("Error loading face-api.js models:", loadError);
      return false;
    }
  } catch (error) {
    console.error("Error fatal saat memuat model face-api.js:", error);
    return false;
  }
};

// Fungsi untuk memverifikasi apakah file model tersedia di server
const checkModelFilesExist = async () => {
  try {
    // Periksa manifest file (menggunakan HEAD request untuk efisiensi)
    const checkFile = async (filename) => {
      try {
        const response = await fetch(`${MODEL_URL}/${filename}`, { method: 'HEAD' });
        return response.ok;
      } catch {
        return false;
      }
    };
    
    // Periksa manifest files yang diperlukan
    const manifestFiles = [
      'tiny_face_detector_model-weights_manifest.json',
      'face_landmark_68_model-weights_manifest.json',
      'face_recognition_model-weights_manifest.json'
    ];
    
    // Cek setiap file
    for (const file of manifestFiles) {
      const exists = await checkFile(file);
      if (!exists) {
        console.warn(`Model file not found: ${file}`);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error("Error checking model files:", error);
    return false;
  }
};

// Fungsi untuk mendeteksi wajah dengan landmark
export const detectFaceWithLandmarks = async (input) => {
  try {
    if (!modelsLoaded) {
      console.warn("Model belum dimuat, mencoba memuat model terlebih dahulu");
      const loaded = await loadFaceApiModels();
      if (!loaded) {
        return { 
          success: false, 
          message: "Gagal memuat model deteksi wajah" 
        };
      }
    }
    
    // Opsi deteksi wajah
    const tinyFaceDetectorOptions = new faceapi.TinyFaceDetectorOptions({ 
      inputSize: 320, 
      scoreThreshold: 0.5 
    });
    
    // Deteksi wajah dengan landmark
    const detection = await faceapi
      .detectSingleFace(input, tinyFaceDetectorOptions)
      .withFaceLandmarks();
    
    if (!detection) {
      return { 
        success: false, 
        message: "Tidak ada wajah terdeteksi" 
      };
    }
    
    // Dapatkan descriptor wajah untuk pengenalan
    const descriptor = await faceapi
      .detectSingleFace(input, tinyFaceDetectorOptions)
      .withFaceLandmarks()
      .withFaceDescriptor();
    
    return { 
      success: true, 
      faceRectangle: detection.detection.box,
      landmarks: detection.landmarks,
      descriptor: descriptor ? descriptor.descriptor : null 
    };
  } catch (error) {
    console.error("Error mendeteksi wajah:", error);
    return { 
      success: false, 
      message: `Error: ${error.message || "Unknown error"}` 
    };
  }
};

// Fungsi untuk menggambar landmark wajah
export const drawFaceLandmarks = (canvas, box) => {
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Bersihkan canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Menggambar kotak wajah
    ctx.strokeStyle = '#32a852';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(box.x, box.y, box.width, box.height);
    ctx.stroke();
    
    // Menggambar titik tengah wajah
    ctx.fillStyle = '#32a852';
    const centerX = box.x + (box.width / 2);
    const centerY = box.y + (box.height / 2);
    ctx.beginPath();
    ctx.arc(centerX, centerY, 3, 0, 2 * Math.PI);
    ctx.fill();
  } catch (error) {
    console.error("Error drawing face landmarks:", error);
  }
};

// Fungsi untuk ekstrak descriptor wajah dari gambar
export const extractFaceDescriptorFromImage = async (imageData) => {
  try {
    // Pastikan model sudah dimuat
    if (!modelsLoaded) {
      const loaded = await loadFaceApiModels();
      if (!loaded) {
        console.warn("Tidak dapat memuat model, tidak bisa ekstrak descriptor");
        return null;
      }
    }
    
    // Buat elemen gambar baru
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    // Tunggu gambar dimuat
    const imageLoaded = await new Promise((resolve, reject) => {
      img.onload = () => resolve(true);
      img.onerror = () => reject(new Error("Gagal memuat gambar"));
      
      // Set timeout untuk image loading
      const timeout = setTimeout(() => reject(new Error("Timeout memuat gambar")), 5000);
      
      // Handle berbagai format base64 atau URL
      if (typeof imageData === 'string') {
        if (imageData.startsWith('data:')) {
          // Data URL / base64
          img.src = imageData;
        } else if (imageData.startsWith('http')) {
          // URL eksternal
          img.src = imageData;
        } else {
          // Path relatif
          img.src = imageData;
        }
      } else {
        reject(new Error("Format gambar tidak didukung"));
      }
      
      // Clear timeout on success
      img.onload = () => {
        clearTimeout(timeout);
        resolve(true);
      };
    });
    
    if (!imageLoaded) {
      return null;
    }
    
    // Deteksi wajah dan ekstrak descriptor
    const detection = await faceapi
      .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
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
}; 