import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Gunakan handler yang sudah dikonfigurasi dengan authOptions
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 