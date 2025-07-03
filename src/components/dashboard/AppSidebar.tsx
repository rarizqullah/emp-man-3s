"use client";

import React from "react";
import Link from "next/link";
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
  Tag,
  Calendar,
  Archive,
  UserCog,
  ChevronDown
} from "lucide-react";
import { Sidebar, SidebarBody, SidebarLink, useSidebar } from "@/components/ui/sidebar";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  items?: {
    title: string;
    url: string;
    icon?: React.ComponentType<{ className?: string }>;
  }[];
}

interface ExpandableMenuProps {
  item: MenuItem;
  isActive: boolean;
  isGroupActive: boolean;
}

const ExpandableMenu = ({ item, isActive, isGroupActive }: ExpandableMenuProps) => {
  const { open, pinned } = useSidebar();
  const pathname = usePathname();
  const [expanded, setExpanded] = React.useState(isGroupActive);
  const isExpanded = open || pinned;

  React.useEffect(() => {
    setExpanded(isGroupActive);
  }, [isGroupActive]);

  if (!item.items) {
    return (
      <SidebarLink
        link={{
          label: item.title,
          href: item.url,
          icon: <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-gray-600")} />
        }}
        className={cn(
          "mb-1",
          isActive ? "bg-primary/10 text-primary" : "text-gray-700 hover:bg-gray-50"
        )}
      />
    );
  }

  return (
    <div className="mb-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "w-full flex items-center justify-start gap-3 py-2 px-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors",
          isGroupActive ? "bg-primary/10 text-primary" : "text-gray-700 hover:bg-gray-50"
        )}
      >
        <div className="flex-shrink-0">
          <item.icon className={cn("w-5 h-5", isGroupActive ? "text-primary" : "text-gray-600")} />
        </div>
        
        <motion.span
          animate={{
            display: isExpanded ? "inline-block" : "none",
            opacity: isExpanded ? 1 : 0,
          }}
          className="text-sm font-medium flex-1 text-left"
        >
          {item.title}
        </motion.span>
        
        <motion.div
          animate={{
            display: isExpanded ? "block" : "none",
            opacity: isExpanded ? 1 : 0,
            rotate: expanded ? 180 : 0,
          }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4" />
        </motion.div>
      </button>

      <AnimatePresence>
        {expanded && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="ml-8 mt-1 space-y-1">
              {item.items.map((subItem) => {
                const subActive = pathname === subItem.url || pathname.startsWith(subItem.url + "/");
                return (
                  <Link
                    key={subItem.title}
                    href={subItem.url}
                    className={cn(
                      "flex items-center gap-2 py-2 px-3 rounded-md text-sm transition-colors",
                      subActive 
                        ? "bg-primary/10 text-primary font-medium" 
                        : "text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    {subItem.icon && <subItem.icon className="w-4 h-4" />}
                    <span>{subItem.title}</span>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

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
      items: [
        {
          title: "Manajemen Karyawan",
          url: "/employee",
          icon: UserCog,
        },
        {
          title: "Arsip Karyawan",
          url: "/employee/archive",
          icon: Archive,
        }
      ]
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
      icon: Calendar,
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

  const configurationItem: MenuItem = {
    title: "Pengaturan",
    url: "/configuration",
    icon: Settings,
    items: configItems,
  };

      return (
    <Sidebar>
      <SidebarBody className="justify-between gap-10 aceternity-sidebar sidebar-content">
        <SidebarInner
          mainNavItems={mainNavItems}
          configurationItem={configurationItem}
          isActive={isActive}
          isGroupActive={isGroupActive}
        />
      </SidebarBody>
    </Sidebar>
  );
}

interface SidebarInnerProps {
  mainNavItems: MenuItem[];
  configurationItem: MenuItem;
  isActive: (url: string) => boolean;
  isGroupActive: (urls: string[]) => boolean;
}

function SidebarInner({ mainNavItems, configurationItem, isActive, isGroupActive }: SidebarInnerProps) {
  const { open, pinned } = useSidebar();
  const isExpanded = open || pinned;

  return (
    <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 h-14">
        <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
          <img src="/logo.ico" alt="Logo" className="w-8 h-8 object-contain" />
        </div>
        <motion.div
          animate={{
            display: isExpanded ? "block" : "none",
            opacity: isExpanded ? 1 : 0,
          }}
          className="flex flex-col min-w-0"
        >
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">EMS System</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Employee Management</p>
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
          <ExpandableMenu
                        key={item.title}
            item={item}
            isActive={isActive(item.url)}
            isGroupActive={isGroupActive([item.url])}
          />
        ))}
      </div>

      {/* Configuration Section */}
      <div className="space-y-1 mt-8">
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

        <ExpandableMenu
          item={configurationItem}
          isActive={false}
          isGroupActive={isGroupActive(['/configuration'])}
        />
      </div>
    </div>
  );
} 