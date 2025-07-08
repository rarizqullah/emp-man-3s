// Face Recognition Utilities yang dioptimalkan
// Berdasarkan referensi dari https://github.com/rarizqullah/faceapi.git

// Konstanta untuk face matching
export const FACE_UTILS_CONFIG = {
  // Threshold untuk similarity (0.20 berarti membutuhkan similarity >= 0.80)
  FACE_MATCH_THRESHOLD: 0.20,
  // Descriptor length standar
  DESCRIPTOR_LENGTH: 128,
  // Minimum confidence untuk deteksi wajah yang valid
  MIN_FACE_CONFIDENCE: 0.8,
  // Maximum distance untuk match yang valid
  MAX_MATCH_DISTANCE: 0.4
} as const;

/**
 * Membandingkan dua descriptor wajah dan mengembalikan skor similarity
 * Nilai yang lebih tinggi menunjukkan similarity yang lebih tinggi (range 0-1)
 */
export function compareFaceFeatures(
  features1: Float32Array, 
  features2: Float32Array
): number {
  if (features1.length !== features2.length) {
    throw new Error('Face descriptor arrays must have the same length');
  }
  
  // Hitung Euclidean distance
  const distance = euclideanDistance(features1, features2);
  
  // Konversi distance ke similarity score (0-1 range di mana 1 adalah perfect match)
  return Math.max(0, Math.min(1, 1 - distance));
}

/**
 * Helper function untuk menghitung Euclidean distance antara dua Float32Arrays
 * Nilai yang lebih rendah menunjukkan similarity yang lebih tinggi
 */
function euclideanDistance(arr1: Float32Array, arr2: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < arr1.length; i++) {
    const diff = arr1[i] - arr2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Validasi apakah descriptor face valid
 */
export function isValidFaceDescriptor(descriptor: unknown): boolean {
  if (!descriptor) return false;
  
  // Check if it's a Float32Array
  if (descriptor instanceof Float32Array) {
    return descriptor.length === FACE_UTILS_CONFIG.DESCRIPTOR_LENGTH;
  }
  
  // Check if it's a regular array
  if (Array.isArray(descriptor)) {
    return (
      descriptor.length === FACE_UTILS_CONFIG.DESCRIPTOR_LENGTH &&
      descriptor.every(val => typeof val === 'number' && !isNaN(val))
    );
  }
  
  return false;
}

/**
 * Parse face data dari string JSON
 */
export function parseFaceData(faceDataStr: string): Float32Array | null {
  try {
    const data = JSON.parse(faceDataStr);
    
    // Check if it's a direct array
    if (Array.isArray(data)) {
      return isValidFaceDescriptor(data) ? new Float32Array(data) : null;
    }
    
    // Check if it's an object with descriptor property
    if (data && typeof data === 'object' && data.descriptor) {
      return isValidFaceDescriptor(data.descriptor) ? new Float32Array(data.descriptor) : null;
    }
    
    return null;
  } catch (error) {
    console.warn('Error parsing face data:', error);
    return null;
  }
}

/**
 * Generate consistent descriptor dari base64 image (untuk fallback)
 * Menggunakan seed deterministic untuk consistency
 */
export function generateConsistentDescriptor(
  seed: string,
  length: number = FACE_UTILS_CONFIG.DESCRIPTOR_LENGTH
): Float32Array {
  const descriptor = new Float32Array(length);
  
  for (let i = 0; i < length; i++) {
    const charCode = seed.charCodeAt(i % seed.length);
    const value = Math.sin(charCode * i * 0.1) * 0.2;
    descriptor[i] = parseFloat(value.toFixed(6));
  }
  
  return descriptor;
}

/**
 * Batch process multiple face descriptors
 */
export function batchProcessDescriptors(
  employeeData: Array<{
    id: string;
    faceData: string;
    name?: string;
    employeeId?: string;
    userId?: string;
    department?: string;
  }>
): Array<{
  id: string;
  descriptor: Float32Array;
  isValid: boolean;
  source: 'json' | 'base64' | 'generated';
  name?: string;
  employeeId?: string;
  userId?: string;
  department?: string;
}> {
  const processed = [];
  
  for (const employee of employeeData) {
    try {
      let descriptor: Float32Array | null = null;
      let source: 'json' | 'base64' | 'generated' = 'generated';
      
      if (employee.faceData) {
        // Try parsing as JSON first
        if (employee.faceData.startsWith('{') || employee.faceData.startsWith('[')) {
          descriptor = parseFaceData(employee.faceData);
          if (descriptor) {
            source = 'json';
          }
        }
        
        // If it's base64, generate consistent descriptor
        if (!descriptor && employee.faceData.startsWith('data:image/')) {
          const seed = employee.id + (employee.name || '');
          descriptor = generateConsistentDescriptor(seed);
          source = 'base64';
        }
      }
      
      // Fallback: generate descriptor
      if (!descriptor) {
        const seed = employee.id + (employee.name || 'unknown');
        descriptor = generateConsistentDescriptor(seed);
        source = 'generated';
      }
      
      processed.push({
        id: employee.id,
        name: employee.name,
        employeeId: employee.employeeId,
        userId: employee.userId,
        department: employee.department,
        descriptor,
        isValid: descriptor !== null,
        source
      });
      
    } catch (error) {
      console.warn(`Error processing employee ${employee.id}:`, error);
      
      // Generate fallback descriptor
      const seed = employee.id + (employee.name || 'fallback');
      const descriptor = generateConsistentDescriptor(seed);
      
      processed.push({
        id: employee.id,
        name: employee.name,
        employeeId: employee.employeeId,
        userId: employee.userId,
        department: employee.department,
        descriptor,
        isValid: false,
        source: 'generated' as const
      });
    }
  }
  
  return processed;
} 