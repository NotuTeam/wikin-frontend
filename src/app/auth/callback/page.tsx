"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const hasCode = Boolean(params.get("code"));
      const hasState = Boolean(params.get("state"));

      if (hasCode && hasState) {
        window.location.replace(`/api/auth/google/callback?${params.toString()}`);
        return;
      }

      try {
        const res = await fetch(`/api/auth/session`, {
          credentials: "include",
        });

        if (!res.ok) {
          router.replace("/auth?error=login_failed");
          return;
        }

        const json = (await res.json()) as {
          success: boolean;
          data?: { user?: { sub: string } };
        };

        if (!json.success || !json.data?.user?.sub) {
          router.replace("/auth?error=login_failed");
          return;
        }

        router.replace("/dashboard");
      } catch {
        router.replace("/auth?error=login_failed");
      }
    };

    handleCallback();
  }, [router]);

  return (
    <main className="min-h-screen bg-(--color-neutral-50) p-8">
      <div className="mx-auto max-w-xl rounded-2xl border border-neutral-300 bg-white p-6 text-sm text-neutral-500">
        Finishing sign in...
      </div>
    </main>
  );
}
