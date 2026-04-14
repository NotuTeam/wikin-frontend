"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MonthlyRankingItem } from "@/server/db/results";
import { LoadingState } from "@/components/features/LoadingState";
import {
  Trophy,
  Medal,
  Calendar,
  CaretLeft,
  CaretRight,
  Funnel,
} from "@phosphor-icons/react";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DIFFICULTY_COLORS = {
  EASY: "bg-green-100 text-green-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HARD: "bg-red-100 text-red-700",
};

const EXAM_COLORS = {
  toefl: "text-blue-600",
  ielts: "text-purple-600",
};

type ExamType = "toefl" | "ielts";
type Difficulty = "EASY" | "MEDIUM" | "HARD";

const PER_PAGE = 10;

function getRankIcon(rank: number) {
  if (rank === 1)
    return <Trophy size={24} weight="fill" className="text-yellow-500" />;
  if (rank === 2)
    return <Medal size={24} weight="fill" className="text-gray-400" />;
  if (rank === 3)
    return <Medal size={24} weight="fill" className="text-amber-600" />;
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600">
      {rank}
    </span>
  );
}

function getRankBgColor(rank: number) {
  if (rank === 1)
    return "bg-gradient-to-r from-yellow-50 to-transparent border-l-4 border-yellow-400";
  if (rank === 2)
    return "bg-gradient-to-r from-gray-50 to-transparent border-l-4 border-gray-400";
  if (rank === 3)
    return "bg-gradient-to-r from-amber-50 to-transparent border-l-4 border-amber-500";
  return "";
}

