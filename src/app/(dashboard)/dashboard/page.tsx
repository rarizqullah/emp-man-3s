"use client"

import { useState, useEffect, useRef } from "react"
import { UserPlus, Users, Building2, ClipboardList, Clock, BarChart2, PlusCircle, CheckCircle, CalendarOff, User, Search, RefreshCw } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/lib/auth-context"

interface UserData {
  id: string
  name: string
  email: string
  role: string
}

interface AttendanceEmployee {
  id: string
  name: string
  department: string
  shift: string
  checkInTime: string
  status: string
}

interface AttendanceRecord {
  employee: {
    id: string
    user: {
      name: string
    }
    department: {
      name: string
    }
    shift: {
      name: string
    }
  }
  checkInTime: string
  status: string
}

interface PermissionEmployee {
  id: string
  name: string
  department: string
  leaveType: string
  startDate: string
  endDate: string
  status: string
}

interface PermissionRecord {
  user: {
    id: string
    name: string
    employee?: {
      department?: {
        name: string
      }
    }
  }
  type: 'SICK' | 'VACATION' | 'PERSONAL' | string
  startDate: string
  endDate: string
}

interface SummaryData {
  totalEmployees: number
  presentToday: number
  lateToday: number
  onLeaveToday: number
  absentToday: number
}

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchAttendance, setSearchAttendance] = useState("")
  const [searchLeave, setSearchLeave] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [presentEmployees, setPresentEmployees] = useState<AttendanceEmployee[]>([])
  const [onLeaveEmployees, setOnLeaveEmployees] = useState<PermissionEmployee[]>([])
  const [summaryData, setSummaryData] = useState<SummaryData>({
    totalEmployees: 0,
    presentToday: 0,
    lateToday: 0,
    onLeaveToday: 0,
    absentToday: 0,
  })
  const dataFetched = useRef(false);
  const [currentDate, setCurrentDate] = useState(new Date())

  useEffect(() => {
    // Update tanggal setiap menit
    const interval = setInterval(() => {
      setCurrentDate(new Date())
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Hindari pemeriksaan berulang
    if (dataFetched.current) {
      return;
    }
    
    console.log("[DashboardPage] Halaman dashboard dimuat, user:", user);

    if (authLoading) {
      console.log("[DashboardPage] Auth masih loading");
      return;
    }
    
    if (!user) {
      console.log("[DashboardPage] User tidak terautentikasi");
      window.location.href = '/login';
      return;
    }
    
    const fetchData = async () => {
      try {
        if (typeof window === 'undefined') {
          console.log("[DashboardPage] Window tidak tersedia, melewati fetching data");
          setIsLoading(false);
          return;
        }
        
        if (user) {
          console.log("[DashboardPage] Data user dari context:", user);
          setUserData({
            id: user.id,
            name: user.user_metadata?.name || 'User',
            email: user.email || '',
            role: user.user_metadata?.role || 'user'
          });
        } else {
          console.log("[DashboardPage] Tidak ada data user");
        }

        // Ambil data absensi hari ini
        try {
          const attendanceResponse = await fetch('/api/attendance/today');
          if (attendanceResponse.ok) {
            const attendanceData = await attendanceResponse.json();
            
            // Transform data untuk sesuai dengan format yang diharapkan
            const formattedAttendance = attendanceData.attendances.map((att: AttendanceRecord) => ({
              id: att.employee.id,
              name: att.employee.user.name,
              department: att.employee.department.name,
              shift: att.employee.shift.name,
              checkInTime: format(new Date(att.checkInTime), 'HH:mm:ss'),
              status: att.status === 'LATE' ? 'Terlambat' : 'Tepat Waktu',
            }));
            
            setPresentEmployees(formattedAttendance);
          }
        } catch (error) {
          console.error("[DashboardPage] Gagal mengambil data absensi:", error);
          // Fallback ke data dummy jika API gagal
          setPresentEmployees([
            {
              id: "1",
              name: "Ahmad Fadillah",
              department: "Marketing",
              shift: "Shift A",
              checkInTime: "07:15:23",
              status: "Tepat Waktu",
            },
            {
              id: "2",
              name: "Budi Santoso",
              department: "Production",
              shift: "Shift A",
              checkInTime: "07:02:45",
              status: "Tepat Waktu",
            },
            {
              id: "3",
              name: "Dewi Anggraini",
              department: "HRD",
              shift: "Non-Shift",
              checkInTime: "08:05:12",
              status: "Terlambat",
            },
            {
              id: "4",
              name: "Eko Prasetyo",
              department: "IT",
              shift: "Non-Shift",
              checkInTime: "07:58:32",
              status: "Tepat Waktu",
            },
            {
              id: "5",
              name: "Fitri Handayani",
              department: "Finance",
              shift: "Non-Shift",
              checkInTime: "08:15:42",
              status: "Terlambat",
            },
          ]);
        }

        // Ambil data izin/cuti hari ini
        try {
          const permissionResponse = await fetch('/api/permissions/active');
          if (permissionResponse.ok) {
            const permissionData = await permissionResponse.json();
            
            // Transform data untuk sesuai dengan format yang diharapkan
            const formattedPermissions = permissionData.permissions.map((perm: PermissionRecord) => ({
              id: perm.user.id,
              name: perm.user.name,
              department: perm.user.employee?.department?.name || "N/A",
              leaveType: perm.type === 'SICK' ? 'Sakit' 
                        : perm.type === 'VACATION' ? 'Cuti Tahunan'
                        : perm.type === 'PERSONAL' ? 'Urusan Pribadi'
                        : 'Lainnya',
              startDate: perm.startDate,
              endDate: perm.endDate,
              status: 'Disetujui',
            }));
            
            setOnLeaveEmployees(formattedPermissions);
          }
        } catch (error) {
          console.error("[DashboardPage] Gagal mengambil data izin/cuti:", error);
          // Fallback ke data dummy jika API gagal
          setOnLeaveEmployees([
            {
              id: "6",
              name: "Galuh Pratiwi",
              department: "Marketing",
              leaveType: "Cuti Tahunan",
              startDate: "2024-07-02",
              endDate: "2024-07-05",
              status: "Disetujui",
            },
            {
              id: "7",
              name: "Hendra Kusuma",
              department: "Production",
              leaveType: "Sakit",
              startDate: "2024-07-02",
              endDate: "2024-07-03",
              status: "Disetujui",
            },
            {
              id: "8",
              name: "Indah Permata",
              department: "HRD",
              leaveType: "Urusan Pribadi",
              startDate: "2024-07-02",
              endDate: "2024-07-02",
              status: "Disetujui",
            },
          ]);
        }

        // Ambil statistik dari API
        try {
          const statsResponse = await fetch('/api/attendance/stats');
          if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            setSummaryData(statsData);
          }
        } catch (error) {
          console.error("[DashboardPage] Gagal mengambil statistik:", error);
          // Fallback ke data dummy jika API gagal
          setSummaryData({
            totalEmployees: 204,
            presentToday: 156,
            lateToday: 12,
            onLeaveToday: 8,
            absentToday: 28,
          });
        }
        
        dataFetched.current = true;
      } catch (error) {
        console.error("[DashboardPage] Error saat mengakses data:", error);
      } finally {
        console.log("[DashboardPage] Proses fetching data selesai");
        setIsLoading(false);
      }
    };
    
    // Tunda sedikit untuk menunggu session tersedia
    const timer = setTimeout(fetchData, 300);
    
    return () => {
      clearTimeout(timer);
      console.log("[DashboardPage] Pembersihan komponen dashboard");
    };
  }, [user, authLoading]);

  // Filter presentEmployees berdasarkan pencarian dan departemen
  const filteredPresentEmployees = presentEmployees.filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchAttendance.toLowerCase()) ||
                          employee.department.toLowerCase().includes(searchAttendance.toLowerCase());
    const matchesDepartment = departmentFilter === "all" || employee.department === departmentFilter;
    return matchesSearch && matchesDepartment;
  });

  // Filter onLeaveEmployees berdasarkan pencarian dan departemen  
  const filteredLeaveEmployees = onLeaveEmployees.filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchLeave.toLowerCase()) ||
                          employee.department.toLowerCase().includes(searchLeave.toLowerCase());
    const matchesDepartment = departmentFilter === "all" || employee.department === departmentFilter;
    return matchesSearch && matchesDepartment;
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Memuat data dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            {format(currentDate, "EEEE, dd MMMM yyyy", { locale: id })} | {format(currentDate, "HH:mm")}
          </p>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Buat Baru
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Pilih Entri</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Link href="/employee/add" className="flex w-full items-center">
                <UserPlus className="mr-2 h-4 w-4" />
                <span>Karyawan Baru</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link href="/attendance/manual" className="flex w-full items-center">
                <Clock className="mr-2 h-4 w-4" />
                <span>Absensi Manual</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link href="/permission/add" className="flex w-full items-center">
                <ClipboardList className="mr-2 h-4 w-4" />
                <span>Izin/Cuti</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Karyawan</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryData.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">
              +6 dari bulan lalu
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hadir Hari Ini</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryData.presentToday}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((summaryData.presentToday / summaryData.totalEmployees) * 100)}% dari total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Terlambat</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryData.lateToday}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((summaryData.lateToday / summaryData.totalEmployees) * 100)}% dari total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Izin/Cuti</CardTitle>
            <CalendarOff className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryData.onLeaveToday}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((summaryData.onLeaveToday / summaryData.totalEmployees) * 100)}% dari total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tidak Hadir</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryData.absentToday}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((summaryData.absentToday / summaryData.totalEmployees) * 100)}% dari total
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Tabs defaultValue="attendance" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="attendance">
              <CheckCircle className="mr-2 h-4 w-4" />
              Absensi Hari Ini
            </TabsTrigger>
            <TabsTrigger value="leave">
              <CalendarOff className="mr-2 h-4 w-4" />
              Cuti & Izin Hari Ini
            </TabsTrigger>
          </TabsList>

          <TabsContent value="attendance" className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div className="relative flex w-full max-w-md items-center">
                <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Cari karyawan..."
                  className="pl-8"
                  value={searchAttendance}
                  onChange={(e) => setSearchAttendance(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Semua Departemen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Departemen</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Production">Produksi</SelectItem>
                    <SelectItem value="HRD">HRD</SelectItem>
                    <SelectItem value="IT">IT</SelectItem>
                    <SelectItem value="Finance">Keuangan</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => {
                  setSearchAttendance("")
                  setDepartmentFilter("all")
                }}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle>Karyawan Hadir</CardTitle>
                  <Badge>{filteredPresentEmployees.length} karyawan</Badge>
                </div>
                <CardDescription>
                  Daftar karyawan yang sudah melakukan presensi hari ini
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-auto max-h-[400px]">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-white border-b">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium text-muted-foreground">Nama</th>
                        <th className="text-left p-3 text-sm font-medium text-muted-foreground">Departemen</th>
                        <th className="text-left p-3 text-sm font-medium text-muted-foreground">Shift</th>
                        <th className="text-left p-3 text-sm font-medium text-muted-foreground">Jam Masuk</th>
                        <th className="text-left p-3 text-sm font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPresentEmployees.length > 0 ? (
                        filteredPresentEmployees.map((employee) => (
                          <tr key={employee.id} className="border-b hover:bg-muted/50">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>{employee.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span>{employee.name}</span>
                              </div>
                            </td>
                            <td className="p-3">{employee.department}</td>
                            <td className="p-3">{employee.shift}</td>
                            <td className="p-3">{employee.checkInTime}</td>
                            <td className="p-3">
                              <Badge variant={employee.status === "Tepat Waktu" ? "default" : "destructive"}>
                                {employee.status}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-muted-foreground">
                            Tidak ada data yang sesuai dengan filter
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
              <CardFooter className="pt-3 pb-4 border-t flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  Menampilkan {filteredPresentEmployees.length} dari {presentEmployees.length} karyawan
                </div>
                <Link href="/attendance" className="text-xs text-blue-600 hover:underline">
                  Lihat semua absensi
                </Link>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="leave" className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div className="relative flex w-full max-w-md items-center">
                <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Cari karyawan cuti/izin..."
                  className="pl-8"
                  value={searchLeave}
                  onChange={(e) => setSearchLeave(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Semua Departemen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Departemen</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Production">Produksi</SelectItem>
                    <SelectItem value="HRD">HRD</SelectItem>
                    <SelectItem value="IT">IT</SelectItem>
                    <SelectItem value="Finance">Keuangan</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => {
                  setSearchLeave("")
                  setDepartmentFilter("all")
                }}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle>Karyawan Cuti/Izin</CardTitle>
                  <Badge variant="outline">{filteredLeaveEmployees.length} karyawan</Badge>
                </div>
                <CardDescription>
                  Daftar karyawan yang sedang cuti atau izin hari ini
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-auto max-h-[400px]">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-white border-b">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium text-muted-foreground">Nama</th>
                        <th className="text-left p-3 text-sm font-medium text-muted-foreground">Departemen</th>
                        <th className="text-left p-3 text-sm font-medium text-muted-foreground">Jenis</th>
                        <th className="text-left p-3 text-sm font-medium text-muted-foreground">Tanggal</th>
                        <th className="text-left p-3 text-sm font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeaveEmployees.length > 0 ? (
                        filteredLeaveEmployees.map((employee) => (
                          <tr key={employee.id} className="border-b hover:bg-muted/50">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>{employee.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span>{employee.name}</span>
                              </div>
                            </td>
                            <td className="p-3">{employee.department}</td>
                            <td className="p-3">{employee.leaveType}</td>
                            <td className="p-3">
                              {employee.startDate === employee.endDate 
                                ? format(new Date(employee.startDate), "dd/MM/yyyy")
                                : `${format(new Date(employee.startDate), "dd/MM/yyyy")} - ${format(new Date(employee.endDate), "dd/MM/yyyy")}`}
                            </td>
                            <td className="p-3">
                              <Badge variant="secondary">
                                {employee.status}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-muted-foreground">
                            Tidak ada data yang sesuai dengan filter
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
              <CardFooter className="pt-3 pb-4 border-t flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  Menampilkan {filteredLeaveEmployees.length} dari {onLeaveEmployees.length} karyawan
                </div>
                <Link href="/permission" className="text-xs text-blue-600 hover:underline">
                  Lihat semua izin/cuti
                </Link>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {userData && userData.role === "ADMIN" && (
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan Admin</CardTitle>
              <CardDescription>
                Akses cepat ke fungsi administrator
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Button variant="outline" className="h-auto flex flex-col items-center justify-center p-4 space-y-2" asChild>
                <Link href="/configuration/departments">
                  <Building2 className="h-6 w-6 mb-2" />
                  <span>Departemen</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto flex flex-col items-center justify-center p-4 space-y-2" asChild>
                <Link href="/configuration/shifts">
                  <Clock className="h-6 w-6 mb-2" />
                  <span>Shift</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto flex flex-col items-center justify-center p-4 space-y-2" asChild>
                <Link href="/configuration/permission-types">
                  <ClipboardList className="h-6 w-6 mb-2" />
                  <span>Jenis Izin</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto flex flex-col items-center justify-center p-4 space-y-2" asChild>
                <Link href="/reports">
                  <BarChart2 className="h-6 w-6 mb-2" />
                  <span>Laporan</span>
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
} 