"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  Clock, 
  CreditCard, 
  FileCheck, 
  Settings,
  Building2,
  MapPin,
  UserCheck,
  DollarSign,
  Gift,
  Calendar,
  UserCog
} from "lucide-react";
import { Sidebar, SidebarBody, SidebarLink, useSidebar } from "@/components/ui/sidebar";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function AppSidebar() {
  const pathname = usePathname();

  // Helper function untuk mengecek apakah link aktif
  const isActive = (url: string) => {
    return pathname === url || pathname.startsWith(url + "/");
  };

  // Menu items utama - semua langsung tanpa submenu
  const mainNavItems: MenuItem[] = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Karyawan",
      url: "/employee",
      icon: Users,
    },
    {
      title: "Absensi",
      url: "/attendance",
      icon: Clock,
    },
    {
      title: "Penggajian",
      url: "/salary",
      icon: CreditCard,
    },
    {
      title: "Izin & Cuti",
      url: "/permission",
      icon: FileCheck,
    },
  ];

  // Configuration menu items - semua langsung tanpa submenu
  const configItems: MenuItem[] = [
    {
      title: "Departemen",
      url: "/configuration/departments",
      icon: Building2,
    },
    {
      title: "Sub Departemen",
      url: "/configuration/sub-departments",
      icon: MapPin,
    },
    {
      title: "Jabatan",
      url: "/configuration/positions",
      icon: UserCheck,
    },
    {
      title: "Shift Kerja",
      url: "/configuration/shifts",
      icon: Calendar,
    },
    {
      title: "Tarif Gaji",
      url: "/configuration/salary-rates",
      icon: DollarSign,
    },
    {
      title: "Tunjangan",
      url: "/configuration/allowances",
      icon: Gift,
    },
  ];

  return (
    <Sidebar>
      <SidebarBody className="justify-between gap-0 aceternity-sidebar sidebar-content">
        <SidebarInner
          mainNavItems={mainNavItems}
          configItems={configItems}
          isActive={isActive}
        />
      </SidebarBody>
    </Sidebar>
  );
}

interface SidebarInnerProps {
  mainNavItems: MenuItem[];
  configItems: MenuItem[];
  isActive: (url: string) => boolean;
}

function SidebarInner({ mainNavItems, configItems, isActive }: SidebarInnerProps) {
  const { open, pinned } = useSidebar();
  const isExpanded = open || pinned;

  return (
    <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
      {/* Header - dengan reduced spacing */}
      <div className="flex items-center gap-3 mb-4 h-12">
        <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
          <Image src="/logo.ico" alt="Logo" width={32} height={32} className="object-contain" />
        </div>
        <motion.div
          animate={{
            display: isExpanded ? "block" : "none",
            opacity: isExpanded ? 1 : 0,
          }}
          className="flex flex-col min-w-0"
        >
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">EMS</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">PT. Sekawan Sahabat Sejati</p>
        </motion.div>
      </div>

      {/* Main Navigation Section */}
      <div className="space-y-1">
        <motion.div
          animate={{
            display: isExpanded ? "block" : "none",
            opacity: isExpanded ? 1 : 0,
          }}
          className="mb-4"
        >
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2">
            Platform
          </h3>
        </motion.div>

        {mainNavItems.map((item) => (
          <SidebarLink
            key={item.title}
            link={{
              label: item.title,
              href: item.url,
              icon: <item.icon className={cn("w-5 h-5", isActive(item.url) ? "text-primary" : "text-gray-600")} />
            }}
            className={cn(
              "mb-1",
              isActive(item.url) ? "bg-primary/10 text-primary" : "text-gray-700 hover:bg-gray-50"
            )}
          />
        ))}
      </div>

      {/* Configuration Section */}
      <div className="mt-6 space-y-1">
        <motion.div
          animate={{
            display: isExpanded ? "block" : "none",
            opacity: isExpanded ? 1 : 0,
          }}
          className="mb-4"
        >
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2">
            Configuration
          </h3>
        </motion.div>

        {configItems.map((item) => (
          <SidebarLink
            key={item.title}
            link={{
              label: item.title,
              href: item.url,
              icon: <item.icon className={cn("w-5 h-5", isActive(item.url) ? "text-primary" : "text-gray-600")} />
            }}
            className={cn(
              "mb-1",
              isActive(item.url) ? "bg-primary/10 text-primary" : "text-gray-700 hover:bg-gray-50"
            )}
          />
        ))}
      </div>
    </div>
  );
} 