"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { WritingVisual, WritingReviewCard } from "@/components/features";
import { SimulationResultData, SectionResultSummary } from "@/types";

export default function ResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<SimulationResultData | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("simulation-result");
      if (!raw) {
        setResult(null);
        return;
      }
      setResult(JSON.parse(raw) as SimulationResultData);
    } catch {
      setResult(null);
    }
  }, []);

  const scoreMap = useMemo(() => {
    if (!result) return new Map<string, SectionResultSummary>();
    return new Map(result.sectionScores.map((s) => [s.sectionId, s]));
  }, [result]);

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) newExpanded.delete(sectionId);
    else newExpanded.add(sectionId);
    setExpandedSections(newExpanded);
  };

  const getAnswerStatus = (isCorrect: boolean | null, questionType: string) => {
    if (isCorrect === null) {
      return questionType === "text"
        ? { text: "Submitted", className: "bg-blue-100 text-blue-800" }
        : { text: "Not auto-graded", className: "bg-slate-100 text-slate-700" };
    }
    return isCorrect
      ? { text: "Correct", className: "bg-[var(--color-accent-pale)] text-[var(--color-accent-dark)]" }
      : { text: "Incorrect", className: "bg-red-100 text-red-700" };
  };

  if (!result) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <div className="rounded-2xl border border-[var(--color-neutral-300)] bg-white px-6 py-12 text-center shadow-sm">
          <h2 className="mb-3 text-2xl font-semibold text-[var(--color-neutral-900)]">No Results Found</h2>
          <p className="mb-6 text-sm text-[var(--color-neutral-500)]">
            Please complete a simulation first to see your results.
          </p>
          <button
            onClick={() => router.push("/")}
            className="rounded-[10px] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white"
          >
            Back to Simulation
          </button>
        </div>
      </main>
    );
  }

  const heroGradient =
    result.totalPercentage >= 70
      ? "linear-gradient(135deg, #1DAF6A, #3DD68C)"
      : result.totalPercentage >= 50
        ? "linear-gradient(135deg, #D97706, #F59E0B)"
        : "linear-gradient(135deg, #DC2626, #EF4444)";

  const strengths = result.sectionScores.filter((s) => s.percentage >= 70);
  const weaknesses = result.sectionScores.filter((s) => s.percentage < 50);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-7">
      <section
        className="rounded-3xl px-6 py-10 text-center text-white md:px-10"
        style={{ background: heroGradient }}
      >
        <p className="text-sm text-white/80">{result.examType.toUpperCase()} Simulation — {result.difficulty}</p>
        <div
          className="my-2 text-[72px] font-extrabold leading-none md:text-[80px]"
          style={{ fontFamily: '"JetBrains Mono", "Fira Code", monospace' }}
        >
          {result.totalPercentage}
        </div>
        <p className="text-base text-white/80">dari 100 maksimal</p>
        <span className="mt-3 inline-flex rounded-full bg-white/20 px-4 py-1 text-xs font-medium">
          {result.totalPercentage >= 70
            ? "Excellent"
            : result.totalPercentage >= 50
              ? "Good"
              : "Needs Improvement"}
        </span>
      </section>

      <section className={`grid gap-4 ${result.sectionScores.length === 1 ? "grid-cols-1" : "md:grid-cols-2 xl:grid-cols-4"}`}>
        {result.sectionScores.map((section) => {
          const colorClass =
            section.percentage >= 70
              ? "text-[var(--color-accent-dark)]"
              : section.percentage >= 50
                ? "text-[var(--color-warning)]"
                : "text-[var(--color-danger)]";
          const barColor =
            section.percentage >= 70
              ? "var(--color-accent)"
              : section.percentage >= 50
                ? "var(--color-warning)"
                : "var(--color-danger)";

          return (
            <div key={section.sectionId} className="rounded-2xl border border-[var(--color-neutral-300)] bg-white p-5 shadow-sm">
              <div className="mb-2 text-xs font-medium text-[var(--color-neutral-500)]">{section.sectionTitle}</div>
              <div
                className={`mb-3 text-[28px] font-bold ${colorClass}`}
                style={{ fontFamily: '"JetBrains Mono", "Fira Code", monospace' }}
              >
                {section.percentage}%
              </div>
              <div className="mb-2 h-1.5 rounded-full bg-[var(--color-neutral-100)]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${section.percentage}%`, background: barColor }}
                />
              </div>
              <p className="text-xs text-[var(--color-neutral-500)]">{section.correct} / {section.total} correct answers</p>
            </div>
          );
        })}
      </section>

      <section className="rounded-2xl border border-[var(--color-neutral-300)] bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-xl font-semibold text-[var(--color-neutral-900)]">Performance Tags</h3>
        <div className="flex flex-wrap gap-2">
          {strengths.map((s) => (
            <span key={`strong-${s.sectionId}`} className="rounded-full bg-[var(--color-accent-pale)] px-3 py-1 text-xs font-medium text-[var(--color-accent-dark)]">
Strong: {s.sectionTitle}
            </span>
          ))}
          {weaknesses.map((s) => (
            <span key={`weak-${s.sectionId}`} className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-[var(--color-danger)]">
Weak: {s.sectionTitle}
            </span>
          ))}
          {!strengths.length && !weaknesses.length && (
            <span className="rounded-full bg-[var(--color-neutral-100)] px-3 py-1 text-xs font-medium text-[var(--color-neutral-500)]">
All sections are in the middle range
            </span>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--color-neutral-300)] bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-[32px] font-bold text-[var(--color-neutral-900)]">Question Review</h2>
        <div className="space-y-3">
          {result.sections.map((section) => {
            const sectionScore = scoreMap.get(section.id);
            const isExpanded = expandedSections.has(section.id);

            return (
              <div key={section.id} className="overflow-hidden rounded-2xl border border-[var(--color-neutral-300)]">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="flex w-full items-center justify-between bg-[var(--color-neutral-50)] px-5 py-4 text-left transition hover:bg-white"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[var(--color-neutral-500)]">{isExpanded ? "▼" : "▶"}</span>
                    <span className="text-sm font-semibold text-[var(--color-neutral-900)]">{section.title}</span>
                    {sectionScore && (
                      <span className="rounded-full bg-[var(--color-primary-pale)] px-2 py-0.5 text-xs font-medium text-[var(--color-primary)]">
                        {sectionScore.correct}/{sectionScore.total} ({sectionScore.percentage}%)
                      </span>
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="space-y-4 border-t border-[var(--color-neutral-100)] p-5">
                    {section.questions.map((q) => {
                      const key = `${section.id}:${q.id}`;
                      const userAnswer = result.answers[key] ?? "";
                      const isMcq = q.type === "mcq" && q.correctAnswer !== undefined;
                      const isCorrect = isMcq ? userAnswer === String(q.correctAnswer) : null;

                      const userAnswerLabel =
                        q.options && userAnswer !== "" && !Number.isNaN(Number(userAnswer))
                          ? `${Number(userAnswer) + 1}. ${q.options[Number(userAnswer)] ?? ""}`
                          : userAnswer || "(empty)";

                      const correctAnswerLabel =
                        isMcq && q.options
                          ? `${(q.correctAnswer as number) + 1}. ${q.options[q.correctAnswer as number] ?? ""}`
                          : "N/A";

                      const status = getAnswerStatus(isCorrect, q.type);

                      return (
                        <div key={q.id} className="rounded-2xl border border-[var(--color-neutral-300)] bg-[var(--color-neutral-50)] p-4">
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <p className="flex-1 whitespace-pre-wrap text-sm font-medium text-[var(--color-neutral-900)]">
                              Q{q.number}. {q.text}
                            </p>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>
                              {status.text}
                            </span>
                          </div>

                          {q.details?.statement && (
                            <div className="mb-3 rounded-[10px] border border-[var(--color-neutral-300)] bg-white p-3">
                              <p className="mb-1 text-xs font-semibold text-[var(--color-neutral-500)]">Statement</p>
                              <p className="whitespace-pre-wrap text-sm text-[var(--color-neutral-700)]">{q.details.statement}</p>
                            </div>
                          )}

                          {q.details?.questionText && (
                            <div className="mb-3 rounded-[10px] border border-[var(--color-neutral-300)] bg-white p-3">
                              <p className="mb-1 text-xs font-semibold text-[var(--color-neutral-500)]">Question</p>
                              <p className="whitespace-pre-wrap text-sm text-[var(--color-neutral-700)]">{q.details.questionText}</p>
                            </div>
                          )}

                          {q.details?.visualData && <WritingVisual visualData={q.details.visualData} />}

                          {q.details?.instructions && (
                            <p className="mb-3 text-xs text-slate-600">Note: {q.details.instructions}</p>
                          )}

                          <div className="mb-3 space-y-2 text-sm">
                            <div className={`rounded-[10px] border-l-4 p-3 ${
                              isCorrect === false
                                ? "border-[var(--color-danger)] bg-red-50"
                                : "border-[var(--color-accent)] bg-[var(--color-accent-pale)]"
                            }`}>
                              <p className="mb-1 text-xs font-semibold text-[var(--color-neutral-700)]">Your Answer:</p>
                              <p className={isCorrect === false ? "text-[var(--color-danger)]" : "text-[var(--color-neutral-700)]"}>{userAnswerLabel}</p>
                            </div>

                            {isMcq && isCorrect === false && (
                              <div className="rounded-[10px] border-l-4 border-[var(--color-accent)] bg-[var(--color-accent-pale)] p-3">
                                <p className="mb-1 text-xs font-semibold text-[var(--color-neutral-700)]">Correct Answer:</p>
                                <p className="text-[var(--color-accent-dark)]">{correctAnswerLabel}</p>
                              </div>
                            )}
                          </div>

                          {q.details?.writingReview && <WritingReviewCard review={q.details.writingReview} />}

                          <div className="rounded-[10px] border border-[var(--color-neutral-300)] bg-white p-4">
                            <p className="mb-1 text-xs font-semibold text-[var(--color-neutral-500)]">Explanation:</p>
                            <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--color-neutral-700)]">
                              {q.details?.writingReview?.summary ||
                                q.explanation ||
                                q.details?.sampleAnswer?.examinerComments ||
                                "Explanation not available."}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <button
        onClick={() => router.push("/")}
        className="w-full rounded-[10px] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(93,63,211,0.35)]"
      >
        Back to Home
      </button>
    </main>
  );
}
