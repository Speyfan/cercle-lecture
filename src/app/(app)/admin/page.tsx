import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function AdminPage() {
  const session = await auth();
  if (session?.user.role !== "admin") redirect("/dashboard");
  redirect("/admin/users");
}
