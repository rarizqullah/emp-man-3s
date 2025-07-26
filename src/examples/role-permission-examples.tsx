// Contoh penggunaan sistem Role dan Permission Management

import React from 'react';
import { withRoleProtection, RoleProtection } from '@/components/auth/RoleProtection';
import { UserRole } from '@/hooks/useUserRole';

// ===== CONTOH 1: Penggunaan HOC (Higher-Order Component) =====

// Page yang hanya bisa diakses Admin
const AdminOnlyPage = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Halaman Admin</h1>
      <p>Halaman ini hanya bisa diakses oleh Admin.</p>
    </div>
  );
};

// Wrap dengan HOC untuk proteksi
export const ProtectedAdminPage = withRoleProtection(AdminOnlyPage, {
  allowedRoles: 'ADMIN',
  fallbackUrl: '/dashboard'
});


// ===== CONTOH 2: Penggunaan Komponen Wrapper =====

// Page konfigurasi yang bisa diakses Admin dan Manager
export const ConfigurationPage = () => {
  return (
    <RoleProtection 
      allowedRoles={['ADMIN', 'MANAGER']}
      fallbackUrl="/dashboard"
    >
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Konfigurasi Sistem</h1>
        <p>Halaman ini bisa diakses oleh Admin dan Manager.</p>
      </div>
    </RoleProtection>
  );
};


// ===== CONTOH 3: Proteksi Conditional dalam Component =====

import { useUserRole } from '@/hooks/useUserRole';

export const ConditionalContentPage = () => {
  const { role, isAdmin, isManager, canManageEmployees } = useUserRole();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      
      {/* Semua user bisa lihat */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Selamat datang!</h2>
        <p>Ini adalah halaman dashboard.</p>
      </div>

      {/* Hanya Admin dan Manager */}
      {canManageEmployees() && (
        <div className="mb-4 p-4 bg-blue-50 rounded">
          <h3 className="font-semibold">Manajemen Karyawan</h3>
          <p>Anda memiliki akses untuk mengelola data karyawan.</p>
        </div>
      )}

      {/* Hanya Admin */}
      {isAdmin() && (
        <div className="mb-4 p-4 bg-red-50 rounded">
          <h3 className="font-semibold">Area Admin</h3>
          <p>Hanya admin yang bisa melihat bagian ini.</p>
        </div>
      )}

      {/* Hanya Manager */}
      {isManager() && (
        <div className="mb-4 p-4 bg-green-50 rounded">
          <h3 className="font-semibold">Area Manager</h3>
          <p>Hanya manager yang bisa melihat bagian ini.</p>
        </div>
      )}

      {/* Hanya Employee */}
      {role === 'EMPLOYEE' && (
        <div className="mb-4 p-4 bg-yellow-50 rounded">
          <h3 className="font-semibold">Area Karyawan</h3>
          <p>Hanya karyawan yang bisa melihat bagian ini.</p>
        </div>
      )}
    </div>
  );
};


// ===== CONTOH 4: Proteksi Button/Action =====

export const ActionButtonsExample = () => {
  const { isAdmin, canManageEmployees } = useUserRole();

  return (
    <div className="flex gap-2">
      {/* Button yang semua bisa klik */}
      <button className="px-4 py-2 bg-blue-500 text-white rounded">
        Lihat Data
      </button>

      {/* Button hanya untuk admin dan manager */}
      {canManageEmployees() && (
        <button className="px-4 py-2 bg-green-500 text-white rounded">
          Edit Karyawan
        </button>
      )}

      {/* Button hanya untuk admin */}
      {isAdmin() && (
        <button className="px-4 py-2 bg-red-500 text-white rounded">
          Hapus Data
        </button>
      )}
    </div>
  );
};


// ===== CONTOH 5: Proteksi Route di Layout =====

export const ProtectedLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <RoleProtection fallbackUrl="/login">
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="px-4 py-6">
            <h1 className="text-xl font-semibold">Aplikasi EMS</h1>
          </div>
        </header>
        <main className="container mx-auto px-4 py-6">
          {children}
        </main>
      </div>
    </RoleProtection>
  );
};

// ===== CONTOH 6: Custom Hook untuk Cek Permission =====

export const usePermissions = () => {
  const { role, isAdmin, isManager, canManageEmployees } = useUserRole();

  const canAccessEmployeeData = () => canManageEmployees();
  const canApproveLeaves = () => canManageEmployees();
  const canManageSystem = () => isAdmin();
  const canViewReports = () => canManageEmployees();
  const canEditOwnProfile = () => Boolean(role); // Semua yang login
  
  return {
    canAccessEmployeeData,
    canApproveLeaves,
    canManageSystem,
    canViewReports,
    canEditOwnProfile,
  };
};

// Penggunaan custom hook
export const ExampleWithCustomHook = () => {
  const { canAccessEmployeeData, canApproveLeaves } = usePermissions();

  return (
    <div>
      {canAccessEmployeeData() && (
        <button>Akses Data Karyawan</button>
      )}
      {canApproveLeaves() && (
        <button>Setujui Cuti</button>
      )}
    </div>
  );
};
