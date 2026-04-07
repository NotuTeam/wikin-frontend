"use client";

import { SimulationQuestion, SimulationSection } from "@/types";
import { Textarea, Typography } from "@/components/atoms";

interface QuestionDisplayProps {
  question: SimulationQuestion;
  section: SimulationSection;
  selectedAnswer: string;
  onAnswer: (value: string) => void;
}

export function QuestionDisplay({
  question,
  section,
  selectedAnswer,
  onAnswer,
}: QuestionDisplayProps) {
  const isMcq = question.type === "mcq" && question.options && question.options.length > 0;

  return (
    <div className="space-y-4">
      <div>
        <Typography variant="body" className="whitespace-pre-wrap">
          <span className="font-semibold">Q{question.number}.</span> {question.text}
        </Typography>
      </div>

      {question.details?.statement && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <Typography variant="label">Statement:</Typography>
          <Typography variant="body-sm" color="muted" className="whitespace-pre-wrap mt-1">
            {question.details.statement}
          </Typography>
        </div>
      )}

      {question.details?.instructions && (
        <p className="text-sm text-slate-600">
          <span className="font-medium">Note:</span> {question.details.instructions}
        </p>
      )}

      {isMcq ? (
        <div className="space-y-2">
          {question.options!.map((option, idx) => {
            const optionLabel = String.fromCharCode(65 + idx); // A, B, C, D...
            const isSelected = selectedAnswer === String(idx);

            return (
              <label
                key={idx}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-blue-50 border-blue-300"
                    : "bg-white border-gray-200 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={idx}
                  checked={isSelected}
                  onChange={() => onAnswer(String(idx))}
                  className="mt-1 h-4 w-4 text-blue-600"
                />
                <span className="text-sm">
                  <span className="font-semibold mr-2">{optionLabel}.</span>
                  {option}
                </span>
              </label>
            );
          })}
        </div>
      ) : (
        <Textarea
          label="Your Answer"
          value={selectedAnswer}
          onChange={(e) => onAnswer(e.target.value)}
          placeholder="Type your answer here..."
          rows={8}
          className="w-full"
        />
      )}
    </div>
  );
}
