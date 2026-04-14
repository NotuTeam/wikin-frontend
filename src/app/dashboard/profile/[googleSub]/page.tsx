"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ResultHistoryItem } from "@/types";
import { ArrowLeft } from "@phosphor-icons/react";
import { ResultHistoryCard } from "@/components/features/ResultHistoryCard";
import { LoadingState } from "@/components/features/LoadingState";
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

type ProfileUser = {
  name: string;
  picture?: string;
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

export default function UserProfilePage() {
  const { googleSub } = useParams<{ googleSub: string }>();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [results, setResults] = useState<ResultHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const stats = useMemo(() => {
    const totalSimulations = results.length;
    const avgAccuracy =
      totalSimulations > 0
        ? Math.round(
            results.reduce((acc, item) => acc + item.totalPercentage, 0) /
              totalSimulations,
          )
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
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    const labels = sorted.map((item) =>
      new Date(item.createdAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      }),
    );
    const data = sorted.map((item) => item.totalPercentage);

    return {
      labels: ["Start", ...labels],
      datasets: [
        {
          label: "Accuracy",
          data: [0, ...data],
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
        const res = await fetch(`/api/users/${googleSub}`, {
          credentials: "include",
          cache: "no-store",
        });
        const json = (await res.json()) as {
          success?: boolean;
          data?: {
            user?: ProfileUser;
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

    if (googleSub) {
      void load();
    }
  }, [googleSub]);

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

  return (
    <section className="space-y-4">
      <Link
        href="/dashboard/leaderboard"
        className="inline-flex items-center gap-2 rounded-lg border-2 border-[var(--color-primary)] bg-[var(--color-primary)] p-2 text-sm font-semibold text-white duration-150 hover:bg-transparent hover:text-[var(--color-primary)]"
      >
        <ArrowLeft size={18} />
      </Link>

      {loading ? (
        <LoadingState message="Loading user profile..." />
      ) : !user ? (
        <div className="rounded-2xl border border-[var(--color-neutral-300)] bg-white p-5 text-sm text-[var(--color-neutral-500)]">
          User not found.
        </div>
      ) : (
        <>
          {/* Profile Header */}
          <div className="rounded-2xl border border-[var(--color-neutral-300)] bg-white p-5">
            <div className="flex items-center gap-3">
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary-pale)] text-lg font-semibold text-[var(--color-primary)]">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-xl font-semibold text-[var(--color-neutral-900)]">
                  {user.name}
                </h1>
                {/* <p className="text-sm text-[var(--color-neutral-500)]">
                  User Profile
                </p> */}
              </div>
            </div>
          </div>

          {/* Stats Dashboard */}
          <div className="rounded-2xl border border-[var(--color-neutral-300)] bg-white p-5">
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-neutral-900)]">
              Simulation Statistics
            </h2>

            <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-[var(--color-neutral-50)] p-3">
                <p className="text-xs text-[var(--color-neutral-500)]">
                  Total Simulations
                </p>
                <p className="text-lg font-semibold text-[var(--color-neutral-900)]">
                  {stats.totalSimulations}
                </p>
              </div>
              <div className="rounded-xl bg-[var(--color-neutral-50)] p-3">
                <p className="text-xs text-[var(--color-neutral-500)]">
                  Average Accuracy
                </p>
                <p className="text-lg font-semibold text-[var(--color-neutral-900)]">
                  {stats.avgAccuracy}%
                </p>
              </div>
              <div className="rounded-xl bg-[var(--color-neutral-50)] p-3">
                <p className="text-xs text-[var(--color-neutral-500)]">
                  Best Accuracy
                </p>
                <p className="text-lg font-semibold text-[var(--color-neutral-900)]">
                  {stats.bestAccuracy}%
                </p>
              </div>
              <div className="rounded-xl bg-[var(--color-neutral-50)] p-3">
                <p className="text-xs text-[var(--color-neutral-500)]">
                  Latest Score
                </p>
                <p className="text-sm font-semibold text-[var(--color-neutral-900)]">
                  {stats.latestScore}
                </p>
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
                  No simulation data yet.
                </p>
              )}
            </div>
          </div>

          {/* Simulation Results */}
          <div className="space-y-3">
            <h2 className="text-lg mb-3! font-semibold text-[var(--color-neutral-900)]">
              Simulation History
            </h2>
            {results.length === 0 ? (
              <div className="rounded-2xl border border-[var(--color-neutral-300)] bg-white p-5 text-sm text-[var(--color-neutral-500)]">
                No simulation results yet.
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {paginatedResults.map((result) => (
                    <ResultHistoryCard key={result.id} item={result} readOnly />
                  ))}
                </div>

                {results.length > PAGE_SIZE && (
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={currentPage === 1}
                      className="rounded-[10px] border border-[var(--color-neutral-300)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-neutral-700)] disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="text-xs font-semibold text-[var(--color-neutral-600)]">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
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
