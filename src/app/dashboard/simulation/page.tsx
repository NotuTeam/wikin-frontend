"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  EXAM_TEMPLATES,
  decryptLocalSession,
  idbDeleteSession,
  idbGetSession,
} from "@/lib";
import { Difficulty, ExamType, SimulationSessionPayload } from "@/types";
import { QuotaIndicator } from "@/components/features/QuotaIndicator";
import { LoadingState } from "@/components/features/LoadingState";
import { useQuota } from "@/hooks/useQuota";

const examTypes: ExamType[] = ["toefl", "ielts"];
const difficulties: Difficulty[] = ["EASY", "MEDIUM", "HARD"];

export default function DashboardSimulationPage() {
  const router = useRouter();
  const [examType, setExamType] = useState<ExamType>("toefl");
  const [difficulty, setDifficulty] = useState<Difficulty>("MEDIUM");
  const [activeSession, setActiveSession] =
    useState<SimulationSessionPayload | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const { quota, loading: quotaLoading } = useQuota();

  const quotaExhausted = quotaLoading || !quota || quota.remaining === 0;

  useEffect(() => {
    const checkActiveSession = async () => {
      try {
        const encrypted = await idbGetSession();
        if (!encrypted) {
          setActiveSession(null);
          return;
        }

        const payload = await decryptLocalSession(encrypted);
        if (!payload || !payload.started) {
          await idbDeleteSession();
          setActiveSession(null);
          return;
        }

        setActiveSession(payload);
      } catch {
        setActiveSession(null);
      } finally {
        setCheckingSession(false);
      }
    };

    checkActiveSession();
  }, []);

  const goToSimulationRunner = () => {
    if (activeSession?.examType) {
      toast.error(
        "An active session is still running. Continue or exit the session first.",
      );
      return;
    }

    router.push(`/simulation/${examType}?difficulty=${difficulty}`);
  };

  const continueSession = () => {
    if (!activeSession?.examType) return;
    router.push(`/simulation/${activeSession.examType}`);
  };

  const exitSession = async () => {
    try {
      await idbDeleteSession();
      setActiveSession(null);
      toast.success("Session ended successfully.");
    } catch {
      toast.error("Failed to end session.");
    }
  };

  return (
    <section className="mx-auto max-w-[980px] space-y-4 relative">
      <QuotaIndicator quota={quota} loading={quotaLoading} />
      <div className="rounded-2xl border border-[var(--color-neutral-300)] bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-[var(--color-neutral-900)] text-center">
          Start Simulation
        </h1>
        <p className="mt-1 text-sm text-[var(--color-neutral-500)] text-center">
          Select the test type, determine the difficulty, then start the
          session.
        </p>
        <div className="flex flex-wrap gap-4 items-center justify-center mt-6 py-3">
          {difficulties.map((level) => (
            <label
              key={level}
              className="inline-flex items-center gap-2 text-sm text-[var(--color-neutral-700)] capitalize"
            >
              <input
                type="radio"
                name="difficulty"
                value={level}
                checked={difficulty === level}
                onChange={() => setDifficulty(level)}
                disabled={!!activeSession || quotaExhausted}
                className="h-4 w-4 accent-[var(--color-primary)]"
              />
              {level.toLowerCase()}
            </label>
          ))}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {examTypes.map((type) => {
            const selected = examType === type;
            const templates = EXAM_TEMPLATES[type];

            return (
              <button
                key={type}
                type="button"
                disabled={!!activeSession || quotaExhausted}
                onClick={() => setExamType(type)}
                className={`rounded-2xl border p-4 text-left transition ${
                  selected
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-pale)]"
                    : "border-[var(--color-neutral-300)] bg-white hover:border-[var(--color-primary-light)]"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <h2 className="text-lg font-semibold text-[var(--color-neutral-900)] text-center">
                  {type.toUpperCase()}
                </h2>
                <div className="mt-3 space-y-2">
                  {templates.map((section, idx) => (
                    <div
                      key={section.id}
                      className="rounded-lg border border-[var(--color-neutral-300)] bg-[var(--color-neutral-50)] px-3 py-2 text-xs"
                    >
                      <span className="font-semibold text-[var(--color-primary)]">
                        {idx + 1}. {section.title}
                      </span>{" "}
                      — {section.durationMinutes} min —{" "}
                      {section.targetQuestionCount} questions
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
        {checkingSession ? (
          <LoadingState message="Checking active session..." />
        ) : activeSession ? (
          <div className="mt-6 rounded-[10px] border border-[#fdba74] bg-[#fff7ed] p-4">
            <p className="text-sm text-[var(--color-neutral-700)]">
              There is active session ({activeSession.examType.toUpperCase()}){" "}
              that undone yet. Continue or exit the session first, before start
              another session.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={continueSession}
                className="rounded-[10px] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(93,63,211,0.35)]"
              >
                Continue Session
              </button>
              <button
                onClick={exitSession}
                className="rounded-[10px] bg-[#9a3412] px-5 py-2.5 text-sm font-semibold text-white"
              >
                Exit Session
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={goToSimulationRunner}
            disabled={quotaExhausted}
            className={`mt-6 rounded-[10px] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(93,63,211,0.35)] ${
              quotaExhausted
                ? "cursor-not-allowed bg-[var(--color-neutral-300)] shadow-none"
                : "bg-[var(--color-primary)]"
            }`}
          >
            {quotaExhausted && quota?.remaining === 0
              ? "Quota Exhausted"
              : quotaExhausted
                ? "Checking quota..."
                : "Start Session"}
          </button>
        )}
      </div>
    </section>
  );
}
