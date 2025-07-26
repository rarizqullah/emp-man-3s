"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  User, 
  Briefcase, 
  Building, 
  Clock, 
  ArrowLeft, 
  Edit,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AddWarningHistoryModal } from "@/components/employee/AddWarningHistoryModal";
import { AddContractHistoryModal } from "@/components/employee/AddContractHistoryModal";
import { AddShiftHistoryModal } from "@/components/employee/AddShiftHistoryModal";
import { ContractChangeModal } from "@/components/employee/ContractChangeModal";
import { ContractChangeFormValues } from "@/components/employee/ContractChangeModal";

// Interface untuk data karyawan
interface Employee {
  id: string;
  employeeId: string;
  userId: string;
  departmentId: string;
  subDepartmentId?: string;
  positionId?: string;
  shiftId: string;
  contractType: string;
  contractNumber: string | null;
  contractStartDate: string;
  contractEndDate: string | null;
  warningStatus: string;
  gender: string | null;
  address: string | null;
  bankAccountNumber: string | null;
  faceData?: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    role: string;
  };
  department: {
    id: string;
    name: string;
  };
  subDepartment?: {
    id: string;
    name: string;
  } | null;
  position?: {
    id: string;
    name: string;
    level?: number;
  } | null;
  shift: {
    id: string;
    name: string;
    shiftType?: string;
  };
}

// Interface untuk riwayat kontrak
interface ContractHistory {
  id: string;
  employeeId: string;
  contractType: string;
  contractNumber: string | null;
  startDate: string;
  endDate: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// Interface untuk riwayat shift
interface ShiftHistory {
  id: string;
  employeeId: string;
  shiftId: string;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  shift: {
    id: string;
    name: string;
  };
}

// Interface untuk riwayat SP
interface WarningHistory {
  id: string;
  employeeId: string;
  warningStatus: string;
  startDate: string;
  endDate: string | null;
  reason: string;
  attachmentUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

// Format tanggal dari string ISO ke format yang lebih mudah dibaca
const formatDate = (dateString: string | null) => {
  if (!dateString) return "Sekarang";
  
  try {
    // Coba format tanggal dengan date-fns
    return format(new Date(dateString), "d MMMM yyyy", { locale: id });
  } catch (error) {
    console.error("Error formatting date:", dateString, error);
    // Return nilai asli jika terjadi error
    return String(dateString);
  }
};

// Component untuk informasi karyawan
const EmployeeInfo = ({ 
  data, 
  setIsContractChangeModalOpen 
}: { 
  data: Employee, 
  setIsContractChangeModalOpen: (isOpen: boolean) => void 
}) => {
  // Fungsi untuk mendapatkan inisial nama dengan penanganan nilai null/undefined
  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name.charAt(0).toUpperCase();
  };

