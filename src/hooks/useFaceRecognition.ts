// Custom hook untuk Face Recognition yang dioptimalkan
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { faceRecognitionService, type EmployeeFaceData } from '@/lib/face-recognition-service';

export interface UseFaceRecognitionOptions {
  onSuccessfulRecognition?: (employeeId: string, employee: EmployeeFaceData) => void;
  onError?: (error: string) => void;
  autoStart?: boolean;
  mode?: 'checkIn' | 'checkOut';
}

export interface UseFaceRecognitionReturn {
  // State
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  employees: EmployeeFaceData[];
  recognizedEmployee: EmployeeFaceData | null;
  
  // Actions
  initialize: () => Promise<void>;
  loadEmployees: (forceRefresh?: boolean) => Promise<void>;
  recognizeFromVideo: (video: HTMLVideoElement) => Promise<EmployeeFaceData | null>;
  reset: () => void;
  clearError: () => void;
  
  // Status
  lastLoadTime: Date | null;
  employeeCount: number;
}

export function useFaceRecognition(options: UseFaceRecognitionOptions = {}): UseFaceRecognitionReturn {
  const {
    onSuccessfulRecognition,
    onError,
    autoStart = false
  } = options;

  // State
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<EmployeeFaceData[]>([]);
  const [recognizedEmployee, setRecognizedEmployee] = useState<EmployeeFaceData | null>(null);
  const [lastLoadTime, setLastLoadTime] = useState<Date | null>(null);

  // Initialize face recognition service
  const initialize = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🚀 Initializing face recognition hook...');
      
      // Initialize service
      await faceRecognitionService.initialize();
      setIsInitialized(true);
      
      console.log('✅ Face recognition service initialized');
      
      // Load employee data
      await loadEmployees();
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize face recognition';
      console.error('❌ Face recognition initialization failed:', error);
      setError(errorMessage);
      onError?.(errorMessage);
      toast.error('Gagal menginisialisasi pengenalan wajah');
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  // Load employee data
  const loadEmployees = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      
      console.log('📊 Loading employee face data...');
      
      const employeeData = await faceRecognitionService.loadEmployeeData(forceRefresh);
      setEmployees(employeeData);
      setLastLoadTime(new Date());
      
      console.log(`✅ Loaded ${employeeData.length} employee records`);
      
             if (employeeData.length === 0) {
         const message = 'Tidak ada data wajah karyawan. Silakan tambahkan data wajah di menu karyawan.';
         setError(message);
         toast(message, { icon: '⚠️' });
       }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load employee data';
      console.error('❌ Failed to load employee data:', error);
      setError(errorMessage);
      onError?.(errorMessage);
      toast.error('Gagal memuat data karyawan');
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  // Recognize face from video element
  const recognizeFromVideo = useCallback(async (video: HTMLVideoElement): Promise<EmployeeFaceData | null> => {
    try {
      if (!isInitialized) {
        throw new Error('Face recognition service not initialized');
      }
      
      if (employees.length === 0) {
        throw new Error('No employee data available');
      }
      
      console.log('🔍 Recognizing face from video...');
      
      // Detect face
      const detection = await faceRecognitionService.detectFaceWithDescriptor(video);
      
      if (!detection) {
        console.log('❌ No face detected');
        return null;
      }
      
      console.log('✅ Face detected, finding match...');
      
      // Find matching employee
      const match = faceRecognitionService.findBestMatch(detection.descriptor, employees);
      
      if (match) {
        console.log(`🎉 Employee recognized: ${match.employee.name} (${match.confidence}%)`);
        setRecognizedEmployee(match.employee);
        
        toast.success(`Wajah dikenali: ${match.employee.name} (${match.confidence}%)`);
        
        // Trigger callback
        onSuccessfulRecognition?.(match.employee.employeeId, match.employee);
        
        return match.employee;
      } else {
        console.log('❌ No matching employee found');
        toast.error('Wajah tidak dikenali');
        return null;
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Face recognition failed';
      console.error('❌ Face recognition error:', error);
      setError(errorMessage);
      onError?.(errorMessage);
      toast.error('Gagal mengenali wajah');
      return null;
    }
  }, [isInitialized, employees, onSuccessfulRecognition, onError]);

  // Reset state
  const reset = useCallback(() => {
    console.log('🔄 Resetting face recognition state...');
    setRecognizedEmployee(null);
    setError(null);
    faceRecognitionService.clearCache();
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-initialize if enabled
  useEffect(() => {
    if (autoStart && !isInitialized && !isLoading) {
      initialize();
    }
  }, [autoStart, isInitialized, isLoading, initialize]);

  // Auto-refresh employee data periodically
  useEffect(() => {
    if (!isInitialized || employees.length === 0) return;
    
    const interval = setInterval(() => {
      if (!isLoading) {
        console.log('🔄 Auto-refreshing employee data...');
        loadEmployees();
      }
    }, 60000); // Refresh every minute
    
    return () => clearInterval(interval);
  }, [isInitialized, employees.length, isLoading, loadEmployees]);

  return {
    // State
    isInitialized,
    isLoading,
    error,
    employees,
    recognizedEmployee,
    
    // Actions
    initialize,
    loadEmployees,
    recognizeFromVideo,
    reset,
    clearError,
    
    // Status
    lastLoadTime,
    employeeCount: employees.length
  };
} 