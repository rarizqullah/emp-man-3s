import { getUser } from "@/queries/user";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const encodedRedirectTo = requestUrl.searchParams.get("redirect") || "/dashboard";
  const redirectTo = decodeURIComponent(encodedRedirectTo);

  const supabase = await createClient();

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
    const userData = await getUser();
    
    if (!userData) {
      console.error("Gagal mengambil data user setelah autentikasi");
    }
  }

  // Redirect ke halaman yang diminta atau dashboard
  return NextResponse.redirect(`${requestUrl.origin}${redirectTo}`);
} 