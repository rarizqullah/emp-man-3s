"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  ChevronDown, 
  ChevronRight, 
  LayoutDashboard, 
  Users, 
  Clock, 
  CreditCard, 
  FileCheck, 
  Settings,
  ChevronLeft,
  ChevronRightCircle
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dispatch, SetStateAction } from "react";

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  collapsed?: boolean;
}

const NavItem = ({ href, label, icon, active, collapsed }: NavItemProps) => {
  if (collapsed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={href}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg transition-all hover:bg-accent mx-auto",
                active ? "bg-accent text-accent-foreground" : "text-muted-foreground"
              )}
            >
              {icon}
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">
            {label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent",
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground"
      )}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
};

interface SubNavItemProps {
  href: string;
  label: string;
  active?: boolean;
  collapsed?: boolean;
}

const SubNavItem = ({ href, label, active, collapsed }: SubNavItemProps) => {
  if (collapsed) return null;
  
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent pl-10",
        active ? "text-accent-foreground" : "text-muted-foreground"
      )}
    >
      <span>{label}</span>
    </Link>
  );
};

// Tambahkan props interface untuk Sidebar
interface SidebarProps {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const pathname = usePathname();
  const [configOpen, setConfigOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const isActiveLink = (path: string) => {
    return pathname === path;
  };

  const isActiveGroup = (paths: string[]) => {
    return paths.some(path => pathname.startsWith(path));
  };

  const navItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      href: "/employee",
      label: "Karyawan",
      icon: <Users className="h-5 w-5" />,
    },
    {
      href: "/attendance",
      label: "Absensi",
      icon: <Clock className="h-5 w-5" />,
    },
    {
      href: "/salary",
      label: "Penggajian",
      icon: <CreditCard className="h-5 w-5" />,
    },
    {
      href: "/permission",
      label: "Izin & Cuti",
      icon: <FileCheck className="h-5 w-5" />,
    },
  ];

  const configMenus = [
    {
      href: "/configuration/departments",
      label: "Departemen",
    },
    {
      href: "/configuration/sub-departments",
      label: "Sub Departemen",
    },
    {
      href: "/configuration/positions",
      label: "Jabatan",
    },
    {
      href: "/configuration/shifts",
      label: "Shift Kerja",
    },
    {
      href: "/configuration/salary-rates",
      label: "Tarif Gaji",
    },
    {
      href: "/configuration/allowance-types",
      label: "Tipe Tunjangan",
    },
    {
      href: "/configuration/allowance-values",
      label: "Nilai Tunjangan",
    },
  ];

  // Toggle sidebar untuk mobile
  const toggleMobileSidebar = () => {
    setIsOpen(!isOpen);
  };

  // Toggle collapsed untuk desktop
  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
    // Juga update state isOpen untuk mengubah layout utama
    setIsOpen(!collapsed);
  };

  return (
    <>
      {/* Overlay untuk menu mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 z-30 md:hidden"
          onClick={toggleMobileSidebar} 
        />
      )}
      
      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-40 h-screen transition-transform duration-300",
        "md:relative md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        collapsed ? "w-16" : "w-64"
      )}>
        {/* Tombol toggle untuk mobile */}
        <button 
          className="absolute right-0 top-4 -mr-10 p-2 bg-primary text-white rounded-r-md md:hidden"
          onClick={toggleMobileSidebar}
        >
          {isOpen ? <ChevronLeft size={20} /> : <ChevronRightCircle size={20} />}
        </button>
        <div className={cn(
          "flex flex-col bg-white border-r h-full transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}>
          <div className={cn(
            "flex items-center border-b",
            collapsed ? "justify-center p-3" : "p-5 justify-between"
          )}>
            {!collapsed && <h2 className="font-bold text-lg">EMS System</h2>}
            <Button
              variant="ghost"
              size="icon" 
              onClick={toggleCollapsed}
              className="h-8 w-8"
            >
              {collapsed ? <ChevronRightCircle className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <nav className="space-y-2">
              {navItems.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={isActiveLink(item.href)}
                  collapsed={collapsed}
                />
              ))}

              {collapsed ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-lg cursor-pointer transition-all hover:bg-accent mx-auto",
                          (isActiveGroup(["/configuration"]) || configOpen)
                            ? "bg-accent text-accent-foreground"
                            : "text-muted-foreground"
                        )}
                        onClick={() => !collapsed && setConfigOpen(!configOpen)}
                      >
                        <Settings className="h-5 w-5" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      Konfigurasi
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <Collapsible
                  open={configOpen}
                  onOpenChange={setConfigOpen}
                  className="w-full"
                >
                  <CollapsibleTrigger
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent",
                      (isActiveGroup(["/configuration"]) || configOpen)
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Settings className="h-5 w-5" />
                      <span>Konfigurasi</span>
                    </div>
                    {configOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-1">
                    {configMenus.map((item) => (
                      <SubNavItem
                        key={item.href}
                        href={item.href}
                        label={item.label}
                        active={isActiveLink(item.href)}
                        collapsed={collapsed}
                      />
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </nav>
          </div>
          {!collapsed && (
            <div className="p-3 text-xs text-center text-muted-foreground border-t">
              <p>EMS System v1.0.0</p>
              <p className="mt-1">© 2024 Hak Cipta Dilindungi</p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
} 