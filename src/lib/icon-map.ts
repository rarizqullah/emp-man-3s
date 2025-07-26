import { 
  LayoutDashboard, 
  Users, 
  Clock, 
  CreditCard, 
  FileCheck, 
  Building2,
  MapPin,
  UserCheck,
  DollarSign,
  Gift,
  Calendar,
  Settings
} from 'lucide-react';

// Mapping icon string ke komponen Lucide
export const iconMap = {
  'LayoutDashboard': LayoutDashboard,
  'Users': Users,
  'Clock': Clock,
  'CreditCard': CreditCard,
  'FileCheck': FileCheck,
  'Building2': Building2,
  'MapPin': MapPin,
  'UserCheck': UserCheck,
  'DollarSign': DollarSign,
  'Gift': Gift,
  'Calendar': Calendar,
  'Settings': Settings,
} as const;

export type IconName = keyof typeof iconMap;

// Helper function untuk mendapatkan komponen icon
export const getIcon = (iconName: string): React.ComponentType<{ className?: string }> => {
  return iconMap[iconName as IconName] || Settings; // Default ke Settings jika tidak ditemukan
};
