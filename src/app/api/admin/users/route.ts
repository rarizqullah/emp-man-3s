import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, ApiResponse } from '@/lib/auth/api-helpers';
import { z } from 'zod';

// Schema validasi untuk update role
const updateRoleSchema = z.object({
  userId: z.string().min(1, 'User ID wajib diisi'),
  role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE'], {
    errorMap: () => ({ message: 'Role harus salah satu dari: ADMIN, MANAGER, EMPLOYEE' })
  })
});

// GET - Mendapatkan daftar semua user dengan role mereka
export const GET = requireRole('ADMIN')(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const role = searchParams.get('role');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (role && ['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(role)) {
      where.role = role;
    }

    // Get total count
    const totalUsers = await prisma.user.count({ where });

    // Get users with pagination
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        employee: {
          select: {
            id: true,
            employeeId: true,
            department: {
              select: {
                name: true
              }
            },
            position: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: [
        { role: 'asc' },
        { name: 'asc' }
      ],
      skip: offset,
      take: limit
    });

    const totalPages = Math.ceil(totalUsers / limit);

    return ApiResponse.success({
      users,
      pagination: {
        currentPage: page,
        totalPages,
        totalUsers,
        limit,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return ApiResponse.error('Gagal mengambil daftar user', 500);
  }
});

// PUT - Update role user (hanya admin yang bisa)
export const PUT = requireRole('ADMIN')(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { userId, role } = updateRoleSchema.parse(body);

    // Cek apakah user yang akan diupdate ada
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    if (!targetUser) {
      return ApiResponse.notFound('User tidak ditemukan');
    }

    // Prevent admin from demoting themselves
    const currentUserId = request.headers.get('x-user-id');
    if (currentUserId === userId && targetUser.role === 'ADMIN' && role !== 'ADMIN') {
      return ApiResponse.error('Anda tidak dapat menurunkan role diri sendiri dari Admin');
    }

    // Update role user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        updatedAt: true
      }
    });

    // Log activity (opsional)
    console.log(`User role updated: ${targetUser.email} from ${targetUser.role} to ${role}`);

    return ApiResponse.success(updatedUser, `Role user ${targetUser.name || targetUser.email} berhasil diubah menjadi ${role}`);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiResponse.error(error.errors[0].message, 400);
    }
    
    console.error('Error updating user role:', error);
    return ApiResponse.error('Gagal mengupdate role user', 500);
  }
});

// DELETE - Remove user (soft delete atau hard delete)
export const DELETE = requireRole('ADMIN')(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return ApiResponse.error('User ID wajib diisi');
    }

    // Cek apakah user yang akan dihapus ada
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    if (!targetUser) {
      return ApiResponse.notFound('User tidak ditemukan');
    }

    // Prevent admin from deleting themselves
    const currentUserId = request.headers.get('x-user-id');
    if (currentUserId === userId) {
      return ApiResponse.error('Anda tidak dapat menghapus akun diri sendiri');
    }

    // Prevent deleting the last admin
    if (targetUser.role === 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN' }
      });
      
      if (adminCount <= 1) {
        return ApiResponse.error('Tidak dapat menghapus admin terakhir di sistem');
      }
    }

    // Delete user (hard delete - bisa diubah ke soft delete jika diperlukan)
    await prisma.user.delete({
      where: { id: userId }
    });

    // Log activity
    console.log(`User deleted: ${targetUser.email} (${targetUser.role})`);

    return ApiResponse.success(
      { deletedUserId: userId },
      `User ${targetUser.name || targetUser.email} berhasil dihapus`
    );

  } catch (error) {
    console.error('Error deleting user:', error);
    return ApiResponse.error('Gagal menghapus user', 500);
  }
});
