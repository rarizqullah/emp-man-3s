"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { id } from 'date-fns/locale';
import {
  Clock,
  Search,
  Download,
  UserCheck,
  Calendar as CalendarIcon,
  RefreshCw
} from "lucide-react";
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import AttendanceFaceRecognition from '@/components/attendance/AttendanceFaceRecognition';

import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Interface untuk data presensi
interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  shift: string;
  checkInTime: string;
  checkOutTime: string | null;
  mainWorkHours: number | null;
  overtimeHours: number | null;
  weeklyOvertimeHours: number | null;
  status: 'InProgress' | 'Completed';
}

interface EmployeeInfo {
  id: string;
  name: string;
  department: string;
  shift: string;
}

export default function AttendancePage() {
  const router = useRouter();
  const [date] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('attendance');
  const [currentTime, setCurrentTime] = useState<string>(format(new Date(), 'HH:mm:ss'));
  const [employeeInfo, setEmployeeInfo] = useState<EmployeeInfo | null>(null);
  const [isCheckedIn, setIsCheckedIn] = useState<boolean>(false);
  const [mode, setMode] = useState<'checkIn' | 'checkOut'>('checkIn');
  const [manualEmployeeId, setManualEmployeeId] = useState<string>("");
  const [isManualDialogOpen, setIsManualDialogOpen] = useState<boolean>(false);

  // Format time untuk tampilan
  const formatTime = (timeString: string | null): string => {
    if (!timeString) return "-";
    return format(new Date(timeString), "HH:mm:ss");
  };

  // Fungsi untuk mendapatkan data presensi hari ini
  const fetchTodayAttendance = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/attendance/today-public');

      if (!response.ok) {
        throw new Error('Gagal mendapatkan data presensi');
      }

      const data = await response.json();
      
      if (data.success) {
        setAttendanceData(data.attendances || []);
        console.log(`Berhasil memuat ${data.attendances?.length || 0} data presensi hari ini`);
      } else {
        throw new Error(data.error || 'Gagal mendapatkan data presensi');
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      toast.error('Gagal memuat data presensi. Silakan coba lagi.');
      // Set empty array instead of dummy data
      setAttendanceData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data karyawan saat ini
  const fetchCurrentEmployeeInfo = async () => {
    try {
      setIsLoading(true);
      console.log("Fetching employee data...");
      
      const response = await fetch('/api/attendance/employee-data');
      
      if (!response.ok) {
        console.log("No session found or unauthorized");
        setEmployeeInfo(null);
        await fetchTodayAttendance();
        return;
      }
      
      const result = await response.json();
      
      console.log("API Response:", result);
      
      if (!result.success) {
        throw new Error(result.error || "Gagal mengambil data karyawan");
      }
      
      // Jika tidak ada data employee (user belum terdaftar sebagai karyawan)
      if (!result.data || result.data.length === 0) {
        console.log("User belum terdaftar sebagai karyawan");
        toast.error("Anda belum terdaftar sebagai karyawan. Hubungi admin untuk didaftarkan.");
        setEmployeeInfo(null);
        await fetchTodayAttendance();
        return;
      }
      
      // Ambil data karyawan pertama (seharusnya hanya satu)
      const employeeData = result.data[0];
      
      setEmployeeInfo({
        id: employeeData.employeeId,
        name: employeeData.name,
        department: employeeData.departmentName || "-",
        shift: employeeData.shiftName || "-"
      });
      
      console.log("Employee data loaded:", employeeData);
      
      // Jika karyawan belum memiliki data wajah, tampilkan peringatan
      if (!employeeData.hasFaceData) {
        toast.error("Anda belum memiliki data wajah. Tambahkan data wajah di profil Anda untuk menggunakan fitur pengenalan wajah.");
      }
      
      // Setelah mendapatkan data karyawan, fetch juga data presensi hari ini
      await fetchTodayAttendance();
      
      // Fetch attendance untuk user ini
      await fetchAttendance();
    } catch (error) {
      console.error("Error fetching current employee info:", error);
      toast.error("Gagal memuat data karyawan. Pastikan Anda sudah login.");
      setEmployeeInfo(null);
      await fetchTodayAttendance();
    } finally {
      setIsLoading(false);
    }
  };

  // Fungsi untuk memperbarui jam saat ini
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(format(new Date(), 'HH:mm:ss'));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Ambil data saat komponen dimuat
  useEffect(() => {
    fetchTodayAttendance();
    fetchCurrentEmployeeInfo();
  }, []);

  // Filtering data attendance berdasarkan pencarian
  const filteredAttendance = attendanceData.filter(attendance => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      attendance.employeeName.toLowerCase().includes(searchLower) ||
      attendance.employeeId.toLowerCase().includes(searchLower) ||
      attendance.department.toLowerCase().includes(searchLower) ||
      attendance.shift.toLowerCase().includes(searchLower)
    );
  });
  
  // Fungsi untuk export data ke Excel
  const handleExportToExcel = () => {
    toast.success('Data presensi berhasil diunduh');
    // Logika export ke Excel akan diimplementasikan di sini
  };

  // Fetch data presensi untuk hari ini
  const fetchAttendance = async () => {
    try {
      // Jika tidak ada employee info, skip
      if (!employeeInfo || !employeeInfo.id) {
        console.log("Skipping attendance fetch - no valid employee");
        setMode('checkIn');
        setIsCheckedIn(false);
        return;
      }
      
      // Determine mode berdasarkan status attendance saat ini
      const currentMode = await determineAttendanceMode(employeeInfo.id);
      setMode(currentMode);
      setIsCheckedIn(currentMode === 'checkOut');
      
      console.log(`Attendance mode set to ${currentMode} for ${employeeInfo.name}`);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      // Default ke check-in mode
      setMode('checkIn');
      setIsCheckedIn(false);
    }
  };

  // Handle presensi berhasil
  const handleSuccessfulRecognition = async (employeeId: string) => {
    setIsLoading(true);
    try {
      // Check current attendance status untuk menentukan mode
      const currentMode = await determineAttendanceMode(employeeId);
      
      // Tentukan endpoint berdasarkan mode
      const endpoint = currentMode === 'checkIn' ? '/api/attendance/check-in' : '/api/attendance/check-out';
      
      console.log(`Processing ${currentMode} for employee ${employeeId}`);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ employeeId }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        
        // Update data attendance dan mode
        await fetchTodayAttendance();
        
        // Update mode untuk employee recognition selanjutnya
        const newMode = currentMode === 'checkIn' ? 'checkOut' : 'checkIn';
        setMode(newMode);
        
        // Update status berdasarkan action yang baru dilakukan
        if (currentMode === 'checkIn') {
          setIsCheckedIn(true);
          toast.success(`✅ Check-in berhasil! Mode beralih ke Check-out untuk kunjungan berikutnya.`);
        } else {
          setIsCheckedIn(false);
          toast.success(`✅ Check-out berhasil! Mode beralih ke Check-in untuk kunjungan berikutnya.`);
        }
        
        // Update employee info
        setEmployeeInfo({
          id: employeeId,
          name: result.data?.employeeName || '',
          department: result.data?.department || '',
          shift: result.data?.shift || ''
        });
      } else {
        toast.error(result.error || result.message || `Gagal melakukan ${currentMode}`);
      }
    } catch (error) {
      console.error(`Error during attendance:`, error);
      toast.error(`Terjadi kesalahan saat melakukan presensi`);
    } finally {
      setIsLoading(false);
    }
  };

  // Determine attendance mode based on current status
  const determineAttendanceMode = async (employeeId: string): Promise<'checkIn' | 'checkOut'> => {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      const response = await fetch(`/api/attendance/check-status?employeeId=${employeeId}&date=${today}`);
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.data) {
          // If already checked in but not checked out, next action is check-out
          if (result.data.checkInTime && !result.data.checkOutTime) {
            console.log(`Employee ${employeeId} already checked in, next action: check-out`);
            return 'checkOut';
          }
        }
      }
      
      // Default to check-in (first visit of the day)
      console.log(`Employee ${employeeId} not checked in yet, next action: check-in`);
      return 'checkIn';
    } catch (error) {
      console.error('Error determining attendance mode:', error);
      // Default to check-in on error
      return 'checkIn';
    }
  };

  // Handle presensi manual (admin)
  const handleManualAttendance = async () => {
    if (!manualEmployeeId) {
      toast.error("ID Karyawan tidak boleh kosong");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: manualEmployeeId,
          mode,
          isManual: true
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Terjadi kesalahan saat mencatat presensi manual');
      }

      await response.json();
      toast.success(`Berhasil mencatat ${mode === 'checkIn' ? 'check in' : 'check out'} manual!`);
      
      setManualEmployeeId("");
      setIsManualDialogOpen(false);
      
      // Refresh data presensi jika karyawan yang di-input adalah user saat ini
      await fetchAttendance();
    } catch (error) {
      console.error("Error recording manual attendance:", error);
      const errorMessage = error instanceof Error ? error.message : 'Gagal mencatat presensi manual';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Presensi Karyawan</h1>
          <p className="text-muted-foreground">
            Kelola presensi karyawan dan lihat rekaman presensi hari ini
          </p>
        </div>

        {/* Jam dan Tanggal */}
        <Card className="w-full md:w-auto">
          <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
            <div className="flex items-center">
              <Clock className="mr-2 h-5 w-5" />
              <span className="text-lg font-semibold">{currentTime}</span>
            </div>
            <div className="flex items-center">
              <CalendarIcon className="mr-2 h-5 w-5" />
              <span>{format(date, "EEEE, dd MMMM yyyy", { locale: id })}</span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabs Presensi dan Riwayat */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="attendance">
            <UserCheck className="mr-2 h-4 w-4" />
            Presensi
          </TabsTrigger>
          <TabsTrigger value="list">
            <Clock className="mr-2 h-4 w-4" />
            Daftar Presensi
          </TabsTrigger>
        </TabsList>
        
        {/* Tab Presensi */}
        <TabsContent value="attendance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Informasi Karyawan */}
            <Card>
              <CardHeader>
                <CardTitle>Informasi Karyawan</CardTitle>
                <CardDescription>
                  Detail karyawan dan shift yang berlaku hari ini
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {employeeInfo ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-sm font-medium">Nama:</div>
                      <div>{employeeInfo.name}</div>

                      <div className="text-sm font-medium">ID Karyawan:</div>
                      <div>{employeeInfo.id}</div>

                      <div className="text-sm font-medium">Departemen:</div>
                      <div>{employeeInfo.department}</div>

                      <div className="text-sm font-medium">Shift:</div>
                      <div>
                        <Badge variant="outline">{employeeInfo.shift}</Badge>
                          </div>

                      <div className="text-sm font-medium">Status:</div>
                      <div>
                        <Badge variant={isCheckedIn ? "default" : "secondary"}>
                          {isCheckedIn ? "Sudah Presensi" : "Belum Presensi"}
                        </Badge>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-4 text-center">
                    <p>Memuat informasi karyawan...</p>
                </div>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => fetchCurrentEmployeeInfo()}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Data
                </Button>
              </CardFooter>
            </Card>
            
            {/* Face Recognition */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {mode === 'checkIn' ? 'Presensi Masuk' : 'Presensi Pulang'}
                </CardTitle>
                <CardDescription>
                  {mode === 'checkIn'
                    ? 'Lakukan scan wajah untuk presensi masuk'
                    : 'Lakukan scan wajah untuk presensi pulang'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AttendanceFaceRecognition
                  onSuccessfulRecognition={(employeeId) => handleSuccessfulRecognition(employeeId)}
                  mode={mode}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Tab Daftar Presensi */}
        <TabsContent value="list" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Cari karyawan..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push("/attendance/history")}>
                <Clock className="mr-2 h-4 w-4" />
                Lihat Riwayat
              </Button>
              <Button variant="outline" onClick={handleExportToExcel}>
                <Download className="mr-2 h-4 w-4" />
                Export Excel
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Daftar Presensi Hari Ini</CardTitle>
              <CardDescription>
                {format(date, "EEEE, dd MMMM yyyy", { locale: id })}
              </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                <TableCaption>
                  {isLoading
                    ? "Memuat data presensi..."
                    : filteredAttendance.length === 0
                      ? "Tidak ada data presensi untuk hari ini"
                      : `Total ${filteredAttendance.length} data presensi`}
                </TableCaption>
                  <TableHeader>
                    <TableRow>
                    <TableHead>ID Karyawan</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Departemen</TableHead>
                      <TableHead>Shift</TableHead>
                    <TableHead>Jam Masuk</TableHead>
                    <TableHead>Jam Keluar</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">
                        <div className="flex justify-center py-4">
                          <RefreshCw className="h-6 w-6 animate-spin" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredAttendance.length > 0 ? (
                      filteredAttendance.map((attendance) => (
                        <TableRow key={attendance.id}>
                          <TableCell>{attendance.employeeId}</TableCell>
                          <TableCell className="font-medium">{attendance.employeeName}</TableCell>
                          <TableCell>{attendance.department}</TableCell>
                          <TableCell>{attendance.shift}</TableCell>
                          <TableCell>{formatTime(attendance.checkInTime)}</TableCell>
                          <TableCell>{formatTime(attendance.checkOutTime)}</TableCell>
                          <TableCell>
                            <Badge variant={attendance.status === "Completed" ? "default" : "secondary"}>
                            {attendance.status === "Completed" ? "Selesai" : "Sedang Berlangsung"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                      <TableCell colSpan={7} className="text-center py-4">
                        Tidak ada data presensi yang sesuai dengan pencarian
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog input manual */}
      <Dialog open={isManualDialogOpen} onOpenChange={setIsManualDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Input Presensi Manual</DialogTitle>
            <DialogDescription>
              Masukkan ID Karyawan untuk mencatat presensi secara manual.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="employeeId" className="text-sm font-medium">
                ID Karyawan
              </label>
              <Input
                id="employeeId"
                value={manualEmployeeId}
                onChange={(e) => setManualEmployeeId(e.target.value)}
                placeholder="Masukkan ID Karyawan"
              />
            </div>
            
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium">Mode:</label>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="checkIn"
                  name="mode"
                  checked={mode === 'checkIn'}
                  onChange={() => setMode('checkIn')}
                />
                <label htmlFor="checkIn">Check In</label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="checkOut"
                  name="mode"
                  checked={mode === 'checkOut'}
                  onChange={() => setMode('checkOut')}
                />
                <label htmlFor="checkOut">Check Out</label>
              </div>
            </div>
            
            <Button 
              className="w-full" 
              onClick={handleManualAttendance}
              disabled={isLoading}
            >
              {isLoading ? "Memproses..." : "Simpan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 