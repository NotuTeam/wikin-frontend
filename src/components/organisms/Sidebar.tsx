"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SquaresFour,
  ChartLineUp,
  GraduationCapIcon,
  BookOpen,
} from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  section?: string;
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    icon: SquaresFour,
    href: "/dashboard",
    section: "Overview",
  },
  {
    label: "Simulation",
    icon: BookOpen,
    href: "/dashboard/simulation",
    section: "Progress",
  },
  {
    label: "Result",
    icon: ChartLineUp,
    href: "/dashboard/result",
    section: "Progress",
  },
  {
    label: "Study Group",
    icon: GraduationCapIcon,
    href: "/dashboard/study-group",
    section: "Progress",
  },
];

interface SidebarProps {
  isExpanded: boolean;
}

export function Sidebar({ isExpanded }: SidebarProps) {
  const [tooltip, setTooltip] = useState<{ text: string; y: number } | null>(
    null,
  );
  const pathname = usePathname();

  const groupedNavItems = navItems.reduce(
    (acc, item) => {
      const section = item.section || "Other";
      if (!acc[section]) acc[section] = [];
      acc[section].push(item);
      return acc;
    },
    {} as Record<string, NavItem[]>,
  );

  const sections = ["Overview", "Progress"];

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen flex-shrink-0 flex-col border-r border-[var(--color-neutral-200)] bg-white transition-all duration-200 ease-out",
        isExpanded
          ? "w-[220px] px-3 py-5 shadow-[2px_0_16px_rgba(0,0,0,0.06)]"
          : "w-[60px] items-center py-5",
      )}
    >
      {/* Logo Area */}
      <div
        className={cn(
          "flex items-center border-b border-[var(--color-neutral-100)] pb-2",
          isExpanded ? "mb-2 px-2" : "mb-2 w-full justify-center px-0",
        )}
      >
        <div className={`inline-flex h-12 w-12 items-center justify-center`}>
          <Image
            src="/logo.png"
            alt="Wikin logo"
            width={50}
            height={50}
            priority
            className={`rounded-full object-contain`}
          />
        </div>
      </div>

      {/* Navigation */}
      <nav
        className={cn("flex flex-1 flex-col", isExpanded ? "gap-1" : "gap-2")}
      >
        {sections.map((section) => (
          <div key={section} className="flex flex-col gap-2">
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
                    isExpanded
                      ? "mx-1 gap-2.5 px-3 py-2.5"
                      : "mx-2 h-11 w-11 justify-center",
                    isActive
                      ? "bg-[var(--color-primary-pale)] text-[var(--color-primary)]"
                      : "text-[var(--color-neutral-500)] hover:bg-[var(--color-neutral-100)] hover:text-[var(--color-neutral-600)]",
                  )}
                  onMouseEnter={(e) => {
                    if (!isExpanded) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltip({
                        text: item.label,
                        y: rect.top + rect.height / 2,
                      });
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
                        isActive ? "font-semibold" : "font-medium",
                      )}
                    >
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>


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
