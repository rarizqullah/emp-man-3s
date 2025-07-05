"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  ChevronDown, 
  LayoutDashboard, 
  Users, 
  Clock, 
  CreditCard, 
  FileCheck, 
  Settings,
  Building2,
  MapPin,
  UserCheck,
  ShiftIcon,
  DollarSign,
  Gift,
  Tag
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Type untuk nav items
interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive?: boolean;
  items?: {
    title: string;
    url: string;
  }[];
}

export function AppSidebar() {
  const pathname = usePathname();

  // Helper function untuk mengecek apakah link aktif
  const isActive = (url: string) => {
    return pathname === url || pathname.startsWith(url + "/");
  };

  // Helper function untuk mengecek apakah grup aktif
  const isGroupActive = (urls: string[]) => {
    return urls.some(url => pathname.startsWith(url));
  };

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
  const configItems = [
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
      icon: ShiftIcon,
    },
    {
      title: "Tarif Gaji",
      url: "/configuration/salary-rates",
      icon: DollarSign,
    },
    {
      title: "Tipe Tunjangan",
      url: "/configuration/allowance-types",
      icon: Gift,
    },
    {
      title: "Nilai Tunjangan",
      url: "/configuration/allowance-values",
      icon: Tag,
    },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <div className="flex items-center gap-2">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Building2 className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Employee Management System</span>
                  <span className="truncate text-xs">PT. Sekawan Sahabat Sejati</span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation Group */}
        <SidebarGroup>
          <SidebarGroupLabel>Menu Utama</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link href={item.url}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Configuration Group */}
        <SidebarGroup>
          <SidebarGroupLabel>Konfigurasi</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <Collapsible defaultOpen={isGroupActive(["/configuration"])}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip="Konfigurasi"
                      isActive={isGroupActive(["/configuration"])}
                    >
                      <Settings className="size-4" />
                      <span>Pengaturan</span>
                      <ChevronDown className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {configItems.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton asChild isActive={isActive(item.url)}>
                            <Link href={item.url}>
                              <item.icon className="size-4" />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
                </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex flex-col items-center gap-1 p-2 text-xs text-muted-foreground">
              <div className="font-medium">EMS System v1.0.0</div>
              <div>© 2024 Hak Cipta Dilindungi</div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
} 