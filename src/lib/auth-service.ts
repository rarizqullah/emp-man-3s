import { supabase } from './supabase';
import { createToken } from './jwt-client';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type UserRegisterData = {
  email: string;
  password: string;
  fullName?: string;
};

export type UserData = {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
  created_at: string;
};

export class AuthService {
  // Registrasi pengguna baru
  static async registerUser(userData: UserRegisterData): Promise<{ success: boolean; message?: string; user?: UserData }> {
    try {
      // Cek apakah email sudah terdaftar
      const { data: existingUser } = await supabase
        .from('users')
        .select('email')
        .eq('email', userData.email)
        .single();

      if (existingUser) {
        return { 
          success: false, 
          message: 'Email sudah terdaftar. Silakan gunakan email lain.' 
        };
      }

      // Hash password sebelum disimpan
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      // Masukkan data user baru ke database
      const { data, error } = await supabase
        .from('users')
        .insert([
          {
            email: userData.email,
            password: hashedPassword,
            full_name: userData.fullName || null,
            role: 'user', // Default role
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (error) {
        console.error('Error registering user:', error);
        return { 
          success: false, 
          message: 'Terjadi kesalahan saat mendaftarkan pengguna.' 
        };
      }

      return { 
        success: true, 
        user: data[0] as UserData,
        message: 'Registrasi berhasil. Silakan login.'
      };
    } catch (error) {
      console.error('Unexpected error during registration:', error);
      return { 
        success: false, 
        message: 'Terjadi kesalahan yang tidak terduga.' 
      };
    }
  }

  // Login pengguna
  static async loginUser(email: string, password: string): Promise<{ 
    success: boolean; 
    message?: string; 
    token?: string;
    user?: UserData; 
  }> {
    try {
      // Cari user berdasarkan email
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !user) {
        return { 
          success: false, 
          message: 'Email atau password salah.' 
        };
      }

      // Verifikasi password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return { 
          success: false, 
          message: 'Email atau password salah.' 
        };
      }

      // Buat token JWT
      const token = await createToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      // Update last_login user
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id);

      // Hapus password dari respons
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: __, ...userWithoutPassword } = user;

      return {
        success: true,
        token,
        user: userWithoutPassword as UserData,
      };
    } catch (error) {
      console.error('Unexpected error during login:', error);
      return { 
        success: false, 
        message: 'Terjadi kesalahan yang tidak terduga.' 
      };
    }
  }

  // Login pengguna dengan Prisma (menggunakan jika Supabase login gagal)
  static async loginWithPrisma(email: string, password: string): Promise<{ 
    success: boolean; 
    message?: string; 
    token?: string;
    user?: UserData; 
  }> {
    try {
      // Cari user berdasarkan email di Prisma
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return { 
          success: false, 
          message: 'Email atau password salah.' 
        };
      }

      // Cari kredensial di Supabase untuk verifikasi password
      const { data: authData, error } = await supabase
        .from('users')
        .select('password')
        .eq('email', email)
        .single();

      if (error || !authData || !authData.password) {
        console.error('Error fetching auth data:', error);
        return { 
          success: false, 
          message: 'Terjadi kesalahan saat login. Coba lagi nanti.' 
        };
      }

      // Verifikasi password
      const isPasswordValid = await bcrypt.compare(password, authData.password);
      if (!isPasswordValid) {
        return { 
          success: false, 
          message: 'Email atau password salah.' 
        };
      }

      // Buat token JWT
      const token = await createToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      // Ubah ke format UserData
      const userData: UserData = {
        id: user.id,
        email: user.email,
        full_name: user.name,
        role: user.role,
        created_at: user.createdAt.toISOString(),
      };

      return {
        success: true,
        token,
        user: userData,
      };
    } catch (error) {
      console.error('Unexpected error during login with Prisma:', error);
      return { 
        success: false, 
        message: 'Terjadi kesalahan yang tidak terduga.' 
      };
    } finally {
      await prisma.$disconnect();
    }
  }

  // Mendapatkan data user berdasarkan ID
  static async getUserById(userId: string): Promise<UserData | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, role, created_at')
        .eq('id', userId)
        .single();

      if (error || !data) {
        console.error('Error fetching user by ID:', error);
        return null;
      }

      return data as UserData;
    } catch (error) {
      console.error('Unexpected error getting user:', error);
      return null;
    }
  }
} 