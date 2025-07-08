"use client";

import React, { useState } from "react";
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
  Clock3,
  DollarSign,
  Gift
} from "lucide-react";

import {
  Sidebar,
  SidebarBody,
  SidebarLink,
} from "@/components/ui/sidebar";

// Type untuk nav items
interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function AppSidebar() {
  const [open, setOpen] = useState(false);

  // Menu items utama
  const mainNavItems: NavItem[] = [
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

  // Configuration menu items
  const configItems: NavItem[] = [
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
      icon: Clock3,
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

  // Convert to the format expected by SidebarLink
  const mainLinks = mainNavItems.map(item => ({
    label: item.title,
    href: item.url,
    icon: <item.icon className="h-5 w-5 flex-shrink-0" />
  }));

  const configLinks = configItems.map(item => ({
    label: item.title,
    href: item.url,
    icon: <item.icon className="h-5 w-5 flex-shrink-0" />
  }));

  return (
    <Sidebar open={open} setOpen={setOpen}>
      <SidebarBody className="justify-between gap-10">
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-6">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">EMS System</span>
              <span className="truncate text-xs">PT. Sekawan Sahabat Sejati</span>
            </div>
          </div>

          {/* Main Navigation */}
          <div className="mt-4 flex flex-col gap-2">
            <div className="text-xs font-semibold text-muted-foreground mb-2">Menu Utama</div>
            {mainLinks.map((link, idx) => (
              <SidebarLink key={idx} link={link} />
            ))}
          </div>

          {/* Configuration */}
          <div className="mt-6 flex flex-col gap-2">
            <div className="text-xs font-semibold text-muted-foreground mb-2">Konfigurasi</div>
            {configLinks.map((link, idx) => (
              <SidebarLink key={idx} link={link} />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col items-center gap-1 p-2 text-xs text-muted-foreground border-t">
          <div className="font-medium">EMS System v1.0.0</div>
          <div>© 2024 Hak Cipta Dilindungi</div>
        </div>
      </SidebarBody>
    </Sidebar>
  );
} 