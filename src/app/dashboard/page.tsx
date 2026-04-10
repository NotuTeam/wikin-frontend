"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
import { useDashboardUser } from "@/components/organisms/DashboardShell";
import { ProgressOverview, ResultHistoryItem } from "@/types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
);

type ExamFilter = "all" | "ielts" | "toefl";

function SkeletonBox({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-[var(--color-neutral-100)] ${className}`}
    />
  );
}

function formatRelative(dateIso: string) {
  const date = new Date(dateIso).getTime();
  const diffMs = Date.now() - date;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function monthKey(dateIso: string) {
  const d = new Date(dateIso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
}

function buildChartOptions() {
  return {
    responsive: true,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: { beginAtZero: true, max: 100, ticks: { stepSize: 20 } },
    },
  };
}

function buildLineData(labels: string[], data: number[], color: string) {
  const labelsWithStart = ["Start", ...labels];
  const dataWithStart = [0, ...data];

  return {
    labels: labelsWithStart,
    datasets: [
      {
        data: dataWithStart,
        borderColor: color,
        backgroundColor: color,
        tension: 0.35,
      },
    ],
  };
}

function aggregateSectionProgress(results: ResultHistoryItem[]) {
  const map = new Map<
    string,
    {
      sectionTitle: string;
      attempts: number;
      sum: number;
      best: number;
      latest: number;
    }
  >();

  for (const item of results) {
    for (const section of item.sections) {
      const key = section.sectionId;
      const current = map.get(key);
      if (!current) {
        map.set(key, {
          sectionTitle: section.sectionTitle,
          attempts: 1,
          sum: section.percentage,
          best: section.percentage,
          latest: section.percentage,
        });
      } else {
        current.attempts += 1;
        current.sum += section.percentage;
        current.best = Math.max(current.best, section.percentage);
      }
    }
  }

  return Array.from(map.entries()).map(([sectionId, value]) => ({
    sectionId,
    sectionTitle: value.sectionTitle,
    attempts: value.attempts,
    averagePercentage: Math.round(value.sum / value.attempts),
    bestPercentage: value.best,
    latestPercentage: value.latest,
  }));
}

export default function DashboardPage() {
  const user = useDashboardUser();
  const [overview, setOverview] = useState<ProgressOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [examFilter, setExamFilter] = useState<ExamFilter>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/results?mode=overview", {
          credentials: "include",
          cache: "no-store",
        });
        const json = (await res.json()) as {
          success?: boolean;
          data?: ProgressOverview;
        };
        if (res.ok && json.success && json.data) {
          setOverview(json.data);
        } else {
          setOverview(null);
        }
      } catch {
        setOverview(null);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const allRecentResults = useMemo(
    () => overview?.recentResults || [],
    [overview],
  );

  const examFilteredResults = useMemo(() => {
    if (examFilter === "all") return allRecentResults;
    return allRecentResults.filter((item) => item.examType === examFilter);
  }, [allRecentResults, examFilter]);

  const monthOptions = useMemo(() => {
    const keys = Array.from(
      new Set(examFilteredResults.map((r) => monthKey(r.createdAt))),
    );
    return keys.sort((a, b) => b.localeCompare(a));
  }, [examFilteredResults]);

  useEffect(() => {
    if (monthFilter !== "all" && !monthOptions.includes(monthFilter)) {
      setMonthFilter("all");
    }
  }, [monthFilter, monthOptions]);

  const chartResults = useMemo(() => {
    const sorted = [...examFilteredResults].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    if (monthFilter === "all") return sorted;
    return sorted.filter((item) => monthKey(item.createdAt) === monthFilter);
  }, [examFilteredResults, monthFilter]);

  const sectionProgress = useMemo(
    () => aggregateSectionProgress(examFilteredResults),
    [examFilteredResults],
  );

  const recentResults = useMemo(
    () => examFilteredResults.slice(0, 3),
    [examFilteredResults],
  );

  const stats = useMemo(() => {
    const completed = examFilteredResults.length;
    const avg =
      completed > 0
        ? Math.round(
            examFilteredResults.reduce((acc, r) => acc + r.totalPercentage, 0) /
              completed,
          )
        : 0;
    const best =
      completed > 0
        ? Math.max(...examFilteredResults.map((r) => r.totalPercentage))
        : 0;
    const latest = examFilteredResults[0];
    const previous = examFilteredResults[1];
    const delta =
      latest && previous
        ? latest.totalPercentage - previous.totalPercentage
        : null;

    return [
      {
        label: "Latest Score",
        value: latest ? latest.heroValue : "-",
        delta: latest ? latest.heroLabel : "No data",
      },
      {
        label: "Completed Sessions",
        value: String(completed),
        delta: completed > 0 ? "Saved in database" : "No session yet",
      },
      {
        label: "Average Accuracy",
        value: `${avg}%`,
        delta:
          delta === null
            ? "No comparison yet"
            : `${delta >= 0 ? "↑" : "↓"} ${Math.abs(delta)} vs previous`,
      },
      {
        label: "Best Accuracy",
        value: `${best}%`,
        delta: "Best historical result",
      },
    ];
  }, [examFilteredResults]);

  const chartLabels = chartResults.map((r) =>
    new Date(r.createdAt).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    }),
  );

  const sectionIds = useMemo(() => {
    const ids = new Set<string>();
    chartResults.forEach((r) =>
      r.sections.forEach((s) => ids.add(s.sectionId)),
    );
    return Array.from(ids).slice(0, 3);
  }, [chartResults]);

  const sectionTitleById = useMemo(() => {
    const map = new Map<string, string>();
    chartResults.forEach((r) =>
      r.sections.forEach((s) => map.set(s.sectionId, s.sectionTitle)),
    );
    return map;
  }, [chartResults]);

  return (
    <>
      <div
        className="mb-7 rounded-[24px] px-6 py-6 text-white"
        style={{ background: "var(--gradient-banner)" }}
      >
        <p className="text-[11px] uppercase tracking-[0.14em] text-white/70">
          Wikin Academy
        </p>
        <h1 className="mt-2! mb-5! block text-3xl font-bold text-white!">
          Welcome back, {user.name}
        </h1>
        <p className="text-sm text-white/80">
          Your simulation history and progress are now persisted.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.04em] text-[var(--color-neutral-500)]">
          Simulation Type
        </span>
        {(["all", "ielts", "toefl"] as const).map((type) => (
          <button
            key={type}
            onClick={() => setExamFilter(type)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              examFilter === type
                ? "bg-[var(--color-primary)] text-white"
                : "bg-[var(--color-neutral-100)] text-[var(--color-neutral-700)]"
            }`}
          >
            {type.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="mb-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={`stats-skeleton-${idx}`}
                className="rounded-2xl border border-[var(--color-neutral-300)] bg-white p-5 shadow-sm"
              >
                <SkeletonBox className="h-3 w-24" />
                <SkeletonBox className="mt-2 h-8 w-16" />
                <SkeletonBox className="mt-2 h-3 w-32" />
              </div>
            ))
          : stats.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-[var(--color-neutral-300)] bg-white p-5 shadow-sm"
              >
                <p className="text-xs text-[var(--color-neutral-500)]">
                  {item.label}
                </p>
                <p
                  className="mt-1 text-2xl font-bold text-[var(--color-neutral-900)]"
                  style={{
                    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                  }}
                >
                  {item.value}
                </p>
                <p className="mt-1 text-xs text-[var(--color-neutral-600)]">
                  {item.delta}
                </p>
              </div>
            ))}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[32px] font-bold text-[var(--color-neutral-900)]">
          Progress
        </h2>
        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="rounded-[10px] border border-[var(--color-neutral-300)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-neutral-700)]"
        >
          <option value="all">All Months</option>
          {monthOptions.map((key) => (
            <option key={key} value={key}>
              {monthLabel(key)}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-7 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={`chart-skeleton-${idx}`}
              className="rounded-2xl border border-[var(--color-neutral-300)] bg-white p-5 shadow-sm"
            >
              <SkeletonBox className="h-4 w-24" />
              <SkeletonBox className="mt-3 h-40 w-full" />
            </div>
          ))
        ) : (
          <>
            <div className="rounded-2xl border border-[var(--color-neutral-300)] bg-white p-5 shadow-sm">
              <p className="mb-2 text-sm font-semibold text-[var(--color-neutral-900)]">
                Overall Score
              </p>
              <Line
                data={buildLineData(
                  chartLabels,
                  chartResults.map((r) => r.totalPercentage),
                  "#5D3FD3",
                )}
                options={buildChartOptions()}
              />
            </div>
            {sectionIds.map((sectionId, idx) => {
              const color = ["#3B82F6", "#3DD68C", "#F59E0B"][idx] || "#EF4444";
              return (
                <div
                  key={sectionId}
                  className="rounded-2xl border border-[var(--color-neutral-300)] bg-white p-5 shadow-sm"
                >
                  <p className="mb-2 text-sm font-semibold text-[var(--color-neutral-900)]">
                    {sectionTitleById.get(sectionId) || sectionId}
                  </p>
                  <Line
                    data={buildLineData(
                      chartLabels,
                      chartResults.map(
                        (r) =>
                          r.sections.find((s) => s.sectionId === sectionId)
                            ?.percentage ?? 0,
                      ),
                      color,
                    )}
                    options={buildChartOptions()}
                  />
                </div>
              );
            })}
            {sectionIds.length < 3 &&
              Array.from({ length: 3 - sectionIds.length }).map((_, idx) => (
                <div
                  key={`empty-section-chart-${idx}`}
                  className="rounded-2xl border border-[var(--color-neutral-300)] bg-white p-5 text-sm text-[var(--color-neutral-500)] shadow-sm"
                >
                  Not enough section data.
                </div>
              ))}
          </>
        )}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[32px] font-bold text-[var(--color-neutral-900)]">
          Recent Results
        </h2>
      </div>

      <div className="space-y-3">
        {loading
          ? Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={`recent-skeleton-${idx}`}
                className="rounded-2xl border border-[var(--color-neutral-300)] bg-white px-6 py-5"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex-1">
                    <SkeletonBox className="h-4 w-44" />
                    <SkeletonBox className="mt-2 h-3 w-56" />
                  </div>
                  <div className="w-28">
                    <SkeletonBox className="ml-auto h-3 w-16" />
                    <SkeletonBox className="mt-2 ml-auto h-3 w-20" />
                    <SkeletonBox className="mt-2 ml-auto h-3 w-12" />
                  </div>
                </div>
              </div>
            ))
          : recentResults.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-[var(--color-neutral-300)] bg-white px-6 py-5"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <h3 className="text-base font-semibold text-[var(--color-primary)]">
                        {item.examType.toUpperCase()} — {item.difficulty}
                      </h3>
                      <span className="rounded-md bg-[var(--color-primary-pale)] px-2 py-0.5 text-xs font-medium text-[var(--color-primary)]">
                        {item.heroLabel}: {item.heroValue}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--color-neutral-500)]">
                      {item.sections
                        .map((s) => `${s.sectionTitle} ${s.percentage}%`)
                        .join(" • ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[var(--color-neutral-500)]">
                      Saved
                    </p>
                    <p className="text-xs font-medium text-[var(--color-neutral-700)]">
                      {formatRelative(item.createdAt)}
                    </p>
                    <Link
                      href={`/result?id=${item.id}`}
                      className="mt-2 inline-block text-xs font-semibold text-[var(--color-primary)]"
                    >
                      Review
                    </Link>
                  </div>
                </div>
              </div>
            ))}

        {!loading && examFilteredResults.length === 0 && (
          <div className="rounded-2xl border border-[var(--color-neutral-300)] bg-white px-6 py-8 text-center text-sm text-[var(--color-neutral-500)]">
            No saved result yet for selected simulation type.
          </div>
        )}
      </div>

      {!loading && !sectionProgress.length && (
        <div className="mt-4 rounded-2xl border border-[var(--color-neutral-300)] bg-white p-5 text-sm text-[var(--color-neutral-500)]">
          No section data yet. Finish a simulation to populate progress.
        </div>
      )}
    </>
  );
}
