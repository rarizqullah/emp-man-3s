import { supabase } from './supabase/client';
import { createServerSupabaseClient } from './supabase/server';

export type UserProfile = {
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  role?: string;
  created_at?: string;
  updated_at?: string;
  last_login?: string;
};

export class UserService {
  // Mendapatkan profil user saat ini dari database
  static async getCurrentUserProfile(): Promise<UserProfile | null> {
    try {
      const supabaseServer = await createServerSupabaseClient();
      const { data: { user } } = await supabaseServer.auth.getUser();
      
      if (!user) return null;
      
      const { data, error } = await supabaseServer
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      return {
        id: user.id,
        email: user.email,
        full_name: data?.full_name || user.user_metadata?.full_name,
        avatar_url: data?.avatar_url || user.user_metadata?.avatar_url,
        role: data?.role || user.user_metadata?.role || 'user',
        created_at: data?.created_at || user.created_at,
        updated_at: data?.updated_at,
        last_login: data?.last_login,
      };
    } catch (error) {
      console.error('Error getting current user profile:', error);
      return null;
    }
  }
  
  // Update profil user
  static async updateUserProfile(userId: string, profile: Partial<UserProfile>): Promise<UserProfile | null> {
    try {
      // Update user_metadata di auth
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
        },
      });
      
      if (authError) throw authError;
      
      // Update data di tabel users
      const { data, error } = await supabase
        .from('users')
        .update({
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          updated_at: new Date().toISOString(),
          ...(profile.role && { role: profile.role }),
        })
        .eq('id', userId)
        .select()
        .single();
      
      if (error) throw error;
      
      return data as UserProfile;
    } catch (error) {
      console.error('Error updating user profile:', error);
      return null;
    }
  }
  
  // Mendapatkan semua user (admin only)
  static async getAllUsers(): Promise<UserProfile[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return data as UserProfile[];
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }
  
  // Mendapatkan user berdasarkan ID
  static async getUserById(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      
      return data as UserProfile;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }
} 