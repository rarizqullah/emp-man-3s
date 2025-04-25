import { EmployeeDetailClient } from './employee-detail-client';

// Server Component yang mengakses params secara asinkronus
export default async function EmployeeDetailPage({ params }: { params: { id: string } }) {
  // Menggunakan await pada params untuk mengatasi error
  const employeeParams = await params;
  const employeeId = employeeParams.id;
  
  // Teruskan ID sebagai prop ke Client Component
  return <EmployeeDetailClient employeeId={employeeId} />;
} 