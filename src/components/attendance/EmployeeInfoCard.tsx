import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, User, Building, Calendar } from 'lucide-react';

interface EmployeeInfoCardProps {
  name: string;
  department: string;
  shift: string;
  checkInTime: string;
  checkOutTime: string;
  status: string;
}

const EmployeeInfoCard: React.FC<EmployeeInfoCardProps> = ({ 
  name, 
  department, 
  shift, 
  checkInTime, 
  checkOutTime, 
  status 
}) => {
  const isCheckInToday = checkInTime && checkInTime !== '-';
  const isCheckOutToday = checkOutTime && checkOutTime !== '-';
  
  return (
    <Card className="w-full shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center">
          <User className="h-5 w-5 mr-2 text-blue-600" />
          {name || 'Karyawan'}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="grid gap-3">
          <div className="flex items-center text-sm">
            <Building className="h-4 w-4 mr-2 text-gray-500" />
            <span className="text-gray-700">{department || '-'}</span>
          </div>
          
          <div className="flex items-center text-sm">
            <Calendar className="h-4 w-4 mr-2 text-gray-500" />
            <span className="text-gray-700">{shift || 'Default'}</span>
          </div>
          
          <div className="mt-3 grid gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm">
                <Clock className="h-4 w-4 mr-2 text-green-600" />
                <span>Check-In:</span>
              </div>
              <Badge variant={isCheckInToday ? "default" : "outline"} className="font-normal">
                {checkInTime}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm">
                <Clock className="h-4 w-4 mr-2 text-red-600" />
                <span>Check-Out:</span>
              </div>
              <Badge variant={isCheckOutToday ? "default" : "outline"} className="font-normal">
                {checkOutTime}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between mt-1">
              <span className="text-sm">Status:</span>
              <Badge 
                variant={status === 'Selesai' ? "default" : "secondary"}
                className="font-normal"
              >
                {status}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmployeeInfoCard; 