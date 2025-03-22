"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { 
  Pencil, 
  Trash2, 
  Plus, 
  Search, 
  RefreshCw,
  DollarSign,
  Building2,
  Briefcase
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { id } from "date-fns/locale"

interface Department {
  id: string
  name: string
}

interface SalaryRate {
  id: string
  contractType: 'PERMANENT' | 'TRAINING'
  departmentId: string
  department: Department
  mainWorkHourRate: number
  regularOvertimeRate: number
  weeklyOvertimeRate: number
  createdAt: string
  updatedAt: string
}

// Schema validasi untuk form tarif gaji
const salaryRateFormSchema = z.object({
  departmentId: z.string().min(1, { message: "Departemen wajib dipilih" }),
  contractType: z.enum(['PERMANENT', 'TRAINING'], { 
    required_error: "Tipe kontrak wajib dipilih" 
  }),
  mainWorkHourRate: z.coerce.number().min(0, { message: "Tarif jam kerja utama harus minimal 0" }),
  regularOvertimeRate: z.coerce.number().min(0, { message: "Tarif lembur reguler harus minimal 0" }),
  weeklyOvertimeRate: z.coerce.number().min(0, { message: "Tarif lembur mingguan harus minimal 0" }),
})

type SalaryRateFormValues = z.infer<typeof salaryRateFormSchema>

// Formatter untuk menampilkan tipe kontrak dengan label Indonesia
const formatContractType = (type: 'PERMANENT' | 'TRAINING') => {
  const labels = {
    'PERMANENT': 'Permanen',
    'TRAINING': 'Training'
  }
  return labels[type]
}

// Formatter untuk menampilkan mata uang rupiah
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

