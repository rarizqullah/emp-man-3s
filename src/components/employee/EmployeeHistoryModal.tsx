"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Calendar, User, AlertTriangle, Trash2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Employee {
  id: string;
  employeeId: string;
  contractEndDate?: string;
  user: {
    name: string;
    email: string;
  };
  department: {
    name: string;
  };
  subDepartment?: {
    name: string;
  };
  position?: {
    name: string;
  };
  contractType: string;
  contractNumber?: string;
  faceData?: string;
}

interface DeletedEmployee {
  id: string;
  employeeId: string;
  deletedAt: string;
  deletedBy: string;
  reason?: string;
  userData: {
    name: string;
    email: string;
  };
  departmentData: {
    name: string;
  };
  positionData?: {
    name: string;
  };
  contractType: string;
  contractStartDate: string;
  contractEndDate?: string;
}

interface EmployeeHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expiringContracts: Employee[];
}

export function EmployeeHistoryModal({
  open,
  onOpenChange,
  expiringContracts,
}: EmployeeHistoryModalProps) {
  const [deletedEmployees, setDeletedEmployees] = useState<DeletedEmployee[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch deleted employees history
  const fetchDeletedEmployees = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/employees/deleted-history');
      if (!response.ok) {
        throw new Error('Gagal mengambil riwayat karyawan yang dihapus');
      }
      const data = await response.json();
      setDeletedEmployees(data);
    } catch (error) {
      console.error('Error fetching deleted employees:', error);
      // For now, use mock data if API doesn't exist
      setDeletedEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchDeletedEmployees();
    }
  }, [open]);

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "d MMMM yyyy", { locale: id });
    } catch {
      return dateString;
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase();
  };

  const getDaysUntilExpiry = (contractEndDate: string) => {
    const today = new Date();
    const endDate = new Date(contractEndDate);
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Riwayat Karyawan</DialogTitle>
          <DialogDescription>
            Lihat riwayat karyawan yang dihapus dan kontrak yang akan berakhir
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="expiring" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="expiring" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Kontrak Berakhir ({expiringContracts.length})
            </TabsTrigger>
            <TabsTrigger value="deleted" className="flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Karyawan Dihapus ({deletedEmployees.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="expiring" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Kontrak Akan Berakhir
                </CardTitle>
                <CardDescription>
                  Daftar karyawan dengan kontrak yang akan berakhir dalam 30 hari
                </CardDescription>
              </CardHeader>
              <CardContent>
                {expiringContracts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Tidak ada kontrak yang akan berakhir dalam 30 hari
                  </div>
                ) : (
                  <div className="space-y-4">
                    {expiringContracts.map((employee) => {
                      const daysLeft = getDaysUntilExpiry(employee.contractEndDate!);
                      return (
                        <div
                          key={employee.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12">
                              {employee.faceData ? (
                                <AvatarImage src={employee.faceData} alt={employee.user.name} />
                              ) : (
                                <AvatarFallback>
                                  {getInitials(employee.user.name)}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div>
                              <div className="font-medium">{employee.user.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {employee.employeeId} • {employee.user.email}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {employee.department.name}
                                {employee.subDepartment && ` - ${employee.subDepartment.name}`}
                                {employee.position && ` • ${employee.position.name}`}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge
                              variant={daysLeft <= 7 ? "destructive" : daysLeft <= 14 ? "secondary" : "outline"}
                            >
                              {daysLeft <= 0 ? "Sudah Berakhir" : `${daysLeft} hari lagi`}
                            </Badge>
                            <div className="text-sm text-muted-foreground mt-1">
                              Berakhir: {formatDate(employee.contractEndDate!)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {employee.contractType === 'PERMANENT' ? 'Permanen' : 'Training'}
                              {employee.contractNumber && ` • ${employee.contractNumber}`}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deleted" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Riwayat Karyawan Dihapus
                </CardTitle>
                <CardDescription>
                  Daftar karyawan yang telah dihapus dari sistem
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Memuat data...
                  </div>
                ) : deletedEmployees.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Belum ada karyawan yang dihapus
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>NIK</TableHead>
                        <TableHead>Nama</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Departemen</TableHead>
                        <TableHead>Posisi</TableHead>
                        <TableHead>Kontrak</TableHead>
                        <TableHead>Dihapus Tanggal</TableHead>
                        <TableHead>Dihapus Oleh</TableHead>
                        <TableHead>Alasan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deletedEmployees.map((employee) => (
                        <TableRow key={employee.id}>
                          <TableCell className="font-medium">
                            {employee.employeeId}
                          </TableCell>
                          <TableCell>{employee.userData.name}</TableCell>
                          <TableCell>{employee.userData.email}</TableCell>
                          <TableCell>{employee.departmentData.name}</TableCell>
                          <TableCell>{employee.positionData?.name || '-'}</TableCell>
                          <TableCell>
                            <div>
                              <Badge variant={employee.contractType === 'PERMANENT' ? 'default' : 'secondary'}>
                                {employee.contractType === 'PERMANENT' ? 'Permanen' : 'Training'}
                              </Badge>
                              <div className="text-xs text-muted-foreground mt-1">
                                {formatDate(employee.contractStartDate)} - {' '}
                                {employee.contractEndDate ? formatDate(employee.contractEndDate) : 'Permanen'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(employee.deletedAt)}</TableCell>
                          <TableCell>{employee.deletedBy}</TableCell>
                          <TableCell>
                            <div className="max-w-xs truncate" title={employee.reason}>
                              {employee.reason || '-'}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
} 