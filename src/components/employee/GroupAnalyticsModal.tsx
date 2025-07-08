"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  TrendingUp, 
  Users, 
  Building, 
  Clock, 
  AlertTriangle, 
  Award,
  PieChart
} from "lucide-react";

interface Employee {
  id: string;
  gender: string;
  contractType: string;
  warningStatus: string;
  contractEndDate?: string;
  department?: { name: string };
  position?: { name: string };
  shift?: { name: string };
}

interface GroupAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEmployees: string[];
  allEmployees: Employee[];
}

interface AnalyticsData {
  total: number;
  demographics: {
    gender: { [key: string]: number };
    contractType: { [key: string]: number };
    warningStatus: { [key: string]: number };
  };
  departments: { [key: string]: number };
  positions: { [key: string]: number };
  shifts: { [key: string]: number };
  contractExpiry: {
    expiringSoon: number; // within 30 days
    expiringMonth: number; // within 90 days
    longTerm: number; // more than 90 days
    permanent: number;
  };
  warnings: {
    none: number;
    sp1: number;
    sp2: number;
    sp3: number;
    total: number;
  };
}

export function GroupAnalyticsModal({
  isOpen,
  onClose,
  selectedEmployees,
  allEmployees,
}: GroupAnalyticsModalProps) {
  const selectedEmployeeData = useMemo(() => {
    return allEmployees.filter(emp => selectedEmployees.includes(emp.id));
  }, [allEmployees, selectedEmployees]);

  const analytics: AnalyticsData = useMemo(() => {
    const data: AnalyticsData = {
      total: selectedEmployeeData.length,
      demographics: {
        gender: {},
        contractType: {},
        warningStatus: {},
      },
      departments: {},
      positions: {},
      shifts: {},
      contractExpiry: {
        expiringSoon: 0,
        expiringMonth: 0,
        longTerm: 0,
        permanent: 0,
      },
      warnings: {
        none: 0,
        sp1: 0,
        sp2: 0,
        sp3: 0,
        total: 0,
      },
    };

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    selectedEmployeeData.forEach(employee => {
      // Demographics
      data.demographics.gender[employee.gender] = (data.demographics.gender[employee.gender] || 0) + 1;
      data.demographics.contractType[employee.contractType] = (data.demographics.contractType[employee.contractType] || 0) + 1;
      data.demographics.warningStatus[employee.warningStatus] = (data.demographics.warningStatus[employee.warningStatus] || 0) + 1;

      // Departments
      const deptName = employee.department?.name || 'Tidak Diketahui';
      data.departments[deptName] = (data.departments[deptName] || 0) + 1;

      // Positions
      const posName = employee.position?.name || 'Tidak Diketahui';
      data.positions[posName] = (data.positions[posName] || 0) + 1;

      // Shifts
      const shiftName = employee.shift?.name || 'Tidak Diketahui';
      data.shifts[shiftName] = (data.shifts[shiftName] || 0) + 1;

      // Contract Expiry Analysis
      if (employee.contractType === 'PERMANENT') {
        data.contractExpiry.permanent++;
      } else if (employee.contractEndDate) {
        const endDate = new Date(employee.contractEndDate);
        if (endDate <= thirtyDaysFromNow) {
          data.contractExpiry.expiringSoon++;
        } else if (endDate <= ninetyDaysFromNow) {
          data.contractExpiry.expiringMonth++;
        } else {
          data.contractExpiry.longTerm++;
        }
      }

      // Warning Status Analysis
      switch (employee.warningStatus) {
        case 'NONE':
          data.warnings.none++;
          break;
        case 'SP1':
          data.warnings.sp1++;
          break;
        case 'SP2':
          data.warnings.sp2++;
          break;
        case 'SP3':
          data.warnings.sp3++;
          break;
      }
    });

    data.warnings.total = data.warnings.sp1 + data.warnings.sp2 + data.warnings.sp3;

    return data;
  }, [selectedEmployeeData]);

  const getPercentage = (value: number, total: number) => {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  };

  const getTopItems = (obj: { [key: string]: number }, limit: number = 5) => {
    return Object.entries(obj)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit);
  };

  const getContractTypeColor = (type: string) => {
    switch (type) {
      case 'PERMANENT': return 'bg-blue-100 text-blue-800';
      case 'TRAINING': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Group Analytics
          </DialogTitle>
          <DialogDescription>
            Analisis mendalam dari {analytics.total} karyawan yang terpilih
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Total</span>
                </div>
                <div className="text-2xl font-bold">{analytics.total}</div>
                <div className="text-xs text-muted-foreground">Karyawan</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Departemen</span>
                </div>
                <div className="text-2xl font-bold">{Object.keys(analytics.departments).length}</div>
                <div className="text-xs text-muted-foreground">Berbeda</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium">Peringatan</span>
                </div>
                <div className="text-2xl font-bold">{analytics.warnings.total}</div>
                <div className="text-xs text-muted-foreground">Memiliki SP</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium">Kontrak</span>
                </div>
                <div className="text-2xl font-bold">{analytics.contractExpiry.expiringSoon}</div>
                <div className="text-xs text-muted-foreground">Segera Berakhir</div>
              </CardContent>
            </Card>
          </div>

          {/* Demographics Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Demografis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Gender Distribution */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Jenis Kelamin</span>
                </div>
                <div className="space-y-2">
                  {Object.entries(analytics.demographics.gender).map(([gender, count]) => (
                    <div key={gender} className="flex items-center justify-between">
                      <span className="text-sm">{gender === 'MALE' ? 'Laki-laki' : 'Perempuan'}</span>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={getPercentage(count, analytics.total)} 
                          className="w-24 h-2" 
                        />
                        <span className="text-sm font-medium">{count} ({getPercentage(count, analytics.total)}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Contract Type Distribution */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Tipe Kontrak</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(analytics.demographics.contractType).map(([type, count]) => (
                    <Badge key={type} className={getContractTypeColor(type)}>
                      {type}: {count} ({getPercentage(count, analytics.total)}%)
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warning Status Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Status Peringatan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{analytics.warnings.none}</div>
                  <div className="text-sm text-muted-foreground">Tidak Ada SP</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{analytics.warnings.sp1}</div>
                  <div className="text-sm text-muted-foreground">SP 1</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{analytics.warnings.sp2}</div>
                  <div className="text-sm text-muted-foreground">SP 2</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{analytics.warnings.sp3}</div>
                  <div className="text-sm text-muted-foreground">SP 3</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Department & Position Distribution */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Top Departemen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getTopItems(analytics.departments).map(([dept, count]) => (
                    <div key={dept} className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{dept}</span>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={getPercentage(count, analytics.total)} 
                          className="w-16 h-2" 
                        />
                        <span className="text-sm">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Top Posisi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getTopItems(analytics.positions).map(([position, count]) => (
                    <div key={position} className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{position}</span>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={getPercentage(count, analytics.total)} 
                          className="w-16 h-2" 
                        />
                        <span className="text-sm">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contract Expiry Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Analisis Berakhirnya Kontrak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{analytics.contractExpiry.expiringSoon}</div>
                  <div className="text-sm text-muted-foreground">≤ 30 Hari</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{analytics.contractExpiry.expiringMonth}</div>
                  <div className="text-sm text-muted-foreground">31-90 Hari</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{analytics.contractExpiry.longTerm}</div>
                  <div className="text-sm text-muted-foreground">&gt; 90 Hari</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{analytics.contractExpiry.permanent}</div>
                  <div className="text-sm text-muted-foreground">Permanen</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 