export default function LeaderboardPage() {
  const router = useRouter();
  const [rankings, setRankings] = useState<MonthlyRankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate] = useState(() => new Date());

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalParticipants, setTotalParticipants] = useState(0);

  const [filterExamType, setFilterExamType] = useState<ExamType>("toefl");
  const [filterDifficulty, setFilterDifficulty] =
    useState<Difficulty>("MEDIUM");

  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const loadRankings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        year: String(currentYear),
        month: String(currentMonth),
        page: String(page),
        perPage: String(PER_PAGE),
      });
      params.set("examType", filterExamType);
      params.set("difficulty", filterDifficulty);

      const response = await fetch(`/api/rankings?${params}`, {
        credentials: "include",
        cache: "no-store",
      });
      const json = await response.json();

      if (response.ok && json.success && json.data?.rankings) {
        setRankings(json.data.rankings);
        setTotalPages(json.data.pagination.totalPages);
        setTotalParticipants(json.data.pagination.total);
      } else {
        setRankings([]);
        setTotalPages(1);
        setTotalParticipants(0);
      }
    } catch {
      setRankings([]);
      setTotalPages(1);
      setTotalParticipants(0);
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentMonth, page, filterExamType, filterDifficulty]);

  useEffect(() => {
    void loadRankings();
  }, [loadRankings]);

  const handleFilterChange = (
    type: "examType" | "difficulty",
    value: string,
  ) => {
    setPage(1);
    if (type === "examType") {
      setFilterExamType(value as ExamType);
    } else {
      setFilterDifficulty(value as Difficulty);
    }
  };

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[32px] font-bold text-[var(--color-neutral-900)]">
            Monthly Leaderboard
          </h1>
          <p className="mt-1 text-sm text-[var(--color-neutral-500)] flex items-center gap-2">
            Let's see who performed best this month.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white flex items-center gap-2">
            <Calendar size={16} weight="fill" />
            {MONTH_NAMES[currentMonth - 1]} {currentYear}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-[var(--color-neutral-200)] bg-white p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={filterExamType}
            onChange={(e) => handleFilterChange("examType", e.target.value)}
            className="rounded-lg border border-[var(--color-neutral-200)] bg-white px-3 py-2 text-sm text-[var(--color-neutral-700)] outline-none focus:border-[var(--color-primary)] transition"
          >
            <option value="toefl">TOEFL</option>
            <option value="ielts">IELTS</option>
          </select>

          <select
            value={filterDifficulty}
            onChange={(e) => handleFilterChange("difficulty", e.target.value)}
            className="rounded-lg border border-[var(--color-neutral-200)] bg-white px-3 py-2 text-sm text-[var(--color-neutral-700)] outline-none focus:border-[var(--color-primary)] transition"
          >
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="rounded-2xl border border-[var(--color-neutral-200)] bg-white overflow-hidden">
        {loading ? (
          <LoadingState message="Loading leaderboard..." />
        ) : rankings.length === 0 ? (
          <div className="p-10 text-center">
            <Trophy
              size={48}
              className="mx-auto text-[var(--color-neutral-300)] mb-3"
            />
            <p className="text-[var(--color-neutral-500)]">
              No leaderboard data for this filter yet.
            </p>
            <p className="mt-1 text-sm text-[var(--color-neutral-400)]">
              Be the first one!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--color-neutral-50)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-neutral-600)]">
                    Rank
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-neutral-600)]">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-neutral-600)]">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-neutral-600)]">
                    Best Score
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-neutral-600)] hidden sm:table-cell">
                    Simulations
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-neutral-600)] hidden md:table-cell">
                    Achieved
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-neutral-100)]">
                {rankings.map((item) => (
                  <tr
                    key={`${item.userGoogleSub}-${item.rank}`}
                    className={`cursor-pointer hover:bg-[var(--color-neutral-50)] transition-colors ${getRankBgColor(item.rank)}`}
                    onClick={() => router.push(`/dashboard/profile/${encodeURIComponent(item.userGoogleSub)}`)}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center">
                        {getRankIcon(item.rank)}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {item.userPicture ? (
                          <img
                            src={item.userPicture}
                            alt={item.userName}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-neutral-200)] text-sm font-semibold text-[var(--color-neutral-600)]">
                            {item.userName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-[var(--color-neutral-900)]">
                            {item.userName}
                          </p>
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${DIFFICULTY_COLORS[item.difficulty]}`}
                          >
                            {item.difficulty}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`font-semibold uppercase text-sm ${EXAM_COLORS[item.examType]}`}
                      >
                        {item.examType}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-bold text-[var(--color-neutral-900)]">
                          {item.bestScoreValue}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden sm:table-cell">
                      <span className="inline-flex items-center rounded-full bg-[var(--color-neutral-100)] px-3 py-1 text-sm font-semibold text-[var(--color-neutral-700)]">
                        {item.totalSimulations}x
                      </span>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <span className="text-sm text-[var(--color-neutral-500)]">
                        {new Date(item.achievedAt).toLocaleDateString("en-US", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--color-neutral-500)]">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="flex items-center gap-1 rounded-lg border border-[var(--color-neutral-200)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-neutral-700)] transition hover:bg-[var(--color-neutral-50)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CaretLeft size={16} />
              Previous
            </button>

            {generatePageNumbers(page, totalPages).map((p, i) =>
              p === "..." ? (
                <span
                  key={`ellipsis-${i}`}
                  className="px-2 text-sm text-[var(--color-neutral-400)]"
                >
                  ...
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  disabled={loading}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition ${
                    page === p
                      ? "bg-[var(--color-primary)] text-white"
                      : "border border-[var(--color-neutral-200)] bg-white text-[var(--color-neutral-700)] hover:bg-[var(--color-neutral-50)]"
                  } disabled:cursor-not-allowed`}
                >
                  {p}
                </button>
              ),
            )}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="flex items-center gap-1 rounded-lg border border-[var(--color-neutral-200)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-neutral-700)] transition hover:bg-[var(--color-neutral-50)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <CaretRight size={16} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function generatePageNumbers(
  current: number,
  total: number,
): (number | "...")[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [1];

  if (current > 3) {
    pages.push("...");
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push("...");
  }

  pages.push(total);

  return pages;
}
