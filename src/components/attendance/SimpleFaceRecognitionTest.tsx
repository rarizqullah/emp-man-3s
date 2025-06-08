'use client';

import React, { useState, useEffect } from 'react';
import { Camera, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  departmentName: string;
  shiftName: string;
  faceData: string;
}

interface SimpleFaceRecognitionTestProps {
  mode: 'checkIn' | 'checkOut';
  onSuccessfulRecognition: (employeeId: string, employeeName: string) => void;
}

const SimpleFaceRecognitionTest: React.FC<SimpleFaceRecognitionTestProps> = ({
  mode,
  onSuccessfulRecognition
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');

  // Load employee data
  useEffect(() => {
    const loadEmployeeData = async () => {
      try {
        setIsLoading(true);
        
        const response = await fetch('/api/attendance/face-recognition-data');
        const result = await response.json();
        
        if (result.success) {
          setEmployees(result.data);
          toast.success(`Loaded ${result.data.length} employees`);
        } else {
          toast.error('Failed to load employee data');
        }
      } catch (error) {
        console.error('Error loading employees:', error);
        toast.error('Error loading employee data');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadEmployeeData();
  }, []);

  const handleManualRecognition = () => {
    if (!selectedEmployee) {
      toast.error('Please select an employee');
      return;
    }

    const employee = employees.find(emp => emp.id === selectedEmployee);
    if (employee) {
      toast.success(`Simulating face recognition for ${employee.name}`);
      onSuccessfulRecognition(employee.id, employee.name);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Face Recognition Test - {mode === 'checkIn' ? 'Check In' : 'Check Out'}
        </h3>
        <p className="text-sm text-gray-600">
          Test mode untuk face recognition attendance
        </p>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-center space-x-3">
          {isLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          ) : employees.length > 0 ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-yellow-500" />
          )}
          <span className="text-sm font-medium text-gray-700">
            {isLoading 
              ? 'Loading employee data...' 
              : employees.length > 0 
                ? `${employees.length} employees ready for recognition`
                : 'No employees with face data found'
            }
          </span>
        </div>
      </div>

      {!isLoading && employees.length > 0 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Employee (Simulated Face Recognition):
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- Pilih Karyawan --</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} ({employee.employeeId}) - {employee.departmentName}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleManualRecognition}
            disabled={!selectedEmployee}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Camera className="h-4 w-4" />
            <span>Simulate Face Recognition {mode === 'checkIn' ? 'Check In' : 'Check Out'}</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 text-center">
        <div className="bg-gray-50 p-3 rounded-lg">
          <Users className="h-5 w-5 text-gray-500 mx-auto mb-1" />
          <p className="text-sm text-gray-600">Total Employees</p>
          <p className="font-semibold text-gray-900">{employees.length}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <CheckCircle className="h-5 w-5 text-gray-500 mx-auto mb-1" />
          <p className="text-sm text-gray-600">With Face Data</p>
          <p className="font-semibold text-gray-900">{employees.filter(emp => emp.faceData).length}</p>
        </div>
      </div>
    </div>
  );
};

export default SimpleFaceRecognitionTest; 