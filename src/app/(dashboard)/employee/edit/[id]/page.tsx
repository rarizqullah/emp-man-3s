import { EmployeeEditClient } from "./employee-edit-client";

export default function EmployeeEditPage({ params }: { params: { id: string } }) {
  return <EmployeeEditClient employeeId={params.id} />;
} 