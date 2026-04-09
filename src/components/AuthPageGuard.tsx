"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AuthPageGuard() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch(`/api/auth/session`, {
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) return;

        const json = (await res.json()) as {
          success: boolean;
          data?: { user?: { sub?: string } };
        };

        if (json.success && json.data?.user?.sub) {
          router.replace("/dashboard");
        }
      } catch {
        // ignore and keep auth page visible
      }
    };

    checkSession();
  }, [router]);

  return null;
}
