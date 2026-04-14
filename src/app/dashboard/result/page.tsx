"use client";

import { useEffect, useMemo, useState } from "react";
import { ResultHistoryItem } from "@/types";
import { ArchiveIcon } from "@phosphor-icons/react";
import { ResultHistoryCard } from "@/components/features/ResultHistoryCard";
import { LoadingState } from "@/components/features/LoadingState";

type SortField = "date" | "score";
type SortDirection = "asc" | "desc";

const PAGE_SIZE = 9;

function getBandScore(item: ResultHistoryItem) {
  if (item.examType === "toefl") {
    return item.scoreSummary?.toefl?.overall ?? item.totalPercentage;
  }
  return item.scoreSummary?.ielts?.overallBand ?? item.totalPercentage / 10;
}

export default function DashboardResultPage() {
  const [results, setResults] = useState<ResultHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [examFilter, setExamFilter] = useState<"all" | "toefl" | "ielts">(
    "all",
  );
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/results?mode=history&limit=50", {
          credentials: "include",
          cache: "no-store",
        });
        const json = (await response.json()) as {
          success?: boolean;
          data?: { results?: ResultHistoryItem[] };
        };

        if (response.ok && json.success && json.data?.results) {
          setResults(json.data.results);
        } else {
          setResults([]);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const filteredResults = useMemo(() => {
    const byExam =
      examFilter === "all"
        ? results
        : results.filter((item) => item.examType === examFilter);

    return [...byExam].sort((a, b) => {
      const factor = sortDirection === "asc" ? 1 : -1;
      if (sortField === "date") {
        return (
          (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) *
          factor
        );
      }
      return (getBandScore(a) - getBandScore(b)) * factor;
    });
  }, [results, examFilter, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredResults.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(1);
  }, [examFilter, sortField, sortDirection]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredResults.slice(start, start + PAGE_SIZE);
  }, [filteredResults, currentPage]);

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-[32px] font-bold text-[var(--color-neutral-900)]">
          Simulation History
        </h1>
        <p className="mt-1 text-sm text-[var(--color-neutral-500)]">
          Simulation history will appear here.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["all", "toefl", "ielts"] as const).map((value) => (
          <button
            key={value}
            onClick={() => setExamFilter(value)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              examFilter === value
                ? "bg-[var(--color-primary)] text-white"
                : "bg-[var(--color-neutral-100)] text-[var(--color-neutral-700)]"
            }`}
          >
            {value.toUpperCase()}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            className="rounded-[10px] border border-[var(--color-neutral-300)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-neutral-700)]"
          >
            <option value="date">Sort : Date</option>
            <option value="score">Sort : Band/Score</option>
          </select>
          <select
            value={sortDirection}
            onChange={(e) => setSortDirection(e.target.value as SortDirection)}
            className="rounded-[10px] border border-[var(--color-neutral-300)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-neutral-700)]"
          >
            <option value="desc">DESC</option>
            <option value="asc">ASC</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingState message="Loading history..." />
      ) : filteredResults.length === 0 ? (
        <div className="rounded-2xl border border-[var(--color-neutral-300)] bg-white px-5 py-10 text-sm text-[var(--color-neutral-500)] flex items-center flex-col gap-2">
          <ArchiveIcon className="text-[var(--color-neutral-500)]" size={45} />
          <p className="text-lg text-[var(--color-neutral-500)]">
            There's no simulation history yet
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {paginatedResults.map((item) => (
              <ResultHistoryCard key={item.id} item={item} />
            ))}
          </div>

          {filteredResults.length > PAGE_SIZE && (
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
    </section>
  );
}
