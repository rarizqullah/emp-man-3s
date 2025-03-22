import AuthFallback from "@/app/auth-fallback";

export default function AuthFallbackPage({
  searchParams,
}: {
  searchParams: { redirect_to?: string };
}) {
  console.log('[AuthFallbackPage] Loaded with searchParams:', searchParams);

  // Ambil redirect path dari URL jika ada
  const redirectPath = searchParams.redirect_to
    ? `/login?redirect_to=${encodeURIComponent(searchParams.redirect_to)}&from_fallback=true`
    : "/login?from_fallback=true";

  return <AuthFallback redirectPath={redirectPath} />;
} 