import { ExamType } from "./exam";
import { SimulationSection } from "./section";

export type LocalEncryptedSession = {
  v: 1;
  expiresAt: number;
  salt: string;
  iv: string;
  cipher: string;
};

export type SimulationSessionPayload = {
  examType: ExamType;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  started: boolean;
  sections: SimulationSection[];
  currentSectionIndex: number;
  currentQuestionIndex: number;
  remainingSeconds: number;
  timerDeadlineMs?: number | null;
  timerSectionIndex?: number | null;
  answers: Record<string, string>;
  failedSectionIndex: number | null;
  failedListeningPartIndex: number | null;
  progress: string;
  error: string | null;
  toeflListeningPartial: Record<string, any>;
  ieltsListeningPartial: Record<string, any>;
  toeflReadingPartial?: Record<string, any>;
  ieltsReadingPartial?: Record<string, any>;
};
