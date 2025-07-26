"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { 
  CalendarDays,
  Clock, 
  Users, 
  RotateCcw,
  Plus,
  Pencil,
  Trash2
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { getCurrentShiftPhase } from "@/lib/utils/shift-rotation"

// Types
interface Shift {
  id: string
  name: string
  shiftType: 'NON_SHIFT' | 'SHIFT_A' | 'SHIFT_B'
  mainWorkStart: string | null
  mainWorkEnd: string | null
}

interface SubDepartment {
  id: string
  name: string
  department: {
    id: string
    name: string
  }
}

interface Employee {
  id: string
  employeeId: string
  user: {
    name: string
  }
}

interface ShiftRotationGroup {
  id: string
  name: string
  description?: string
  anchorDate: string
  isActive: boolean
  subDepartment?: SubDepartment
  shiftA: Shift
  shiftB: Shift
  employees: Employee[]
  _count: {
    employees: number
  }
}

// Schema validasi
const rotationGroupSchema = z.object({
  name: z.string().min(1, { message: "Nama grup rotasi wajib diisi" }),
  description: z.string().optional(),
  subDepartmentId: z.string().optional(),
  shiftAId: z.string().min(1, { message: "Shift A wajib dipilih" }),
  shiftBId: z.string().min(1, { message: "Shift B wajib dipilih" }),
  anchorDate: z.string().min(1, { message: "Tanggal mulai wajib diisi" }),
  employeeIds: z.array(z.string()).optional().default([])
}).refine((data) => data.shiftAId !== data.shiftBId, {
  message: "Shift A dan Shift B harus berbeda",
  path: ["shiftBId"]
})

type RotationGroupFormValues = z.infer<typeof rotationGroupSchema>

interface ShiftRotationDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function ShiftRotationDialog({ isOpen, onClose }: ShiftRotationDialogProps) {
  const [rotationGroups, setRotationGroups] = useState<ShiftRotationGroup[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentGroup, setCurrentGroup] = useState<ShiftRotationGroup | null>(null)

  // Form untuk tambah/edit grup rotasi
  const form = useForm<RotationGroupFormValues>({
    resolver: zodResolver(rotationGroupSchema),
    defaultValues: {
      name: '',
      description: '',
      subDepartmentId: '',
      shiftAId: '',
      shiftBId: '',
      anchorDate: format(new Date(), 'yyyy-MM-dd'),
      employeeIds: []
    }
  })

  // Load data awal
  useEffect(() => {
    if (isOpen) {
      fetchInitialData()
    }
  }, [isOpen])

