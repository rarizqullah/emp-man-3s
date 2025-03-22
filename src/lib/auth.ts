import { prisma } from "@/lib/db/prisma";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcrypt";
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 jam
  },
  pages: {
    signIn: "/login",
    error: "/login?error=auth",
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
          include: {
            employee: true,
          },
        });

        if (!user) {
          return null;
        }

        const isPasswordValid = await compare(credentials.password, user.password);

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          employeeId: user.employee?.id,
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.role = token.role as string;
        session.user.employeeId = token.employeeId as string | undefined;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.employeeId = user.employeeId;
      }
      return token;
    },
  },
};

// Tambahkan tipe untuk session
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      employeeId?: string;
    };
  }
  
  interface User {
    role: string;
    employeeId?: string;
  }
}

/**
 * Utilitas autentikasi untuk aplikasi
 * Menyediakan fungsi-fungsi untuk verifikasi token JWT
 */

// Tipe untuk data user dalam token
export interface TokenUser {
  id: string;
  email: string;
  name: string;
  role: string;
  iat: number;
  exp: number;
}

/**
 * Verifikasi token dari cookie atau header Authorization
 * @param req Request NextJS
 * @returns Data user jika token valid, null jika tidak valid
 */
export async function verifyToken(req: NextRequest): Promise<TokenUser | null> {
  try {
    // Dapatkan token dari header Authorization
    const authHeader = req.headers.get('Authorization');
    let token: string | undefined;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Jika ada di header Authorization
      token = authHeader.substring(7);
    } else {
      // Jika tidak ada di header, cek di cookie
      const tokenCookie = req.cookies.get('token');
      if (tokenCookie) {
        token = tokenCookie.value;
      }
    }
    
    if (!token) {
      return null;
    }
    
    // Ambil JWT secret dari environment variables
    const jwtSecret = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET;
    
    if (!jwtSecret) {
      console.error('JWT Secret tidak ditemukan di environment variables');
      return null;
    }
    
    // Verifikasi token
    const decoded = jwt.verify(token, jwtSecret) as TokenUser;
    
    // Pastikan token belum expired
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      console.error('Token sudah expired');
      return null;
    }
    
    return decoded;
  } catch (error) {
    console.error('Error verifikasi token:', error);
    return null;
  }
}

/**
 * Verifikasi token dari cookie untuk digunakan di server components
 * @returns Data user jika token valid, null jika tidak valid
 */
export async function getServerAuthSession(): Promise<TokenUser | null> {
  try {
    // Gunakan function async untuk menunggu cookies() promise selesai
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) {
      return null;
    }
    
    // Ambil JWT secret dari environment variables
    const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
    
    if (!jwtSecret) {
      console.error('JWT Secret tidak ditemukan di environment variables');
      return null;
    }
    
    // Verifikasi token
    const decoded = jwt.verify(token, jwtSecret) as TokenUser;
    
    // Pastikan token belum expired
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      console.error('Token sudah expired');
      return null;
    }
    
    return decoded;
  } catch (error) {
    console.error('Error verifikasi token:', error);
    return null;
  }
} 