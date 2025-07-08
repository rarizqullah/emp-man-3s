// Face Recognition Service yang dioptimalkan
import * as faceapi from '@vladmandic/face-api';

// Konfigurasi untuk face recognition
export const FACE_CONFIG = {
  MODEL_PATH: '/models',
  THRESHOLDS: {
    FACE_DETECTION: 0.8,  // Threshold deteksi wajah yang lebih tinggi
    FACE_MATCHING: 0.4,   // Threshold matching - lebih rendah untuk akurasi
    MIN_CONFIDENCE: 0.8,  // Minimum confidence untuk deteksi
  },
  DETECTION: {
    INPUT_SIZE: 320,      // Input size untuk model
    SCORE_THRESHOLD: 0.5, // Score threshold untuk deteksi
  },
  CACHE: {
    EMPLOYEE_DATA_TTL: 30000, // Cache employee data selama 30 detik
  }
} as const;

// Interface untuk employee face data
export interface EmployeeFaceData {
  id: string;
  employeeId: string;
  name: string;
  descriptor: Float32Array;
  department?: string;
}

// Interface untuk face detection result
export interface FaceDetectionResult {
  detection: faceapi.FaceDetection;
  landmarks: faceapi.FaceLandmarks68;
  descriptor: Float32Array;
  confidence: number;
}

// Service class untuk face recognition
export class FaceRecognitionService {
  private initialized = false;
  private modelLoadPromise: Promise<void> | null = null;
  private employeeDataCache: {
    data: EmployeeFaceData[];
    timestamp: number;
  } | null = null;

  // Singleton pattern
  private static instance: FaceRecognitionService | null = null;
  
  public static getInstance(): FaceRecognitionService {
    if (!FaceRecognitionService.instance) {
      FaceRecognitionService.instance = new FaceRecognitionService();
    }
    return FaceRecognitionService.instance;
  }

  // Initialize models
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    if (this.modelLoadPromise) {
      return this.modelLoadPromise;
    }

    this.modelLoadPromise = this._loadModels();
    await this.modelLoadPromise;
    this.initialized = true;
  }

  private async _loadModels(): Promise<void> {
    try {
      console.log('🔄 Loading face recognition models...');
      
      // Load models secara paralel
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(FACE_CONFIG.MODEL_PATH),
        faceapi.nets.faceLandmark68Net.loadFromUri(FACE_CONFIG.MODEL_PATH),
        faceapi.nets.faceRecognitionNet.loadFromUri(FACE_CONFIG.MODEL_PATH)
      ]);
      
      console.log('✅ Face recognition models loaded successfully');
    } catch (error) {
      console.error('❌ Error loading face recognition models:', error);
      throw new Error('Gagal memuat model face recognition');
    }
  }

  // Check if service is initialized
  isInitialized(): boolean {
    return this.initialized;
  }

  // Detect face with enhanced options
  async detectFaceWithDescriptor(
    input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement
  ): Promise<FaceDetectionResult | null> {
    if (!this.initialized) {
      throw new Error('Face recognition service not initialized');
    }

    try {
      const options = new faceapi.SsdMobilenetv1Options({
        minConfidence: FACE_CONFIG.THRESHOLDS.MIN_CONFIDENCE,
        maxResults: 1
      });

      const detection = await faceapi
        .detectSingleFace(input, options)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection && detection.detection.score >= FACE_CONFIG.THRESHOLDS.FACE_DETECTION) {
        return {
          detection: detection.detection,
          landmarks: detection.landmarks,
          descriptor: detection.descriptor,
          confidence: detection.detection.score
        };
      }

      return null;
    } catch (error) {
      console.error('Error detecting face:', error);
      return null;
    }
  }

  // Load employee data dengan caching
  async loadEmployeeData(forceRefresh = false): Promise<EmployeeFaceData[]> {
    // Check cache first
    if (!forceRefresh && this.employeeDataCache) {
      const now = Date.now();
      if (now - this.employeeDataCache.timestamp < FACE_CONFIG.CACHE.EMPLOYEE_DATA_TTL) {
        console.log('📦 Using cached employee data');
        return this.employeeDataCache.data;
      }
    }

    try {
      console.log('🔄 Loading employee face data...');
      
      const response = await fetch('/api/face-recognition/descriptors');
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to load employee data');
      }

      const processedData: EmployeeFaceData[] = result.data.map((emp: {
        id: string;
        employeeId: string;
        name: string;
        descriptor: number[];
        department?: string;
      }) => ({
        id: emp.id,
        employeeId: emp.employeeId,
        name: emp.name,
        descriptor: new Float32Array(emp.descriptor),
        department: emp.department
      }));

      // Cache the data
      this.employeeDataCache = {
        data: processedData,
        timestamp: Date.now()
      };

      console.log(`✅ Loaded ${processedData.length} employee face data`);
      return processedData;
    } catch (error) {
      console.error('❌ Error loading employee data:', error);
      throw new Error('Gagal memuat data karyawan');
    }
  }

  // Compare face descriptors
  calculateDistance(descriptor1: Float32Array, descriptor2: Float32Array): number {
    return faceapi.euclideanDistance(descriptor1, descriptor2);
  }

  // Find best match from employee data
  findBestMatch(
    inputDescriptor: Float32Array,
    employeeData: EmployeeFaceData[]
  ): { employee: EmployeeFaceData; distance: number; confidence: number } | null {
    let bestMatch: EmployeeFaceData | null = null;
    let bestDistance = 1.0;

    console.log(`🔍 Comparing face with ${employeeData.length} employees`);

    for (const employee of employeeData) {
      const distance = this.calculateDistance(inputDescriptor, employee.descriptor);
      
      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = employee;
      }
    }

    if (bestMatch && bestDistance < FACE_CONFIG.THRESHOLDS.FACE_MATCHING) {
      const confidence = Math.round((1 - bestDistance) * 100);
      console.log(`✅ Best match: ${bestMatch.name} (confidence: ${confidence}%)`);
      
      return {
        employee: bestMatch,
        distance: bestDistance,
        confidence
      };
    }

    console.log(`❌ No match found within threshold ${FACE_CONFIG.THRESHOLDS.FACE_MATCHING}`);
    return null;
  }

  // Clear cache
  clearCache(): void {
    this.employeeDataCache = null;
    console.log('🗑️ Employee data cache cleared');
  }

  // Get detection options
  getDetectionOptions() {
    return new faceapi.SsdMobilenetv1Options({
      minConfidence: FACE_CONFIG.THRESHOLDS.MIN_CONFIDENCE,
      maxResults: 1
    });
  }
}

// Export singleton instance
export const faceRecognitionService = FaceRecognitionService.getInstance(); 