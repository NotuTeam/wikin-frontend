"use client";

import { SimulationSection, GenerationStatus } from "@/types";
import { Badge } from "@/components/atoms";

interface SectionProgressProps {
  sections: SimulationSection[];
  currentSectionIndex: number;
  isGenerating: boolean;
  progress: string;
  failedSectionIndex: number | null;
}

const statusVariant: Record<GenerationStatus, Parameters<typeof Badge>[0]["variant"]> = {
  pending: "neutral",
  generating: "info",
  done: "success",
  failed: "error",
  skipped: "warning",
};

export function SectionProgressList({
  sections,
  currentSectionIndex,
  isGenerating,
  progress,
  failedSectionIndex,
}: SectionProgressProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-600">
        Status: {isGenerating ? "Generating..." : "Idle"}
      </p>
      <p className="text-sm text-gray-600 truncate">Progress: {progress}</p>

      <div className="space-y-2 mt-4">
        {sections.map((section, idx) => (
          <div
            key={section.id}
            className={`p-3 rounded-lg border transition-colors ${
              idx === currentSectionIndex
                ? "bg-blue-50 border-blue-200"
                : idx > currentSectionIndex
                ? "bg-gray-50 opacity-75"
                : "bg-white border-gray-200"
            } ${failedSectionIndex === idx ? "border-red-300 bg-red-50" : ""}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">
                {idx + 1}. {section.title}
              </span>
              <Badge variant={statusVariant[section.status]} size="sm">
                {section.status}
              </Badge>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {section.questions.length}/{section.targetQuestionCount} generated
            </p>
            {section.error && (
              <p className="text-xs text-red-600 mt-1">{section.error}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
