"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { API_URL } from "@/lib";

export function HomeNavbar() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/session`, {
          credentials: "include",
        });

        if (!res.ok) {
          setIsAuthenticated(false);
          return;
        }

        const json = (await res.json()) as {
          success: boolean;
          data?: { user?: { sub: string } };
        };

        setIsAuthenticated(Boolean(json.success && json.data?.user));
      } catch {
        setIsAuthenticated(false);
      }
    };

    checkSession();
  }, []);

  const handleAuthAction = async () => {
    if (isAuthenticated) {
      try {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: "POST",
          credentials: "include",
        });
      } finally {
        setIsAuthenticated(false);
        router.replace("/auth");
      }
      return;
    }

    router.push("/auth");
  };

  return (
    <header className="fixed left-0 top-0 z-50 w-full border-b border-[var(--color-neutral-300)] bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 md:px-7">
        <div className="text-2xl font-bold text-[var(--color-primary)] flex items-center justify-center">
          <div className={`inline-flex h-16 w-16 items-center justify-center`}>
            <Image
              src="/logo.png"
              alt="Wikin logo"
              width={100}
              height={100}
              priority
              className={`rounded-full object-contain`}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAuthAction}
            className="rounded-[10px] border border-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white duration-150 cursor-pointer"
          >
            {isAuthenticated ? "Logout" : "Login"}
          </button>
          {isAuthenticated && (
            <Link
              href="/dashboard"
              className="rounded-[10px] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(93,63,211,0.35)] hover:bg-[var(--color-primary-dark)]"
            >
              Dashboard
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
