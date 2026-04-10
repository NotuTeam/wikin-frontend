import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/server/auth/session";
import { isAdminEmail } from "@/server/auth/admin";

export default async function ActivityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("wikin_auth")?.value;
  const user = verifySession(token);

  if (!user || !isAdminEmail(user.email)) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
