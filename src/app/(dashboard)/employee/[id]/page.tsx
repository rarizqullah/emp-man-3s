import { EmployeeDetailClient } from './employee-detail-client';

// Server Component yang mengakses params
export default function EmployeeDetailPage({ params }: { params: { id: string } }) {
  // Teruskan ID sebagai prop ke Client Component
  return <EmployeeDetailClient employeeId={params.id} />;
} 