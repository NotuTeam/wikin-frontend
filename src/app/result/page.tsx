"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CountUp from "react-countup";
import {
  WritingVisual,
  WritingReviewCard,
  Certificate,
} from "@/components/features";
import { LoadingState } from "@/components/features/LoadingState";
import { SimulationResultData, SectionResultSummary } from "@/types";

export default function ResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<SimulationResultData | null>(null);
  const [isLoadingResult, setIsLoadingResult] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(),
  );
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [activeScriptKey, setActiveScriptKey] = useState<string | null>(null);

  useEffect(() => {
    const resultId = new URLSearchParams(window.location.search).get("id");

    const load = async () => {
      try {
        if (resultId) {
          try {
            const response = await fetch(`/api/results/${resultId}`, {
              credentials: "include",
              cache: "no-store",
            });
            const json = (await response.json()) as {
              success?: boolean;
              data?: { result?: SimulationResultData };
            };
            if (response.ok && json.success && json.data?.result) {
              setResult(json.data.result);
              return;
            }
          } catch {}
        }

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
      } finally {
        setIsLoadingResult(false);
      }
    };

    void load();
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
      ? {
          text: "Correct",
          className:
            "bg-[var(--color-accent-pale)] text-[var(--color-accent-dark)]",
        }
      : { text: "Incorrect", className: "bg-red-100 text-red-700" };
  };

  const stopScriptPlayback = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    speechRef.current = null;
    setActiveScriptKey(null);
  };

  const playScript = (script: string, key: string) => {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window) ||
      !script
    )
      return;

    if (activeScriptKey === key) {
      stopScriptPlayback();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(script);
    utterance.rate = 0.95;
    utterance.onend = () => {
      setActiveScriptKey(null);
      speechRef.current = null;
    };
    utterance.onerror = () => {
      setActiveScriptKey(null);
      speechRef.current = null;
    };

    speechRef.current = utterance;
    setActiveScriptKey(key);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => stopScriptPlayback();
  }, []);

  if (isLoadingResult) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <LoadingState message="Loading your result..." />
      </main>
    );
  }

  if (!result) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <div className="rounded-2xl border border-[var(--color-neutral-300)] bg-white px-6 py-12 text-center shadow-sm">
          <h2 className="mb-3 text-2xl font-semibold text-[var(--color-neutral-900)]">
            No Results Found
          </h2>
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

  const toeflSummary = result.scoreSummary?.toefl;
  const ieltsSummary = result.scoreSummary?.ielts;

  const scoreColor =
    result.totalPercentage >= 70
      ? "text-[#1DAF6A]"
      : result.totalPercentage >= 50
        ? "text-[#D9770]"
        : "text-[#DC2626]";

  const strengths = result.sectionScores.filter((s) => s.percentage >= 70);
  const weaknesses = result.sectionScores.filter((s) => s.percentage < 50);

  const heroValue =
    result.examType === "toefl"
      ? String(toeflSummary?.overall ?? result.totalPercentage)
      : (ieltsSummary?.overallBand ?? 0).toFixed(1);

  const heroSubLabel =
    result.examType === "toefl"
      ? "TOEFL ITP Overall Score"
      : "IELTS Overall Band (3 sections)";

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-7">
      <section className="rounded-3xl px-6 pt-10 flex flex-col items-center text-white md:px-10">
        <p className="text-xs text-gray-500 font-semibold bg-gray-200 block w-fit px-4 py-2 rounded-full">
          {result.difficulty}
        </p>
        <div
          className={`my-2 text-[72px] font-extrabold leading-none md:text-[80px] ${scoreColor}`}
          style={{
            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          }}
        >
          <CountUp
            end={parseFloat(heroValue)}
            duration={2}
            decimals={result.examType === "toefl" ? 0 : 1}
            separator=""
          />
        </div>
        <p className={`font-semibold ${scoreColor}`}>{heroSubLabel}</p>
        <div className="flex flex-wrap gap-2 w-full items-center justify-center p-5">
          <span className="rounded-full bg-[var(--color-primary-pale)] px-3 py-1 text-xs font-medium text-[var(--color-primary)]">
            {" "}
            {result.totalPercentage >= 70
              ? "Excellent"
              : result.totalPercentage >= 50
                ? "Good"
                : "Needs Improvement"}
          </span>
          {strengths.map((s) => (
            <span
              key={`strong-${s.sectionId}`}
              className="rounded-full bg-[var(--color-accent-pale)] px-3 py-1 text-xs font-medium text-[var(--color-accent-dark)]"
            >
              Strong: {s.sectionTitle}
            </span>
          ))}
          {weaknesses.map((s) => (
            <span
              key={`weak-${s.sectionId}`}
              className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-[var(--color-danger)]"
            >
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
      <section
        className={`shadow-sm rounded-2xl border-[var(--color-neutral-300)] bg-white`}
      >
        <div
          className={`grid gap-4 ${result.sectionScores.length === 1 ? "grid-cols-1" : "grid-cols-3"}`}
        >
          {result.sectionScores.map((section) => {
            const colorClass =
              section.percentage >= 70
                ? "text-[var(--color-accent-dark)]"
                : section.percentage >= 50
                  ? "text-[var(--color-warning)]"
                  : "text-[var(--color-danger)]";

            return (
              <div
                key={section.sectionId}
                className="flex flex-col items-center p-5"
              >
                <div className="mb-2 text-lg font-medium text-[var(--color-neutral-500)] text-center">
                  {section.sectionTitle}
                </div>
                {typeof section.scaledScore === "number" && (
                  <p
                    style={{
                      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                    }}
                    className={`my-1 text-center text-[60px] text-xs font-bold ${colorClass}`}
                  >
                    <CountUp
                      end={section.scaledScore}
                      duration={1.5}
                      decimals={0}
                    />
                  </p>
                )}
                {typeof section.bandScore === "number" && (
                  <p
                    style={{
                      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                    }}
                    className={`my-1 text-center text-[60px] text-xs font-bold ${colorClass}`}
                  >
                    <CountUp
                      end={section.bandScore}
                      duration={1.5}
                      decimals={1}
                    />
                  </p>
                )}
                <div className="flex justify-between w-[50%]">
                  <p className="text-xs text-[var(--color-neutral-500)]">
                    {section.correct} / {section.total}
                  </p>
                  <p className="text-xs text-[var(--color-neutral-500)]">
                    {section.percentage}%
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--color-neutral-300)] bg-white p-5 shadow-sm">
        <h2 className="mb-4! text-[32px] font-bold text-[var(--color-neutral-900)]">
          Question Review
        </h2>
        <div className="space-y-3">
          {result.sections.map((section) => {
            const sectionScore = scoreMap.get(section.id);
            const isExpanded = expandedSections.has(section.id);

            return (
              <div
                key={section.id}
                className="overflow-hidden rounded-2xl border border-[var(--color-neutral-300)]"
              >
                <button
                  onClick={() => toggleSection(section.id)}
                  className="flex w-full items-center justify-between bg-[var(--color-neutral-50)] px-5 py-4 text-left transition hover:bg-white"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[var(--color-neutral-500)]">
                      {isExpanded ? "▼" : "▶"}
                    </span>
                    <span className="text-sm font-semibold text-[var(--color-neutral-900)]">
                      {section.title}
                    </span>
                    {sectionScore && (
                      <span className="rounded-full bg-[var(--color-primary-pale)] px-2 py-0.5 text-xs font-medium text-[var(--color-primary)]">
                        {sectionScore.correct}/{sectionScore.total} (
                        {sectionScore.percentage}%)
                      </span>
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="space-y-4 border-t border-[var(--color-neutral-100)] p-5">
                    {section.questions.map((q) => {
                      const key = `${section.id}:${q.id}`;
                      const userAnswer = result.answers[key] ?? "";
                      const isMcq =
                        q.type === "mcq" && q.correctAnswer !== undefined;
                      const isCorrect = isMcq
                        ? userAnswer === String(q.correctAnswer)
                        : null;

                      const matchingListeningTracks =
                        section.id === "listening"
                          ? (section.listeningTracks ?? []).filter(
                              (track) =>
                                q.number >= track.start &&
                                q.number <= track.end,
                            )
                          : [];
                      const listeningTracksToShow =
                        matchingListeningTracks.filter(
                          (track) => q.number === track.start,
                        );

                      const matchingPassages =
                        section.id === "reading"
                          ? (section.passages ?? []).filter((passage) => {
                              const start = passage.questionStart ?? 1;
                              const end =
                                passage.questionEnd ?? section.questions.length;
                              return q.number >= start && q.number <= end;
                            })
                          : [];
                      const passagesToShow = matchingPassages.filter(
                        (passage) => q.number === (passage.questionStart ?? 1),
                      );

                      const userAnswerIndex =
                        q.options &&
                        userAnswer !== "" &&
                        !Number.isNaN(Number(userAnswer))
                          ? Number(userAnswer)
                          : null;

                      const userAnswerLabel =
                        q.options && userAnswerIndex !== null
                          ? `${userAnswerIndex + 1}. ${q.options[userAnswerIndex] ?? ""}`
                          : userAnswer || "(empty)";

                      const correctAnswerLabel =
                        isMcq && q.options
                          ? `${(q.correctAnswer as number) + 1}. ${q.options[q.correctAnswer as number] ?? ""}`
                          : "N/A";

                      const status = getAnswerStatus(isCorrect, q.type);

                      return (
                        <div
                          key={q.id}
                          className="rounded-2xl border border-[var(--color-neutral-300)] bg-[var(--color-neutral-50)] p-4"
                        >
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <p className="flex-1 whitespace-pre-wrap text-sm font-medium text-[var(--color-neutral-900)]">
                              Q{q.number}. {q.text}
                            </p>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}
                            >
                              {status.text}
                            </span>
                          </div>

                          {q.details?.statement && (
                            <div className="mb-3 rounded-[10px] border border-[var(--color-neutral-300)] bg-white p-3">
                              <p className="mb-1 text-xs font-semibold text-[var(--color-neutral-500)]">
                                Statement
                              </p>
                              <p className="whitespace-pre-wrap text-sm text-[var(--color-neutral-700)]">
                                {q.details.statement}
                              </p>
                            </div>
                          )}

                          {q.details?.questionText && (
                            <div className="mb-3 rounded-[10px] border border-[var(--color-neutral-300)] bg-white p-3">
                              <p className="mb-1 text-xs font-semibold text-[var(--color-neutral-500)]">
                                Question
                              </p>
                              <p className="whitespace-pre-wrap text-sm text-[var(--color-neutral-700)]">
                                {q.details.questionText}
                              </p>
                            </div>
                          )}

                          {q.details?.visualData && (
                            <WritingVisual visualData={q.details.visualData} />
                          )}

                          {q.details?.instructions && (
                            <p className="mb-3 text-xs text-slate-600">
                              Note: {q.details.instructions}
                            </p>
                          )}

                          {section.id === "listening" &&
                            listeningTracksToShow.length > 0 && (
                              <div className="mb-3 rounded-[10px] border border-[var(--color-neutral-300)] bg-white p-3">
                                <p className="mb-2 text-xs font-semibold text-[var(--color-neutral-500)]">
                                  Listening Reference
                                </p>
                                <div className="space-y-2">
                                  {listeningTracksToShow.map((track) => {
                                    const scriptKey = `${section.id}:${q.id}:${track.label}`;
                                    return (
                                      <div
                                        key={scriptKey}
                                        className="rounded-lg border border-[var(--color-neutral-300)] bg-[var(--color-neutral-50)] p-2"
                                      >
                                        <div className="mb-2 flex items-center justify-between gap-2">
                                          <p className="text-xs font-medium text-[var(--color-neutral-700)]">
                                            {track.label} (Q{track.start}-
                                            {track.end})
                                          </p>
                                          <button
                                            onClick={() =>
                                              playScript(
                                                track.script,
                                                scriptKey,
                                              )
                                            }
                                            className="rounded-md border border-[var(--color-neutral-300)] bg-white px-2 py-1 text-xs font-semibold text-[var(--color-primary)]"
                                          >
                                            {activeScriptKey === scriptKey
                                              ? "Stop Audio"
                                              : "Play Audio"}
                                          </button>
                                        </div>
                                        <p className="whitespace-pre-wrap text-xs leading-6 text-[var(--color-neutral-700)]">
                                          {track.script}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                          {section.id === "reading" &&
                            (passagesToShow.length > 0 ||
                              (!section.passages?.length &&
                                q.number === 1)) && (
                              <div className="mb-3 rounded-[10px] border border-[var(--color-neutral-300)] bg-white p-3">
                                <p className="mb-2 text-xs font-semibold text-[var(--color-neutral-500)]">
                                  Reading Passage Reference
                                </p>
                                {section.passages &&
                                section.passages.length > 0 ? (
                                  passagesToShow.map((passage, idx) => (
                                    <div
                                      key={`${section.id}:${q.id}:passage:${idx}`}
                                      className="mb-2 last:mb-0 rounded-lg border border-[var(--color-neutral-300)] bg-[var(--color-neutral-50)] p-2"
                                    >
                                      <p className="mb-1 text-xs font-medium text-[var(--color-neutral-700)]">
                                        {passage.title}
                                      </p>
                                      <p className="max-h-40 overflow-auto whitespace-pre-wrap text-xs leading-6 text-[var(--color-neutral-700)]">
                                        {passage.content}
                                      </p>
                                    </div>
                                  ))
                                ) : (
                                  <p className="max-h-40 overflow-auto whitespace-pre-wrap text-xs leading-6 text-[var(--color-neutral-700)]">
                                    {section.passageContent ||
                                      "Passage not available."}
                                  </p>
                                )}
                              </div>
                            )}

                          {isMcq && q.options?.length ? (
                            <div className="mb-3 rounded-[10px] border border-[var(--color-neutral-300)] bg-white p-3">
                              <p className="mb-2 text-xs font-semibold text-[var(--color-neutral-500)]">
                                Choices Review
                              </p>
                              <div className="space-y-2">
                                {q.options.map((option, optionIdx) => {
                                  const isCorrectChoice =
                                    optionIdx === q.correctAnswer;
                                  const isUserChoice =
                                    userAnswerIndex === optionIdx;

                                  return (
                                    <div
                                      key={`${q.id}-choice-${optionIdx}`}
                                      className={`rounded-lg border p-2 text-xs ${
                                        isCorrectChoice
                                          ? "border-[var(--color-accent)] bg-[var(--color-accent-pale)]"
                                          : isUserChoice
                                            ? "border-[var(--color-danger)] bg-red-50"
                                            : "border-[var(--color-neutral-300)] bg-[var(--color-neutral-50)]"
                                      }`}
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <span className="whitespace-pre-wrap text-[var(--color-neutral-700)]">
                                          {optionIdx + 1}. {option}
                                        </span>
                                        <span className="shrink-0 text-[10px] font-semibold">
                                          {isCorrectChoice
                                            ? "Correct"
                                            : isUserChoice
                                              ? "Your choice"
                                              : ""}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}

                          <div className="mb-3 space-y-2 text-sm">
                            <div
                              className={`rounded-[10px] border-l-4 p-3 ${
                                isCorrect === false
                                  ? "border-[var(--color-danger)] bg-red-50"
                                  : "border-[var(--color-accent)] bg-[var(--color-accent-pale)]"
                              }`}
                            >
                              <p className="mb-1 text-xs font-semibold text-[var(--color-neutral-700)]">
                                Your Answer:
                              </p>
                              <p
                                className={
                                  isCorrect === false
                                    ? "text-[var(--color-danger)]"
                                    : "text-[var(--color-neutral-700)]"
                                }
                              >
                                {userAnswerLabel}
                              </p>
                            </div>

                            {isMcq && isCorrect === false && (
                              <div className="rounded-[10px] border-l-4 border-[var(--color-accent)] bg-[var(--color-accent-pale)] p-3">
                                <p className="mb-1 text-xs font-semibold text-[var(--color-neutral-700)]">
                                  Correct Answer:
                                </p>
                                <p className="text-[var(--color-accent-dark)]">
                                  {correctAnswerLabel}
                                </p>
                              </div>
                            )}
                          </div>

                          {q.details?.writingReview && (
                            <WritingReviewCard
                              review={q.details.writingReview}
                            />
                          )}

                          <div className="rounded-[10px] border border-[var(--color-neutral-300)] bg-white p-4">
                            <p className="mb-1 text-xs font-semibold text-[var(--color-neutral-500)]">
                              Explanation:
                            </p>
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

      <section className="flex justify-center gap-5">
        <button
          onClick={() => router.push("/dashboard/result")}
          className="rounded-[10px] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(93,63,211,0.35)]"
        >
          Back to Dashboard
        </button>
        <Certificate result={result} />
      </section>
    </main>
  );
}
