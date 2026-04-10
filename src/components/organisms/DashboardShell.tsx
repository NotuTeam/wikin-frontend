"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CaretDown,
  Gear,
  SidebarSimple,
  SignOut,
  UserCircle,
} from "@phosphor-icons/react";
import { AuthGuard } from "@/components/AuthGuard";
import { Sidebar } from "@/components/organisms/Sidebar";

type DashboardUser = {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  isAdmin?: boolean;
};

const DashboardUserContext = createContext<DashboardUser | null>(null);

export function useDashboardUser() {
  const value = useContext(DashboardUserContext);
  if (!value) {
    throw new Error("useDashboardUser must be used inside DashboardShell");
  }
  return value;
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      {(user) => (
        <DashboardUserContext.Provider value={user}>
          <DashboardShellInner user={user}>{children}</DashboardShellInner>
        </DashboardUserContext.Provider>
      )}
    </AuthGuard>
  );
}

function DashboardShellInner({
  user,
  children,
}: {
  user: DashboardUser;
  children: React.ReactNode;
}) {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch(`/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setIsUserMenuOpen(false);
      router.replace("/auth");
    }
  };

  return (
    <main className="flex min-h-screen bg-[var(--color-neutral-50)]">
      <Sidebar isExpanded={isSidebarExpanded} isAdmin={user.isAdmin} />

      <div className="flex-1 min-h-screen">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-[var(--color-neutral-300)] bg-white px-7">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
              className="flex h-9 w-9 items-center justify-center rounded-[10px] text-[var(--color-neutral-500)] transition-colors hover:bg-[var(--color-neutral-100)] hover:text-[var(--color-neutral-700)]"
              aria-label={
                isSidebarExpanded ? "Collapse sidebar" : "Expand sidebar"
              }
            >
              <SidebarSimple
                size={16}
                weight={isSidebarExpanded ? "bold" : "regular"}
              />
            </button>
          </div>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              className="flex items-center gap-3 rounded-[10px] px-2 py-1 text-sm transition-colors hover:bg-[var(--color-neutral-100)]"
            >
              {user.picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.picture}
                  alt={user.name}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-[var(--color-primary-pale)]" />
              )}
              <span className="font-medium text-[var(--color-neutral-700)]">
                {user.name}
              </span>
              <CaretDown
                size={14}
                className="text-[var(--color-neutral-500)]"
              />
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 top-full z-20 mt-2 w-48 overflow-hidden rounded-[10px] border border-[var(--color-neutral-200)] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
                <Link
                  href="/dashboard/profile"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium text-[var(--color-neutral-700)] transition-colors hover:bg-[var(--color-neutral-100)]"
                >
                  <UserCircle size={18} />
                  Profile
                </Link>
                <Link
                  href="/dashboard/settings"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium text-[var(--color-neutral-700)] transition-colors hover:bg-[var(--color-neutral-100)]"
                >
                  <Gear size={18} />
                  Settings
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] font-semibold text-[var(--color-danger)] transition-colors hover:bg-[rgba(239,68,68,0.08)]"
                >
                  <SignOut size={18} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        <section className="p-7">{children}</section>
      </div>
    </main>
  );
}
