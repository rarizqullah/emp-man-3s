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
  Building,
  Layers,
  ArrowUp,
  ArrowDown 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface Position {
  id: string
  name: string
  description: string | null
  level: number
  employeeCount?: number
  createdAt: string
  updatedAt: string
}

// Schema validasi untuk form jabatan
const positionFormSchema = z.object({
  name: z.string().min(1, { message: "Nama jabatan wajib diisi" }),
  description: z.string().optional(),
  level: z.coerce.number().int().positive({ message: "Level harus berupa angka positif" }).default(1),
})

type PositionFormValues = z.infer<typeof positionFormSchema>

export default function PositionsPage() {
  const [positions, setPositions] = useState<Position[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [currentPosition, setCurrentPosition] = useState<Position | null>(null)

  // Form untuk tambah/edit jabatan
  const form = useForm<PositionFormValues>({
    resolver: zodResolver(positionFormSchema),
    defaultValues: {
      name: "",
      description: "",
      level: 1,
    },
  })

  // Mengambil daftar jabatan
  const fetchPositions = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/positions')
      
      if (!response.ok) {
        throw new Error('Gagal mengambil data jabatan')
      }
      
      const data: Position[] = await response.json()
      setPositions(data)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Gagal memuat data jabatan')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPositions()
  }, [])

  // Filter jabatan berdasarkan pencarian
  const filteredPositions = positions.filter(position => 
    position.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (position.description && position.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Menangani submit form tambah jabatan
  const handleAddPositionSubmit = async (data: PositionFormValues) => {
    try {
      const response = await fetch('/api/positions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Gagal menambahkan jabatan')
      }
      
      await fetchPositions()
      setIsAddDialogOpen(false)
      form.reset()
      toast.success('Jabatan berhasil ditambahkan')
    } catch (error: any) {
      console.error('Error:', error)
      toast.error(error.message || 'Gagal menambahkan jabatan')
    }
  }

  // Mengisi form untuk edit jabatan
  const handleEditPosition = (position: Position) => {
    setCurrentPosition(position)
    form.setValue('name', position.name)
    form.setValue('description', position.description || '')
    form.setValue('level', position.level)
    setIsEditDialogOpen(true)
  }

  // Menangani submit form edit jabatan
  const handleEditPositionSubmit = async (data: PositionFormValues) => {
    if (!currentPosition) return
    
    try {
      const response = await fetch(`/api/positions/${currentPosition.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Gagal mengupdate jabatan')
      }
      
      await fetchPositions()
      setIsEditDialogOpen(false)
      form.reset()
      toast.success('Jabatan berhasil diperbarui')
    } catch (error: any) {
      console.error('Error:', error)
      toast.error(error.message || 'Gagal mengupdate jabatan')
    }
  }

  // Menangani hapus jabatan
  const handleDeletePosition = async (id: string) => {
    try {
      const response = await fetch(`/api/positions/${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || errorData.error || 'Gagal menghapus jabatan')
      }
      
      await fetchPositions()
      toast.success('Jabatan berhasil dihapus')
    } catch (error: any) {
      console.error('Error:', error)
      toast.error(error.message || 'Gagal menghapus jabatan')
    }
  }

  // Render loading
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Memuat data jabatan...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Konfigurasi Jabatan</h1>
          <p className="text-muted-foreground mt-1">
            Kelola daftar jabatan yang tersedia dalam sistem
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Jabatan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Jabatan Baru</DialogTitle>
              <DialogDescription>
                Tambahkan jabatan baru ke dalam sistem.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleAddPositionSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Jabatan</FormLabel>
                      <FormControl>
                        <Input placeholder="Masukkan nama jabatan" {...field} />
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
                      <FormLabel>Deskripsi</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Deskripsi jabatan (opsional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Level Jabatan</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormDescription>
                        Angka yang lebih kecil menunjukkan level jabatan yang lebih tinggi (misal: 1 = Direktur)
                      </FormDescription>
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
      
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="relative flex w-full max-w-sm items-center">
            <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari jabatan..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Button variant="outline" onClick={fetchPositions}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Daftar Jabatan</CardTitle>
            <CardDescription>
              Menampilkan {filteredPositions.length} dari {positions.length} jabatan yang tersedia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-[600px]">
              <table className="w-full">
                <thead className="text-left text-sm border-b">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nama Jabatan</th>
                    <th className="px-4 py-3 font-medium">Level</th>
                    <th className="px-4 py-3 font-medium">Deskripsi</th>
                    <th className="px-4 py-3 font-medium">Jumlah Karyawan</th>
                    <th className="px-4 py-3 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPositions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-muted-foreground">
                        Tidak ada data jabatan yang ditemukan
                      </td>
                    </tr>
                  ) : (
                    filteredPositions.map((position) => (
                      <tr key={position.id} className="border-b hover:bg-muted/50">
                        <td className="px-4 py-3 flex items-center gap-2">
                          <Building className="h-4 w-4 text-primary" />
                          {position.name}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="font-normal">
                              <Layers className="mr-1 h-3 w-3" />
                              Level {position.level}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-xs text-sm text-muted-foreground">
                          {position.description || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary">{position.employeeCount || 0}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleEditPosition(position)}
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                  <span className="sr-only">Hapus</span>
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Hapus Jabatan</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Apakah Anda yakin ingin menghapus jabatan "{position.name}"?
                                    {position.employeeCount && position.employeeCount > 0 && (
                                      <div className="mt-2 text-destructive">
                                        Jabatan ini sedang digunakan oleh {position.employeeCount} karyawan.
                                        Anda harus mengubah jabatan karyawan terlebih dahulu.
                                      </div>
                                    )}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeletePosition(position.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Hapus
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Dialog untuk edit jabatan */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Jabatan</DialogTitle>
            <DialogDescription>
              Ubah detail jabatan yang sudah ada.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEditPositionSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Jabatan</FormLabel>
                    <FormControl>
                      <Input placeholder="Masukkan nama jabatan" {...field} />
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
                    <FormLabel>Deskripsi</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Deskripsi jabatan (opsional)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Level Jabatan</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} />
                    </FormControl>
                    <FormDescription>
                      Angka yang lebih kecil menunjukkan level jabatan yang lebih tinggi (misal: 1 = Direktur)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsEditDialogOpen(false)}>
                  Batal
                </Button>
                <Button type="submit">Simpan Perubahan</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
} 