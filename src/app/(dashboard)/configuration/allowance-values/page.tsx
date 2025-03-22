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
  CreditCard,
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
import { Textarea } from "@/components/ui/textarea"

interface AllowanceType {
  id: string
  name: string
  description: string | null
}

interface AllowanceValue {
  id: string
  name: string
  amount: number
  description: string | null
  allowanceTypeId: string
  allowanceType: AllowanceType
  createdAt: string
  updatedAt: string
}

// Schema validasi untuk form nilai tunjangan
const allowanceValueFormSchema = z.object({
  allowanceTypeId: z.string().min(1, { message: "Tipe tunjangan wajib dipilih" }),
  name: z.string().min(1, { message: "Nama nilai tunjangan wajib diisi" }),
  amount: z.coerce.number().min(0, { message: "Jumlah tunjangan harus minimal 0" }),
  description: z.string().optional(),
})

type AllowanceValueFormValues = z.infer<typeof allowanceValueFormSchema>

// Format angka ke format mata uang rupiah
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

export default function AllowanceValuesPage() {
  const [allowanceValues, setAllowanceValues] = useState<AllowanceValue[]>([])
  const [allowanceTypes, setAllowanceTypes] = useState<AllowanceType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterTypeId, setFilterTypeId] = useState<string>("ALL")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [currentAllowanceValue, setCurrentAllowanceValue] = useState<AllowanceValue | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  // Form untuk tambah/edit nilai tunjangan
  const form = useForm<AllowanceValueFormValues>({
    resolver: zodResolver(allowanceValueFormSchema),
    defaultValues: {
      allowanceTypeId: "",
      name: "",
      amount: 0,
      description: "",
    },
  })

  // Mengambil daftar tipe tunjangan untuk dropdown
  const fetchAllowanceTypes = async () => {
    try {
      const response = await fetch('/api/allowance-types')
      
      if (!response.ok) {
        throw new Error('Gagal mengambil data tipe tunjangan')
      }
      
      const data: AllowanceType[] = await response.json()
      setAllowanceTypes(data)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Gagal memuat data tipe tunjangan')
    }
  }

  // Mengambil daftar nilai tunjangan
  const fetchAllowanceValues = async () => {
    try {
      setIsLoading(true)
      
      // Buat URL dengan filter tipe tunjangan jika ada
      let url = '/api/allowance-values'
      if (filterTypeId && filterTypeId !== 'ALL') {
        url += `?typeId=${filterTypeId}`
      }
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Gagal mengambil data nilai tunjangan')
      }
      
      const data: AllowanceValue[] = await response.json()
      setAllowanceValues(data)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Gagal memuat data nilai tunjangan')
    } finally {
      setIsLoading(false)
    }
  }

  // Inisialisasi data
  useEffect(() => {
    const init = async () => {
      await fetchAllowanceTypes()
      await fetchAllowanceValues()
    }
    
    init()
  }, [])

  // Ambil ulang data nilai tunjangan saat filter berubah
  useEffect(() => {
    fetchAllowanceValues()
  }, [filterTypeId])

  // Filter nilai tunjangan berdasarkan pencarian
  const filteredAllowanceValues = allowanceValues.filter(value => 
    value.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (value.description && value.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    value.allowanceType.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Menangani submit form tambah nilai tunjangan
  const handleAddAllowanceValueSubmit = async (data: AllowanceValueFormValues) => {
    try {
      const response = await fetch('/api/allowance-values', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || errorData.error || 'Gagal menambahkan nilai tunjangan')
      }
      
      await fetchAllowanceValues()
      setIsAddDialogOpen(false)
      form.reset()
      toast.success('Nilai tunjangan berhasil ditambahkan')
    } catch (error) {
      console.error('Error:', error)
      if (error instanceof Error) {
        toast.error(error.message || 'Gagal menambahkan nilai tunjangan')
      } else {
        toast.error('Gagal menambahkan nilai tunjangan')
      }
    }
  }

  // Mengisi form untuk edit nilai tunjangan
  const handleEditAllowanceValue = (allowanceValue: AllowanceValue) => {
    setCurrentAllowanceValue(allowanceValue)
    form.setValue('allowanceTypeId', allowanceValue.allowanceTypeId)
    form.setValue('name', allowanceValue.name)
    form.setValue('amount', allowanceValue.amount)
    form.setValue('description', allowanceValue.description || '')
    setIsEditDialogOpen(true)
  }

  // Menangani submit form edit nilai tunjangan
  const handleEditAllowanceValueSubmit = async (data: AllowanceValueFormValues) => {
    if (!currentAllowanceValue) return
    
    try {
      const response = await fetch(`/api/allowance-values/${currentAllowanceValue.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || errorData.error || 'Gagal mengupdate nilai tunjangan')
      }
      
      await fetchAllowanceValues()
      setIsEditDialogOpen(false)
      form.reset()
      toast.success('Nilai tunjangan berhasil diperbarui')
    } catch (error) {
      console.error('Error:', error)
      if (error instanceof Error) {
        toast.error(error.message || 'Gagal mengupdate nilai tunjangan')
      } else {
        toast.error('Gagal mengupdate nilai tunjangan')
      }
    }
  }

  // Membuka dialog konfirmasi hapus
  const openDeleteDialog = (allowanceValue: AllowanceValue) => {
    setCurrentAllowanceValue(allowanceValue)
    setIsDeleteDialogOpen(true)
  }

  // Menangani hapus nilai tunjangan
  const handleDeleteAllowanceValue = async () => {
    if (!currentAllowanceValue) return
    
    try {
      const response = await fetch(`/api/allowance-values/${currentAllowanceValue.id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || errorData.error || 'Gagal menghapus nilai tunjangan')
      }
      
      await fetchAllowanceValues()
      setIsDeleteDialogOpen(false)
      toast.success('Nilai tunjangan berhasil dihapus')
    } catch (error) {
      console.error('Error:', error)
      if (error instanceof Error) {
        toast.error(error.message || 'Gagal menghapus nilai tunjangan')
      } else {
        toast.error('Gagal menghapus nilai tunjangan')
      }
    }
  }

  // Render loading
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Memuat data nilai tunjangan...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Konfigurasi Nilai Tunjangan</h1>
          <p className="text-muted-foreground mt-1">
            Kelola nilai tunjangan yang tersedia dalam sistem
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Nilai Tunjangan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Nilai Tunjangan Baru</DialogTitle>
              <DialogDescription>
                Tambahkan nilai tunjangan baru ke dalam sistem.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleAddAllowanceValueSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="allowanceTypeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipe Tunjangan</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih tipe tunjangan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {allowanceTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.name}
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
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Nilai Tunjangan</FormLabel>
                      <FormControl>
                        <Input placeholder="Masukkan nama nilai tunjangan" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jumlah Tunjangan (Rp)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" placeholder="Masukkan jumlah tunjangan" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deskripsi (Opsional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Masukkan deskripsi nilai tunjangan" 
                          className="resize-none" 
                          {...field} 
                          value={field.value || ''}
                        />
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
            placeholder="Cari nilai tunjangan..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Select
          value={filterTypeId}
          onValueChange={setFilterTypeId}
        >
          <SelectTrigger className="w-full sm:w-[240px]">
            <SelectValue placeholder="Filter tipe tunjangan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua tipe tunjangan</SelectItem>
            {allowanceTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button variant="outline" size="icon" onClick={fetchAllowanceValues}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      
      {filteredAllowanceValues.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <CreditCard className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Tidak ada nilai tunjangan</p>
            <p className="text-sm text-muted-foreground">
              {allowanceValues.length > 0 
                ? 'Tidak ada nilai tunjangan yang sesuai dengan pencarian atau filter Anda' 
                : 'Belum ada nilai tunjangan yang ditambahkan. Klik "Tambah Nilai Tunjangan" untuk mulai.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredAllowanceValues.map((value) => (
            <Card key={value.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <Badge className="w-fit mb-1" variant="outline">
                      {value.allowanceType.name}
                    </Badge>
                    <CardTitle>{value.name}</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="outline" onClick={() => handleEditAllowanceValue(value)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="outline" 
                      className="text-destructive"
                      onClick={() => openDeleteDialog(value)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Jumlah:</span>
                    <span className="font-semibold">
                      {formatCurrency(value.amount)}
                    </span>
                  </div>
                  
                  {value.description && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {value.description}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Dialog edit nilai tunjangan */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Nilai Tunjangan</DialogTitle>
            <DialogDescription>
              Ubah informasi nilai tunjangan yang sudah ada
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEditAllowanceValueSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="allowanceTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipe Tunjangan</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih tipe tunjangan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {allowanceTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
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
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Nilai Tunjangan</FormLabel>
                    <FormControl>
                      <Input placeholder="Masukkan nama nilai tunjangan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jumlah Tunjangan (Rp)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" placeholder="Masukkan jumlah tunjangan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deskripsi (Opsional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Masukkan deskripsi nilai tunjangan" 
                        className="resize-none" 
                        {...field} 
                        value={field.value || ''}
                      />
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
            <AlertDialogTitle>Konfirmasi Hapus Nilai Tunjangan</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus nilai tunjangan &quot;{currentAllowanceValue?.name}&quot; (tipe: {currentAllowanceValue?.allowanceType.name})? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAllowanceValue} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 