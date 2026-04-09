"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AuthUser = {
  sub: string;
  email: string;
  name: string;
  picture?: string;
};

type AuthGuardProps = {
  children: (user: AuthUser) => React.ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch(`/api/auth/session`, {
          credentials: "include",
        });

        if (!res.ok) {
          router.replace("/auth");
          return;
        }

        const json = (await res.json()) as {
          success: boolean;
          data?: { user: AuthUser };
        };

        if (!json.success || !json.data?.user) {
          router.replace("/auth");
          return;
        }

        setUser(json.data.user);
      } catch {
        router.replace("/auth");
      } finally {
        setIsLoading(false);
      }
    };

    run();
  }, [router]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[var(--color-neutral-50)] p-8">
        <div className="mx-auto max-w-xl rounded-2xl border border-[var(--color-neutral-300)] bg-white p-6 text-sm text-[var(--color-neutral-500)]">
          Checking session...
        </div>
      </main>
    );
  }

  if (!user) return null;

  return <>{children(user)}</>;
}
