"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useDashboardUser } from "@/components/organisms/DashboardShell";
import { ResultHistoryItem } from "@/types";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import { ResultHistoryCard } from "@/components/features/ResultHistoryCard";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

type TargetUser = {
  id: string;
  email: string;
  name: string;
  picture?: string;
  createdAt: string;
};

const PAGE_SIZE = 9;

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
);

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

export default function ActivityUserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const viewer = useDashboardUser();
  const [user, setUser] = useState<TargetUser | null>(null);
  const [results, setResults] = useState<ResultHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const stats = useMemo(() => {
    const totalSimulations = results.length;
    const avgAccuracy =
      totalSimulations > 0
        ? Math.round(results.reduce((acc, item) => acc + item.totalPercentage, 0) / totalSimulations)
        : 0;
    const bestAccuracy =
      totalSimulations > 0
        ? Math.max(...results.map((item) => item.totalPercentage))
        : 0;
    const latest = results[0];

    return {
      totalSimulations,
      avgAccuracy,
      bestAccuracy,
      latestScore: latest ? `${latest.heroLabel}: ${latest.heroValue}` : "-",
    };
  }, [results]);

  const progressChart = useMemo(() => {
    const sorted = [...results].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    return {
      labels: sorted.map((item) =>
        new Date(item.createdAt).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
        }),
      ),
      datasets: [
        {
          label: "Accuracy",
          data: sorted.map((item) => item.totalPercentage),
          borderColor: "#5D3FD3",
          backgroundColor: "#5D3FD3",
          tension: 0.35,
        },
      ],
    };
  }, [results]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/admin/activity/${userId}`, {
          credentials: "include",
          cache: "no-store",
        });
        const json = (await res.json()) as {
          success?: boolean;
          data?: {
            user?: TargetUser;
            results?: ResultHistoryItem[];
          };
        };

        if (res.ok && json.success && json.data?.user) {
          setUser(json.data.user);
          setResults(json.data.results || []);
        } else {
          setUser(null);
          setResults([]);
        }
      } catch {
        setUser(null);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    if (viewer.isAdmin && userId) {
      void load();
    } else {
      setLoading(false);
    }
  }, [viewer.isAdmin, userId]);

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return results.slice(start, start + PAGE_SIZE);
  }, [results, currentPage]);

  if (!viewer.isAdmin) {
    return (
      <div className="rounded-2xl border border-[var(--color-neutral-300)] bg-white p-6 text-sm text-[var(--color-neutral-600)]">
        This page is only available for admin account.
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <Link
        href="/dashboard/activity"
        className="text-sm font-semibold text-white border border-2 border-[var(--color-primary)] bg-[var(--color-primary)] mb-5! p-2 block w-fit rounded-lg hover:bg-transparent hover:text-[var(--color-primary)] duration-150"
      >
        <ArrowLeftIcon size={18} />
      </Link>

      {loading ? (
        <div className="rounded-2xl border border-[var(--color-neutral-300)] bg-white p-5 text-sm text-[var(--color-neutral-500)]">
          Loading user detail...
        </div>
      ) : !user ? (
        <div className="rounded-2xl border border-[var(--color-neutral-300)] bg-white p-5 text-sm text-[var(--color-neutral-500)]">
          User not found.
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-[var(--color-neutral-300)] bg-white p-5">
            <div className="flex items-center gap-3">
              {user.picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.picture}
                  alt={user.name}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-[var(--color-primary-pale)]" />
              )}
              <div>
                <h1 className="text-xl font-semibold text-[var(--color-neutral-900)]">
                  {user.name}
                </h1>
                <p className="text-sm text-[var(--color-neutral-600)]">
                  {user.email}
                </p>
                <p className="text-xs text-[var(--color-neutral-500)]">
                  Created: {formatDate(user.createdAt)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-neutral-300)] bg-white p-5">
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-neutral-900)]">
              Account Statistics Dashboard
            </h2>

            <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-[var(--color-neutral-50)] p-3">
                <p className="text-xs text-[var(--color-neutral-500)]">Total Simulations</p>
                <p className="text-lg font-semibold text-[var(--color-neutral-900)]">{stats.totalSimulations}</p>
              </div>
              <div className="rounded-xl bg-[var(--color-neutral-50)] p-3">
                <p className="text-xs text-[var(--color-neutral-500)]">Average Accuracy</p>
                <p className="text-lg font-semibold text-[var(--color-neutral-900)]">{stats.avgAccuracy}%</p>
              </div>
              <div className="rounded-xl bg-[var(--color-neutral-50)] p-3">
                <p className="text-xs text-[var(--color-neutral-500)]">Best Accuracy</p>
                <p className="text-lg font-semibold text-[var(--color-neutral-900)]">{stats.bestAccuracy}%</p>
              </div>
              <div className="rounded-xl bg-[var(--color-neutral-50)] p-3">
                <p className="text-xs text-[var(--color-neutral-500)]">Latest Score</p>
                <p className="text-sm font-semibold text-[var(--color-neutral-900)]">{stats.latestScore}</p>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--color-neutral-300)] bg-white p-4">
              <p className="mb-2 text-sm font-semibold text-[var(--color-neutral-900)]">
                Accuracy Trend
              </p>
              {results.length > 0 ? (
                <Line
                  data={progressChart}
                  options={{
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { stepSize: 20 },
                      },
                    },
                  }}
                />
              ) : (
                <p className="text-sm text-[var(--color-neutral-500)]">
                  No simulation data for chart yet.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-[var(--color-neutral-900)]">Simulation Results</h2>
            {results.length === 0 ? (
              <div className="rounded-2xl border border-[var(--color-neutral-300)] bg-white p-5 text-sm text-[var(--color-neutral-500)]">
                No simulation result for this user.
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {paginatedResults.map((result) => (
                    <ResultHistoryCard key={result.id} item={result} />
                  ))}
                </div>

                {results.length > PAGE_SIZE && (
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
        </>
      )}
    </section>
  );
}
