"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  SquaresFour,
  ChartLineUp,
  ClockCounterClockwise,
  BookOpen,
  Globe,
  Pencil,
  UserCircle,
  Gear,
  SignOut,
} from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { API_URL } from "@/lib";

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  section?: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: SquaresFour, href: "/dashboard", section: "Overview" },
  { label: "Progress", icon: ChartLineUp, href: "/dashboard/progress", section: "Overview" },
  { label: "History", icon: ClockCounterClockwise, href: "/dashboard/history", section: "Overview" },
  { label: "Simulasi IELTS", icon: BookOpen, href: "/dashboard/ielts", section: "Ujian" },
  { label: "Simulasi TOEFL", icon: Globe, href: "/dashboard/toefl", section: "Ujian" },
  { label: "Latihan Section", icon: Pencil, href: "/dashboard/practice", section: "Ujian" },
  { label: "Profil", icon: UserCircle, href: "/dashboard/profile", section: "Akun" },
  { label: "Pengaturan", icon: Gear, href: "/dashboard/settings", section: "Akun" },
];

interface SidebarProps {
  user: {
    name: string;
    picture?: string;
  };
  isExpanded: boolean;
  onToggle: () => void;
}

export function Sidebar({ user, isExpanded, onToggle }: SidebarProps) {
  const [tooltip, setTooltip] = useState<{ text: string; y: number } | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      router.replace("/auth");
    }
  };

  const groupedNavItems = navItems.reduce((acc, item) => {
    const section = item.section || "Other";
    if (!acc[section]) acc[section] = [];
    acc[section].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  const sections = ["Overview", "Ujian", "Akun"];

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen flex-shrink-0 flex-col border-r border-[var(--color-neutral-200)] bg-white transition-all duration-200 ease-out",
        isExpanded ? "w-[220px] px-3 py-5 shadow-[2px_0_16px_rgba(0,0,0,0.06)]" : "w-[60px] items-center py-5"
      )}
    >
      {/* Logo Area */}
      <div
        className={cn(
          "flex items-center border-b border-[var(--color-neutral-100)] pb-5",
          isExpanded ? "mb-2 px-2" : "mb-2 w-full justify-center px-0"
        )}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--color-primary-pale)]">
          <span className="text-lg font-bold text-[var(--color-primary)]">W</span>
        </div>
        {isExpanded && (
          <span className="ml-2 text-xl font-bold text-[var(--color-neutral-900)]">wikin</span>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn("flex flex-1 flex-col", isExpanded ? "gap-1" : "gap-2")}>
        {sections.map((section, sectionIndex) => (
          <div key={section}>
            {/* Section Label - Only when expanded */}
            {isExpanded && groupedNavItems[section] && (
              <div className="px-3 pb-1 pt-3 first:pt-2">
                <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-neutral-400)]">
                  {section}
                </span>
              </div>
            )}

            {/* Nav Items */}
            {groupedNavItems[section]?.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "relative flex items-center rounded-[10px] transition-all duration-150",
                    isExpanded ? "mx-1 gap-2.5 px-3 py-2.5" : "mx-2 h-11 w-11 justify-center",
                    isActive
                      ? "bg-[var(--color-primary-pale)] text-[var(--color-primary)]"
                      : "text-[var(--color-neutral-500)] hover:bg-[var(--color-neutral-100)] hover:text-[var(--color-neutral-600)]"
                  )}
                  onMouseEnter={(e) => {
                    if (!isExpanded) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltip({ text: item.label, y: rect.top + rect.height / 2 });
                    }
                  }}
                  onMouseLeave={() => setTooltip(null)}
                >
                  <Icon
                    size={isExpanded ? 20 : 22}
                    weight={isActive ? "bold" : "regular"}
                  />
                  {isExpanded && (
                    <span
                      className={cn(
                        "text-[13px] transition-all duration-150",
                        isActive ? "font-semibold" : "font-medium"
                      )}
                    >
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}

            {/* Divider between sections */}
            {!isExpanded && sectionIndex < sections.length - 1 && groupedNavItems[section] && (
              <div className="my-2 h-px w-10 bg-[var(--color-neutral-100)]" />
            )}
          </div>
        ))}
      </nav>

      {/* Bottom Actions */}
      <div className={cn("flex flex-col", isExpanded ? "mt-auto gap-1" : "mt-auto gap-2")}>
        {/* Profile */}
        <Link
          href="/dashboard/profile"
          className={cn(
            "flex items-center rounded-[10px] transition-all duration-150",
            isExpanded ? "mx-1 gap-2.5 px-3 py-2.5" : "mx-2 h-11 w-11 justify-center",
            pathname === "/dashboard/profile"
              ? "bg-[var(--color-primary-pale)] text-[var(--color-primary)]"
              : "text-[var(--color-neutral-500)] hover:bg-[var(--color-neutral-100)] hover:text-[var(--color-neutral-600)]"
          )}
          onMouseEnter={(e) => {
            if (!isExpanded) {
              const rect = e.currentTarget.getBoundingClientRect();
              setTooltip({ text: "Profil", y: rect.top + rect.height / 2 });
            }
          }}
          onMouseLeave={() => setTooltip(null)}
        >
          {user.picture ? (
            <img
              src={user.picture}
              alt={user.name}
              className="h-6 w-6 rounded-full object-cover"
            />
          ) : (
            <UserCircle size={isExpanded ? 20 : 22} />
          )}
          {isExpanded && (
            <span className="text-[13px] font-medium">{user.name}</span>
          )}
        </Link>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center rounded-[10px] text-[var(--color-neutral-400)] transition-all duration-150",
            isExpanded
              ? "mx-1 gap-2.5 px-3 py-2.5 hover:bg-[rgba(239,68,68,0.08)] hover:text-[var(--color-danger)]"
              : "mx-2 h-11 w-11 justify-center hover:bg-[rgba(239,68,68,0.08)] hover:text-[var(--color-danger)]"
          )}
          onMouseEnter={(e) => {
            if (!isExpanded) {
              const rect = e.currentTarget.getBoundingClientRect();
              setTooltip({ text: "Keluar", y: rect.top + rect.height / 2 });
            }
          }}
          onMouseLeave={() => setTooltip(null)}
        >
          <SignOut size={isExpanded ? 20 : 22} />
          {isExpanded && (
            <span className="text-[13px] font-medium text-[var(--color-danger)]">Keluar</span>
          )}
        </button>
      </div>

      {/* Tooltip - Only show when collapsed */}
      {!isExpanded && tooltip && (
        <div
          className="fixed z-[60] rounded-md bg-[var(--color-neutral-900)] px-2.5 py-1.5 text-[13px] text-white shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
          style={{
            left: "72px",
            top: `${tooltip.y - 14}px`,
          }}
        >
          {tooltip.text}
          <div className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 bg-[var(--color-neutral-900)]" />
        </div>
      )}
    </aside>
  );
}
