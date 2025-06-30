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
  checkInTime: string | null;
  checkOutTime: string | null;
  mainWorkHours: number | null;
  regularOvertimeHours: number | null;
  weeklyOvertimeHours: number | null;
  status: string;
  attendanceDate: string;
  // Break times
  breakStartTime: string | null;
  breakEndTime: string | null;
  // Overtime times
  overtimeStartTime: string | null;
  overtimeEndTime: string | null;
  // Auto cutoff info
  isAutoCutOff: boolean;
  autoCutOffReason: string | null;
  // Validation status
  isCheckInValidated: boolean;
  isCheckOutValidated: boolean;
  // Lateness info
  isLate: boolean;
  minutesLate: number | null;
  roundedMinutesLate: number | null;
  latenessMessage: string | null;
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
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterLateness, setFilterLateness] = useState("all");
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

      const matchesDepartment = filterDepartment === "all" || record.departmentName === filterDepartment;
      const matchesStatus = filterStatus === "all" || record.status === filterStatus;

      const matchesLateness = filterLateness === "all" || 
        (filterLateness === "late" && record.isLate) ||
        (filterLateness === "ontime" && !record.isLate);

      return matchesSearch && matchesDepartment && matchesStatus && matchesLateness;
    });

    setFilteredData(filtered);
  }, [searchTerm, filterDepartment, filterStatus, filterLateness, attendanceData]);

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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="typography-h1">Riwayat Kehadiran</h1>
          <p className="typography-muted mt-2">Lihat dan kelola riwayat kehadiran karyawan untuk bulan {format(date, "MMMM yyyy", { locale: id })}</p>
        </div>
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
          <div className="mb-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 max-w-md">
                <Label className="mb-2 block text-sm font-semibold">Pencarian</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari nama karyawan..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 h-10"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <Label className="mb-2 block text-sm font-semibold">Periode</Label>
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
              </div>

              <Button variant="outline" onClick={handleExportData} disabled={isLoading} className="h-10">
                <FileDown className="mr-2 h-4 w-4" />
                Export Data
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <DropdownFilter
                label="Departemen"
                placeholder="Pilih departemen"
                items={[
                  { value: "all", label: "Semua" },
                  ...departments.map(dept => ({ value: dept, label: dept }))
                ]}
                value={filterDepartment}
                onChange={setFilterDepartment}
                disabled={isLoading}
              />

              <DropdownFilter
                label="Status"
                placeholder="Pilih status"
                items={[
                  { value: "all", label: "Semua" },
                  { value: "PRESENT", label: "Hadir" },
                  { value: "LATE", label: "Terlambat" },
                  { value: "ABSENT", label: "Tidak Hadir" },
                ]}
                value={filterStatus}
                onChange={setFilterStatus}
                disabled={isLoading}
              />

              <DropdownFilter
                label="Keterlambatan"
                placeholder="Pilih keterlambatan"
                items={[
                  { value: "all", label: "Semua" },
                  { value: "late", label: "Terlambat" },
                  { value: "ontime", label: "Tepat Waktu" },
                ]}
                value={filterLateness}
                onChange={setFilterLateness}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[90px] text-center">Tanggal</TableHead>
                  <TableHead className="min-w-[120px] text-center">ID</TableHead>
                  <TableHead className="min-w-[150px] text-center">Nama</TableHead>
                  <TableHead className="min-w-[120px] text-center">Departemen</TableHead>
                  <TableHead className="min-w-[100px] text-center">Shift</TableHead>
                  <TableHead className="min-w-[80px] text-center">Masuk</TableHead>
                  <TableHead className="min-w-[80px] text-center">Keluar</TableHead>
                  <TableHead className="min-w-[90px] text-center">Istirahat<br/>Mulai</TableHead>
                  <TableHead className="min-w-[90px] text-center">Istirahat<br/>Selesai</TableHead>
                  <TableHead className="min-w-[90px] text-center">Lembur<br/>Mulai</TableHead>
                  <TableHead className="min-w-[90px] text-center">Lembur<br/>Selesai</TableHead>
                  <TableHead className="min-w-[80px] text-center">Jam<br/>Kerja</TableHead>
                  <TableHead className="min-w-[80px] text-center">Lembur<br/>Reguler</TableHead>
                  <TableHead className="min-w-[80px] text-center">Lembur<br/>Mingguan</TableHead>
                  <TableHead className="min-w-[100px] text-center">Keterlambatan</TableHead>
                  <TableHead className="min-w-[90px] text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={16} className="text-center h-24">
                      <div className="flex justify-center items-center">
                        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                        Memuat data riwayat kehadiran...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredData.length > 0 ? (
                  filteredData.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="text-center">{formatDate(record.attendanceDate)}</TableCell>
                      <TableCell className="text-center">{record.employeeId}</TableCell>
                      <TableCell className="font-medium">{record.employeeName}</TableCell>
                      <TableCell className="text-center">{record.departmentName}</TableCell>
                      <TableCell className="text-center">{record.shiftName}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center">
                          <span>{formatTime(record.checkInTime)}</span>
                          {record.isCheckInValidated && (
                            <span className="text-xs text-green-600">✓ Tervalidasi</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center">
                          <span>{formatTime(record.checkOutTime)}</span>
                          {record.isCheckOutValidated && (
                            <span className="text-xs text-green-600">✓ Tervalidasi</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{formatTime(record.breakStartTime)}</TableCell>
                      <TableCell className="text-center">{formatTime(record.breakEndTime)}</TableCell>
                      <TableCell className="text-center">{formatTime(record.overtimeStartTime)}</TableCell>
                      <TableCell className="text-center">{formatTime(record.overtimeEndTime)}</TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono text-sm">
                          {record.mainWorkHours ? `${record.mainWorkHours.toFixed(2)}h` : "-"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono text-sm">
                          {record.regularOvertimeHours ? `${record.regularOvertimeHours.toFixed(2)}h` : "-"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono text-sm">
                          {record.weeklyOvertimeHours ? `${record.weeklyOvertimeHours.toFixed(2)}h` : "-"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {record.isLate ? (
                          <div className="flex flex-col items-center">
                            <Badge variant="destructive" className="text-xs mb-1">
                              Terlambat {record.roundedMinutesLate || record.minutesLate}m
                            </Badge>
                            {record.latenessMessage && (
                              <span className="text-xs text-muted-foreground">
                                {record.latenessMessage}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getStatusBadge(record.status).variant}>
                          {getStatusBadge(record.status).label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={16} className="text-center h-24">
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
            <div className="mt-4 space-y-3">
              <div className="text-sm text-muted-foreground">
              Menampilkan {filteredData.length} dari {attendanceData.length} data kehadiran
              </div>
              
              {/* Summary Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <div className="text-lg font-semibold text-slate-700">
                    {filteredData.filter(r => r.status === 'PRESENT').length}
                  </div>
                  <div className="text-xs text-muted-foreground">Hadir</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-slate-700">
                    {filteredData.filter(r => r.isLate).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Terlambat</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-slate-700">
                    {filteredData.filter(r => r.status === 'ABSENT').length}
                  </div>
                  <div className="text-xs text-muted-foreground">Tidak Hadir</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-slate-700">
                    {filteredData.filter(r => r.regularOvertimeHours && r.regularOvertimeHours > 0).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Ada Lembur</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-slate-700">
                    {filteredData.filter(r => r.isCheckInValidated && r.isCheckOutValidated).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Tervalidasi</div>
                </div>
              </div>
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
  disabled: boolean;
}

function DropdownFilter({
  label,
  placeholder,
  items,
  value,
  onChange,
  disabled,
}: DropdownFilterProps) {
  return (
    <div>
      <Label className="mb-2 block text-sm font-semibold">{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="h-10">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
} 