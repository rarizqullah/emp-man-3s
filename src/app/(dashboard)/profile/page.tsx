"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Mail, Building2, Phone, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  employee?: {
    id: string;
    employeeId: string;
    department: {
      name: string;
    };
    subDepartment?: {
      name: string;
    };
    position?: {
      name: string;
    };
    contractStartDate: string;
  };
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserProfile() {
      try {
        setLoading(true);
        const response = await fetch('/api/users/me');
        
        if (!response.ok) {
          throw new Error('Gagal memuat profil');
        }
        
        const data = await response.json();
        console.log('Data profile:', data);
        setProfile(data);
      } catch (error) {
        console.error('Error loading profile:', error);
        toast.error('Gagal memuat data profil');
      } finally {
        setLoading(false);
      }
    }
    
    fetchUserProfile();
  }, []);

  // Fungsi untuk mendapatkan inisial nama
  const getInitials = (name: string) => {
    if (!name) return "U";
    return name.charAt(0).toUpperCase();
  };

  // Fungsi untuk format tanggal
  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Profil Saya</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Info Pengguna</CardTitle>
              <CardDescription>Informasi akun Anda</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center py-6">
              {loading ? (
                <Skeleton className="w-24 h-24 rounded-full" />
              ) : (
                <Avatar className="w-24 h-24">
                  <AvatarFallback className="text-3xl">
                    {profile ? getInitials(profile.name) : "?"}
                  </AvatarFallback>
                </Avatar>
              )}
              
              <div className="mt-4 text-center">
                {loading ? (
                  <>
                    <Skeleton className="h-7 w-32 mx-auto mb-2" />
                    <Skeleton className="h-5 w-24 mx-auto" />
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-semibold">{profile?.name || "-"}</h2>
                    <p className="text-muted-foreground">{profile?.role || "User"}</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Detail Profil</CardTitle>
              <CardDescription>Informasi lengkap tentang profil Anda</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium">Informasi Pribadi</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Nama Lengkap</p>
                      {loading ? (
                        <Skeleton className="h-5 w-32 mt-1" />
                      ) : (
                        <p className="font-medium">{profile?.name || "-"}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      {loading ? (
                        <Skeleton className="h-5 w-40 mt-1" />
                      ) : (
                        <p className="font-medium">{profile?.email || "-"}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {profile?.employee && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-medium">Informasi Karyawan</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <Building2 className="w-5 h-5 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Departemen</p>
                        {loading ? (
                          <Skeleton className="h-5 w-36 mt-1" />
                        ) : (
                          <p className="font-medium">
                            {profile.employee.department?.name || "-"}
                            {profile.employee.subDepartment ? ` - ${profile.employee.subDepartment.name}` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Jabatan</p>
                        {loading ? (
                          <Skeleton className="h-5 w-28 mt-1" />
                        ) : (
                          <p className="font-medium">{profile.employee.position?.name || "-"}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Tanggal Bergabung</p>
                        {loading ? (
                          <Skeleton className="h-5 w-32 mt-1" />
                        ) : (
                          <p className="font-medium">{formatDate(profile.employee.contractStartDate)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {(!profile?.employee && !loading) && (
                <div className="py-4 border-t">
                  <p className="text-muted-foreground italic">Anda belum terdaftar sebagai karyawan.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 