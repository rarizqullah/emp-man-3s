import { EmployeeEditClient } from "./employee-edit-client";

export default async function EmployeeEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EmployeeEditClient employeeId={id} />;
} 