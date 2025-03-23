import { redirect } from "next/navigation";
import { getUser } from "@/queries/user";
import { Register } from "./component";

export default async function RegisterPage() {
  const user = await getUser();
  
  if (user) {
    return redirect("/dashboard");
  }

  return <Register />;
} 