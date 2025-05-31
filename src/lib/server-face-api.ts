import * as canvas from 'canvas';
import * as faceapi from 'face-api.js';
import path from 'path';

// Inisialisasi canvas untuk face-api pada server
const { Canvas, Image, ImageData } = canvas;

// Menyiapkan monkeyPatch pada faceapi untuk NodeJS
let isFaceApiInitialized = false;

/**
 * Inisialisasi face-api.js untuk NodeJS environment
 */
export async function initServerFaceApi(): Promise<void> {
  if (isFaceApiInitialized) return;
  
  try {
    // Monkeypatch untuk menggunakan canvas pada NodeJS
    // @ts-expect-error - canvas tidak cocok dengan tipe di browser
    faceapi.env.monkeyPatch({ Canvas, Image, ImageData });
    
    isFaceApiInitialized = true;
    console.log('Server face-api initialized successfully');
  } catch (error) {
    console.error('Failed to initialize server face-api:', error);
    throw new Error('Failed to initialize face recognition system');
  }
}

// Flag untuk melacak status model
let modelsLoaded = false;

/**
 * Memuat model-model face-api.js pada server jika belum dimuat
 */
export async function loadServerFaceApiModels(): Promise<void> {
  if (modelsLoaded) return;
  
  try {
    // Pastikan face-api sudah diinisialisasi
    await initServerFaceApi();
    
    // Path ke direktori model
    const modelPath = path.join(process.cwd(), 'public/models');
    
    // Muat model-model
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromDisk(modelPath),
      faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath),
      faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath)
    ]);
    
    modelsLoaded = true;
    console.log('Server face-api models loaded successfully');
  } catch (error) {
    console.error('Failed to load server face-api models:', error);
    modelsLoaded = false;
    throw new Error('Failed to load face recognition models');
  }
}

/**
 * Mendeteksi wajah dan mengekstrak descriptor dari gambar
 */
export async function extractFaceDescriptor(imageBuffer: Buffer): Promise<number[] | null> {
  try {
    // Pastikan model sudah dimuat
    await loadServerFaceApiModels();
    
    // Muat gambar
    const image = await canvas.loadImage(imageBuffer);
    
    // Deteksi wajah
    const detection = await faceapi.detectSingleFace(
      image as unknown as HTMLImageElement,
      new faceapi.TinyFaceDetectorOptions()
    )
      .withFaceLandmarks()
      .withFaceDescriptor();
    
    if (!detection) {
      return null;
    }
    
    // Konversi descriptor ke array biasa
    return Array.from(detection.descriptor);
  } catch (error) {
    console.error('Error extracting face descriptor:', error);
    return null;
  }
}

/**
 * Memvalidasi format descriptor wajah
 */
export function isValidServerFaceDescriptor(descriptor: unknown): boolean {
  if (!descriptor || !Array.isArray(descriptor)) {
    return false;
  }
  
  // Face descriptor harus berupa array 128 angka
  if (descriptor.length !== 128) {
    return false;
  }
  
  // Setiap elemen harus berupa angka yang valid
  return descriptor.every(val => typeof val === 'number' && !isNaN(val));
} 