// Script untuk mengunduh model face-api.js
const fs = require('fs');
const https = require('https');
const path = require('path');

const BASE_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
const MODELS_DIR = path.join(__dirname, 'public', 'models');

// Daftar file model yang perlu diunduh
const models = [
  // Model TinyFaceDetector
  'tiny_face_detector_model-shard1',
  'tiny_face_detector_model-weights_manifest.json',
  
  // Model FaceLandmark68
  'face_landmark_68_model-shard1',
  'face_landmark_68_model-weights_manifest.json',
  
  // Model FaceRecognition
  'face_recognition_model-shard1',
  'face_recognition_model-shard2',
  'face_recognition_model-weights_manifest.json'
];

// Memastikan direktori models ada
if (!fs.existsSync(MODELS_DIR)) {
  console.log(`Membuat direktori ${MODELS_DIR}`);
  fs.mkdirSync(MODELS_DIR, { recursive: true });
}

// Fungsi untuk mengunduh file
function downloadFile(fileName) {
  return new Promise((resolve, reject) => {
    const fileUrl = `${BASE_URL}/${fileName}`;
    const filePath = path.join(MODELS_DIR, fileName);
    
    console.log(`Mengunduh ${fileName}...`);
    
    // Jika file sudah ada, skip
    if (fs.existsSync(filePath)) {
      console.log(`File ${fileName} sudah ada, melewati...`);
      resolve();
      return;
    }
    
    const file = fs.createWriteStream(filePath);
    
    https.get(fileUrl, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Gagal mengunduh ${fileName}: HTTP ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`Berhasil mengunduh ${fileName}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {}); // Hapus file yang tidak lengkap
      reject(err);
    });
    
    file.on('error', (err) => {
      fs.unlink(filePath, () => {});
      reject(err);
    });
  });
}

// Fungsi untuk mengunduh semua model
async function downloadModels() {
  console.log('Memulai unduhan model face-api.js...');
  
  try {
    // Unduh satu per satu
    for (const model of models) {
      await downloadFile(model);
    }
    
    console.log('Semua model berhasil diunduh!');
  } catch (error) {
    console.error('Terjadi kesalahan:', error);
  }
}

// Jalankan unduhan
downloadModels(); 