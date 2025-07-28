"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Sidebar, SidebarBody, SidebarLink, useSidebar } from "@/components/ui/sidebar";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";
import { getAccessibleMenus } from "@/lib/menu-config";
import { getIcon } from "@/lib/icon-map";

interface ProcessedMenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function AppSidebar() {
  const pathname = usePathname();
  const { role, isLoading } = useUserRole();

  // Helper function untuk mengecek apakah link aktif
  const isActive = (url: string) => {
    if (!pathname) return false;
    return pathname === url || pathname.startsWith(url + "/");
  };

  // Dapatkan menu yang dapat diakses berdasarkan role user
  const accessibleMenus = useMemo(() => {
    if (isLoading || !role) {
      return [];
    }

    return getAccessibleMenus(role);
  }, [role, isLoading]);

  // Process menu items untuk mengkonversi icon string ke komponen
  const processedMenus = useMemo(() => {
    return accessibleMenus.map(section => ({
      ...section,
      items: section.items.map(item => ({
        title: item.title,
        url: item.url,
        icon: getIcon(item.icon),
      }))
    }));
  }, [accessibleMenus]);

  // Loading state
  if (isLoading) {
    return (
      <Sidebar>
        <SidebarBody className="justify-between gap-0 aceternity-sidebar sidebar-content">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4 h-12">
              <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                <Image src="/logo.ico" alt="Logo" width={32} height={32} className="object-contain" />
              </div>
              <div className="flex flex-col min-w-0">
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">EMS</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">PT. Sekawan Sahabat Sejati</p>
              </div>
            </div>
            
            {/* Loading skeleton */}
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              ))}
            </div>
          </div>
        </SidebarBody>
      </Sidebar>
    );
  }

  // No role atau tidak ada menu yang dapat diakses
  if (!role || processedMenus.length === 0) {
    return (
      <Sidebar>
        <SidebarBody className="justify-between gap-0 aceternity-sidebar sidebar-content">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            <div className="flex items-center gap-3 mb-4 h-12">
              <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                <Image src="/logo.ico" alt="Logo" width={32} height={32} className="object-contain" />
              </div>
              <div className="flex flex-col min-w-0">
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">EMS</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">PT. Sekawan Sahabat Sejati</p>
              </div>
            </div>
            
            <div className="text-center text-gray-500 mt-8">
              <p>Tidak ada menu yang dapat diakses</p>
            </div>
          </div>
        </SidebarBody>
      </Sidebar>
    );
  }

  return (
    <Sidebar>
      <SidebarBody className="justify-between gap-0 aceternity-sidebar sidebar-content">
        <SidebarInner
          menuSections={processedMenus}
          isActive={isActive}
        />
      </SidebarBody>
    </Sidebar>
  );
}

interface SidebarInnerProps {
  menuSections: Array<{
    title: string;
    items: ProcessedMenuItem[];
  }>;
  isActive: (url: string) => boolean;
}

function SidebarInner({ menuSections, isActive }: SidebarInnerProps) {
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

      {/* Render menu sections dynamically with role-based filtering */}
      {menuSections.map((section, sectionIndex) => (
        <div key={section.title} className={`space-y-1 ${sectionIndex > 0 ? 'mt-6' : ''}`}>
          {/* Only show section header if there are items to display */}
          {section.items.length > 0 && (
            <motion.div
              animate={{
                display: isExpanded ? "block" : "none",
                opacity: isExpanded ? 1 : 0,
              }}
              className="mb-4"
            >
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2">
                {section.title}
              </h3>
            </motion.div>
          )}

          {section.items.map((item) => (
            <SidebarLink
              key={item.title}
              link={{
                label: item.title,
                href: item.url,
                icon: <item.icon className={cn("w-5 h-5", isActive(item.url) ? "text-primary" : "text-gray-600")} />
              }}
              className={cn(
                "mb-1",
                isActive(item.url) ? "bg-primary/10 text-primary" : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
} 