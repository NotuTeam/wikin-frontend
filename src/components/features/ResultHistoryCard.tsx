import Link from "next/link";
import { ResultHistoryItem } from "@/types";

function formatDate(dateIso: string) {
  const date = new Date(dateIso);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getScoreDisplay(item: ResultHistoryItem) {
  if (item.examType === "toefl") {
    const overall = item.scoreSummary?.toefl?.overall;
    return overall ? `TOEFL ${overall}` : `${item.totalPercentage}%`;
  }

  const band = item.scoreSummary?.ielts?.overallBand;
  return typeof band === "number"
    ? `IELTS ${band.toFixed(1)}`
    : `IELTS ${(item.totalPercentage / 10).toFixed(1)}`;
}

export function ResultHistoryCard({ item, readOnly = false }: { item: ResultHistoryItem; readOnly?: boolean }) {
  const content = (
    <>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[var(--color-neutral-900)]">
            {item.examType.toUpperCase()} · {item.difficulty}
          </p>
          <p className="text-xs text-[var(--color-neutral-500)]">
            {formatDate(item.createdAt)}
          </p>
        </div>
        <span className="rounded-md bg-[var(--color-primary-pale)] px-2 py-0.5 text-xs font-semibold text-[var(--color-primary)]">
          {getScoreDisplay(item)}
        </span>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <div className="rounded-[10px] bg-[var(--color-neutral-50)] p-2">
          <p className="text-[11px] text-[var(--color-neutral-500)]">Accuracy</p>
          <p className="text-sm font-semibold text-[var(--color-neutral-900)]">
            {item.totalPercentage}%
          </p>
        </div>
        <div className="rounded-[10px] bg-[var(--color-neutral-50)] p-2">
          <p className="text-[11px] text-[var(--color-neutral-500)]">Correct</p>
          <p className="text-sm font-semibold text-[var(--color-neutral-900)]">
            {item.totalCorrect}/{item.totalQuestions}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.04em] text-[var(--color-neutral-500)]">
          Section Scores
        </p>
        {item.sections.map((section) => (
          <div
            key={`${item.id}-${section.sectionId}`}
            className="rounded-[10px] border border-[var(--color-neutral-300)] bg-[var(--color-neutral-50)] p-2"
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-[var(--color-neutral-700)]">
                {section.sectionTitle}
              </p>
              <p className="text-xs font-semibold text-[var(--color-primary)]">
                {section.percentage}%
              </p>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--color-neutral-200)]">
              <div
                className="h-full rounded-full bg-[var(--color-accent)]"
                style={{ width: `${section.percentage}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-[var(--color-neutral-500)]">
              {section.correct}/{section.total}
              {typeof section.bandScore === "number"
                ? ` • Band ${section.bandScore.toFixed(1)}`
                : ""}
              {typeof section.scaledScore === "number"
                ? ` • Scaled ${section.scaledScore}`
                : ""}
            </p>
          </div>
        ))}
      </div>
    </>
  );

  if (readOnly) {
    return (
      <div className="rounded-2xl border border-[var(--color-neutral-300)] bg-white p-5 shadow-sm">
        {content}
      </div>
    );
  }

  return (
    <Link
      href={`/result?id=${item.id}`}
      className="group block cursor-pointer rounded-2xl border border-[var(--color-neutral-300)] bg-white p-5 shadow-sm transition-all duration-300 hover:border-[var(--color-primary-pale)] hover:shadow-[0_8px_18px_rgba(0,0,0,0.10)] hover:bg-[var(--color-primary-pale)]"
    >
      {content}
    </Link>
  );
}
