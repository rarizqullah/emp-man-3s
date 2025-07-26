"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Bell, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSupabase } from "@/providers/supabase-provider";
import { useUserRole } from "@/hooks/useUserRole";
import toast from "react-hot-toast";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

export function AppTopbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user: supabaseUser, signOut } = useSupabase();
  const { user: userWithRole, role, isLoading } = useUserRole();
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    // Update waktu setiap menit
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);
  
  const handleLogout = async () => {
    try {
      // Logout dari Supabase
      await signOut();
      toast.success("Berhasil logout");
      // router.push akan ditangani oleh useSupabase.signOut()
    } catch (error) {
      console.error("Error saat logout:", error);
      toast.error("Gagal logout. Silakan coba lagi.");
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(word => word.charAt(0))
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const formatRole = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "Administrator";
      case "MANAGER":
        return "Manager";
      case "EMPLOYEE":
        return "Karyawan";
      default:
        return role;
    }
  };

  // Dapatkan nama user dari useUserRole atau fallback ke Supabase metadata
  const userName = userWithRole?.name || supabaseUser?.user_metadata?.name || supabaseUser?.email?.split('@')[0] || "User";
  const userRole = role || "EMPLOYEE";

  // Generate breadcrumbs
  const segments = pathname?.split("/").filter(Boolean) || [];
  const breadcrumbs = [] as React.ReactNode[];
  let accumulated = "";
  segments.forEach((seg, idx) => {
    accumulated += `/${seg}`;
    const label = seg.charAt(0).toUpperCase() + seg.slice(1).replace(/[-_]/g, " ");
    if (idx === segments.length - 1) {
      breadcrumbs.push(
        <BreadcrumbItem key={accumulated}>
          <BreadcrumbPage>{label}</BreadcrumbPage>
        </BreadcrumbItem>
      );
    } else {
      breadcrumbs.push(
        <BreadcrumbItem key={accumulated}>
          <BreadcrumbLink href={accumulated}>{label}</BreadcrumbLink>
        </BreadcrumbItem>
      );
      breadcrumbs.push(<BreadcrumbSeparator key={`${accumulated}-sep`} />);
    }
  });

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-gray-200 dark:border-gray-700 px-6 bg-white dark:bg-gray-800">
      <div className="flex-1">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            {segments.length > 0 && <BreadcrumbSeparator />}
            {breadcrumbs}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Notification button (always visible) */}
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </Button>
        {/* Current time display (always visible) */}
        <div className="text-sm text-right hidden sm:block">
          <p className="font-medium text-gray-900 dark:text-white">Waktu Sekarang</p>
          <p className="text-gray-500 dark:text-gray-400">
            {currentTime.toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
              <Avatar>
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {userName ? getInitials(userName) : "U"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{userName}</p>
                <p className="text-xs text-muted-foreground">{userWithRole?.email || supabaseUser?.email || ""}</p>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${
                    role === 'ADMIN' ? 'bg-red-500' : 
                    role === 'MANAGER' ? 'bg-blue-500' : 
                    'bg-green-500'
                  }`} />
                  <p className="text-xs text-muted-foreground font-medium">{formatRole(userRole)}</p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/profile")}>
              <User className="mr-2 h-4 w-4" />
              <span>Profil Saya</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Keluar</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
} 