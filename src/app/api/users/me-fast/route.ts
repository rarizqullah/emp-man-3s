import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ApiResponse } from '@/lib/auth/api-helpers';
import { prisma, safeQuery } from '@/lib/db';

// Define interface untuk user data
interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  employee: null | { id?: string; employeeId?: string };
}

// Simple in-memory cache untuk mengurangi database calls
const userCache = new Map<string, { data: UserData; timestamp: number }>();
const CACHE_TTL = 1 * 60 * 1000; // 1 minute - lebih pendek untuk data yang akurat

// Function untuk membersihkan cache yang expired
function cleanExpiredCache() {
  const now = Date.now();
  for (const [key, value] of userCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      userCache.delete(key);
    }
  }
}

export async function GET() {
  const startTime = Date.now();
  
  try {
    // Ambil user dari Supabase session dengan timeout pendek
    const supabase = await createServerSupabaseClient();
    
    // Try both getUser() and getSession() untuk compatibility
    let user = null;
    let authError = null;
    
    try {
      const { data: { user: userData }, error: userError } = await supabase.auth.getUser();
      if (userData && !userError) {
        user = userData;
      } else {
        // Fallback ke getSession
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (session?.user && !sessionError) {
          user = session.user;
        } else {
          authError = userError || sessionError;
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      return ApiResponse.unauthorized('Authentication failed');
    }

    if (authError || !user) {
      console.log('❌ No authenticated user found:', authError?.message);
      return ApiResponse.unauthorized('Please login to continue');
    }

    console.log('🔍 Fast route - getting user profile for:', user.email);

    // Check cache first
    cleanExpiredCache();
    const cacheKey = user.id;
    const cached = userCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log('✅ Returning cached data for user:', user.email, `(${Date.now() - startTime}ms)`);
      return ApiResponse.success(cached.data, 'User profile loaded from cache');
    }

    // Try to get data from database dengan timeout pendek
    try {
      const userData = await safeQuery(
        () => prisma.user.findUnique({
          where: { authId: user.id }, // Use authId instead of id
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            authId: true,
            employee: {
              select: {
                id: true,
                employeeId: true,
              }
            }
          }
        }),
        1, // Single attempt
        5000 // 5 second timeout - increased slightly
      );

      if (userData) {
        // Validate role dari database
        const validRoles = ['ADMIN', 'MANAGER', 'EMPLOYEE'];
        let userRole = userData.role;
        
        if (!userRole || !validRoles.includes(userRole)) {
          console.warn('⚠️ Invalid/missing role in database, fixing to EMPLOYEE:', userRole);
          userRole = 'EMPLOYEE';
          
          // Auto-fix invalid role di database
          await prisma.user.update({
            where: { authId: user.id }, // Use authId instead of id
            data: { role: 'EMPLOYEE' }
          }).catch(err => {
            console.warn('Failed to update role in database:', err);
          });
        }

        const userResponse: UserData = {
          id: userData.id,
          name: userData.name || user.email?.split('@')[0] || 'User',
          email: userData.email || user.email || '',
          role: userRole,
          employee: userData.employee ? {
            id: userData.employee.id,
            employeeId: userData.employee.employeeId
          } : null
        };

        // Cache the result
        userCache.set(cacheKey, {
          data: userResponse,
          timestamp: Date.now()
        });

        const duration = Date.now() - startTime;
        console.log('✅ Fast route completed with DB data in:', `${duration}ms`);

        return ApiResponse.success(userResponse, 'User profile loaded from database');
      }
    } catch (dbError) {
      console.warn('Database query failed in fast route, using fallback:', dbError);
    }

    // Fallback ke user metadata jika ada
    const userMetadata = user.user_metadata || {};
    const appMetadata = user.app_metadata || {};
    
    // Construct response dengan data yang ada
    const userResponse: UserData = {
      id: user.id,
      name: userMetadata.name || userMetadata.full_name || user.email?.split('@')[0] || 'User',
      email: user.email || '',
      role: appMetadata.role || userMetadata.role || 'EMPLOYEE', // Default to EMPLOYEE
      employee: null // Set to null for now
    };

    // Validate role
    const validRoles = ['ADMIN', 'MANAGER', 'EMPLOYEE'];
    if (!validRoles.includes(userResponse.role)) {
      console.warn('⚠️ Invalid role detected, defaulting to EMPLOYEE:', userResponse.role);
      userResponse.role = 'EMPLOYEE';
    }

    // Cache the result
    userCache.set(cacheKey, {
      data: userResponse,
      timestamp: Date.now()
    });

    const duration = Date.now() - startTime;
    console.log('✅ Fast route completed in:', `${duration}ms`);

    return ApiResponse.success(userResponse, 'User profile loaded successfully');

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ Fast route error after:', `${duration}ms`, error);
    
    // Return basic response to prevent complete failure
    return ApiResponse.error('Unable to load user profile. Please try refreshing the page.', 503);
  }
}
