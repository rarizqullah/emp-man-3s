"use client";

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useToast } from '@/components/ui/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Pencil, Plus, Search, Trash2, Clock, ArrowRightLeft } from 'lucide-react'
import { ShiftRotationDialog } from '@/components/shift-rotation/ShiftRotationDialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface SubDepartment {
  id: string
  name: string
  departmentId: string
  department: {
    id: string
    name: string
  }
  _count?: {
    employees: number
  }
}

interface Shift {
  id: string
  name: string
  shiftType: 'NON_SHIFT' | 'SHIFT_A' | 'SHIFT_B'
  subDepartmentId: string | null
  subDepartment?: {
    id: string
    name: string
    department: {
      id: string
      name: string
    }
  } | null
  mainWorkStart: string | null
  mainWorkEnd: string | null
  lunchBreakStart: string | null
  lunchBreakEnd: string | null
  workingDays: string[]
  regularOvertimeStart: string | null
  regularOvertimeEnd: string | null
  weeklyOvertimeStart: string | null
  weeklyOvertimeEnd: string | null
  _count?: {
    employees: number
  }
  createdAt: string
  updatedAt: string
}

// Formatter untuk menampilkan waktu
const formatTime = (dateString: string | null) => {
  if (!dateString) return '-';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleTimeString('id-ID', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  } catch {
    return '-';
  }
}

// Formatter untuk status shift
const formatShiftType = (type: 'NON_SHIFT' | 'SHIFT_A' | 'SHIFT_B') => {
  const types = {
    'NON_SHIFT': 'Non-Shift',
    'SHIFT_A': 'Shift A',
    'SHIFT_B': 'Shift B',
  }
  return types[type] || type
}

// Schema validasi untuk form shift - dimodifikasi untuk Non-Shift
const shiftFormSchema = z.object({
  name: z.string().min(1, { message: "Nama shift wajib diisi" }),
  shiftType: z.enum(['NON_SHIFT', 'SHIFT_A', 'SHIFT_B']),
  subDepartmentId: z.string().min(1, { message: "Sub-departemen wajib dipilih" }),
  mainWorkStart: z.string().optional(),
  mainWorkEnd: z.string().optional(),
  lunchBreakStart: z.string().optional(),
  lunchBreakEnd: z.string().optional(),
  workingDays: z.array(z.string()).default([]),
  regularOvertimeStart: z.string().optional(),
  regularOvertimeEnd: z.string().optional(),
  weeklyOvertimeStart: z.string().optional(),
  weeklyOvertimeEnd: z.string().optional(),
}).refine((data) => {
  // Untuk tipe shift selain NON_SHIFT, mainWorkStart dan mainWorkEnd wajib diisi
  if (data.shiftType !== 'NON_SHIFT') {
    return data.mainWorkStart && data.mainWorkStart.trim() !== '' && 
           data.mainWorkEnd && data.mainWorkEnd.trim() !== '';
  }
  return true;
}, {
  message: "Jam kerja wajib diisi untuk tipe shift ini",
  path: ["mainWorkStart"]
});

