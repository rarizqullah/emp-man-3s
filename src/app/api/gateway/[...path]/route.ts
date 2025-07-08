import { NextRequest } from 'next/server';
import { apiGateway, createHandler, proxyHandler, validationSchemas } from '@/lib/api-gateway';
import { APIGatewayRequest } from '@/lib/api-gateway/types';

// Import existing services dengan nama yang benar
import { getAllEmployees, createEmployee, getEmployeeById, updateEmployee, deleteEmployee } from '@/lib/db/employee.service';
import { getAllDepartments, createDepartment, getDepartmentById, updateDepartment, deleteDepartment } from '@/lib/db/department.service';
import { getAllAllowances, createAllowance, getAllowanceById, updateAllowance, deleteAllowance } from '@/lib/db/allowance.service';
import { getAllShifts, createShift, getShiftById, updateShift, deleteShift } from '@/lib/db/shift.service';
import { getAllPositions, createPosition, getPositionById, updatePosition, deletePosition } from '@/lib/db/position.service';
import { getAllSubDepartments, createSubDepartment, getSubDepartmentById, updateSubDepartment, deleteSubDepartment } from '@/lib/db/sub-department.service';

// Initialize API Gateway routes
function initializeRoutes() {
  console.log('🔧 Initializing API Gateway routes...');
  
  // Note: Auth routes removed - using Supabase auth directly
  
  // Employee routes
  apiGateway.registerRoute('/employees', 'GET', createHandler(async (req: APIGatewayRequest) => {
    const employees = await getAllEmployees();
    return employees;
  }));
  
  apiGateway.registerRoute('/employees', 'POST', createHandler(async (req: APIGatewayRequest) => {
    const employee = await createEmployee(req.body);
    return employee;
  }, {
    validation: {
      body: validationSchemas.employeeCreate
    }
  }));
  
  apiGateway.registerRoute('/employees/:id', 'GET', createHandler(async (req: APIGatewayRequest) => {
    const employee = await getEmployeeById(req.params!.id);
    if (!employee) {
      throw new Error('Employee not found');
    }
    return employee;
  }, {
    validation: {
      params: validationSchemas.idParam
    }
  }));
  
  apiGateway.registerRoute('/employees/:id', 'PUT', createHandler(async (req: APIGatewayRequest) => {
    const employee = await updateEmployee(req.params!.id, req.body);
    return employee;
  }, {
    validation: {
      params: validationSchemas.idParam,
      body: validationSchemas.employeeUpdate
    }
  }));
  
  apiGateway.registerRoute('/employees/:id', 'DELETE', createHandler(async (req: APIGatewayRequest) => {
    await deleteEmployee(req.params!.id);
    return { message: 'Employee deleted successfully' };
  }, {
    validation: {
      params: validationSchemas.idParam
    }
  }));
  
  // Department routes
  apiGateway.registerRoute('/departments', 'GET', createHandler(async (req: APIGatewayRequest) => {
    const departments = await getAllDepartments();
    return departments;
  }));
  
  apiGateway.registerRoute('/departments', 'POST', createHandler(async (req: APIGatewayRequest) => {
    const department = await createDepartment(req.body);
    return department;
  }, {
    validation: {
      body: validationSchemas.departmentCreate
    }
  }));
  
  apiGateway.registerRoute('/departments/:id', 'GET', createHandler(async (req: APIGatewayRequest) => {
    const department = await getDepartmentById(req.params!.id);
    if (!department) {
      throw new Error('Department not found');
    }
    return department;
  }, {
    validation: {
      params: validationSchemas.idParam
    }
  }));
  
  apiGateway.registerRoute('/departments/:id', 'PUT', createHandler(async (req: APIGatewayRequest) => {
    const department = await updateDepartment(req.params!.id, req.body);
    return department;
  }, {
    validation: {
      params: validationSchemas.idParam,
      body: validationSchemas.departmentUpdate
    }
  }));
  
  apiGateway.registerRoute('/departments/:id', 'DELETE', createHandler(async (req: APIGatewayRequest) => {
    await deleteDepartment(req.params!.id);
    return { message: 'Department deleted successfully' };
  }, {
    validation: {
      params: validationSchemas.idParam
    }
  }));
  
  // Allowance routes
  apiGateway.registerRoute('/allowances', 'GET', createHandler(async (req: APIGatewayRequest) => {
    const allowances = await getAllAllowances();
    return allowances;
  }));
  
  apiGateway.registerRoute('/allowances', 'POST', createHandler(async (req: APIGatewayRequest) => {
    const allowance = await createAllowance(req.body);
    return allowance;
  }, {
    validation: {
      body: validationSchemas.allowanceCreate
    }
  }));
  
  apiGateway.registerRoute('/allowances/:id', 'GET', createHandler(async (req: APIGatewayRequest) => {
    const allowance = await getAllowanceById(req.params!.id);
    if (!allowance) {
      throw new Error('Allowance not found');
    }
    return allowance;
  }, {
    validation: {
      params: validationSchemas.idParam
    }
  }));
  
  apiGateway.registerRoute('/allowances/:id', 'PUT', createHandler(async (req: APIGatewayRequest) => {
    const allowance = await updateAllowance(req.params!.id, req.body);
    return allowance;
  }, {
    validation: {
      params: validationSchemas.idParam,
      body: validationSchemas.allowanceUpdate
    }
  }));
  
  apiGateway.registerRoute('/allowances/:id', 'DELETE', createHandler(async (req: APIGatewayRequest) => {
    await deleteAllowance(req.params!.id);
    return { message: 'Allowance deleted successfully' };
  }, {
    validation: {
      params: validationSchemas.idParam
    }
  }));
  
  // Shift routes
  apiGateway.registerRoute('/shifts', 'GET', createHandler(async (req: APIGatewayRequest) => {
    const shifts = await getAllShifts();
    return shifts;
  }));
  
  apiGateway.registerRoute('/shifts', 'POST', createHandler(async (req: APIGatewayRequest) => {
    const shift = await createShift(req.body);
    return shift;
  }));
  
  apiGateway.registerRoute('/shifts/:id', 'GET', createHandler(async (req: APIGatewayRequest) => {
    const shift = await getShiftById(req.params!.id);
    if (!shift) {
      throw new Error('Shift not found');
    }
    return shift;
  }, {
    validation: {
      params: validationSchemas.idParam
    }
  }));
  
  apiGateway.registerRoute('/shifts/:id', 'PUT', createHandler(async (req: APIGatewayRequest) => {
    const shift = await updateShift(req.params!.id, req.body);
    return shift;
  }, {
    validation: {
      params: validationSchemas.idParam
    }
  }));
  
  apiGateway.registerRoute('/shifts/:id', 'DELETE', createHandler(async (req: APIGatewayRequest) => {
    await deleteShift(req.params!.id);
    return { message: 'Shift deleted successfully' };
  }, {
    validation: {
      params: validationSchemas.idParam
    }
  }));
  
  // Position routes
  apiGateway.registerRoute('/positions', 'GET', createHandler(async (req: APIGatewayRequest) => {
    const positions = await getAllPositions();
    return positions;
  }));
  
  apiGateway.registerRoute('/positions', 'POST', createHandler(async (req: APIGatewayRequest) => {
    const position = await createPosition(req.body);
    return position;
  }));
  
  apiGateway.registerRoute('/positions/:id', 'GET', createHandler(async (req: APIGatewayRequest) => {
    const position = await getPositionById(req.params!.id);
    if (!position) {
      throw new Error('Position not found');
    }
    return position;
  }, {
    validation: {
      params: validationSchemas.idParam
    }
  }));
  
  apiGateway.registerRoute('/positions/:id', 'PUT', createHandler(async (req: APIGatewayRequest) => {
    const position = await updatePosition(req.params!.id, req.body);
    return position;
  }, {
    validation: {
      params: validationSchemas.idParam
    }
  }));
  
  apiGateway.registerRoute('/positions/:id', 'DELETE', createHandler(async (req: APIGatewayRequest) => {
    await deletePosition(req.params!.id);
    return { message: 'Position deleted successfully' };
  }, {
    validation: {
      params: validationSchemas.idParam
    }
  }));
  
  // Sub-department routes
  apiGateway.registerRoute('/sub-departments', 'GET', createHandler(async (req: APIGatewayRequest) => {
    const subDepartments = await getAllSubDepartments();
    return subDepartments;
  }));
  
  apiGateway.registerRoute('/sub-departments', 'POST', createHandler(async (req: APIGatewayRequest) => {
    const subDepartment = await createSubDepartment(req.body);
    return subDepartment;
  }));
  
  apiGateway.registerRoute('/sub-departments/:id', 'GET', createHandler(async (req: APIGatewayRequest) => {
    const subDepartment = await getSubDepartmentById(req.params!.id);
    if (!subDepartment) {
      throw new Error('Sub-department not found');
    }
    return subDepartment;
  }, {
    validation: {
      params: validationSchemas.idParam
    }
  }));
  
  apiGateway.registerRoute('/sub-departments/:id', 'PUT', createHandler(async (req: APIGatewayRequest) => {
    const subDepartment = await updateSubDepartment(req.params!.id, req.body);
    return subDepartment;
  }, {
    validation: {
      params: validationSchemas.idParam
    }
  }));
  
  apiGateway.registerRoute('/sub-departments/:id', 'DELETE', createHandler(async (req: APIGatewayRequest) => {
    await deleteSubDepartment(req.params!.id);
    return { message: 'Sub-department deleted successfully' };
  }, {
    validation: {
      params: validationSchemas.idParam
    }
  }));
  
  // Proxy routes untuk existing endpoints yang belum dimigrasi
  apiGateway.registerRoute('/attendance/check-in', 'POST', proxyHandler('/api/attendance/check-in'));
  apiGateway.registerRoute('/attendance/check-out', 'POST', proxyHandler('/api/attendance/check-out'));
  apiGateway.registerRoute('/attendance/list', 'GET', proxyHandler('/api/attendance/list'));
  apiGateway.registerRoute('/attendance/today', 'GET', proxyHandler('/api/attendance/today'));
  apiGateway.registerRoute('/attendance/employee-data', 'GET', proxyHandler('/api/attendance/employee-data'));
  apiGateway.registerRoute('/attendance/face-recognition-data', 'GET', proxyHandler('/api/attendance/face-recognition-data'));
  
  // Face recognition routes
  apiGateway.registerRoute('/face-recognition/process', 'POST', proxyHandler('/api/face-recognition/process'));
  apiGateway.registerRoute('/face-recognition/descriptors', 'GET', proxyHandler('/api/face-recognition/descriptors'));
  apiGateway.registerRoute('/face-recognition/test-recognition', 'POST', proxyHandler('/api/face-recognition/test-recognition'));
  
  // Salary routes
  apiGateway.registerRoute('/salaries', 'GET', proxyHandler('/api/salaries'));
  apiGateway.registerRoute('/salaries/generate-by-date', 'POST', proxyHandler('/api/salaries/generate-by-date'));
  apiGateway.registerRoute('/salaries/process-payments', 'POST', proxyHandler('/api/salaries/process-payments'));
  apiGateway.registerRoute('/salaries/:id', 'GET', proxyHandler('/api/salaries/:id'));
  apiGateway.registerRoute('/salaries/:id', 'PUT', proxyHandler('/api/salaries/:id'));
  
  // Public routes (tidak perlu auth)
  apiGateway.registerRoute('/departments-public', 'GET', proxyHandler('/api/departments-public'));
  apiGateway.registerRoute('/employees-public', 'GET', proxyHandler('/api/employees-public'));
  apiGateway.registerRoute('/sub-departments-public', 'GET', proxyHandler('/api/sub-departments-public'));
  
  console.log('✅ API Gateway routes initialized');
}

// Initialize routes saat modul dimuat
initializeRoutes();

// Generic handler untuk semua HTTP methods
async function handleRequest(request: NextRequest, method: string) {
  try {
    return await apiGateway.handleRequest(request);
  } catch (error) {
    console.error(`[API Gateway] ${method} Error:`, error);
    return Response.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Terjadi kesalahan pada API Gateway',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// HTTP Method Handlers
export async function GET(request: NextRequest) {
  return handleRequest(request, 'GET');
}

export async function POST(request: NextRequest) {
  return handleRequest(request, 'POST');
}

export async function PUT(request: NextRequest) {
  return handleRequest(request, 'PUT');
}

export async function DELETE(request: NextRequest) {
  return handleRequest(request, 'DELETE');
}

export async function PATCH(request: NextRequest) {
  return handleRequest(request, 'PATCH');
}

export async function OPTIONS(request: NextRequest) {
  return handleRequest(request, 'OPTIONS');
}

export async function HEAD(request: NextRequest) {
  return handleRequest(request, 'HEAD');
} 