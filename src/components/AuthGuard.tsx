"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingState } from "@/components/features/LoadingState";

type AuthUser = {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  isAdmin?: boolean;
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
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-neutral-50)]">
        <LoadingState message="Checking session..." />
      </main>
    );
  }

  if (!user) return null;

  return <>{children(user)}</>;
}
