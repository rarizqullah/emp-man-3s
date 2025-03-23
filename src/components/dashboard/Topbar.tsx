"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, LogOut, User, Menu } from "lucide-react";
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
import { Dispatch, SetStateAction } from "react";
import { useAuth } from "@/lib/auth-context";
import { signOut } from "@/lib/supabase";
import toast from "react-hot-toast";

interface TopbarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: Dispatch<SetStateAction<boolean>>;
}

export function Topbar({ isSidebarOpen, setIsSidebarOpen }: TopbarProps) {
  const router = useRouter();
  const { user } = useAuth();
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
      const { error } = await signOut();
      if (error) throw error;
      
      toast.success("Berhasil logout");
      router.push("/login");
    } catch (error) {
      console.error("Error saat logout:", error);
      toast.error("Gagal logout. Silakan coba lagi.");
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
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

  // Dapatkan nama user dari metadata Supabase
  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || "User";
  const userRole = user?.user_metadata?.role || "EMPLOYEE";

  return (
    <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="mr-2"
          aria-label={isSidebarOpen ? "Tutup sidebar" : "Buka sidebar"}
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <h1 className="text-xl font-semibold">Employee Management System</h1>
      </div>
      
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="relative"
        >
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </Button>
        
        <div className="text-sm text-right mr-4">
          <p className="font-medium">Waktu Sekarang</p>
          <p className="text-gray-500">
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
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
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
                <p className="text-xs text-muted-foreground">{user?.email || ""}</p>
                <p className="text-xs text-muted-foreground">{formatRole(userRole)}</p>
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