  // Validasi properti penting
  const userName = data.user?.name || 'Nama tidak tersedia';
  const userEmail = data.user?.email || '-';
  const deptName = data.department?.name || 'Dept tidak tersedia';
  const positionName = data.position?.name || 'Posisi tidak tersedia';
  const shiftName = data.shift?.name || '-';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
        <Avatar className="w-28 h-28">
          {data.faceData ? (
            <AvatarImage src={data.faceData} alt={userName} />
          ) : (
            <AvatarFallback className="text-4xl">{getInitials(userName)}</AvatarFallback>
          )}
        </Avatar>
        
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">{userName}</h2>
          <p className="text-muted-foreground">{positionName}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline">{deptName} {data.subDepartment ? `- ${data.subDepartment.name}` : ''}</Badge>
            <Badge variant={data.contractType === "PERMANENT" ? "default" : "secondary"}>
              {data.contractType === "PERMANENT" ? "Permanen" : "Training"}
            </Badge>
            <Badge variant={data.warningStatus === "NONE" ? "outline" : 
              data.warningStatus === "SP1" ? "default" :
              data.warningStatus === "SP2" ? "secondary" : "destructive"}>
              {data.warningStatus === "NONE" ? "Tidak Ada SP" : data.warningStatus}
            </Badge>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Informasi Pribadi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-0">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm sm:col-span-2 break-all">{userEmail}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-0">
              <span className="text-sm text-muted-foreground">Telepon</span>
              <span className="text-sm sm:col-span-2">{data.user?.phone || '-'}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-0">
              <span className="text-sm text-muted-foreground">NIK</span>
              <span className="text-sm sm:col-span-2">{data.employeeId || '-'}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-0">
              <span className="text-sm text-muted-foreground">Alamat</span>
              <span className="text-sm sm:col-span-2 break-words">{data.address || '-'}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-0">
              <span className="text-sm text-muted-foreground">Jenis Kelamin</span>
              <span className="text-sm sm:col-span-2">{data.gender === "MALE" ? "Laki-laki" : data.gender === "FEMALE" ? "Perempuan" : "-"}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-0">
              <span className="text-sm text-muted-foreground">Nomor Rekening</span>
              <span className="text-sm sm:col-span-2">{data.bankAccountNumber || '-'}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Informasi Pekerjaan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-0">
              <span className="text-sm text-muted-foreground">NIK</span>
              <span className="text-sm sm:col-span-2">{data.employeeId || '-'}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-0">
              <span className="text-sm text-muted-foreground">Departemen</span>
              <span className="text-sm sm:col-span-2 break-words">{deptName} {data.subDepartment ? `- ${data.subDepartment.name}` : ''}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-0">
              <span className="text-sm text-muted-foreground">Jabatan</span>
              <span className="text-sm sm:col-span-2">{positionName}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-0">
              <span className="text-sm text-muted-foreground">Tanggal Bergabung</span>
              <span className="text-sm sm:col-span-2">{formatDate(data.contractStartDate) || '-'}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row justify-between items-start">
            <CardTitle className="text-base flex items-center gap-2">
              <Building className="h-4 w-4" />
              Informasi Kontrak
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                if (data) {
                  setIsContractChangeModalOpen(true);
                }
              }}
            >
              Ubah Kontrak
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3">
              <span className="text-sm text-muted-foreground">Jenis Kontrak</span>
              <span className="text-sm col-span-2">
                <Badge variant={data.contractType === "PERMANENT" ? "default" : "secondary"}>
                  {data.contractType === "PERMANENT" ? "Permanen" : "Training"}
                </Badge>
              </span>
            </div>
            <div className="grid grid-cols-3">
              <span className="text-sm text-muted-foreground">No. Kontrak</span>
              <span className="text-sm col-span-2">{data.contractNumber || '-'}</span>
            </div>
            <div className="grid grid-cols-3">
              <span className="text-sm text-muted-foreground">Mulai Kontrak</span>
              <span className="text-sm col-span-2">{formatDate(data.contractStartDate)}</span>
            </div>
            <div className="grid grid-cols-3">
              <span className="text-sm text-muted-foreground">Berakhir Kontrak</span>
              <span className="text-sm col-span-2">{formatDate(data.contractEndDate)}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Informasi Shift
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3">
              <span className="text-sm text-muted-foreground">Shift Saat Ini</span>
              <span className="text-sm col-span-2">{shiftName}</span>
            </div>
            <div className="grid grid-cols-3">
              <span className="text-sm text-muted-foreground">Status SP</span>
              <span className="text-sm col-span-2">
                <Badge variant={data.warningStatus === "NONE" ? "outline" : 
                  data.warningStatus === "SP1" ? "default" :
                  data.warningStatus === "SP2" ? "secondary" : "destructive"}>
                  {data.warningStatus === "NONE" ? "Tidak Ada SP" : data.warningStatus}
                </Badge>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Client Component yang menerima employeeId sebagai prop
