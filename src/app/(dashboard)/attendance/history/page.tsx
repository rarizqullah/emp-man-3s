"use client";

import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { id } from "date-fns/locale";
import {
  Search,
  FileDown,
  Calendar as CalendarIcon,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "react-hot-toast";

// Tipe data untuk riwayat kehadiran
interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  departmentName: string;
  shiftName: string;
  checkInTime: string;
  checkOutTime: string | null;
  mainWorkHours: number | null;
  regularOvertimeHours: number | null;
  weeklyOvertimeHours: number | null;
  status: string;
  attendanceDate: string;
}

// Format waktu
const formatTime = (timeString: string | null) => {
  if (!timeString) return "-";
  return format(new Date(timeString), "HH:mm:ss", { locale: id });
};

// Format tanggal
const formatDate = (dateString: string) => {
  return format(new Date(dateString), "d MMMM yyyy", { locale: id });
};

export default function AttendanceHistoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [filteredData, setFilteredData] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [departments, setDepartments] = useState<string[]>([]);

  // Fungsi untuk fetch data department
  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      if (response.ok) {
        const departments = await response.json();
        // API mengembalikan array departments langsung, bukan dalam format { success: true, departments: [...] }
        if (Array.isArray(departments)) {
          const departmentNames = departments.map((dept: { name: string }) => dept.name);
          setDepartments(departmentNames);
        }
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  // Fungsi untuk fetch data attendance
  const fetchAttendanceData = async () => {
    setIsLoading(true);
    try {
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      
      const startDate = format(monthStart, 'yyyy-MM-dd');
      const endDate = format(monthEnd, 'yyyy-MM-dd');
      
      console.log(`Fetching attendance data dari ${startDate} sampai ${endDate}`);
      
      const response = await fetch(`/api/attendance/list?startDate=${startDate}&endDate=${endDate}&limit=100`);
      
      if (!response.ok) {
        throw new Error('Gagal mengambil data riwayat kehadiran');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setAttendanceData(data.attendances || []);
        console.log(`Berhasil memuat ${data.attendances?.length || 0} data riwayat kehadiran`);
      } else {
        throw new Error(data.message || 'Gagal mengambil data riwayat kehadiran');
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      toast.error('Gagal memuat data riwayat kehadiran. Silakan coba lagi.');
      setAttendanceData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter data berdasarkan parameter pencarian dan filter
  useEffect(() => {
    const filtered = attendanceData.filter(record => {
      const matchesSearch =
        record.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.employeeId.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDepartment = filterDepartment === "" || record.departmentName === filterDepartment;
      const matchesStatus = filterStatus === "" || record.status === filterStatus;

      return matchesSearch && matchesDepartment && matchesStatus;
    });

    setFilteredData(filtered);
  }, [searchTerm, filterDepartment, filterStatus, attendanceData]);

  // Fetch data saat komponen dimuat atau tanggal berubah
  useEffect(() => {
    fetchAttendanceData();
  }, [date]);

  // Fetch departments saat komponen dimuat
  useEffect(() => {
    fetchDepartments();
  }, []);

  // Handler untuk pergantian bulan pada kalender
  const handleMonthChange = (newDate: Date) => {
    setDate(newDate);
  };

  // Handler untuk ekspor data kehadiran
  const handleExportData = () => {
    console.log("Mengekspor data kehadiran:", filteredData);
    toast.success("Fitur ekspor akan segera tersedia");
    // TODO: Implementasi ekspor data ke Excel/CSV
  };

  // Fungsi untuk refresh data
  const handleRefreshData = () => {
    fetchAttendanceData();
  };

  // Fungsi untuk menentukan status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return { variant: "default" as const, label: "Hadir" };
      case 'LATE':
        return { variant: "secondary" as const, label: "Terlambat" };
      case 'ABSENT':
        return { variant: "destructive" as const, label: "Tidak Hadir" };
      default:
        return { variant: "outline" as const, label: status };
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Riwayat Kehadiran</h1>
        <Button variant="outline" onClick={handleRefreshData} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Riwayat Kehadiran</CardTitle>
          <CardDescription>
            Lihat dan kelola riwayat kehadiran karyawan untuk bulan {format(date, "MMMM yyyy", { locale: id })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row justify-between mb-4 gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-1">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama karyawan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                  disabled={isLoading}
                />
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-10 gap-1" disabled={isLoading}>
                    <CalendarIcon className="h-4 w-4" />
                    {format(date, "MMMM yyyy", { locale: id })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(date) => date && setDate(date)}
                    month={date}
                    onMonthChange={handleMonthChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <div className="flex gap-2 w-full sm:w-auto">
                <DropdownFilter
                  label="Departemen"
                  placeholder="Pilih departemen"
                  items={[
                    { value: "", label: "Semua" },
                    ...departments.map(dept => ({ value: dept, label: dept }))
                  ]}
                  value={filterDepartment}
                  onChange={setFilterDepartment}
                  className="w-full sm:w-[140px]"
                  disabled={isLoading}
                />

                <DropdownFilter
                  label="Status"
                  placeholder="Pilih status"
                  items={[
                    { value: "", label: "Semua" },
                    { value: "PRESENT", label: "Hadir" },
                    { value: "LATE", label: "Terlambat" },
                    { value: "ABSENT", label: "Tidak Hadir" },
                  ]}
                  value={filterStatus}
                  onChange={setFilterStatus}
                  className="w-full sm:w-[140px]"
                  disabled={isLoading}
                />
              </div>
            </div>

            <Button variant="outline" onClick={handleExportData} disabled={isLoading}>
              <FileDown className="mr-2 h-4 w-4" />
              Export Data
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Departemen</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Jam Kerja</TableHead>
                  <TableHead>Lembur</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center h-24">
                      <div className="flex justify-center items-center">
                        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                        Memuat data riwayat kehadiran...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredData.length > 0 ? (
                  filteredData.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{formatDate(record.attendanceDate)}</TableCell>
                      <TableCell>{record.employeeId}</TableCell>
                      <TableCell className="font-medium">{record.employeeName}</TableCell>
                      <TableCell>{record.departmentName}</TableCell>
                      <TableCell>{record.shiftName}</TableCell>
                      <TableCell>{formatTime(record.checkInTime)}</TableCell>
                      <TableCell>{formatTime(record.checkOutTime)}</TableCell>
                      <TableCell>{record.mainWorkHours?.toFixed(2) || "-"}</TableCell>
                      <TableCell>{record.regularOvertimeHours?.toFixed(2) || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadge(record.status).variant}>
                          {getStatusBadge(record.status).label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center h-24">
                      {attendanceData.length === 0 
                        ? "Tidak ada data kehadiran untuk bulan ini" 
                        : "Tidak ada data yang sesuai dengan filter pencarian"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {!isLoading && filteredData.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              Menampilkan {filteredData.length} dari {attendanceData.length} data kehadiran
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Komponen untuk dropdown filter
interface DropdownFilterProps {
  label: string;
  placeholder: string;
  items: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  className: string;
  disabled: boolean;
}

function DropdownFilter({
  label,
  placeholder,
  items,
  value,
  onChange,
  className,
  disabled,
}: DropdownFilterProps) {
  return (
    <div className={className}>
      <Label className="mb-2 block text-sm font-semibold">{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem
              key={item.value || `item-${item.label}`}
              value={item.value || `default-${item.label}`}
            >
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
} 