export default function SalaryRatesPage() {
  const [salaryRates, setSalaryRates] = useState<SalaryRate[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterDepartmentId, setFilterDepartmentId] = useState<string>("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [currentSalaryRate, setCurrentSalaryRate] = useState<SalaryRate | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  // Form untuk tambah/edit tarif gaji
  const form = useForm<SalaryRateFormValues>({
    resolver: zodResolver(salaryRateFormSchema),
    defaultValues: {
      departmentId: "",
      contractType: "PERMANENT",
      mainWorkHourRate: 0,
      regularOvertimeRate: 0,
      weeklyOvertimeRate: 0,
    },
  })

  // Mengambil daftar departemen untuk dropdown
  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments')
      
      if (!response.ok) {
        throw new Error('Gagal mengambil data departemen')
      }
      
      const data: Department[] = await response.json()
      setDepartments(data)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Gagal memuat data departemen')
    }
  }

  // Mengambil daftar tarif gaji
  const fetchSalaryRates = async () => {
    try {
      setIsLoading(true)
      
      // Buat URL dengan filter departemen jika ada
      let url = '/api/salary-rates'
      if (filterDepartmentId && filterDepartmentId !== 'ALL') {
        url += `?departmentId=${filterDepartmentId}`
      }
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Gagal mengambil data tarif gaji')
      }
      
      const data: SalaryRate[] = await response.json()
      setSalaryRates(data)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Gagal memuat data tarif gaji')
    } finally {
      setIsLoading(false)
    }
  }

  // Inisialisasi data
  useEffect(() => {
    const init = async () => {
      await fetchDepartments()
      await fetchSalaryRates()
    }
    
    init()
  }, [])

  // Re-fetch saat filter departemen berubah
  useEffect(() => {
    fetchSalaryRates()
  }, [filterDepartmentId])

  // Filter tarif gaji berdasarkan pencarian
  const filteredSalaryRates = salaryRates.filter(salaryRate => 
    salaryRate.department.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    formatContractType(salaryRate.contractType).toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Menangani submit form tambah tarif gaji
  const handleAddSalaryRateSubmit = async (data: SalaryRateFormValues) => {
    try {
      const response = await fetch('/api/salary-rates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || errorData.error || 'Gagal menambahkan tarif gaji')
      }
      
      await fetchSalaryRates()
      setIsAddDialogOpen(false)
      form.reset()
      toast.success('Tarif gaji berhasil ditambahkan')
    } catch (error: any) {
      console.error('Error:', error)
      toast.error(error.message || 'Gagal menambahkan tarif gaji')
    }
  }

  // Mengisi form untuk edit tarif gaji
  const handleEditSalaryRate = (salaryRate: SalaryRate) => {
    setCurrentSalaryRate(salaryRate)
    form.setValue('departmentId', salaryRate.departmentId)
    form.setValue('contractType', salaryRate.contractType)
    form.setValue('mainWorkHourRate', salaryRate.mainWorkHourRate)
    form.setValue('regularOvertimeRate', salaryRate.regularOvertimeRate)
    form.setValue('weeklyOvertimeRate', salaryRate.weeklyOvertimeRate)
    setIsEditDialogOpen(true)
  }

  // Menangani submit form edit tarif gaji
  const handleEditSalaryRateSubmit = async (data: SalaryRateFormValues) => {
    if (!currentSalaryRate) return
    
    try {
      const response = await fetch(`/api/salary-rates/${currentSalaryRate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || errorData.error || 'Gagal mengupdate tarif gaji')
      }
      
      await fetchSalaryRates()
      setIsEditDialogOpen(false)
      form.reset()
      toast.success('Tarif gaji berhasil diperbarui')
    } catch (error: any) {
      console.error('Error:', error)
      toast.error(error.message || 'Gagal mengupdate tarif gaji')
    }
  }

  // Membuka dialog konfirmasi hapus
  const openDeleteDialog = (salaryRate: SalaryRate) => {
    setCurrentSalaryRate(salaryRate)
    setIsDeleteDialogOpen(true)
  }

  // Menangani hapus tarif gaji
  const handleDeleteSalaryRate = async () => {
    if (!currentSalaryRate) return
    
    try {
      const response = await fetch(`/api/salary-rates/${currentSalaryRate.id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || errorData.error || 'Gagal menghapus tarif gaji')
      }
      
      await fetchSalaryRates()
      setIsDeleteDialogOpen(false)
      toast.success('Tarif gaji berhasil dihapus')
    } catch (error: any) {
      console.error('Error:', error)
      toast.error(error.message || 'Gagal menghapus tarif gaji')
    }
  }

  // Mendapatkan label departemen berdasarkan ID
  const getDepartmentName = (id: string) => {
    const department = departments.find(dept => dept.id === id)
    return department ? department.name : 'Tidak ditemukan'
  }

  // Render loading
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Memuat data tarif gaji...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Konfigurasi Tarif Gaji</h1>
          <p className="text-muted-foreground mt-1">
            Kelola tarif gaji berdasarkan departemen dan tipe kontrak
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Tarif Gaji
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Tarif Gaji Baru</DialogTitle>
              <DialogDescription>
                Tambahkan tarif gaji baru berdasarkan departemen dan tipe kontrak.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleAddSalaryRateSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departemen</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih departemen" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {departments.map((department) => (
                            <SelectItem key={department.id} value={department.id}>
                              {department.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="contractType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipe Kontrak</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih tipe kontrak" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PERMANENT">Permanen</SelectItem>
                          <SelectItem value="TRAINING">Training</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="mainWorkHourRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tarif Jam Kerja Utama (Rp)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="regularOvertimeRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tarif Lembur Reguler (Rp)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="weeklyOvertimeRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tarif Lembur Mingguan (Rp)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button variant="outline" type="button" onClick={() => setIsAddDialogOpen(false)}>
                    Batal
                  </Button>
                  <Button type="submit">Simpan</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 md:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cari tarif gaji..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Select
          value={filterDepartmentId}
          onValueChange={setFilterDepartmentId}
        >
          <SelectTrigger className="w-full sm:w-[240px]">
            <SelectValue placeholder="Filter departemen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua departemen</SelectItem>
            {departments.map((department) => (
              <SelectItem key={department.id} value={department.id}>
                {department.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button variant="outline" size="icon" onClick={fetchSalaryRates}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      
      {filteredSalaryRates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <DollarSign className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Tidak ada tarif gaji</p>
            <p className="text-sm text-muted-foreground">
              {salaryRates.length > 0 
                ? 'Tidak ada tarif gaji yang sesuai dengan pencarian atau filter Anda' 
                : 'Belum ada tarif gaji yang ditambahkan. Klik "Tambah Tarif Gaji" untuk mulai.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredSalaryRates.map((salaryRate) => (
            <Card key={salaryRate.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <Badge className="w-fit mb-1" variant="outline">
                      {formatContractType(salaryRate.contractType)}
                    </Badge>
                    <CardTitle className="text-lg">{salaryRate.department.name}</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="outline" onClick={() => handleEditSalaryRate(salaryRate)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="outline" 
                      className="text-destructive"
                      onClick={() => openDeleteDialog(salaryRate)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Tarif Jam Utama:</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(salaryRate.mainWorkHourRate)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Tarif Lembur Reguler:</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(salaryRate.regularOvertimeRate)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Tarif Lembur Mingguan:</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(salaryRate.weeklyOvertimeRate)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                    <span>Diperbarui:</span>
                    <span>
                      {format(new Date(salaryRate.updatedAt), 'dd MMM yyyy', { locale: id })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Dialog edit tarif gaji */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tarif Gaji</DialogTitle>
            <DialogDescription>
              Ubah informasi tarif gaji yang sudah ada
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEditSalaryRateSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Departemen</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih departemen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments.map((department) => (
                          <SelectItem key={department.id} value={department.id}>
                            {department.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="contractType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipe Kontrak</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih tipe kontrak" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PERMANENT">Permanen</SelectItem>
                        <SelectItem value="TRAINING">Training</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="mainWorkHourRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tarif Jam Kerja Utama (Rp)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="regularOvertimeRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tarif Lembur Reguler (Rp)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="weeklyOvertimeRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tarif Lembur Mingguan (Rp)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsEditDialogOpen(false)}>
                  Batal
                </Button>
                <Button type="submit">Simpan</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Dialog konfirmasi hapus */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus Tarif Gaji</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus tarif gaji untuk departemen &quot;{currentSalaryRate?.department.name}&quot; dengan tipe kontrak {currentSalaryRate ? formatContractType(currentSalaryRate.contractType) : ''}? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSalaryRate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 