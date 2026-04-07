import { SimulationQuestion } from "./question";
import { ExamType, GenerationStatus } from "./exam";

export type ListeningTrack = {
  label: string;
  start: number;
  end: number;
  script: string;
};

export type Passage = {
  title: string;
  content: string;
  questionStart?: number;
  questionEnd?: number;
};

export type SectionTemplate = {
  id: string;
  title: string;
  durationMinutes: number;
  targetQuestionCount: number;
};

export type SimulationSection = {
  id: string;
  title: string;
  durationMinutes: number;
  targetQuestionCount: number;
  questions: SimulationQuestion[];
  rawQuestions: any[];
  listeningScripts: string[];
  listeningTracks: ListeningTrack[];
  passageTitle?: string;
  passageContent?: string;
  passages?: Passage[];
  status: GenerationStatus;
  error?: string;
};

export type SectionResultSummary = {
  sectionId: string;
  sectionTitle: string;
  correct: number;
  total: number;
  percentage: number;
};

export type SimulationResultData = {
  examType: ExamType;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  sectionScores: SectionResultSummary[];
  totalCorrect: number;
  totalQuestions: number;
  totalPercentage: number;
  sections: SimulationSection[];
  answers: Record<string, string>;
};
