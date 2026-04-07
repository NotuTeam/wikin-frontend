"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  Typography,
  Badge,
  Modal,
} from "@/components";
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
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const getAnswerStatus = (
    isMcq: boolean,
    isCorrect: boolean | null,
    questionType: string
  ) => {
    if (isCorrect === null) {
      if (questionType === "text") return { text: "Submitted", variant: "info" as const };
      return { text: "Not auto-graded", variant: "neutral" as const };
    }
    return isCorrect
      ? { text: "Correct", variant: "success" as const }
      : { text: "Incorrect", variant: "error" as const };
  };

  if (!result) {
    return (
      <main className="max-w-4xl mx-auto p-6">
        <Card className="text-center py-12">
          <Typography variant="h2" className="mb-4">No Results Found</Typography>
          <Typography variant="body" color="muted" className="mb-6">
            Please complete a simulation first to see your results.
          </Typography>
          <Button onClick={() => router.push("/")}>Back to Simulation</Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto p-6">
      <Typography variant="h1" className="mb-2">
        {result.examType.toUpperCase()} Results
      </Typography>
      <Typography variant="body" color="muted" className="mb-6">
        Difficulty: {result.difficulty}
      </Typography>

      {/* Total Score Card */}
      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50">
        <Typography variant="h2" className="mb-4">Total Score</Typography>
        <div className="flex items-center gap-4">
          <div className="text-5xl font-bold text-blue-600">
            {result.totalPercentage}%
          </div>
          <div className="text-gray-600">
            <Typography variant="body-sm">
              MCQ: {result.totalCorrect}/{result.totalQuestions} correct
            </Typography>
          </div>
        </div>
      </Card>

      {/* Section Scores */}
      <Card className="mb-6">
        <Typography variant="h3" className="mb-4">Section Scores</Typography>
        <div className="grid gap-3">
          {result.sectionScores.map((section) => (
            <div
              key={section.sectionId}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <Typography variant="body-sm" className="font-medium">
                {section.sectionTitle}
              </Typography>
              <div className="flex items-center gap-3">
                <Badge
                  variant={
                    section.percentage >= 70
                      ? "success"
                      : section.percentage >= 50
                      ? "warning"
                      : "error"
                  }
                >
                  {section.percentage}%
                </Badge>
                <span className="text-sm text-gray-500">
                  {section.correct}/{section.total}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Question Review */}
      <Card className="mb-6">
        <Typography variant="h3" className="mb-4">Question Review</Typography>
        <div className="space-y-3">
          {result.sections.map((section, idx) => {
            const sectionScore = scoreMap.get(section.id);
            const isExpanded = expandedSections.has(section.id);

            return (
              <div
                key={section.id}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">
                      {isExpanded ? "▼" : "▶"}
                    </span>
                    <Typography variant="body-sm" className="font-medium">
                      {section.title}
                    </Typography>
                    {sectionScore && (
                      <Badge
                        variant={
                          sectionScore.percentage >= 70
                            ? "success"
                            : sectionScore.percentage >= 50
                            ? "warning"
                            : "error"
                        }
                        size="sm"
                      >
                        {sectionScore.correct}/{sectionScore.total} ({sectionScore.percentage}%)
                      </Badge>
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-4 space-y-4">
                    {section.questions.map((q) => {
                      const key = `${section.id}:${q.id}`;
                      const userAnswer = result.answers[key] ?? "";
                      const isMcq = q.type === "mcq" && q.correctAnswer !== undefined;
                      const isCorrect = isMcq
                        ? userAnswer === String(q.correctAnswer)
                        : null;

                      const userAnswerLabel =
                        q.options && userAnswer !== "" && !Number.isNaN(Number(userAnswer))
                          ? `${Number(userAnswer) + 1}. ${q.options[Number(userAnswer)] ?? ""}`
                          : userAnswer || "(empty)";

                      const correctAnswerLabel =
                        isMcq && q.options
                          ? `${(q.correctAnswer as number) + 1}. ${q.options[q.correctAnswer as number] ?? ""}`
                          : "N/A";

                      const status = getAnswerStatus(isMcq, isCorrect, q.type);

                      return (
                        <div
                          key={q.id}
                          className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <Typography variant="body-sm" className="font-medium whitespace-pre-wrap flex-1">
                              Q{q.number}. {q.text}
                            </Typography>
                            <Badge variant={status.variant} size="sm">
                              {status.text}
                            </Badge>
                          </div>

                          {q.details?.statement && (
                            <div className="mb-3 p-2 bg-white rounded border border-gray-200">
                              <Typography variant="label" size="sm">Statement:</Typography>
                              <Typography variant="body-sm" color="muted" className="whitespace-pre-wrap mt-1">
                                {q.details.statement}
                              </Typography>
                            </div>
                          )}

                          {q.details?.questionText && (
                            <div className="mb-3">
                              <Typography variant="label" size="sm">Question:</Typography>
                              <Typography variant="body-sm" color="muted" className="whitespace-pre-wrap mt-1">
                                {q.details.questionText}
                              </Typography>
                            </div>
                          )}

                          {q.details?.visualData && (
                            <WritingVisual visualData={q.details.visualData} />
                          )}

                          {q.details?.instructions && (
                            <p className="text-xs text-slate-600 mb-3">
                              <span className="font-medium">Note:</span> {q.details.instructions}
                            </p>
                          )}

                          <div className="grid gap-2 text-sm">
                            <div className="flex gap-2">
                              <span className="text-gray-600 min-w-[120px]">Your Answer:</span>
                              <span className={isCorrect === false ? "text-red-600" : ""}>
                                {userAnswerLabel}
                              </span>
                            </div>
                            {isMcq && (
                              <div className="flex gap-2">
                                <span className="text-gray-600 min-w-[120px]">Correct Answer:</span>
                                <span className="text-green-600">{correctAnswerLabel}</span>
                              </div>
                            )}
                          </div>

                          {q.details?.writingReview && (
                            <WritingReviewCard review={q.details.writingReview} />
                          )}

                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <Typography variant="label" size="sm">Explanation:</Typography>
                            <Typography variant="body-sm" color="muted" className="whitespace-pre-wrap mt-1">
                              {q.details?.writingReview?.summary ||
                                q.explanation ||
                                q.details?.sampleAnswer?.examinerComments ||
                                "Explanation not available."}
                            </Typography>
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
      </Card>

      <Button onClick={() => router.push("/")} className="w-full">
        Back to Home
      </Button>
    </main>
  );
}
