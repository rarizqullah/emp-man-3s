import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db/prisma'; // Menggunakan import default
import { Role, ContractType, WarningStatus, Gender } from '@prisma/client';
import { ensureDatabaseConnection } from '@/lib/db/prisma'; // Tambahkan import ini
import crypto from 'crypto';
import { hash } from 'bcrypt';

// Schema validasi untuk membuat karyawan dan user secara bersamaan
const employeeRegisterSchema = z.object({
  // Data User
  name: z.string().min(1, "Nama wajib diisi"),
  email: z.string().email("Format email tidak valid"),
  idNumber: z.string().min(1, "ID Number wajib diisi"),
  phone: z.string().optional(),
  
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
    console.log("API /employees/register dipanggil");
    
    // Pastikan koneksi database terbentuk
    const dbConnected = await ensureDatabaseConnection();
    if (!dbConnected) {
      console.error("Gagal terhubung ke database");
      return NextResponse.json(
        { error: "Koneksi database gagal, silakan coba lagi nanti" },
        { status: 503 }
      );
    }
    
    const data = await request.json();
    console.log("Data registrasi yang diterima:", data);
    
    // Validasi input
    let validatedData;
    try {
      validatedData = employeeRegisterSchema.parse(data);
      console.log("Data setelah validasi:", validatedData);
    } catch (validationError) {
      console.error("Error validasi:", validationError);
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validasi gagal', details: validationError.errors },
          { status: 400 }
        );
      }
      throw validationError;
    }
    
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
    try {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Buat user baru
        const password = `${validatedData.idNumber}@ems`; // Default password
        const hashedPassword = await hash(password, 10);
        
        const user = await tx.user.create({
          data: {
            name: validatedData.name,
            email: validatedData.email,
            authId: crypto.randomUUID(),
            role: Role.EMPLOYEE,
            password: hashedPassword,
          } as any, // Gunakan 'as any' untuk menghindari TypeScript error
        });
        
        console.log("User berhasil dibuat dengan ID:", user.id);
        
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
        
        console.log("Karyawan berhasil dibuat dengan ID:", employee.id);
        
        return employee;
      });
      
      console.log("Transaksi berhasil, data karyawan:", result);
      return NextResponse.json(result, { status: 201 });
    } catch (dbError) {
      console.error("Error database saat membuat karyawan:", dbError);
      
      // Cek apakah error koneksi
      const errorMessage = String(dbError).toLowerCase();
      if (
        errorMessage.includes('connection') &&
        (errorMessage.includes('reset') || 
         errorMessage.includes('closed') || 
         errorMessage.includes('timeout'))
      ) {
        return NextResponse.json(
          { error: "Koneksi database terputus, silakan coba lagi" },
          { status: 503 }
        );
      }
      
      throw dbError;
    }
  } catch (error: unknown) {
    console.error('Gagal mendaftarkan karyawan baru:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Terjadi kesalahan saat mendaftarkan karyawan' },
      { status: 500 }
    );
  }
} 