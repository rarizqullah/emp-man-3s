import { UserRole } from '@/hooks/useUserRole';

export interface MenuItem {
  title: string;
  url: string;
  icon: string; // Nama icon sebagai string, akan di-resolve di komponen
  roles: UserRole[]; // Role yang dapat mengakses menu ini
  description?: string;
}

export interface MenuSection {
  title: string;
  items: MenuItem[];
}

// Konfigurasi akses menu berdasarkan role
export const MENU_ACCESS_CONFIG = {
  // Menu yang dapat diakses oleh semua role
  ALL_ROLES: ['ADMIN', 'MANAGER', 'EMPLOYEE'] as UserRole[],
  
  // Menu khusus admin
  ADMIN_ONLY: ['ADMIN'] as UserRole[],
  
  // Menu untuk admin dan manager
  ADMIN_MANAGER: ['ADMIN', 'MANAGER'] as UserRole[],
  
  // Menu khusus employee
  EMPLOYEE_ONLY: ['EMPLOYEE'] as UserRole[],
  
  // Menu untuk admin dan employee (tidak termasuk manager)
  ADMIN_EMPLOYEE: ['ADMIN', 'EMPLOYEE'] as UserRole[],
} as const;

// Helper function untuk mengecek akses menu berdasarkan role
export const hasMenuAccess = (menuRoles: UserRole[], userRole: UserRole | null): boolean => {
  if (!userRole || !['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(userRole)) {
    console.warn('❌ Invalid user role for menu access:', userRole);
    return false;
  }
  return menuRoles.includes(userRole);
};

// Helper function untuk memfilter menu items berdasarkan role user
export const filterMenuByRole = <T extends { roles: UserRole[] }>(
  items: T[], 
  userRole: UserRole | null
): T[] => {
  if (!userRole) return [];
  return items.filter(item => hasMenuAccess(item.roles, userRole));
};

// Konfigurasi lengkap menu dengan role access
export const MENU_CONFIGURATION: MenuSection[] = [
  {
    title: 'Platform',
    items: [
      {
        title: 'Dashboard',
        url: '/dashboard',
        icon: 'LayoutDashboard', // Akan di-resolve di komponen
        roles: MENU_ACCESS_CONFIG.ALL_ROLES,
        description: 'Ringkasan dan statistik sistem'
      },
      {
        title: 'Karyawan',
        url: '/employee',
        icon: 'Users',
        roles: MENU_ACCESS_CONFIG.ADMIN_MANAGER,
        description: 'Manajemen data karyawan'
      },
      {
        title: 'Absensi',
        url: '/attendance',
        icon: 'Clock',
        roles: MENU_ACCESS_CONFIG.ALL_ROLES,
        description: 'Absensi dan presensi karyawan'
      },
      {
        title: 'Penggajian',
        url: '/salary',
        icon: 'CreditCard',
        roles: MENU_ACCESS_CONFIG.ADMIN_MANAGER,
        description: 'Manajemen penggajian karyawan'
      },
      {
        title: 'Izin & Cuti',
        url: '/permission',
        icon: 'FileCheck',
        roles: MENU_ACCESS_CONFIG.ALL_ROLES,
        description: 'Pengajuan dan persetujuan izin/cuti'
      },
    ]
  },
  {
    title: 'Configuration',
    items: [
      {
        title: 'Departemen',
        url: '/configuration/departments',
        icon: 'Building2',
        roles: MENU_ACCESS_CONFIG.ADMIN_ONLY,
        description: 'Manajemen departemen perusahaan'
      },
      {
        title: 'Sub Departemen',
        url: '/configuration/sub-departments',
        icon: 'MapPin',
        roles: MENU_ACCESS_CONFIG.ADMIN_ONLY,
        description: 'Manajemen sub departemen'
      },
      {
        title: 'Jabatan',
        url: '/configuration/positions',
        icon: 'UserCheck',
        roles: MENU_ACCESS_CONFIG.ADMIN_ONLY,
        description: 'Manajemen jabatan karyawan'
      },
      {
        title: 'Shift Kerja',
        url: '/configuration/shifts',
        icon: 'Calendar',
        roles: MENU_ACCESS_CONFIG.ADMIN_ONLY,
        description: 'Konfigurasi shift kerja'
      },
      {
        title: 'Tarif Gaji',
        url: '/configuration/salary-rates',
        icon: 'DollarSign',
        roles: MENU_ACCESS_CONFIG.ADMIN_ONLY,
        description: 'Pengaturan tarif gaji'
      },
      {
        title: 'Tunjangan',
        url: '/configuration/allowances',
        icon: 'Gift',
        roles: MENU_ACCESS_CONFIG.ADMIN_ONLY,
        description: 'Manajemen tunjangan karyawan'
      },
    ]
  }
];

// Helper untuk mendapatkan menu yang dapat diakses user
export const getAccessibleMenus = (userRole: UserRole | null): MenuSection[] => {
  if (!userRole) return [];
  
  return MENU_CONFIGURATION.map(section => ({
    ...section,
    items: filterMenuByRole(section.items, userRole)
  })).filter(section => section.items.length > 0); // Hapus section kosong
};

// Helper untuk mengecek apakah user dapat mengakses URL tertentu
export const canAccessUrl = (url: string, userRole: UserRole | null): boolean => {
  if (!userRole || !['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(userRole)) {
    console.warn('❌ Invalid user role for URL access:', userRole);
    return false;
  }
  
  // Cari menu item dengan URL yang cocok
  for (const section of MENU_CONFIGURATION) {
    const menuItem = section.items.find(item => 
      url === item.url || url.startsWith(item.url + '/')
    );
    
    if (menuItem) {
      return hasMenuAccess(menuItem.roles, userRole);
    }
  }
  
  // Default: izinkan akses untuk /dashboard dan halaman dasar
  const publicUrls = ['/dashboard', '/profile', '/'];
  if (publicUrls.some(publicUrl => url === publicUrl || url.startsWith(publicUrl + '/'))) {
    return true;
  }
  
  // Block access untuk URL yang tidak dikenali
  return false;
};