// Tipe data untuk form shift
type ShiftFormValues = z.infer<typeof shiftFormSchema>

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterSubDepartmentId, setFilterSubDepartmentId] = useState<string>("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [currentShift, setCurrentShift] = useState<Shift | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isRotationDialogOpen, setIsRotationDialogOpen] = useState(false)
  
  // Form untuk tambah/edit shift
  const form = useForm<ShiftFormValues>({
    resolver: zodResolver(shiftFormSchema),
    defaultValues: {
      name: '',
      shiftType: 'NON_SHIFT',
      subDepartmentId: '',
      mainWorkStart: '',
      mainWorkEnd: '',
      lunchBreakStart: '',
      lunchBreakEnd: '',
      workingDays: [],
      regularOvertimeStart: '',
      regularOvertimeEnd: '',
      weeklyOvertimeStart: '',
      weeklyOvertimeEnd: '',
    }
  })
  
  // Watch untuk perubahan shiftType
  const watchedShiftType = form.watch('shiftType')
  
  // Effect untuk membersihkan field yang tidak diperlukan saat tipe shift berubah
  useEffect(() => {
    if (watchedShiftType === 'NON_SHIFT') {
      // Reset semua field waktu ke nilai kosong untuk NON_SHIFT
      form.setValue('mainWorkStart', '')
      form.setValue('mainWorkEnd', '')
      form.setValue('lunchBreakStart', '')
      form.setValue('lunchBreakEnd', '')
      form.setValue('workingDays', [])
      form.setValue('regularOvertimeStart', '')
      form.setValue('regularOvertimeEnd', '')
      form.setValue('weeklyOvertimeStart', '')
      form.setValue('weeklyOvertimeEnd', '')
    }
  }, [watchedShiftType, form])
  
  const { toast } = useToast()
  
  // Mengambil daftar sub-departemen
  const fetchSubDepartments = async () => {
    try {
      const response = await fetch('/api/sub-departments')
      
      if (!response.ok) {
        throw new Error('Gagal mengambil data sub-departemen')
      }
      
      const data: SubDepartment[] = await response.json()
      setSubDepartments(data)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Gagal memuat data sub-departemen')
    }
  }
  
  // Mengambil daftar shift
  const fetchShifts = async () => {
    try {
      setIsLoading(true)
      
      // Buat URL dengan filter sub-departemen jika ada
      let url = '/api/shifts'
      if (filterSubDepartmentId && filterSubDepartmentId !== 'ALL') {
        url += `?subDepartmentId=${filterSubDepartmentId}`
      }
      
      console.log('Memulai fetch data shift...', url)
      const response = await fetch(url)
      
      console.log('Respons API shift:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })
      
      if (!response.ok) {
        let errorMessage = `Server returned ${response.status}`
        try {
          const errorData = await response.json()
          console.error('Error data:', errorData)
          errorMessage = errorData.error || errorMessage
        } catch (parseError) {
          console.error('Tidak dapat memparse error response:', parseError)
        }
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      console.log('Data shift berhasil diambil:', data.length, 'item')
      setShifts(data)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Gagal memuat data shift: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setIsLoading(false)
    }
  }

  // Inisialisasi data
  useEffect(() => {
    const init = async () => {
      await fetchSubDepartments()
      await fetchShifts()
    }
    
    init()
  }, [])

  // Re-fetch saat filter sub-departemen berubah
  useEffect(() => {
    fetchShifts()
  }, [filterSubDepartmentId])
  
  // Filter shift berdasarkan pencarian
  const filteredShifts = shifts.filter(shift => 
    shift.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    formatShiftType(shift.shiftType).toLowerCase().includes(searchQuery.toLowerCase()) ||
    (shift.subDepartment?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (shift.subDepartment?.department?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  // Helper untuk menangani nilai input waktu
  const handleTimeInputValue = (value: string | null | undefined): string => {
    if (!value || value === 'undefined') return '';
    return value;
  }
  
  // Format waktu untuk API
  const formatTimeToISO = (timeString: string | null | undefined) => {
    if (!timeString || timeString.trim() === '') return null;
    
    const [hours, minutes] = timeString.split(':').map(Number);
    
    if (isNaN(hours) || isNaN(minutes)) {
      return null;
    }
    
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    
    return date.toISOString();
  }
  
  // Menangani submit form tambah shift
  const handleAddShiftSubmit = async (data: ShiftFormValues) => {
    try {
      // Konversi waktu untuk API berdasarkan tipe shift
      const payload: {
        name: string;
        shiftType: 'NON_SHIFT' | 'SHIFT_A' | 'SHIFT_B';
        subDepartmentId: string;
        mainWorkStart?: string | null;
        mainWorkEnd?: string | null;
        lunchBreakStart?: string | null;
        lunchBreakEnd?: string | null;
        workingDays?: string[];
        regularOvertimeStart?: string | null;
        regularOvertimeEnd?: string | null;
        weeklyOvertimeStart?: string | null;
        weeklyOvertimeEnd?: string | null;
      } = {
        name: data.name,
        shiftType: data.shiftType,
        subDepartmentId: data.subDepartmentId,
      }
      
      // Hanya tambahkan field waktu jika bukan NON_SHIFT
      if (data.shiftType !== 'NON_SHIFT') {
        payload.mainWorkStart = formatTimeToISO(data.mainWorkStart)
        payload.mainWorkEnd = formatTimeToISO(data.mainWorkEnd)
        payload.lunchBreakStart = formatTimeToISO(data.lunchBreakStart)
        payload.lunchBreakEnd = formatTimeToISO(data.lunchBreakEnd)
        payload.workingDays = data.workingDays || []
        payload.regularOvertimeStart = formatTimeToISO(data.regularOvertimeStart)
        payload.regularOvertimeEnd = formatTimeToISO(data.regularOvertimeEnd)
        payload.weeklyOvertimeStart = formatTimeToISO(data.weeklyOvertimeStart)
        payload.weeklyOvertimeEnd = formatTimeToISO(data.weeklyOvertimeEnd)
      } else {
        // Untuk NON_SHIFT, set field waktu ke null
        payload.mainWorkStart = null
        payload.mainWorkEnd = null
        payload.lunchBreakStart = null
        payload.lunchBreakEnd = null
        payload.workingDays = []
        payload.regularOvertimeStart = null
        payload.regularOvertimeEnd = null
        payload.weeklyOvertimeStart = null
        payload.weeklyOvertimeEnd = null
      }
      
      const response = await fetch('/api/shifts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Gagal menambahkan shift')
      }
      
      // Refresh data
      await fetchShifts()
      
      // Reset form dan tutup dialog
      setIsAddDialogOpen(false)
      form.reset()
      toast.success('Shift berhasil ditambahkan')
    } catch (error: unknown) {
      console.error('Error:', error)
      if (error instanceof Error) {
        toast.error(error.message || 'Gagal menambahkan shift')
      } else {
        toast.error('Gagal menambahkan shift')
      }
    }
  }
  
  // Mengisi form untuk edit shift
  const handleEditShift = (shift: Shift) => {
    setCurrentShift(shift)
    
    // Helper function untuk konversi time ke format HH:mm untuk input
    const formatTimeForInput = (dateString: string | null): string => {
      if (!dateString) return '';
      
      try {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        });
      } catch {
        return '';
      }
    }
    
    form.setValue('name', shift.name)
    form.setValue('shiftType', shift.shiftType)
    form.setValue('subDepartmentId', shift.subDepartmentId || '')
    form.setValue('mainWorkStart', formatTimeForInput(shift.mainWorkStart))
    form.setValue('mainWorkEnd', formatTimeForInput(shift.mainWorkEnd))
    form.setValue('lunchBreakStart', formatTimeForInput(shift.lunchBreakStart))
    form.setValue('lunchBreakEnd', formatTimeForInput(shift.lunchBreakEnd))
    form.setValue('workingDays', shift.workingDays || [])
    form.setValue('regularOvertimeStart', formatTimeForInput(shift.regularOvertimeStart))
    form.setValue('regularOvertimeEnd', formatTimeForInput(shift.regularOvertimeEnd))
    form.setValue('weeklyOvertimeStart', formatTimeForInput(shift.weeklyOvertimeStart))
    form.setValue('weeklyOvertimeEnd', formatTimeForInput(shift.weeklyOvertimeEnd))
    
    setIsEditDialogOpen(true)
  }
  
  // Menangani submit form edit shift
  const handleEditShiftSubmit = async (data: ShiftFormValues) => {
    if (!currentShift) return
    
    try {
      // Konversi waktu untuk API berdasarkan tipe shift
      const payload: {
        name: string;
        shiftType: 'NON_SHIFT' | 'SHIFT_A' | 'SHIFT_B';
        subDepartmentId: string;
        mainWorkStart?: string | null;
        mainWorkEnd?: string | null;
        lunchBreakStart?: string | null;
        lunchBreakEnd?: string | null;
        workingDays?: string[];
        regularOvertimeStart?: string | null;
        regularOvertimeEnd?: string | null;
        weeklyOvertimeStart?: string | null;
        weeklyOvertimeEnd?: string | null;
      } = {
        name: data.name,
        shiftType: data.shiftType,
        subDepartmentId: data.subDepartmentId,
      }
      
      // Hanya tambahkan field waktu jika bukan NON_SHIFT
      if (data.shiftType !== 'NON_SHIFT') {
        payload.mainWorkStart = formatTimeToISO(data.mainWorkStart)
        payload.mainWorkEnd = formatTimeToISO(data.mainWorkEnd)
        payload.lunchBreakStart = formatTimeToISO(data.lunchBreakStart)
        payload.lunchBreakEnd = formatTimeToISO(data.lunchBreakEnd)
        payload.workingDays = data.workingDays || []
        payload.regularOvertimeStart = formatTimeToISO(data.regularOvertimeStart)
        payload.regularOvertimeEnd = formatTimeToISO(data.regularOvertimeEnd)
        payload.weeklyOvertimeStart = formatTimeToISO(data.weeklyOvertimeStart)
        payload.weeklyOvertimeEnd = formatTimeToISO(data.weeklyOvertimeEnd)
      } else {
        // Untuk NON_SHIFT, set field waktu ke null
        payload.mainWorkStart = null
        payload.mainWorkEnd = null
        payload.lunchBreakStart = null
        payload.lunchBreakEnd = null
        payload.workingDays = []
        payload.regularOvertimeStart = null
        payload.regularOvertimeEnd = null
        payload.weeklyOvertimeStart = null
        payload.weeklyOvertimeEnd = null
      }
      
      const response = await fetch(`/api/shifts/${currentShift.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Gagal mengupdate shift')
      }
      
      // Refresh data
      await fetchShifts()
      
      // Reset form dan tutup dialog
      setIsEditDialogOpen(false)
      setCurrentShift(null)
      form.reset()
      toast.success('Shift berhasil diperbarui')
    } catch (error: unknown) {
      console.error('Error:', error)
      if (error instanceof Error) {
        toast.error(error.message || 'Gagal mengupdate shift')
      } else {
        toast.error('Gagal mengupdate shift')
      }
    }
  }
  
  // Buka dialog konfirmasi hapus shift
  const openDeleteDialog = (shift: Shift) => {
    setCurrentShift(shift)
    setIsDeleteDialogOpen(true)
  }
  
  // Menangani delete shift
  const handleDeleteShift = async () => {
    if (!currentShift) return
    
    try {
      const response = await fetch(`/api/shifts/${currentShift.id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Gagal menghapus shift')
      }
      
      // Refresh data
      await fetchShifts()
      
      // Reset state dan tutup dialog
      setIsDeleteDialogOpen(false)
      setCurrentShift(null)
      toast.success('Shift berhasil dihapus')
    } catch (error: unknown) {
      console.error('Error:', error)
      if (error instanceof Error) {
        toast.error(error.message || 'Gagal menghapus shift')
      } else {
        toast.error('Gagal menghapus shift')
      }
    }
  }
  
  // Fungsi untuk memperbarui jam istirahat shift yang kosong
  const handleUpdateBreakTimes = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/shifts/update-break-times', {
        method: 'POST',
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Gagal memperbarui jam istirahat')
      }
      
      const result = await response.json()
      
      // Refresh data shift
      await fetchShifts()
      
      toast.success(`Berhasil memperbarui ${result.updates?.length || 0} shift dengan jam istirahat`)
    } catch (error: unknown) {
      console.error('Error:', error)
      if (error instanceof Error) {
        toast.error(error.message || 'Gagal memperbarui jam istirahat')
      } else {
        toast.error('Gagal memperbarui jam istirahat')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Fungsi untuk memperbarui hari kerja shift yang kosong
  const handleUpdateWorkingDays = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/shifts/update-working-days', {
        method: 'POST',
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Gagal memperbarui hari kerja')
      }
      
      const result = await response.json()
      
      // Refresh data shift
      await fetchShifts()
      
      toast.success(`Berhasil memperbarui ${result.updates?.length || 0} shift dengan hari kerja default`)
    } catch (error: unknown) {
      console.error('Error:', error)
      if (error instanceof Error) {
        toast.error(error.message || 'Gagal memperbarui hari kerja')
      } else {
        toast.error('Gagal memperbarui hari kerja')
      }
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="typography-h1">Konfigurasi Shift</h1>
          <p className="typography-muted mt-2">Kelola pengaturan shift untuk berbagai sub-departemen</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={handleUpdateBreakTimes}
            disabled={isLoading}
          >
            <Clock className="mr-2 h-4 w-4" />
            Perbaiki Jam Istirahat
          </Button>
          <Button 
            variant="outline"
            onClick={() => setIsRotationDialogOpen(true)}
            disabled={isLoading}
          >
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            Rotasi Shift
          </Button>
          <Button 
            variant="outline"
            onClick={handleUpdateWorkingDays}
            disabled={isLoading}
          >
            <Clock className="mr-2 h-4 w-4" />
            Set Hari Kerja
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Shift
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="typography-h3">Daftar Shift</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Cari shift..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-[260px]">
              <Select 
                value={filterSubDepartmentId} 
                onValueChange={setFilterSubDepartmentId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter Sub-Departemen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Sub-Departemen</SelectItem>
                  {subDepartments.map((subDept) => (
                    <SelectItem key={subDept.id} value={subDept.id}>
                      {subDept.name} ({subDept.department.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">Memuat data...</p>
            </div>
          ) : filteredShifts.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">
                {searchQuery ? 'Tidak ada shift yang sesuai dengan pencarian' : 'Belum ada data shift'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Nama Shift</TableHead>
                    <TableHead>Tipe Shift</TableHead>
                    <TableHead>Sub-Departemen</TableHead>
                    <TableHead>Departemen</TableHead>
                    <TableHead>Jam Kerja Pokok</TableHead>
                    <TableHead>Jam Istirahat</TableHead>
                    <TableHead>Hari Kerja</TableHead>
                    <TableHead>Jam Lembur Reguler</TableHead>
                    <TableHead>Jam Lembur Mingguan</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredShifts.map((shift) => (
                    <TableRow key={shift.id}>
                      <TableCell className="font-medium">{shift.name}</TableCell>
                      <TableCell>{formatShiftType(shift.shiftType)}</TableCell>
                      <TableCell>{shift.subDepartment?.name || '-'}</TableCell>
                      <TableCell>{shift.subDepartment?.department?.name || '-'}</TableCell>
                      <TableCell>
                        {shift.mainWorkStart && shift.mainWorkEnd ? 
                          `${formatTime(shift.mainWorkStart)} - ${formatTime(shift.mainWorkEnd)}` : 
                          '-'}
                      </TableCell>
                      <TableCell>
                        {shift.lunchBreakStart && shift.lunchBreakEnd ? 
                          `${formatTime(shift.lunchBreakStart)} - ${formatTime(shift.lunchBreakEnd)}` : 
                          '-'}
                      </TableCell>
                      <TableCell>
                        {shift.workingDays && shift.workingDays.length > 0 ? 
                          shift.workingDays.join(', ') : 
                          '-'}
                      </TableCell>
                      <TableCell>
                        {shift.regularOvertimeStart && shift.regularOvertimeEnd ? 
                          `${formatTime(shift.regularOvertimeStart)} - ${formatTime(shift.regularOvertimeEnd)}` : 
                          '-'}
                      </TableCell>
                      <TableCell>
                        {shift.weeklyOvertimeStart && shift.weeklyOvertimeEnd ? 
                          `${formatTime(shift.weeklyOvertimeStart)} - ${formatTime(shift.weeklyOvertimeEnd)}` : 
                          '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => handleEditShift(shift)}
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon"
                            className="text-red-500 hover:text-red-600"
                            onClick={() => openDeleteDialog(shift)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Tambah Shift */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Tambah Shift Baru</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddShiftSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Shift</FormLabel>
                    <FormControl>
                      <Input placeholder="Shift Pagi" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="shiftType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipe Shift</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih tipe shift" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="NON_SHIFT">Non-Shift</SelectItem>
                          <SelectItem value="SHIFT_A">Shift A</SelectItem>
                          <SelectItem value="SHIFT_B">Shift B</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="subDepartmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sub-Departemen</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih sub-departemen" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {subDepartments.map((subDept) => (
                            <SelectItem key={subDept.id} value={subDept.id}>
                              {subDept.name} ({subDept.department.name})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Tampilkan field jam kerja hanya jika bukan NON_SHIFT */}
              {watchedShiftType !== 'NON_SHIFT' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="mainWorkStart"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Jam Mulai Kerja</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="mainWorkEnd"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Jam Selesai Kerja</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="lunchBreakStart"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Jam Mulai Istirahat</FormLabel>
                          <FormControl>
                            <Input 
                              type="time" 
                              value={handleTimeInputValue(field.value)}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              disabled={field.disabled}
                              name={field.name}
                              ref={field.ref}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lunchBreakEnd"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Jam Selesai Istirahat</FormLabel>
                          <FormControl>
                            <Input 
                              type="time" 
                              value={handleTimeInputValue(field.value)}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              disabled={field.disabled}
                              name={field.name}
                              ref={field.ref}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="workingDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hari Kerja</FormLabel>
                        <FormControl>
                          <div className="grid grid-cols-7 gap-2">
                            {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map((day) => (
                              <label key={day} className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={field.value?.includes(day) || false}
                                  onChange={(e) => {
                                    const currentValue = field.value || [];
                                    if (e.target.checked) {
                                      field.onChange([...currentValue, day]);
                                    } else {
                                      field.onChange(currentValue.filter((d: string) => d !== day));
                                    }
                                  }}
                                  className="rounded border-gray-300"
                                />
                                <span className="text-xs">{day}</span>
                              </label>
                            ))}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="regularOvertimeStart"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Jam Mulai Lembur Reguler</FormLabel>
                          <FormControl>
                            <Input 
                              type="time" 
                              value={handleTimeInputValue(field.value)}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              disabled={field.disabled}
                              name={field.name}
                              ref={field.ref}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="regularOvertimeEnd"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Jam Selesai Lembur Reguler</FormLabel>
                          <FormControl>
                            <Input 
                              type="time" 
                              value={handleTimeInputValue(field.value)}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              disabled={field.disabled}
                              name={field.name}
                              ref={field.ref}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="weeklyOvertimeStart"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Jam Mulai Lembur Mingguan</FormLabel>
                          <FormControl>
                            <Input 
                              type="time" 
                              value={handleTimeInputValue(field.value)}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              disabled={field.disabled}
                              name={field.name}
                              ref={field.ref}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="weeklyOvertimeEnd"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Jam Selesai Lembur Mingguan</FormLabel>
                          <FormControl>
                            <Input 
                              type="time" 
                              value={handleTimeInputValue(field.value)}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              disabled={field.disabled}
                              name={field.name}
                              ref={field.ref}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit">Simpan</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Dialog Edit Shift */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Edit Shift</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEditShiftSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Shift</FormLabel>
                    <FormControl>
                      <Input placeholder="Shift Pagi" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="shiftType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipe Shift</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih tipe shift" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="NON_SHIFT">Non-Shift</SelectItem>
                          <SelectItem value="SHIFT_A">Shift A</SelectItem>
                          <SelectItem value="SHIFT_B">Shift B</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="subDepartmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sub-Departemen</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih sub-departemen" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {subDepartments.map((subDept) => (
                            <SelectItem key={subDept.id} value={subDept.id}>
                              {subDept.name} ({subDept.department.name})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Tampilkan field jam kerja hanya jika bukan NON_SHIFT */}
              {watchedShiftType !== 'NON_SHIFT' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="mainWorkStart"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Jam Mulai Kerja</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="mainWorkEnd"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Jam Selesai Kerja</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="lunchBreakStart"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Jam Mulai Istirahat</FormLabel>
                          <FormControl>
                            <Input 
                              type="time" 
                              value={handleTimeInputValue(field.value)}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              disabled={field.disabled}
                              name={field.name}
                              ref={field.ref}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lunchBreakEnd"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Jam Selesai Istirahat</FormLabel>
                          <FormControl>
                            <Input 
                              type="time" 
                              value={handleTimeInputValue(field.value)}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              disabled={field.disabled}
                              name={field.name}
                              ref={field.ref}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="workingDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hari Kerja</FormLabel>
                        <FormControl>
                          <div className="grid grid-cols-7 gap-2">
                            {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map((day) => (
                              <label key={day} className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={field.value?.includes(day) || false}
                                  onChange={(e) => {
                                    const currentValue = field.value || [];
                                    if (e.target.checked) {
                                      field.onChange([...currentValue, day]);
                                    } else {
                                      field.onChange(currentValue.filter((d: string) => d !== day));
                                    }
                                  }}
                                  className="rounded border-gray-300"
                                />
                                <span className="text-xs">{day}</span>
                              </label>
                            ))}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="regularOvertimeStart"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Jam Mulai Lembur Reguler</FormLabel>
                          <FormControl>
                            <Input 
                              type="time" 
                              value={handleTimeInputValue(field.value)}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              disabled={field.disabled}
                              name={field.name}
                              ref={field.ref}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="regularOvertimeEnd"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Jam Selesai Lembur Reguler</FormLabel>
                          <FormControl>
                            <Input 
                              type="time" 
                              value={handleTimeInputValue(field.value)}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              disabled={field.disabled}
                              name={field.name}
                              ref={field.ref}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="weeklyOvertimeStart"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Jam Mulai Lembur Mingguan</FormLabel>
                          <FormControl>
                            <Input 
                              type="time" 
                              value={handleTimeInputValue(field.value)}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              disabled={field.disabled}
                              name={field.name}
                              ref={field.ref}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="weeklyOvertimeEnd"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Jam Selesai Lembur Mingguan</FormLabel>
                          <FormControl>
                            <Input 
                              type="time" 
                              value={handleTimeInputValue(field.value)}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              disabled={field.disabled}
                              name={field.name}
                              ref={field.ref}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsEditDialogOpen(false)
                    setCurrentShift(null)
                  }}
                >
                  Batal
                </Button>
                <Button type="submit">Simpan Perubahan</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Dialog Konfirmasi Hapus */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus Shift</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus shift &quot;{currentShift?.name}&quot;? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCurrentShift(null)}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteShift} className="bg-red-600 hover:bg-red-700">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Rotasi Shift */}
      <ShiftRotationDialog 
        isOpen={isRotationDialogOpen} 
        onClose={() => setIsRotationDialogOpen(false)} 
      />
    </div>
  )
} 