// Face API Configuration
// This file centralizes face-api configuration to avoid dynamic import issues

export const FACE_API_CONFIG = {
  // Model files location
  MODEL_PATH: '/models',
  
  // Detection thresholds
  THRESHOLDS: {
    FACE_DETECTION: 0.5,     // How confident we need to be that a face is detected
    FACE_RECOGNITION: 0.5,   // How similar faces need to be to match
    FACE_MATCHING: 0.6,      // Maximum distance for face matching
  },
  
  // Detection settings
  DETECTION: {
    INPUT_SIZE: 512,
    SCORE_THRESHOLD: 0.5,
    NMS_THRESHOLD: 0.3,
  },
  
  // Video settings
  VIDEO: {
    WIDTH: 640,
    HEIGHT: 480,
    FACING_MODE: 'user' as const,
  },
  
  // Auto-detection interval (ms)
  AUTO_DETECTION_INTERVAL: 2000,
  
  // Retry settings
  RETRY: {
    MAX_ATTEMPTS: 3,
    DELAY: 5000, // 5 seconds
  },
  
  // Cache settings
  CACHE: {
    EMPLOYEE_DATA_REFRESH: 30000, // 30 seconds
  }
} as const;

// Available models that need to be loaded
export const REQUIRED_MODELS = [
  'tinyFaceDetector',
  'faceLandmark68Net',
  'faceRecognitionNet'
] as const;

export type RequiredModel = typeof REQUIRED_MODELS[number]; 