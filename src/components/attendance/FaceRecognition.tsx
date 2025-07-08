"use client";

import React, { useState } from 'react';
import BasicFaceRecognition from './BasicFaceRecognition';
import FaceRecognitionErrorBoundary from './FaceRecognitionErrorBoundary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Camera, UserCheck, Hash } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface FaceRecognitionProps {
  onSuccessfulRecognition: (employeeId: string) => void;
  mode: 'checkIn' | 'checkOut';
}

const FaceRecognition: React.FC<FaceRecognitionProps> = ({ 
  onSuccessfulRecognition, 
  mode 
}) => {
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualEmployeeId, setManualEmployeeId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasError] = useState(false);

  const handleManualSubmit = async () => {
    if (!manualEmployeeId.trim()) {
      toast.error('Silakan masukkan ID Karyawan');
      return;
    }

    setIsLoading(true);
    try {
      // Verify employee exists
      const response = await fetch(`/api/employees/verify/${manualEmployeeId}`);
      const result = await response.json();

      if (result.success) {
        toast.success(`Absensi berhasil untuk ${result.employee.name}`);
        onSuccessfulRecognition(manualEmployeeId);
        setManualEmployeeId('');
      } else {
        toast.error(result.message || 'ID Karyawan tidak ditemukan');
      }
    } catch (error) {
      console.error('Error verifying employee:', error);
      toast.error('Terjadi kesalahan saat memverifikasi karyawan');
    } finally {
      setIsLoading(false);
    }
  };



  // Manual attendance fallback component
  const ManualAttendanceInput = () => (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-3 p-3 rounded-full bg-blue-100">
          <Hash className="w-8 h-8 text-blue-600" />
        </div>
        <CardTitle className="text-lg">
          Input Manual {mode === 'checkIn' ? 'Check In' : 'Check Out'}
        </CardTitle>
        <p className="text-sm text-gray-600">
          Masukkan ID Karyawan untuk melakukan absensi
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label htmlFor="employeeId" className="block text-sm font-medium mb-2">
              ID Karyawan
            </label>
            <Input
              id="employeeId"
              type="text"
              placeholder="Masukkan ID Karyawan (contoh: EMP001)"
              value={manualEmployeeId}
              onChange={(e) => setManualEmployeeId(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
              className="text-center font-mono text-lg"
            />
          </div>
          
          <div className="space-y-2">
            <Button 
              onClick={handleManualSubmit}
              disabled={isLoading || !manualEmployeeId.trim()}
              className="w-full"
            >
              <UserCheck className="w-4 h-4 mr-2" />
              {isLoading ? 'Memproses...' : `${mode === 'checkIn' ? 'Check In' : 'Check Out'}`}
            </Button>
            
            {!hasError && (
              <Button 
                variant="outline"
                onClick={() => setShowManualInput(false)}
                className="w-full"
              >
                <Camera className="w-4 h-4 mr-2" />
                Kembali ke Face Recognition
              </Button>
            )}
          </div>

          <div className="text-xs text-gray-500 text-center">
            <p>Pastikan ID Karyawan yang dimasukkan benar</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Error fallback component
  const ErrorFallback = () => (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-amber-700 mb-2">
          Face Recognition Tidak Tersedia
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Sistem face recognition sedang mengalami masalah. 
          Gunakan input manual untuk melakukan absensi.
        </p>
        <Button 
          onClick={() => setShowManualInput(true)}
          className="w-full"
        >
          <Hash className="w-4 h-4 mr-2" />
          Gunakan Input Manual
        </Button>
      </CardContent>
    </Card>
  );

  if (showManualInput) {
    return <ManualAttendanceInput />;
  }

  return (
    <FaceRecognitionErrorBoundary fallback={<ErrorFallback />}>
      <div className="space-y-4">
        <BasicFaceRecognition
          onSuccessfulRecognition={onSuccessfulRecognition}
          mode={mode}
        />
        
        {/* Manual input toggle button */}
        <div className="text-center">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowManualInput(true)}
            className="text-gray-500 hover:text-gray-700"
          >
            <Hash className="w-4 h-4 mr-2" />
            Gunakan Input Manual
          </Button>
        </div>
      </div>
    </FaceRecognitionErrorBoundary>
  );
};

export default FaceRecognition; 