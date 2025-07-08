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
} else {
  console.log(`Direktori ${MODELS_DIR} sudah ada`);
}

// Fungsi untuk mengunduh file
function downloadFile(fileName) {
  return new Promise((resolve, reject) => {
    const fileUrl = `${BASE_URL}/${fileName}`;
    const filePath = path.join(MODELS_DIR, fileName);
    
    console.log(`Memeriksa ${fileName}...`);
    
    // Jika file sudah ada, skip
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log(`✅ File ${fileName} sudah ada (${Math.round(stats.size / 1024)}KB)`);
      resolve();
      return;
    }
    
    console.log(`📥 Mengunduh ${fileName} dari ${fileUrl}...`);
    
    const file = fs.createWriteStream(filePath);
    
    const request = https.get(fileUrl, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        console.log(`🔄 Redirect untuk ${fileName} ke ${response.headers.location}`);
        file.close();
        fs.unlinkSync(filePath);
        
        https.get(response.headers.location, (redirectResponse) => {
          if (redirectResponse.statusCode !== 200) {
            reject(new Error(`Gagal mengunduh ${fileName} setelah redirect: HTTP ${redirectResponse.statusCode}`));
            return;
          }
          
          const redirectFile = fs.createWriteStream(filePath);
          redirectResponse.pipe(redirectFile);
          
          redirectFile.on('finish', () => {
            redirectFile.close();
            const stats = fs.statSync(filePath);
            console.log(`✅ Berhasil mengunduh ${fileName} (${Math.round(stats.size / 1024)}KB)`);
            resolve();
          });
          
          redirectFile.on('error', (err) => {
            fs.unlink(filePath, () => {});
            reject(err);
          });
        });
        
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Gagal mengunduh ${fileName}: HTTP ${response.statusCode}`));
        return;
      }
      
      let downloadedBytes = 0;
      const totalBytes = parseInt(response.headers['content-length']) || 0;
      
      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        if (totalBytes > 0) {
          const progress = Math.round((downloadedBytes / totalBytes) * 100);
          process.stdout.write(`\r📥 ${fileName}: ${progress}%`);
        }
      });
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        const stats = fs.statSync(filePath);
        console.log(`\n✅ Berhasil mengunduh ${fileName} (${Math.round(stats.size / 1024)}KB)`);
        resolve();
      });
    });
    
    request.on('error', (err) => {
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
  console.log('🚀 Memulai unduhan model face-api.js...');
  console.log(`📁 Target direktori: ${MODELS_DIR}`);
  
  try {
    // Unduh satu per satu
    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      console.log(`\n[${i + 1}/${models.length}] Memproses ${model}...`);
      await downloadFile(model);
    }
    
    console.log('\n🎉 Semua model berhasil diunduh!');
    
    // Verifikasi file yang telah diunduh
    console.log('\n📋 Verifikasi file:');
    models.forEach(model => {
      const filePath = path.join(MODELS_DIR, model);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`✅ ${model} (${Math.round(stats.size / 1024)}KB)`);
      } else {
        console.log(`❌ ${model} - TIDAK DITEMUKAN`);
      }
    });
    
  } catch (error) {
    console.error('\n❌ Terjadi kesalahan:', error.message);
    process.exit(1);
  }
}

// Fungsi untuk memeriksa model yang sudah ada
function checkExistingModels() {
  console.log('\n🔍 Memeriksa model yang sudah ada...');
  let existingCount = 0;
  
  models.forEach(model => {
    const filePath = path.join(MODELS_DIR, model);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log(`✅ ${model} (${Math.round(stats.size / 1024)}KB)`);
      existingCount++;
    } else {
      console.log(`❌ ${model} - TIDAK DITEMUKAN`);
    }
  });
  
  console.log(`\n📊 Status: ${existingCount}/${models.length} model tersedia`);
  
  if (existingCount === models.length) {
    console.log('🎉 Semua model sudah tersedia!');
    return true;
  } else {
    console.log('⚠️ Beberapa model belum tersedia');
    return false;
  }
}

// Jalankan
(async () => {
  console.log('🔧 Face Recognition Model Downloader');
  console.log('=====================================');
  
  // Periksa model yang sudah ada
  const allExists = checkExistingModels();
  
  if (!allExists) {
    console.log('\n🚀 Memulai download model yang hilang...');
    await downloadModels();
  }
  
  console.log('\n🏁 Selesai!');
})(); 