"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useDashboardUser } from "@/components/organisms/DashboardShell";
import { LoadingState } from "@/components/features/LoadingState";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";

type ActivityUser = {
  id: string;
  email: string;
  name: string;
  picture?: string;
  createdAt: string;
  simulationCount: number;
  latestResultAt: string | null;
};

type JoinedAtSort = "desc" | "asc";

const PAGE_SIZE = 10;

function formatDate(dateIso: string | null) {
  if (!dateIso) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateIso));
}

export default function ActivityPage() {
  const user = useDashboardUser();
  const [users, setUsers] = useState<ActivityUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [joinedAtSort, setJoinedAtSort] = useState<JoinedAtSort>("desc");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/admin/activity", {
          credentials: "include",
          cache: "no-store",
        });
        const json = (await res.json()) as {
          success?: boolean;
          data?: { users?: ActivityUser[] };
        };
        if (res.ok && json.success && json.data?.users) {
          setUsers(json.data.users);
        } else {
          setUsers([]);
        }
      } catch {
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    if (user.isAdmin) {
      void load();
    } else {
      setLoading(false);
    }
  }, [user.isAdmin]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    const searched = !query
      ? users
      : users.filter(
          (item) =>
            item.name.toLowerCase().includes(query) ||
            item.email.toLowerCase().includes(query),
        );

    return [...searched].sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return joinedAtSort === "asc" ? timeA - timeB : timeB - timeA;
    });
  }, [users, search, joinedAtSort]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(1);
  }, [search, joinedAtSort]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, currentPage]);

  if (!user.isAdmin) {
    return (
      <div className="rounded-2xl border border-[var(--color-neutral-300)] bg-white p-6 text-sm text-[var(--color-neutral-600)]">
        This page is only available for admin account.
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[32px] font-bold text-[var(--color-neutral-900)]">
            Activity
          </h1>
          <p className="text-sm text-[var(--color-neutral-500)]">
            All activity user list will appear here.
          </p>
        </div>

        <div className="relative w-full max-w-[320px]">
          <MagnifyingGlassIcon
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-neutral-500)]"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search username or email"
            className="h-9 w-full rounded-full border border-[var(--color-neutral-200)] bg-[var(--color-neutral-100)] pl-9 pr-4 text-sm text-[var(--color-neutral-900)] placeholder:text-[var(--color-neutral-500)] focus:border-[var(--color-primary)] focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-end">
          <select
            value={joinedAtSort}
            onChange={(e) => setJoinedAtSort(e.target.value as JoinedAtSort)}
            className="rounded-[10px] border border-[var(--color-neutral-300)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-neutral-700)]"
          >
            <option value="desc">Joined At: DESC</option>
            <option value="asc">Joined At: ASC</option>
          </select>
        </div>

        {loading ? (
          <LoadingState message="Loading users..." />
        ) : filteredUsers.length === 0 ? (
          <div className="rounded-2xl border border-neutral-300 bg-white p-5 text-sm text-[var(--color-neutral-500)]">
            No users found.
          </div>
        ) : (
          <>
            {paginatedUsers.map((item) => (
              <Link
                key={item.id}
                href={`/dashboard/activity/${item.id}`}
                className="block rounded-2xl border border-[var(--color-neutral-300)] bg-white px-5 py-4 transition hover:bg-[var(--color-primary-pale)] hover:shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {item.picture ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.picture}
                        alt={item.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-[var(--color-primary-pale)]" />
                    )}
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-semibold text-[var(--color-neutral-900)]">
                        {item.name}
                        <span className="ml-1 inline-block text-[var(--color-primary-light)] font-medium text-xs">
                          {item.email}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}

            {filteredUsers.length > PAGE_SIZE && (
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="rounded-[10px] border border-[var(--color-neutral-300)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-neutral-700)] disabled:opacity-50"
                >
                  Prev
                </button>
                <span className="text-xs font-semibold text-[var(--color-neutral-600)]">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-[10px] border border-[var(--color-neutral-300)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-neutral-700)] disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
