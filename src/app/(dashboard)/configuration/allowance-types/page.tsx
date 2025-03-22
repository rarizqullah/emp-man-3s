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
  Banknote,
  Tag
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
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"

interface AllowanceType {
  id: string
  name: string
  description: string | null
  _count: {
    allowanceValues: number
  }
  createdAt: string
  updatedAt: string
}

// Schema validasi untuk form tipe tunjangan
const allowanceTypeFormSchema = z.object({
  name: z.string().min(1, { message: "Nama tipe tunjangan wajib diisi" }),
  description: z.string().optional(),
})

type AllowanceTypeFormValues = z.infer<typeof allowanceTypeFormSchema>

export default function AllowanceTypesPage() {
  const [allowanceTypes, setAllowanceTypes] = useState<AllowanceType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [currentAllowanceType, setCurrentAllowanceType] = useState<AllowanceType | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  // Form untuk tambah/edit tipe tunjangan
  const form = useForm<AllowanceTypeFormValues>({
    resolver: zodResolver(allowanceTypeFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  })

  // Mengambil daftar tipe tunjangan
  const fetchAllowanceTypes = async () => {
    try {
      setIsLoading(true)
      
      const response = await fetch('/api/allowance-types')
      
      if (!response.ok) {
        throw new Error('Gagal mengambil data tipe tunjangan')
      }
      
      const data: AllowanceType[] = await response.json()
      setAllowanceTypes(data)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Gagal memuat data tipe tunjangan')
    } finally {
      setIsLoading(false)
    }
  }

  // Inisialisasi data
  useEffect(() => {
    fetchAllowanceTypes()
  }, [])

  // Filter tipe tunjangan berdasarkan pencarian
  const filteredAllowanceTypes = allowanceTypes.filter(type => 
    type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (type.description && type.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Menangani submit form tambah tipe tunjangan
  const handleAddAllowanceTypeSubmit = async (data: AllowanceTypeFormValues) => {
    try {
      const response = await fetch('/api/allowance-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || errorData.error || 'Gagal menambahkan tipe tunjangan')
      }
      
      await fetchAllowanceTypes()
      setIsAddDialogOpen(false)
      form.reset()
      toast.success('Tipe tunjangan berhasil ditambahkan')
    } catch (error: unknown) {
      console.error('Error:', error)
      if (error instanceof Error) {
        toast.error(error.message || 'Gagal menambahkan tipe tunjangan')
      } else {
        toast.error('Gagal menambahkan tipe tunjangan')
      }
    }
  }

  // Mengisi form untuk edit tipe tunjangan
  const handleEditAllowanceType = (allowanceType: AllowanceType) => {
    setCurrentAllowanceType(allowanceType)
    form.setValue('name', allowanceType.name)
    form.setValue('description', allowanceType.description || '')
    setIsEditDialogOpen(true)
  }

  // Menangani submit form edit tipe tunjangan
  const handleEditAllowanceTypeSubmit = async (data: AllowanceTypeFormValues) => {
    if (!currentAllowanceType) return
    
    try {
      const response = await fetch(`/api/allowance-types/${currentAllowanceType.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || errorData.error || 'Gagal mengupdate tipe tunjangan')
      }
      
      await fetchAllowanceTypes()
      setIsEditDialogOpen(false)
      form.reset()
      toast.success('Tipe tunjangan berhasil diperbarui')
    } catch (error: unknown) {
      console.error('Error:', error)
      if (error instanceof Error) {
        toast.error(error.message || 'Gagal mengupdate tipe tunjangan')
      } else {
        toast.error('Gagal mengupdate tipe tunjangan')
      }
    }
  }

  // Membuka dialog konfirmasi hapus
  const openDeleteDialog = (allowanceType: AllowanceType) => {
    setCurrentAllowanceType(allowanceType)
    setIsDeleteDialogOpen(true)
  }

  // Menangani hapus tipe tunjangan
  const handleDeleteAllowanceType = async () => {
    if (!currentAllowanceType) return
    
    try {
      const response = await fetch(`/api/allowance-types/${currentAllowanceType.id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || errorData.error || 'Gagal menghapus tipe tunjangan')
      }
      
      await fetchAllowanceTypes()
      setIsDeleteDialogOpen(false)
      toast.success('Tipe tunjangan berhasil dihapus')
    } catch (error: unknown) {
      console.error('Error:', error)
      if (error instanceof Error) {
        toast.error(error.message || 'Gagal menghapus tipe tunjangan')
      } else {
        toast.error('Gagal menghapus tipe tunjangan')
      }
    }
  }

  // Render loading
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Memuat data tipe tunjangan...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Konfigurasi Tipe Tunjangan</h1>
          <p className="text-muted-foreground mt-1">
            Kelola daftar tipe tunjangan yang tersedia dalam sistem
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Tipe Tunjangan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Tipe Tunjangan Baru</DialogTitle>
              <DialogDescription>
                Tambahkan tipe tunjangan baru ke dalam sistem.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleAddAllowanceTypeSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Tipe Tunjangan</FormLabel>
                      <FormControl>
                        <Input placeholder="Masukkan nama tipe tunjangan" {...field} />
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
                          placeholder="Masukkan deskripsi tipe tunjangan" 
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
            placeholder="Cari tipe tunjangan..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Button variant="outline" size="icon" onClick={fetchAllowanceTypes}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      
      {filteredAllowanceTypes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Tag className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Tidak ada tipe tunjangan</p>
            <p className="text-sm text-muted-foreground">
              {allowanceTypes.length > 0 
                ? 'Tidak ada tipe tunjangan yang sesuai dengan pencarian Anda' 
                : 'Belum ada tipe tunjangan yang ditambahkan. Klik "Tambah Tipe Tunjangan" untuk mulai.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredAllowanceTypes.map((type) => (
            <Card key={type.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle>{type.name}</CardTitle>
                  <div className="flex gap-2">
                    <Button size="icon" variant="outline" onClick={() => handleEditAllowanceType(type)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="outline" 
                      className="text-destructive"
                      onClick={() => openDeleteDialog(type)}
                      disabled={type._count.allowanceValues > 0}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3">
                  {type.description && (
                    <p className="text-sm text-muted-foreground">
                      {type.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {type._count.allowanceValues} Nilai Tunjangan
                    </span>
                  </div>
                  
                  {type._count.allowanceValues > 0 && (
                    <Badge variant="outline" className="w-fit mt-1 text-xs">
                      Tidak dapat dihapus
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Dialog edit tipe tunjangan */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tipe Tunjangan</DialogTitle>
            <DialogDescription>
              Ubah informasi tipe tunjangan yang sudah ada
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEditAllowanceTypeSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Tipe Tunjangan</FormLabel>
                    <FormControl>
                      <Input placeholder="Masukkan nama tipe tunjangan" {...field} />
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
                        placeholder="Masukkan deskripsi tipe tunjangan" 
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
            <AlertDialogTitle>Konfirmasi Hapus Tipe Tunjangan</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus tipe tunjangan &quot;{currentAllowanceType?.name}&quot;? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAllowanceType} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 