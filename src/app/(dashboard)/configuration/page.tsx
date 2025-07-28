'use client';

import { withRoleProtection } from '@/components/with-role-protection';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Users, Building2, Calendar, DollarSign, Gift } from 'lucide-react';
import Link from 'next/link';

// Halaman konfigurasi yang hanya bisa diakses oleh ADMIN
function ConfigurationPage() {
  const configItems = [
    {
      title: 'Departemen',
      description: 'Kelola departemen perusahaan',
      icon: Building2,
      href: '/configuration/departments',
    },
    {
      title: 'Jabatan',
      description: 'Kelola jabatan karyawan',
      icon: Users,
      href: '/configuration/positions',
    },
    {
      title: 'Shift Kerja',
      description: 'Konfigurasi jadwal shift',
      icon: Calendar,
      href: '/configuration/shifts',
    },
    {
      title: 'Tarif Gaji',
      description: 'Pengaturan tarif penggajian',
      icon: DollarSign,
      href: '/configuration/salary-rates',
    },
    {
      title: 'Tunjangan',
      description: 'Kelola tunjangan karyawan',
      icon: Gift,
      href: '/configuration/allowances',
    },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Settings className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Konfigurasi Sistem</h1>
          <p className="text-muted-foreground">
            Kelola pengaturan dan konfigurasi sistem HRM
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {configItems.map((item) => (
          <Card key={item.href} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {item.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Link href={item.href}>
                <Button variant="outline" className="w-full">
                  Kelola {item.title}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">Informasi</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-blue-800">
            Halaman ini hanya dapat diakses oleh <strong>Administrator</strong>. 
            Perubahan konfigurasi dapat mempengaruhi seluruh sistem.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Export halaman dengan proteksi role ADMIN - redirect jika tidak ada akses
export default withRoleProtection(ConfigurationPage, {
  requiredRoles: 'ADMIN',
  showAccessDenied: false, // Tidak menampilkan halaman akses ditolak, langsung redirect
});
