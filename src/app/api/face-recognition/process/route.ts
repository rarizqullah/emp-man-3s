import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import * as tf from '@tensorflow/tfjs-node';
import * as canvas from 'canvas';
import * as faceapi from 'face-api.js';

// Inisialisasi canvas untuk face-api
const { Canvas, Image, ImageData } = canvas;
// Menggunakan pendekatan yang aman untuk monkeyPatch
// @ts-ignore: Property 'Canvas' does not exist on type 'typeof globalThis'
if (faceapi.env && typeof faceapi.env.monkeyPatch === 'function') {
  faceapi.env.monkeyPatch({ Canvas, Image, ImageData });
}

// Flag untuk melacak status model
let modelsLoaded = false;

// Fungsi untuk memuat model jika belum dimuat
async function loadModelsIfNeeded() {
  if (!modelsLoaded) {
    // Path ke model-model
    const MODEL_URL = process.cwd() + '/public/models';
    
    await faceapi.nets.tinyFaceDetector.loadFromDisk(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_URL);
    
    modelsLoaded = true;
    console.log('Face-api models loaded on server');
  }
}

export async function POST(request: NextRequest) {
  try {
    await loadModelsIfNeeded();
    
    // Parse body request
    const body = await request.json();
    const { employeeId, faceImageBase64 } = body;
    
    if (!employeeId || !faceImageBase64) {
      return NextResponse.json({ 
        success: false, 
        error: 'Data karyawan atau gambar wajah tidak tersedia' 
      }, { status: 400 });
    }
    
    // Validasi format base64
    if (!faceImageBase64.startsWith('data:image')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Format gambar tidak valid' 
      }, { status: 400 });
    }
    
    // Ubah base64 menjadi buffer gambar
    const base64Data = faceImageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Buat gambar dari buffer
    const image = await canvas.loadImage(imageBuffer);
    
    // Deteksi wajah dalam gambar
    const detection = await faceapi.detectSingleFace(image)
      .withFaceLandmarks()
      .withFaceDescriptor();
    
    if (!detection) {
      return NextResponse.json({ 
        success: false, 
        error: 'Tidak dapat mendeteksi wajah dalam gambar' 
      }, { status: 400 });
    }
    
    // Konversi descriptor ke array biasa untuk disimpan di database
    const faceDescriptor = Array.from(detection.descriptor);
    
    // Simpan descriptor dalam format yang siap digunakan JSON 
    const faceData = {
      descriptor: faceDescriptor,
      timestamp: new Date().toISOString()
    };
    
    // Update data wajah karyawan
    await prisma.employee.update({
      where: { id: employeeId },
      data: {
        faceData: JSON.stringify(faceData)
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Data wajah berhasil diproses dan disimpan',
      employeeId
    });
  } catch (error) {
    console.error('Error processing face data:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Terjadi kesalahan saat memproses data wajah' 
    }, { status: 500 });
  }
} 