import { SimulationResultData } from "./section";

export type ResultListItem = {
  id: string;
  examType: "toefl" | "ielts";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  totalCorrect: number;
  totalQuestions: number;
  totalPercentage: number;
  scoreSummary?: SimulationResultData["scoreSummary"];
  createdAt: string;
  heroLabel: string;
  heroValue: string;
};

export type ResultSectionSummary = {
  sectionId: string;
  sectionTitle: string;
  correct: number;
  total: number;
  percentage: number;
  scaledScore?: number;
  bandScore?: number;
};

export type ResultHistoryItem = ResultListItem & {
  sections: ResultSectionSummary[];
};

export type ProgressOverview = {
  stats: {
    completedSessions: number;
    averageAccuracy: number;
    bestPercentage: number;
    latestResult: ResultListItem | null;
    improvementFromPrevious: number | null;
  };
  trend: Array<{
    id: string;
    label: string;
    percentage: number;
    examType: "toefl" | "ielts";
    createdAt: string;
  }>;
  sectionProgress: Array<{
    sectionId: string;
    sectionTitle: string;
    attempts: number;
    averagePercentage: number;
    bestPercentage: number;
    latestPercentage: number;
  }>;
  recentResults: ResultHistoryItem[];
};