  const fetchInitialData = async () => {
    setIsLoading(true)
    try {
      const [groupsRes, shiftsRes, subDeptsRes] = await Promise.all([
        fetch('/api/shift-rotation-groups'),
        fetch('/api/shifts'),
        fetch('/api/sub-departments')
      ])

      if (groupsRes.ok) {
        const groups = await groupsRes.json()
        setRotationGroups(groups)
      }

      if (shiftsRes.ok) {
        const shiftsData = await shiftsRes.json()
        // Filter hanya shift A dan B
        const validShifts = shiftsData.filter((shift: Shift) => 
          shift.shiftType === 'SHIFT_A' || shift.shiftType === 'SHIFT_B'
        )
        setShifts(validShifts)
      }

      if (subDeptsRes.ok) {
        const subDepts = await subDeptsRes.json()
        setSubDepartments(subDepts)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Gagal memuat data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddGroup = async (data: RotationGroupFormValues) => {
    try {
      // Validasi tanggal tidak di masa depan pada frontend
      const selectedDate = new Date(data.anchorDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0) // Reset jam untuk perbandingan tanggal saja
      
      if (selectedDate > today) {
        toast.error('Tanggal mulai tidak boleh di masa depan')
        return
      }

      const response = await fetch('/api/shift-rotation-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          // Jika subDepartmentId kosong atau NONE, set null
          subDepartmentId: data.subDepartmentId === '' || !data.subDepartmentId ? null : data.subDepartmentId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Gagal membuat grup rotasi')
      }

      await fetchInitialData()
      setIsAddDialogOpen(false)
      form.reset()
      toast.success('Grup rotasi berhasil dibuat')
    } catch (error: unknown) {
      console.error('Error:', error)
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Gagal membuat grup rotasi')
      }
    }
  }

  const handleEditGroup = (group: ShiftRotationGroup) => {
    setCurrentGroup(group)
    form.setValue('name', group.name)
    form.setValue('description', group.description || '')
    form.setValue('subDepartmentId', group.subDepartment?.id || '')
    form.setValue('shiftAId', group.shiftA.id)
    form.setValue('shiftBId', group.shiftB.id)
    form.setValue('anchorDate', format(new Date(group.anchorDate), 'yyyy-MM-dd'))
    form.setValue('employeeIds', group.employees.map(emp => emp.id))
    setIsEditDialogOpen(true)
  }

  const handleUpdateGroup = async (data: RotationGroupFormValues) => {
    if (!currentGroup) return

    try {
      // Validasi tanggal tidak di masa depan pada frontend
      const selectedDate = new Date(data.anchorDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (selectedDate > today) {
        toast.error('Tanggal mulai tidak boleh di masa depan')
        return
      }

      const response = await fetch(`/api/shift-rotation-groups/${currentGroup.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          subDepartmentId: data.subDepartmentId === '' || !data.subDepartmentId ? null : data.subDepartmentId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Gagal mengupdate grup rotasi')
      }

      await fetchInitialData()
      setIsEditDialogOpen(false)
      setCurrentGroup(null)
      form.reset()
      toast.success('Grup rotasi berhasil diupdate')
    } catch (error: unknown) {
      console.error('Error:', error)
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Gagal mengupdate grup rotasi')
      }
    }
  }

  const handleDeleteGroup = async () => {
    if (!currentGroup) return

    try {
      const response = await fetch(`/api/shift-rotation-groups/${currentGroup.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Gagal menghapus grup rotasi')
      }

      await fetchInitialData()
      setIsDeleteDialogOpen(false)
      setCurrentGroup(null)
      toast.success('Grup rotasi berhasil dihapus')
    } catch (error: unknown) {
      console.error('Error:', error)
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Gagal menghapus grup rotasi')
      }
    }
  }

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '-'
    try {
      const date = new Date(timeString)
      return date.toLocaleTimeString('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      })
    } catch {
      return '-'
    }
  }

  const getShiftPhaseInfo = (group: ShiftRotationGroup) => {
    const currentPhase = getCurrentShiftPhase(group.anchorDate, new Date().toISOString())
    const currentShift = currentPhase === 'A' ? group.shiftA : group.shiftB
    const nextShift = currentPhase === 'A' ? group.shiftB : group.shiftA
    
    return {
      currentPhase,
      currentShift,
      nextShift
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Manajemen Rotasi Shift
            </DialogTitle>
            <DialogDescription>
              Kelola grup rotasi shift mingguan antara Shift A dan Shift B
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Header dengan tombol tambah */}
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Total {rotationGroups.length} grup rotasi
              </div>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Tambah Grup Rotasi
              </Button>
            </div>

            {/* Daftar grup rotasi */}
            {isLoading ? (
              <div className="text-center py-8">
                <div className="text-muted-foreground">Memuat data...</div>
              </div>
            ) : rotationGroups.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <RotateCcw className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">Belum Ada Grup Rotasi</h3>
                  <p className="text-sm text-muted-foreground mb-4 text-center">
                    Buat grup rotasi pertama untuk memulai sistem pergantian shift mingguan
                  </p>
                  <Button onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah Grup Rotasi
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {rotationGroups.map((group) => {
                  const phaseInfo = getShiftPhaseInfo(group)
                  return (
                    <Card key={group.id} className={`${!group.isActive ? 'opacity-60' : ''}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-base">{group.name}</CardTitle>
                            {group.description && (
                              <p className="text-sm text-muted-foreground">{group.description}</p>
                            )}
                            {group.subDepartment && (
                              <Badge variant="outline" className="text-xs">
                                {group.subDepartment.name} - {group.subDepartment.department.name}
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleEditGroup(group)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                setCurrentGroup(group)
                                setIsDeleteDialogOpen(true)
                              }}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Status rotasi saat ini */}
                        <div className="bg-muted/30 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Shift Saat Ini:</span>
                            <Badge variant={phaseInfo.currentPhase === 'A' ? 'default' : 'secondary'}>
                              Fase {phaseInfo.currentPhase}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4" />
                            <span className="font-medium">{phaseInfo.currentShift.name}</span>
                            <span className="text-muted-foreground">
                              ({formatTime(phaseInfo.currentShift.mainWorkStart)} - {formatTime(phaseInfo.currentShift.mainWorkEnd)})
                            </span>
                          </div>
                        </div>

                        {/* Informasi pergantian */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="font-medium text-green-700 mb-1">Shift A</div>
                            <div>{group.shiftA.name}</div>
                            <div className="text-muted-foreground">
                              {formatTime(group.shiftA.mainWorkStart)} - {formatTime(group.shiftA.mainWorkEnd)}
                            </div>
                          </div>
                          <div>
                            <div className="font-medium text-blue-700 mb-1">Shift B</div>
                            <div>{group.shiftB.name}</div>
                            <div className="text-muted-foreground">
                              {formatTime(group.shiftB.mainWorkStart)} - {formatTime(group.shiftB.mainWorkEnd)}
                            </div>
                          </div>
                        </div>

                        {/* Info karyawan dan tanggal mulai */}
                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>{group._count.employees} karyawan</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <CalendarDays className="h-4 w-4" />
                            <span>Mulai: {format(new Date(group.anchorDate), 'dd MMM yyyy', { locale: id })}</span>
                          </div>
                        </div>

                        {/* Status aktif */}
                        <div className="flex items-center justify-between">
                          <Badge variant={group.isActive ? 'default' : 'secondary'}>
                            {group.isActive ? 'Aktif' : 'Nonaktif'}
                          </Badge>
                          {group.isActive && (
                            <div className="text-xs text-muted-foreground">
                              Minggu depan: {phaseInfo.nextShift.name}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Tambah Grup Rotasi */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Tambah Grup Rotasi Baru</DialogTitle>
            <DialogDescription>
              Buat grup rotasi baru untuk pergantian shift mingguan
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddGroup)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Grup Rotasi</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Rotasi Produksi Pagi-Malam" {...field} />
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
                      <Textarea placeholder="Deskripsi grup rotasi..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subDepartmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sub-Departemen (Opsional)</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value === "NONE" ? "" : value)} value={field.value || "NONE"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih sub-departemen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NONE">Semua Sub-Departemen</SelectItem>
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="shiftAId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shift A</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih Shift A" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {shifts.map((shift) => (
                            <SelectItem key={shift.id} value={shift.id}>
                              {shift.name} ({formatTime(shift.mainWorkStart)} - {formatTime(shift.mainWorkEnd)})
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
                  name="shiftBId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shift B</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih Shift B" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {shifts.map((shift) => (
                            <SelectItem key={shift.id} value={shift.id}>
                              {shift.name} ({formatTime(shift.mainWorkStart)} - {formatTime(shift.mainWorkEnd)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="anchorDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tanggal Mulai Rotasi</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} max={format(new Date(), 'yyyy-MM-dd')} />
                    </FormControl>
                    <FormDescription>
                      Tanggal dimulainya rotasi (sebaiknya hari Senin, tidak boleh di masa depan)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Batal
                </Button>
                <Button type="submit">Simpan</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog Edit Grup Rotasi */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Grup Rotasi</DialogTitle>
            <DialogDescription>
              Ubah pengaturan grup rotasi
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateGroup)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Grup Rotasi</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Rotasi Produksi Pagi-Malam" {...field} />
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
                      <Textarea placeholder="Deskripsi grup rotasi..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subDepartmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sub-Departemen (Opsional)</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value === "NONE" ? "" : value)} value={field.value || "NONE"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih sub-departemen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NONE">Semua Sub-Departemen</SelectItem>
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="shiftAId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shift A</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih Shift A" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {shifts.map((shift) => (
                            <SelectItem key={shift.id} value={shift.id}>
                              {shift.name} ({formatTime(shift.mainWorkStart)} - {formatTime(shift.mainWorkEnd)})
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
                  name="shiftBId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shift B</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih Shift B" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {shifts.map((shift) => (
                            <SelectItem key={shift.id} value={shift.id}>
                              {shift.name} ({formatTime(shift.mainWorkStart)} - {formatTime(shift.mainWorkEnd)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="anchorDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tanggal Mulai Rotasi</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} max={format(new Date(), 'yyyy-MM-dd')} />
                    </FormControl>
                    <FormDescription>
                      Tanggal dimulainya rotasi (sebaiknya hari Senin, tidak boleh di masa depan)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
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
            <AlertDialogTitle>Hapus Grup Rotasi</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus grup rotasi &quot;{currentGroup?.name}&quot;? 
              {currentGroup?._count.employees && currentGroup._count.employees > 0 && (
                <>
                  <br />
                  <strong>{currentGroup._count.employees} karyawan</strong> akan kehilangan assignment rotasi.
                </>
              )}
              <br />
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCurrentGroup(null)}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGroup} className="bg-destructive hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
