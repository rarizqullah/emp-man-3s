import * as faceapi from '@vladmandic/face-api';

// Local configuration to avoid import issues
const FACE_API_CONFIG = {
  MODEL_PATH: '/models',
  THRESHOLDS: {
    FACE_DETECTION: 0.5,
    FACE_RECOGNITION: 0.5,
    FACE_MATCHING: 0.6,
  },
  DETECTION: {
    INPUT_SIZE: 512,
    SCORE_THRESHOLD: 0.5,
    NMS_THRESHOLD: 0.3,
  },
  RETRY: {
    MAX_ATTEMPTS: 3,
    DELAY: 5000,
  },
} as const;

const REQUIRED_MODELS = [
  'tinyFaceDetector',
  'faceLandmark68Net',
  'faceRecognitionNet'
] as const;

// Export types untuk digunakan di komponen
export interface FaceDetection {
  descriptor: Float32Array;
}

export interface EmployeeFaceData {
  id: string;
  name: string;
  descriptor: number[];
  department?: string;
  employeeId: string;
}

// Face API wrapper class
export class FaceRecognitionService {
  private initialized = false;
  private loadingPromise: Promise<void> | null = null;

  // Initialize face API models
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    // Prevent multiple concurrent initializations
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = this._doInitialize();
    return this.loadingPromise;
  }

  private async _doInitialize(): Promise<void> {
    try {
      console.log('🔄 Loading face recognition models...');
      
      // Check if we're in browser environment
      if (typeof window === 'undefined') {
        throw new Error('Face recognition service can only be initialized in browser environment');
      }

      // Check if face-api is available
      if (!faceapi) {
        throw new Error('Face-api library not available');
      }

      console.log('📦 Face-api library loaded successfully');
      
      // Test if models directory is accessible
      try {
        const testResponse = await fetch(`${FACE_API_CONFIG.MODEL_PATH}/tiny_face_detector_model-weights_manifest.json`, {
          method: 'HEAD',
          cache: 'no-cache'
        });
        
        if (!testResponse.ok) {
          throw new Error(`Models directory not accessible: ${testResponse.status}`);
        }
        
        console.log('✅ Models directory is accessible');
      } catch (testError) {
        console.error('❌ Models directory test failed:', testError);
        throw new Error(`Cannot access models directory at ${FACE_API_CONFIG.MODEL_PATH}. Please ensure model files are available.`);
      }
      
      // Load models with retry mechanism
      const modelPromises = [
        this.loadModelWithRetry('tinyFaceDetector', () => 
          faceapi.nets.tinyFaceDetector.loadFromUri(FACE_API_CONFIG.MODEL_PATH)
        ),
        this.loadModelWithRetry('faceLandmark68Net', () => 
          faceapi.nets.faceLandmark68Net.loadFromUri(FACE_API_CONFIG.MODEL_PATH)
        ),
        this.loadModelWithRetry('faceRecognitionNet', () => 
          faceapi.nets.faceRecognitionNet.loadFromUri(FACE_API_CONFIG.MODEL_PATH)
        )
      ];

      // Load all models with individual error handling
      const modelResults = await Promise.allSettled(modelPromises);
      
      const failedModels = modelResults
        .map((result, index) => ({ result, model: REQUIRED_MODELS[index] }))
        .filter(({ result }) => result.status === 'rejected');

      if (failedModels.length > 0) {
        const failedModelNames = failedModels.map(({ model }) => model).join(', ');
        const failedReasons = failedModels.map(({ result }) => 
          result.status === 'rejected' ? result.reason?.message || 'Unknown error' : ''
        ).join('; ');
        
        throw new Error(`Failed to load models: ${failedModelNames}. Reasons: ${failedReasons}`);
      }

      this.initialized = true;
      console.log('✅ Face API models loaded successfully');
      console.log(`📁 Models loaded from: ${FACE_API_CONFIG.MODEL_PATH}`);
      console.log(`🎯 Required models: ${REQUIRED_MODELS.join(', ')}`);
      
      // Test face-api functionality
      console.log('🧪 Testing face-api functionality...');
      const testOptions = new faceapi.TinyFaceDetectorOptions();
      console.log('✅ Face-api test successful', { optionsCreated: !!testOptions });
      
    } catch (error) {
      console.error('❌ Failed to load face API models:', error);
      this.loadingPromise = null; // Reset so it can be retried
      
      // Provide more specific error messages
      let errorMessage = 'Failed to initialize face recognition models';
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to load models')) {
          errorMessage = `Model loading failed: ${error.message}`;
        } else if (error.message.includes('browser environment')) {
          errorMessage = 'Face recognition only works in browser environment';
        } else if (error.message.includes('Face-api library not available')) {
          errorMessage = 'Face-api library is not properly loaded';
        } else if (error.message.includes('Models directory not accessible')) {
          errorMessage = 'Cannot access AI models directory. Please check if model files are available.';
        } else if (error.message.includes('Cannot access models directory')) {
          errorMessage = error.message;
        } else {
          errorMessage = `Initialization error: ${error.message}`;
        }
      }
      
      throw new Error(errorMessage);
    }
  }

  // Helper method to load model with retry
  private async loadModelWithRetry(
    modelName: string, 
    loadFunction: () => Promise<void>, 
    maxRetries: number = 3
  ): Promise<void> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📥 Loading ${modelName} (attempt ${attempt}/${maxRetries})...`);
        await loadFunction();
        console.log(`✅ ${modelName} loaded successfully`);
        return;
      } catch (error) {
        console.warn(`⚠️ Failed to load ${modelName} on attempt ${attempt}:`, error);
        lastError = error instanceof Error ? error : new Error(`Unknown error loading ${modelName}`);
        
        // Wait before retry (except on last attempt)
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    throw new Error(`Failed to load ${modelName} after ${maxRetries} attempts: ${lastError?.message}`);
  }

  // Check if service is initialized
  isInitialized(): boolean {
    return this.initialized;
  }

  // Detect face and get descriptor
  async detectFace(video: HTMLVideoElement): Promise<FaceDetection | null> {
    if (!this.initialized) {
      throw new Error('Face recognition service not initialized');
    }

    try {
      const options = new faceapi.TinyFaceDetectorOptions({
        inputSize: FACE_API_CONFIG.DETECTION.INPUT_SIZE,
        scoreThreshold: FACE_API_CONFIG.DETECTION.SCORE_THRESHOLD
      });

      const detection = await faceapi
        .detectSingleFace(video, options)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        console.log(`✅ Face detected with descriptor length: ${detection.descriptor.length}`);
      }

      return detection || null;
    } catch (error) {
      console.error('Error detecting face:', error);
      return null;
    }
  }

  // Calculate distance between two face descriptors
  calculateDistance(descriptor1: Float32Array, descriptor2: Float32Array | number[]): number {
    try {
      // Convert number array to Float32Array if needed
      const desc2 = descriptor2 instanceof Float32Array 
        ? descriptor2 
        : new Float32Array(descriptor2);
      
      const distance = faceapi.euclideanDistance(descriptor1, desc2);
      return distance;
    } catch (error) {
      console.error('Error calculating face distance:', error);
      return Infinity;
    }
  }

  // Find best match from employee data
  findBestMatch(
    inputDescriptor: Float32Array, 
    employeeData: EmployeeFaceData[], 
    threshold: number = FACE_API_CONFIG.THRESHOLDS.FACE_MATCHING
  ): EmployeeFaceData | null {
    let bestMatch: EmployeeFaceData | null = null;
    let bestDistance = Infinity;

    console.log(`🔍 Comparing face with ${employeeData.length} employees (threshold: ${threshold})`);

    for (const employee of employeeData) {
      const distance = this.calculateDistance(inputDescriptor, employee.descriptor);
      
      console.log(`📏 Distance to ${employee.name}: ${distance.toFixed(3)}`);
      
      if (distance < threshold && distance < bestDistance) {
        bestDistance = distance;
        bestMatch = employee;
      }
    }

    if (bestMatch) {
      const confidence = Math.round((1 - bestDistance) * 100);
      console.log(`✅ Best match: ${bestMatch.name} (distance: ${bestDistance.toFixed(3)}, confidence: ${confidence}%)`);
    } else {
      console.log(`❌ No match found within threshold ${threshold}`);
    }

    return bestMatch;
  }

  // Get face API options with current configuration
  getDetectorOptions() {
    return new faceapi.TinyFaceDetectorOptions({
      inputSize: FACE_API_CONFIG.DETECTION.INPUT_SIZE,
      scoreThreshold: FACE_API_CONFIG.DETECTION.SCORE_THRESHOLD
    });
  }

  // Get current configuration
  getConfig() {
    return FACE_API_CONFIG;
  }

  // Reset initialization state (for debugging/testing)
  reset() {
    this.initialized = false;
    this.loadingPromise = null;
    console.log('🔄 Face recognition service reset');
  }
}

// Singleton instance
export const faceRecognitionService = new FaceRecognitionService(); 