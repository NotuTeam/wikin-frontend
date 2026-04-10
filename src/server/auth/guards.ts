import { NextRequest } from "next/server";
import { readCookie, verifySession } from "@/server/auth/session";
import { isAdminEmail } from "@/server/auth/admin";

export function getAuthUserFromRequest(req: NextRequest) {
  const token = readCookie(req.headers.get("cookie") || undefined, "wikin_auth");
  return verifySession(token);
}

export function isAdminRequest(req: NextRequest) {
  const user = getAuthUserFromRequest(req);
  if (!user) return { ok: false as const, reason: "unauthorized" as const };
  if (!isAdminEmail(user.email)) return { ok: false as const, reason: "forbidden" as const };
  return { ok: true as const, user };
}
