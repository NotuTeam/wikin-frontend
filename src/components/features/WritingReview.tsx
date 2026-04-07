"use client";

import { WritingReview } from "@/types";
import { Card, Typography, Badge } from "@/components/atoms";

interface WritingReviewCardProps {
  review: WritingReview;
}

export function WritingReviewCard({ review }: WritingReviewCardProps) {
  const criteria = [
    { label: "Task Achievement", value: review.criteria.taskAchievement },
    { label: "Coherence & Cohesion", value: review.criteria.coherenceAndCohesion },
    { label: "Lexical Resource", value: review.criteria.lexicalResource },
    { label: "Grammatical Range", value: review.criteria.grammaticalRangeAndAccuracy },
  ];

  return (
    <Card className="mt-2 bg-slate-50 border-slate-200" padding="md">
      <div className="flex items-center gap-2 mb-3">
        <Typography variant="label">Writing Band:</Typography>
        <Badge variant={review.overallBand >= 6 ? "success" : review.overallBand >= 5 ? "default" : "warning"}>
          {review.overallBand.toFixed(1)}/9
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Word Count:</span>
          <span className={review.checks.wordCountOk ? "text-green-600" : "text-amber-600"}>
            {review.checks.wordCount}/{review.checks.minWordCount}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Relevance:</span>
          <span>{review.checks.relevanceToPrompt}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Structure:</span>
          <span>{review.checks.structureQuality}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Grammar:</span>
          <span>{review.checks.grammarQuality}%</span>
        </div>
      </div>

      <div className="mb-3">
        <Typography variant="label" className="mb-1">Criteria Scores:</Typography>
        <div className="flex flex-wrap gap-2">
          {criteria.map((c) => (
            <Badge key={c.label} variant="neutral" size="sm">
              {c.label.split(" ").map(w => w[0]).join("")}: {c.value}
            </Badge>
          ))}
        </div>
      </div>

      {review.strengths.length > 0 && (
        <div className="mb-2">
          <Typography variant="label" color="success" className="mb-1">Strengths:</Typography>
          <Typography variant="body-sm" color="muted">
            {review.strengths.join("; ")}
          </Typography>
        </div>
      )}

      {review.improvements.length > 0 && (
        <div>
          <Typography variant="label" color="error" className="mb-1">Improvements:</Typography>
          <Typography variant="body-sm" color="muted">
            {review.improvements.join("; ")}
          </Typography>
        </div>
      )}
    </Card>
  );
}
