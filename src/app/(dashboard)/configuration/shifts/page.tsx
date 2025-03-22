"use client";

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { useToast } from '@/components/ui/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
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
  mainWorkStart: string
  mainWorkEnd: string
  lunchBreakStart: string | null
  lunchBreakEnd: string | null
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
const formatTime = (dateString: string) => {
  try {
    const date = new Date(dateString)
    return format(date, 'HH:mm', { locale: id })
  } catch {
    // Ignore error dan return placeholder
    return '-'
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

// Schema validasi untuk form shift
const shiftFormSchema = z.object({
  name: z.string().min(1, { message: "Nama shift wajib diisi" }),
  shiftType: z.enum(['NON_SHIFT', 'SHIFT_A', 'SHIFT_B']),
  subDepartmentId: z.string().min(1, { message: "Sub-departemen wajib dipilih" }),
  mainWorkStart: z.string().min(1, { message: "Waktu mulai kerja wajib diisi" }),
  mainWorkEnd: z.string().min(1, { message: "Waktu akhir kerja wajib diisi" }),
  lunchBreakStart: z.string().optional().nullable(),
  lunchBreakEnd: z.string().optional().nullable(),
  regularOvertimeStart: z.string().optional().nullable(),
  regularOvertimeEnd: z.string().optional().nullable(),
  weeklyOvertimeStart: z.string().optional().nullable(),
  weeklyOvertimeEnd: z.string().optional().nullable(),
})

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
      regularOvertimeStart: '',
      regularOvertimeEnd: '',
      weeklyOvertimeStart: '',
      weeklyOvertimeEnd: '',
    }
  })
  
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
    if (!value) return '';
    return value;
  }
  
  // Format waktu untuk API
  const formatTimeToISO = (timeString: string | null | undefined) => {
    if (!timeString) return null;
    
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
      // Konversi waktu untuk API
      const payload = {
        ...data,
        mainWorkStart: formatTimeToISO(data.mainWorkStart),
        mainWorkEnd: formatTimeToISO(data.mainWorkEnd),
        lunchBreakStart: formatTimeToISO(data.lunchBreakStart || null),
        lunchBreakEnd: formatTimeToISO(data.lunchBreakEnd || null),
        regularOvertimeStart: formatTimeToISO(data.regularOvertimeStart || null),
        regularOvertimeEnd: formatTimeToISO(data.regularOvertimeEnd || null),
        weeklyOvertimeStart: formatTimeToISO(data.weeklyOvertimeStart || null),
        weeklyOvertimeEnd: formatTimeToISO(data.weeklyOvertimeEnd || null),
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
    
    // Format tanggal untuk input time
    const mainWorkStart = formatTime(shift.mainWorkStart)
    const mainWorkEnd = formatTime(shift.mainWorkEnd)
    
    form.setValue('name', shift.name)
    form.setValue('shiftType', shift.shiftType)
    form.setValue('subDepartmentId', shift.subDepartmentId || '')
    form.setValue('mainWorkStart', mainWorkStart)
    form.setValue('mainWorkEnd', mainWorkEnd)
    form.setValue('lunchBreakStart', handleTimeInputValue(shift.lunchBreakStart ? formatTime(shift.lunchBreakStart) : null))
    form.setValue('lunchBreakEnd', handleTimeInputValue(shift.lunchBreakEnd ? formatTime(shift.lunchBreakEnd) : null))
    form.setValue('regularOvertimeStart', handleTimeInputValue(shift.regularOvertimeStart ? formatTime(shift.regularOvertimeStart) : null))
    form.setValue('regularOvertimeEnd', handleTimeInputValue(shift.regularOvertimeEnd ? formatTime(shift.regularOvertimeEnd) : null))
    form.setValue('weeklyOvertimeStart', handleTimeInputValue(shift.weeklyOvertimeStart ? formatTime(shift.weeklyOvertimeStart) : null))
    form.setValue('weeklyOvertimeEnd', handleTimeInputValue(shift.weeklyOvertimeEnd ? formatTime(shift.weeklyOvertimeEnd) : null))
    
    setIsEditDialogOpen(true)
  }
  
  // Menangani submit form edit shift
  const handleEditShiftSubmit = async (data: ShiftFormValues) => {
    if (!currentShift) return
    
    try {
      // Konversi waktu untuk API
      const payload = {
        ...data,
        mainWorkStart: formatTimeToISO(data.mainWorkStart),
        mainWorkEnd: formatTimeToISO(data.mainWorkEnd),
        lunchBreakStart: formatTimeToISO(data.lunchBreakStart || null),
        lunchBreakEnd: formatTimeToISO(data.lunchBreakEnd || null),
        regularOvertimeStart: formatTimeToISO(data.regularOvertimeStart || null),
        regularOvertimeEnd: formatTimeToISO(data.regularOvertimeEnd || null),
        weeklyOvertimeStart: formatTimeToISO(data.weeklyOvertimeStart || null),
        weeklyOvertimeEnd: formatTimeToISO(data.weeklyOvertimeEnd || null),
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
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle>Konfigurasi Shift</CardTitle>
            <CardDescription>
              Kelola pengaturan shift untuk berbagai sub-departemen
            </CardDescription>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Shift
          </Button>
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
                        {formatTime(shift.mainWorkStart)} - {formatTime(shift.mainWorkEnd)}
                      </TableCell>
                      <TableCell>
                        {shift.lunchBreakStart && shift.lunchBreakEnd ? 
                          `${formatTime(shift.lunchBreakStart)} - ${formatTime(shift.lunchBreakEnd)}` : 
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
    </div>
  )
} 