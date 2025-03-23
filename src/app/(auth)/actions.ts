"use server";
import { z } from "zod";
import { validatedAction } from "@/lib/auth/middleware";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const signInSchema = z.object({
  email: z.string().email().min(3).max(255),
  password: z.string().min(6).max(100),
});

export const signIn = validatedAction(signInSchema, async (data) => {
  const supabase = await createClient();
  const { email, password } = data;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "Data login tidak valid. Silakan coba lagi." };
  }

  // Kembalikan sukses tanpa redirect
  return { success: true };
});

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const signUp = validatedAction(signUpSchema, async (data) => {
  const supabase = await createClient();
  const { email, password } = data;

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError) {
    return { error: signUpError.message };
  }

  // Sync dengan database jika diperlukan
  const { error: userDataError } = await supabase
    .from("user_data")
    .insert({ user_id: signUpData?.user?.id });

  if (userDataError) {
    console.error("Error saat membuat entri user_data:", userDataError);
  }

  // Kembalikan sukses dan userId tanpa redirect
  return { success: true, userId: signUpData?.user?.id };
});

export const signInWithMagicLink = validatedAction(
  z.object({
    email: z.string().email(),
    redirect: z.string().optional(),
  }),
  async (data) => {
    const supabase = await createClient();
    const { email } = data;
    const redirectTo = `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/auth/callback`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });
    
    if (error) {
      console.error("Error saat mengirim magic link:", error);
      return { error: error.message };
    }

    return { success: "Magic link telah dikirim ke email Anda." };
  }
);

export const signOut = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}; 