import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const { id } = params;
    
    // Cek apakah user ada
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });
    
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User tidak ditemukan' },
        { status: 404 }
      );
    }
    
    // Hapus user
    await prisma.user.delete({
      where: { id },
    });
    
    return NextResponse.json({ message: 'User berhasil dihapus' });
  } catch (error) {
    console.error('Gagal menghapus user:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat menghapus user' },
      { status: 500 }
    );
  }
} 