export function EmployeeDetailClient({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("info");
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [contractHistory, setContractHistory] = useState<ContractHistory[]>([]);
  const [shiftHistory, setShiftHistory] = useState<ShiftHistory[]>([]);
  const [warningHistory, setWarningHistory] = useState<WarningHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState({
    contract: false,
    shift: false,
    warning: false,
  });
  const [historyError, setHistoryError] = useState({
    contract: null as string | null,
    shift: null as string | null,
    warning: null as string | null,
  });
  
  // Modal state untuk SP
  const [isAddWarningModalOpen, setIsAddWarningModalOpen] = useState(false);
  
  // Modal state untuk menambahkan riwayat kontrak
  const [isAddContractModalOpen, setIsAddContractModalOpen] = useState(false);
  
  // Modal state untuk menambahkan riwayat shift
  const [isAddShiftModalOpen, setIsAddShiftModalOpen] = useState(false);
  
  // Modal state untuk mengubah kontrak
  const [isContractChangeModalOpen, setIsContractChangeModalOpen] = useState(false);

  // Menggunakan useRef untuk menyimpan employeeId saat ini
  const employeeIdRef = useRef(employeeId);
  
  // Menyimpan referensi ke state untuk diakses oleh callbacks
  const stateRef = useRef({
    employee: null as Employee | null,
    activeTab: "info" as string,
  });

  // AbortController ref untuk cleanup yang proper - moved outside callback
  const abortControllerRef = useRef<AbortController | null>(null);

  // Update referensi state saat state berubah
  useEffect(() => {
    stateRef.current.employee = employee;
    stateRef.current.activeTab = activeTab;
  }, [employee, activeTab]);
  
  // Fungsi untuk memuat data karyawan
  const fetchEmployeeData = useCallback(async (retryCount = 0, maxRetries = 2) => {
    if (!employeeIdRef.current) return;
    
    try {
      setLoading(true);
      console.log(`Fetching employee data for ID: ${employeeIdRef.current} (attempt ${retryCount + 1}/${maxRetries + 1})`);
      
      // Create new AbortController untuk setiap request
      abortControllerRef.current = new AbortController();
      const controller = abortControllerRef.current;
      
      // Enhanced timeout management dengan progressive timeout
      const baseTimeout = retryCount === 0 ? 45000 : 30000; // Diperpanjang untuk mencocokkan backend
      const timeoutDuration = Math.max(baseTimeout - (retryCount * 5000), 20000);
      
      console.log(`Setting timeout untuk ${timeoutDuration/1000} detik`);
      
      // Enhanced timeout promise dengan proper cleanup
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timeoutId = setTimeout(() => {
          if (!controller.signal.aborted) {
            console.log(`Request timeout setelah ${timeoutDuration/1000} detik, membatalkan request...`);
            controller.abort();
            reject(new Error(`Request timeout after ${timeoutDuration/1000} seconds`));
          }
        }, timeoutDuration);
        
        // Cleanup timeout jika controller sudah aborted
        controller.signal.addEventListener('abort', () => {
          clearTimeout(timeoutId);
        });
      });
      
      try {
        const fetchPromise = fetch(`/api/employees/${employeeIdRef.current}`, {
          cache: 'no-store',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            // Add request ID untuk debugging
            'X-Request-ID': `emp-${employeeIdRef.current}-${Date.now()}`,
          }
        });
        
        console.log('Mengirim request ke API...');
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        
        // Clear reference setelah request selesai
        abortControllerRef.current = null;
        
        if (!response.ok) {
          let errorData = null;
          try {
            const responseText = await response.text();
            errorData = responseText ? JSON.parse(responseText) : null;
          } catch {
            // Fallback jika tidak bisa parse JSON
          }
          
          console.error(`HTTP Error ${response.status}: ${response.statusText}`, errorData);
          
          // Enhanced retry logic berdasarkan status code dan error type
          const shouldRetryStatus = [408, 500, 502, 503, 504].includes(response.status);
          const isRetryableError = errorData?.retryable === true || errorData?.errorType === 'timeout' || errorData?.errorType === 'connection';
          
          if ((shouldRetryStatus || isRetryableError) && retryCount < maxRetries) {
            // Progressive backoff dengan cap maksimum
            const waitTime = Math.min(2000 * Math.pow(1.5, retryCount), 8000);
            console.log(`HTTP ${response.status} error, akan mencoba lagi dalam ${waitTime}ms...`);
            
            setError(`${errorData?.error || 'Terjadi kesalahan server'}. Mencoba kembali dalam ${waitTime/1000} detik...`);
            
            await new Promise(resolve => setTimeout(resolve, waitTime));
            
            setLoading(false);
            return fetchEmployeeData(retryCount + 1, maxRetries);
          }
          
          // Tampilkan error yang user-friendly berdasarkan status dan error type
          let userError = errorData?.error;
          
          if (!userError) {
            switch (response.status) {
              case 408:
                userError = 'Permintaan membutuhkan waktu terlalu lama. Silakan coba lagi.';
                break;
              case 503:
                userError = 'Layanan sementara tidak tersedia. Silakan coba lagi dalam beberapa saat.';
                break;
              case 404:
                userError = 'Data karyawan tidak ditemukan.';
                break;
              case 500:
                userError = 'Terjadi kesalahan pada server. Tim teknis telah diberitahu.';
                break;
              default:
                userError = `Error ${response.status}: ${response.statusText}`;
            }
          }
          
          throw new Error(userError);
        }
        
        let result;
        try {
          console.log('Memproses response JSON...');
          result = await response.json();
          console.log('Employee data fetched successfully:', result ? 'Data received' : 'No data');
        } catch (parseError) {
          console.error('Failed to parse response as JSON:', parseError);
          
          // Retry parsing untuk network-related issues
          if (retryCount < maxRetries) {
            const waitTime = Math.min(2000 * Math.pow(1.5, retryCount), 6000);
            console.log(`JSON parse error, akan mencoba lagi dalam ${waitTime}ms`);
            
            setError(`Terjadi kesalahan saat memproses data. Mencoba kembali dalam ${waitTime/1000} detik...`);
            
            await new Promise(resolve => setTimeout(resolve, waitTime));
            
            setLoading(false);
            return fetchEmployeeData(retryCount + 1, maxRetries);
          }
          
          throw new Error('Format respons tidak valid dari server');
        }
        
        // Periksa format respons API dengan enhanced validation
        if (!result) {
          throw new Error('Respons kosong dari server');
        }
        
        // Dapatkan data karyawan, baik dari format {success, data} atau langsung
        let data = result;
        
        // Jika respons menggunakan format {success, data}
        if (result.hasOwnProperty('success')) {
          if (!result.success) {
            // Cek apakah ini adalah retryable error dari API
            const isRetryableApiError = (
              result.retryable === true || 
              result.errorType === 'timeout' || 
              result.errorType === 'connection' ||
              (result.error && (
                result.error.includes('database') || 
                result.error.includes('connection') ||
                result.error.includes('timeout')
              ))
            );
            
            if (isRetryableApiError && retryCount < maxRetries) {
              const waitTime = Math.min(2000 * Math.pow(1.5, retryCount), 6000);
              console.log(`API error (retryable), akan mencoba lagi dalam ${waitTime}ms`);
              
              setError(`${result.error || 'Terjadi kesalahan'}. Mencoba kembali dalam ${waitTime/1000} detik...`);
              
              await new Promise(resolve => setTimeout(resolve, waitTime));
              
              setLoading(false);
              return fetchEmployeeData(retryCount + 1, maxRetries);
            }
            
            throw new Error(result.error || 'Gagal memuat data karyawan');
          }
          if (result.hasOwnProperty('data')) {
            data = result.data;
          }
        }
        
        // Validasi data yang diterima dengan pengecekan yang comprehensive
        if (!data || typeof data !== 'object') {
          throw new Error('Data karyawan tidak valid');
        }
        
        // Enhanced data validation dan fallback handling
        if (!data.id || !data.employeeId) {
          throw new Error('Data karyawan tidak lengkap (missing ID)');
        }
        
        // Siapkan struktur data dengan enhanced fallback yang aman
        const safeData = {
          ...data,
          user: data.user || { id: '', name: 'Nama tidak tersedia', email: '-', role: 'user' },
          department: data.department || { id: '', name: 'Departemen tidak tersedia' },
          subDepartment: data.subDepartment || null,
          position: data.position || null,
          shift: data.shift || { id: '', name: 'Shift tidak tersedia', shiftType: 'NORMAL' }
        };
        
        // Validate critical fields
        if (!safeData.user.name || safeData.user.name === 'Nama tidak tersedia') {
          console.warn('Employee name not available, using fallback');
        }
        
        // Data valid, update state
        setEmployee(safeData);
        setError(null);
        console.log('Employee data successfully loaded and validated');
        
      } catch (fetchError) {
        // Proper cleanup di catch block
        if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = null;
        throw fetchError;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error fetching employee:', errorMessage);
      
      // Enhanced error categorization dengan better detection
      const isAbortError = (
        error instanceof Error && 
        (error.name === 'AbortError' || error.message.includes('aborted') || error.message.includes('signal'))
      );
      const isTimeoutError = (
        errorMessage.includes('timeout') || 
        errorMessage.includes('Request timeout') ||
        errorMessage.includes('time')
      );
      const isNetworkError = (
        error instanceof TypeError || 
        /failed to fetch|network|connection refused/i.test(errorMessage)
      );
      const isConnectionError = /connection|database|server/i.test(errorMessage);
      
      // Enhanced retry logic dengan better condition checking
      const shouldRetry = (
        retryCount < maxRetries && 
        !errorMessage.includes('tidak ditemukan') && // Don't retry for not found
        !errorMessage.includes('tidak valid') && // Don't retry for invalid data
        (isTimeoutError || isNetworkError || isConnectionError || (isAbortError && retryCount === 0))
      );
      
      if (shouldRetry) {
        // Progressive wait time dengan randomization untuk menghindari thundering herd
        const baseWait = Math.min(2000 * Math.pow(1.5, retryCount), 8000);
        const randomDelay = Math.random() * 1000; // 0-1 second random delay
        const waitTime = baseWait + randomDelay;
        
        let errorType = 'Network';
        if (isTimeoutError || isAbortError) errorType = 'Timeout';
        else if (isConnectionError) errorType = 'Database';
        
        console.log(`${errorType} error, akan mencoba lagi dalam ${Math.round(waitTime)}ms (attempt ${retryCount + 1}/${maxRetries})`);
        
        setError(`${errorType} error. Mencoba kembali dalam ${Math.round(waitTime/1000)} detik... (${retryCount + 1}/${maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        setLoading(false);
        return fetchEmployeeData(retryCount + 1, maxRetries);
      }
      
      // Final error - tidak ada retry lagi dengan enhanced user messaging
      let userFriendlyError = `Terjadi kesalahan: ${errorMessage}`;
      
      if (isAbortError || isTimeoutError) {
        userFriendlyError = 'Permintaan membutuhkan waktu terlalu lama. Silakan periksa koneksi internet dan coba lagi.';
      } else if (isNetworkError) {
        userFriendlyError = 'Tidak dapat terhubung ke server. Silakan periksa koneksi internet Anda dan coba lagi.';
      } else if (isConnectionError) {
        userFriendlyError = 'Terjadi masalah koneksi database. Tim teknis telah diberitahu. Silakan coba lagi dalam beberapa menit.';
      } else if (errorMessage.includes('tidak ditemukan')) {
        userFriendlyError = 'Data karyawan tidak ditemukan. Silakan periksa ID karyawan atau hubungi administrator.';
      }
      
      setError(userFriendlyError);
      toast.error('Gagal memuat data karyawan', {
        description: retryCount > 0 ? `Gagal setelah ${retryCount + 1} percobaan` : undefined
      });
    } finally {
      // Final cleanup
      if (abortControllerRef.current) {
        abortControllerRef.current = null;
      }
      setLoading(false);
    }
  }, []); // Tidak ada dependensi, state diakses melalui refs
  
  // Update employeeIdRef saat employeeId berubah
  useEffect(() => {
    employeeIdRef.current = employeeId;
  }, [employeeId]);
  
  // Fetch employee data
  useEffect(() => {
    if (employeeId) {
      fetchEmployeeData();
    }
  }, [employeeId, fetchEmployeeData]);
  
  // Tambahkan useEffect untuk contract history
  useEffect(() => {
    // Gunakan stateRef untuk mengakses state terkini
    const { activeTab, employee } = stateRef.current;
    if (activeTab === 'contract' && employee?.id) {
      console.log('Active tab is contract and employee data is available, fetching contract history...');
      
      // Langsung set loading state
      setLoadingHistory((prev) => ({ ...prev, contract: true }));
      
      // Fetch contract history langsung tanpa kondisi
      fetch(`/api/employees/${employee.id}/contract-history`)
        .then(response => response.json())
        .then(result => {
          console.log('Contract history API response:', result);
          
          if (result.success && Array.isArray(result.data)) {
            console.log(`Setting contract history with ${result.data.length} records`);
            setContractHistory(result.data);
          } else {
            console.error('Failed to fetch contract history:', result.message || 'Unknown error');
            setHistoryError((prev) => ({ 
              ...prev, 
              contract: "Gagal memuat data riwayat kontrak" 
            }));
            toast.error("Gagal memuat data riwayat kontrak");
          }
        })
        .catch(error => {
          console.error('Error fetching contract history:', error);
          setHistoryError((prev) => ({ 
            ...prev, 
            contract: "Terjadi kesalahan saat mengambil riwayat kontrak" 
          }));
          toast.error("Terjadi kesalahan saat mengambil riwayat kontrak");
        })
        .finally(() => {
          setLoadingHistory((prev) => ({ ...prev, contract: false }));
        });
    }
  }, [activeTab, employee]); // Tambahkan employee ke dependensi
  
  // Tambahkan useEffect untuk shift history
  useEffect(() => {
    // Gunakan stateRef untuk mengakses state terkini
    const { activeTab, employee } = stateRef.current;
    if (activeTab === 'shift' && employee?.id) {
      console.log('Active tab is shift and employee data is available, fetching shift history...');
      
      // Langsung set loading state
      setLoadingHistory((prev) => ({ ...prev, shift: true }));
      
      // Fetch shift history langsung tanpa kondisi
      fetch(`/api/employees/${employee.id}/shift-history`)
        .then(response => response.json())
        .then(result => {
          console.log('Shift history API response:', result);
          
          if (result.success && Array.isArray(result.data)) {
            console.log(`Setting shift history with ${result.data.length} records`);
            setShiftHistory(result.data);
          } else {
            console.error('Failed to fetch shift history:', result.message || 'Unknown error');
            setHistoryError((prev) => ({ 
              ...prev, 
              shift: "Gagal memuat data riwayat shift" 
            }));
            toast.error("Gagal memuat data riwayat shift");
          }
        })
        .catch(error => {
          console.error('Error fetching shift history:', error);
          setHistoryError((prev) => ({ 
            ...prev, 
            shift: "Terjadi kesalahan saat mengambil riwayat shift" 
          }));
          toast.error("Terjadi kesalahan saat mengambil riwayat shift");
        })
        .finally(() => {
          setLoadingHistory((prev) => ({ ...prev, shift: false }));
        });
    }
  }, [activeTab, employee]); // Tambahkan employee ke dependensi
  
  // Tambahkan useEffect untuk warning history
  useEffect(() => {
    // Gunakan stateRef untuk mengakses state terkini
    const { activeTab, employee } = stateRef.current;
    if (activeTab === 'warning' && employee?.id) {
      console.log('Active tab is warning and employee data is available, fetching warning history...');
      
      // Langsung set loading state
      setLoadingHistory((prev) => ({ ...prev, warning: true }));
      
      // Fetch warning history langsung tanpa kondisi
      fetch(`/api/employees/${employee.id}/warning-history`)
        .then(response => response.json())
        .then(result => {
          console.log('Warning history API response:', result);
          
          if (result.success && Array.isArray(result.data)) {
            console.log(`Setting warning history with ${result.data.length} records`);
            setWarningHistory(result.data);
          } else {
            console.error('Failed to fetch warning history:', result.message || 'Unknown error');
            setHistoryError((prev) => ({ 
              ...prev, 
              warning: "Gagal memuat data riwayat SP/peringatan" 
            }));
            toast.error("Gagal memuat data riwayat SP/peringatan");
          }
        })
        .catch(error => {
          console.error('Error fetching warning history:', error);
          setHistoryError((prev) => ({ 
            ...prev, 
            warning: "Terjadi kesalahan saat mengambil riwayat SP/peringatan" 
          }));
          toast.error("Terjadi kesalahan saat mengambil riwayat SP/peringatan");
        })
        .finally(() => {
          setLoadingHistory((prev) => ({ ...prev, warning: false }));
        });
    }
  }, [activeTab, employee]); // Tambahkan employee ke dependensi
  
  // Refresh history data after adding new entries
  const handleWarningAdded = useCallback(() => {
    setWarningHistory([]);
    // Kosongkan warning history agar useEffect akan memuat ulang
    const { activeTab, employee } = stateRef.current;
    if (activeTab === 'warning' && employee?.id) {
      setLoadingHistory(prev => ({ ...prev, warning: true }));
      
      fetch(`/api/employees/${employee.id}/warning-history`)
        .then(response => response.json())
        .then(result => {
          if (result.success && Array.isArray(result.data)) {
            setWarningHistory(result.data);
          }
        })
        .catch(error => {
          console.error('Error refreshing warning history:', error);
        })
        .finally(() => {
          setLoadingHistory(prev => ({ ...prev, warning: false }));
        });
    }
    
    // Refresh employee data juga
    fetchEmployeeData();
  }, []); // Tidak perlu dependensi karena menggunakan refs

  // Handler untuk mengubah kontrak
  const handleContractChange = useCallback(async (data: ContractChangeFormValues, employeeId: string) => {
    try {
      console.log(`Updating contract for employee ${employeeId} with data:`, data);
      
      // Format data sesuai yang diharapkan oleh endpoint
      const payload = {
        contractType: data.contractType,
        contractNumber: data.contractNumber || "",
        startDate: data.startDate.toISOString(),
        endDate: data.endDate ? data.endDate.toISOString() : null,
        status: data.status,
        notes: data.notes || ""
      };
      
      // Kirim permintaan ke endpoint contract-status
      const response = await fetch(`/api/employees/${employeeId}/contract-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      const responseData = await response.json();
      
      // Penanganan error yang lebih robust
      if (!response.ok) {
        let errorMessage = 'Gagal mengubah kontrak';
        
        if (responseData && responseData.message) {
          errorMessage = responseData.message;
        }
        
        throw new Error(errorMessage);
      }
      
      toast.success('Kontrak berhasil diubah dan riwayat disimpan');
      
      // Refresh data menggunakan fetchEmployeeData yang sudah didefinisikan
      await fetchEmployeeData();
      
      // Refresh riwayat kontrak
      const { employee } = stateRef.current;
      if (employee?.id) {
        setLoadingHistory(prev => ({ ...prev, contract: true }));
        
        // Pastikan untuk mengambil riwayat yang terbaru
        const historyResponse = await fetch(`/api/employees/${employee.id}/contract-history`);
        const historyData = await historyResponse.json();
        
        if (historyData.success && Array.isArray(historyData.data)) {
          console.log(`Riwayat kontrak diperbarui: ${historyData.data.length} entri`);
          setContractHistory(historyData.data);
        } else {
          console.error('Error format data riwayat kontrak:', historyData);
        }
        
        setLoadingHistory(prev => ({ ...prev, contract: false }));
      }
      
      // Tutup modal
      setIsContractChangeModalOpen(false);
    } catch (error) {
      console.error('Error updating contract:', error);
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan saat mengubah kontrak';
      toast.error(errorMessage);
    }
  }, []); // Tidak perlu dependensi karena menggunakan refs

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Memuat data karyawan...</p>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/employee')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="typography-h1">Detail Karyawan</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-red-500">{error || "Data karyawan tidak ditemukan"}</p>
            <Button className="mt-4" onClick={() => router.push('/employee')}>
              Kembali
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => router.push('/employee')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="typography-h1">Detail Karyawan: {employee.user?.name}</h1>
        </div>
        
        <Button onClick={() => router.push(`/employee/edit/${employee.id}`)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Karyawan
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="info">Informasi</TabsTrigger>
          <TabsTrigger value="contract">Riwayat Kontrak</TabsTrigger>
          <TabsTrigger value="shift">Riwayat Shift</TabsTrigger>
          <TabsTrigger value="warning">Riwayat SP</TabsTrigger>
        </TabsList>
        
        <TabsContent value="info" className="mt-6">
          <EmployeeInfo 
            data={employee} 
            setIsContractChangeModalOpen={setIsContractChangeModalOpen} 
          />
        </TabsContent>
        
        <TabsContent value="contract" className="mt-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Riwayat Kontrak</CardTitle>
                <CardDescription>
                  Daftar riwayat perubahan kontrak karyawan
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {loadingHistory.contract ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <p className="ml-2">Memuat riwayat kontrak...</p>
                </div>
              ) : historyError.contract ? (
                <Alert variant="destructive" className="mb-4">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{historyError.contract}</AlertDescription>
                </Alert>
              ) : contractHistory.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-muted-foreground">Belum ada riwayat kontrak yang tercatat</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Jenis</TableHead>
                        <TableHead>Nomor</TableHead>
                        <TableHead>Tanggal Mulai</TableHead>
                        <TableHead>Tanggal Berakhir</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contractHistory.map((contract) => (
                        <TableRow key={contract.id}>
                          <TableCell>
                            <Badge variant={contract.contractType === "PERMANENT" ? "default" : "secondary"}>
                              {contract.contractType === "PERMANENT" ? "Permanen" : "Training"}
                            </Badge>
                          </TableCell>
                          <TableCell>{contract.contractNumber || '-'}</TableCell>
                          <TableCell>{formatDate(contract.startDate)}</TableCell>
                          <TableCell>{formatDate(contract.endDate)}</TableCell>
                          <TableCell>
                            <Badge variant={
                              contract.status === "Aktif" ? "default" :
                              contract.status === "Selesai" ? "outline" :
                              "secondary"
                            }>
                              {contract.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="shift" className="mt-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Riwayat Shift</CardTitle>
                <CardDescription>
                  Daftar riwayat perubahan shift karyawan
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {loadingHistory.shift ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <p className="ml-2">Memuat riwayat shift...</p>
                </div>
              ) : historyError.shift ? (
                <Alert variant="destructive" className="mb-4">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{historyError.shift}</AlertDescription>
                </Alert>
              ) : shiftHistory.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-muted-foreground">Belum ada riwayat shift yang tercatat</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Shift</TableHead>
                        <TableHead>Tanggal Mulai</TableHead>
                        <TableHead>Tanggal Berakhir</TableHead>
                        <TableHead>Catatan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shiftHistory.map((shift) => (
                        <TableRow key={shift.id}>
                          <TableCell>{shift.shift?.name || 'Unknown'}</TableCell>
                          <TableCell>{formatDate(shift.startDate)}</TableCell>
                          <TableCell>{formatDate(shift.endDate)}</TableCell>
                          <TableCell>{shift.notes || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="warning" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Riwayat Surat Peringatan</CardTitle>
                <CardDescription>
                  Daftar riwayat surat peringatan karyawan
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {loadingHistory.warning ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <p className="ml-2">Memuat riwayat SP...</p>
                </div>
              ) : historyError.warning ? (
                <Alert variant="destructive" className="mb-4">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{historyError.warning}</AlertDescription>
                </Alert>
              ) : warningHistory.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-muted-foreground">Belum ada riwayat SP yang tercatat</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status SP</TableHead>
                        <TableHead>Tanggal Mulai</TableHead>
                        <TableHead>Tanggal Berakhir</TableHead>
                        <TableHead>Alasan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {warningHistory.map((warning) => (
                        <TableRow key={warning.id}>
                          <TableCell>
                            <Badge variant={warning.warningStatus === "NONE" ? "outline" : 
                              warning.warningStatus === "SP1" ? "default" :
                              warning.warningStatus === "SP2" ? "secondary" : "destructive"}>
                              {warning.warningStatus === "NONE" ? "Tidak Ada SP" : warning.warningStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(warning.startDate)}</TableCell>
                          <TableCell>{formatDate(warning.endDate)}</TableCell>
                          <TableCell>{warning.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Modal untuk menambah riwayat SP */}
      <AddWarningHistoryModal
        isOpen={isAddWarningModalOpen}
        onClose={() => setIsAddWarningModalOpen(false)}
        employeeId={employee.id}
        onSuccess={handleWarningAdded}
      />
      
      {/* Modal untuk menambahkan riwayat kontrak */}
      {employee && (
        <AddContractHistoryModal 
          isOpen={isAddContractModalOpen}
          onClose={() => setIsAddContractModalOpen(false)}
          employeeId={employee.id}
          onSuccess={() => {
            // Refresh riwayat kontrak setelah menambahkan
            if (employee?.id) {
              setLoadingHistory(prev => ({ ...prev, contract: true }));
              fetch(`/api/employees/${employee.id}/contract-history`)
                .then(response => response.json())
                .then(result => {
                  if (result.success && Array.isArray(result.data)) {
                    setContractHistory(result.data);
                  }
                })
                .catch(error => {
                  console.error('Error refreshing contract history:', error);
                })
                .finally(() => {
                  setLoadingHistory(prev => ({ ...prev, contract: false }));
                });
            }
          }}
        />
      )}
      
      {/* Modal untuk menambahkan riwayat shift */}
      {employee && (
        <AddShiftHistoryModal 
          isOpen={isAddShiftModalOpen}
          onClose={() => setIsAddShiftModalOpen(false)}
          employeeId={employee.id}
          onSuccess={() => {
            // Refresh riwayat shift setelah menambahkan
            if (employee?.id) {
              setLoadingHistory(prev => ({ ...prev, shift: true }));
              fetch(`/api/employees/${employee.id}/shift-history`)
                .then(response => response.json())
                .then(result => {
                  if (result.success && Array.isArray(result.data)) {
                    setShiftHistory(result.data);
                  }
                })
                .catch(error => {
                  console.error('Error refreshing shift history:', error);
                })
                .finally(() => {
                  setLoadingHistory(prev => ({ ...prev, shift: false }));
                });
            }
          }}
        />
      )}
      
      {/* Modal untuk mengubah kontrak */}
      {employee && (
        <ContractChangeModal
          open={isContractChangeModalOpen}
          onOpenChange={setIsContractChangeModalOpen}
          employeeName={employee.user?.name}
          employeeId={employee.id}
          currentContractType={employee.contractType === "PERMANENT" ? "Permanen" : "Training"}
          onSubmit={handleContractChange}
        />
      )}
    </div>
  );
} 