"use client";

import { Passage } from "@/types";
import { Card, Typography } from "@/components/atoms";

interface PassageDisplayProps {
  passages: Passage[];
  currentQuestionNum: number;
}

export function PassageDisplay({ passages, currentQuestionNum }: PassageDisplayProps) {
  const activePassageIdx = passages.findIndex(
    (p) =>
      currentQuestionNum >= (p.questionStart ?? 1) &&
      currentQuestionNum <= (p.questionEnd ?? passages.length * 10)
  );

  if (activePassageIdx === -1 || !passages[activePassageIdx]) return null;

  const passage = passages[activePassageIdx];
  const start = passage.questionStart ?? 1;
  const end = passage.questionEnd ?? passages.length * 10;

  return (
    <Card className="mb-4" padding="md">
      <Typography variant="label" className="mb-2">
        Passage {activePassageIdx + 1}: {passage.title} (Questions {start}-{end})
      </Typography>
      <div className="max-h-60 overflow-y-auto">
        <Typography
          variant="body"
          color="muted"
          className="whitespace-pre-wrap leading-relaxed"
        >
          {passage.content}
        </Typography>
      </div>
    </Card>
  );
}
