"use client";

import { useMemo } from "react";
import { SimulationSection, SimulationQuestion } from "@/types";

interface QuestionGridProps {
  section: SimulationSection;
  currentQuestionIndex: number;
  answers: Record<string, string>;
  onSelectQuestion: (index: number) => void;
  totalQuestions?: number;
}

export function QuestionGrid({
  section,
  currentQuestionIndex,
  answers,
  onSelectQuestion,
  totalQuestions,
}: QuestionGridProps) {
  const mapTotal =
    section?.id === "listening"
      ? section.targetQuestionCount
      : section?.questions.length || 0;

  const total = totalQuestions || mapTotal;

  return (
    <div className="grid grid-cols-5 gap-2">
      {Array.from({ length: total }).map((_, idx) => {
        const q = section.questions[idx];
        const disabled = !q;
        const key = q ? `${section.id}:${q.id}` : `pending-${idx}`;
        const answered = q ? !!answers[key]?.trim() : false;

        const buttonClass = disabled
          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
          : idx === currentQuestionIndex
          ? "bg-blue-600 text-white"
          : answered
          ? "bg-green-100 text-green-800 border-green-300"
          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50";

        return (
          <button
            key={q?.id || `pending-${idx + 1}`}
            onClick={() => {
              if (!disabled) onSelectQuestion(idx);
            }}
            disabled={disabled}
            className={`py-2 rounded-md border text-sm font-medium transition-colors ${buttonClass}`}
          >
            {idx + 1}
          </button>
        );
      })}
    </div>
  );
}
