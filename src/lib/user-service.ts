import { prisma } from "@/lib/db/prisma";
import { User } from "@supabase/supabase-js";

/**
 * Membuat atau memperbarui user di database lokal berdasarkan data dari Supabase
 */
export async function syncUserWithDatabase(user: User) {
  try {
    // Cek apakah user sudah ada di database berdasarkan authId
    const existingUser = await prisma.user.findFirst({
      where: {
        authId: user.id,
      },
    });

    // Jika user sudah ada, update data
    if (existingUser) {
      return await prisma.user.update({
        where: {
          id: existingUser.id,
        },
        data: {
          email: user.email || existingUser.email,
          name: user.user_metadata?.name || existingUser.name,
          role: user.user_metadata?.role || existingUser.role,
        },
      });
    }

    // Jika user belum ada, buat user baru
    return await prisma.user.create({
      data: {
        email: user.email as string,
        name: user.user_metadata?.name as string || user.email?.split('@')[0] || 'User',
        authId: user.id,
        role: (user.user_metadata?.role as string) || 'EMPLOYEE',
      },
    });
  } catch (error) {
    console.error('Error sinkronisasi user:', error);
    throw error;
  }
}

/**
 * Mendapatkan data user dari database lokal berdasarkan Supabase auth ID
 */
export async function getUserByAuthId(authId: string) {
  try {
    return await prisma.user.findFirst({
      where: {
        authId,
      },
      include: {
        employee: true,
      },
    });
  } catch (error) {
    console.error('Error mendapatkan user:', error);
    return null;
  }
} 