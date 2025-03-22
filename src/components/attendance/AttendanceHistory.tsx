import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface AttendanceHistoryProps {
  userId: string;
  limit?: number;
}

interface AttendanceRecord {
  id: string;
  employeeId: string;
  checkIn: string | null;
  checkOut: string | null;
  createdAt: string;
  isManualCheckIn: boolean;
  isManualCheckOut: boolean;
}

const AttendanceHistory: React.FC<AttendanceHistoryProps> = ({ userId, limit = 10 }) => {
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAttendanceHistory = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(`/api/attendance/employee/${userId}`);
        
        if (!response.ok) {
          throw new Error('Gagal mengambil riwayat presensi');
        }
        
        const data = await response.json();
        setHistory(data.history || []);
      } catch (error) {
        console.error('Error fetching attendance history:', error);
        setError('Gagal memuat riwayat presensi');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttendanceHistory();
  }, [userId]);

  // Format tanggal: "Senin, 10 Januari 2023"
  const formatDate = (dateString: string): string => {
    return format(new Date(dateString), "EEEE, dd MMMM yyyy", { locale: id });
  };

  // Format waktu: "08:30"
  const formatTime = (timeString: string | null): string => {
    if (!timeString) return '-';
    return format(new Date(timeString), "HH:mm", { locale: id });
  };

  // Hitung durasi kerja dalam format jam dan menit
  const calculateWorkDuration = (checkIn: string | null, checkOut: string | null): string => {
    if (!checkIn || !checkOut) return '-';
    
    const startTime = new Date(checkIn);
    const endTime = new Date(checkOut);
    
    // Hitung selisih dalam milidetik
    const diffMs = endTime.getTime() - startTime.getTime();
    
    // Konversi ke jam dan menit
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours} jam ${minutes} menit`;
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (history.length === 0) {
    return <div className="text-gray-500">Belum ada riwayat presensi</div>;
  }

  // Kelompokkan presensi berdasarkan tanggal
  const groupedHistory: { [date: string]: AttendanceRecord[] } = {};
  
  history.forEach(record => {
    const dateKey = format(new Date(record.createdAt), 'yyyy-MM-dd');
    if (!groupedHistory[dateKey]) {
      groupedHistory[dateKey] = [];
    }
    groupedHistory[dateKey].push(record);
  });

  return (
    <div className="space-y-4">
      {Object.entries(groupedHistory).map(([date, records]) => (
        <Card key={date} className="overflow-hidden">
          <CardHeader className="py-2">
            <CardTitle className="text-sm font-medium">
              {formatDate(date)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Durasi</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map(record => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {formatTime(record.checkIn)}
                      {record.isManualCheckIn && (
                        <span className="ml-1 text-xs text-yellow-500">(Manual)</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {formatTime(record.checkOut)}
                      {record.isManualCheckOut && (
                        <span className="ml-1 text-xs text-yellow-500">(Manual)</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {calculateWorkDuration(record.checkIn, record.checkOut)}
                    </TableCell>
                    <TableCell>
                      {!record.checkIn && !record.checkOut ? (
                        <span className="text-red-500">Tidak Hadir</span>
                      ) : record.checkIn && !record.checkOut ? (
                        <span className="text-yellow-500">Belum Checkout</span>
                      ) : (
                        <span className="text-green-500">Selesai</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AttendanceHistory; 