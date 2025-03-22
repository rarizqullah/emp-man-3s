import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { hash } from 'bcrypt';
import { Role, ContractType, WarningStatus, Gender } from '@prisma/client';

// Schema validasi untuk membuat karyawan dan user secara bersamaan
const employeeRegisterSchema = z.object({
  // Data User
  name: z.string().min(1, "Nama wajib diisi"),
  email: z.string().email("Format email tidak valid"),
  idNumber: z.string().min(1, "ID Number wajib diisi"),
  
  // Data Employee
  department: z.string().uuid("Format ID departemen tidak valid"),
  subDepartment: z.string().uuid("Format ID sub departemen tidak valid").optional().nullable(),
  positionId: z.string().uuid("Format ID posisi tidak valid").optional().nullable(),
  shift: z.string().uuid("Format ID shift tidak valid"),
  contractType: z.string().transform(val => val === "Permanen" ? ContractType.PERMANENT : ContractType.TRAINING),
  contractNumber: z.string().optional().nullable(),
  contractStartDate: z.string().or(z.date()).transform(val => val instanceof Date ? val : new Date(val)),
  contractEndDate: z.string().or(z.date()).optional().nullable()
    .transform(val => val ? (val instanceof Date ? val : new Date(val)) : null),
  gender: z.string().transform(val => 
    val === "FEMALE" || val === "Female" || val === "female" ? Gender.FEMALE : Gender.MALE
  ),
  address: z.string().optional().nullable(),
  faceData: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    console.log("Data registrasi yang diterima:", data);
    
    // Validasi input
    const validatedData = employeeRegisterSchema.parse(data);
    console.log("Data setelah validasi:", validatedData);
    
    // Cek apakah email sudah terdaftar
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email sudah terdaftar' },
        { status: 400 }
      );
    }
    
    // Mulai transaksi untuk membuat user dan employee
    const result = await prisma.$transaction(async (tx) => {
      // 1. Buat user baru
      const password = `${validatedData.idNumber}@ems`; // Default password
      const hashedPassword = await hash(password, 10);
      
      const user = await tx.user.create({
        data: {
          name: validatedData.name,
          email: validatedData.email,
          password: hashedPassword,
          role: Role.EMPLOYEE,
        },
      });
      
      // 2. Buat karyawan baru
      const employee = await tx.employee.create({
        data: {
          userId: user.id,
          employeeId: validatedData.idNumber,
          departmentId: validatedData.department,
          subDepartmentId: validatedData.subDepartment,
          positionId: validatedData.positionId,
          shiftId: validatedData.shift,
          contractType: validatedData.contractType,
          contractNumber: validatedData.contractNumber,
          contractStartDate: validatedData.contractStartDate,
          contractEndDate: validatedData.contractEndDate,
          warningStatus: WarningStatus.NONE,
          gender: validatedData.gender,
          address: validatedData.address,
          faceData: validatedData.faceData,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            }
          },
          department: true,
          subDepartment: true,
          position: true,
          shift: true,
        }
      });
      
      return employee;
    });
    
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('Gagal mendaftarkan karyawan baru:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validasi gagal', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan saat mendaftarkan karyawan' },
      { status: 500 }
    );
  }
} 