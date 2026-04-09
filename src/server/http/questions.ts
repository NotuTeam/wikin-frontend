import { ieltsEngine } from "@/server/engines/ielts";
import { toeflEngine } from "@/server/engines/toefl";
import {
  createSimulationSession,
  exitSimulationSession,
  finishSimulationSession,
  getSimulationSession,
  updateSimulationSession,
} from "@/server/session/store";

export type Difficulty = "EASY" | "MEDIUM" | "HARD";
export type ListeningSection =
  | "SECTION_1"
  | "SECTION_2"
  | "SECTION_3"
  | "SECTION_4";

export async function generateByEndpoint(
  endpoint: string,
  difficulty: Difficulty = "MEDIUM",
  section: ListeningSection = "SECTION_1",
) {
  switch (endpoint) {
    case "/toefl/listening/part-a":
      return toeflEngine.generateListeningPartA(difficulty);
    case "/toefl/listening/part-b":
      return toeflEngine.generateListeningPartB(difficulty);
    case "/toefl/listening/part-c":
      return toeflEngine.generateListeningPartC(difficulty);
    case "/toefl/listening/part-d":
      return toeflEngine.generateListeningPartD(difficulty);
    case "/toefl/listening/part-e":
      return toeflEngine.generateListeningPartE(difficulty);
    case "/toefl/reading":
      return toeflEngine.generateReading(difficulty);
    case "/toefl/structure":
      return toeflEngine.generateStructure(difficulty);
    case "/ielts/listening":
      return ieltsEngine.generateListeningSection(section, difficulty);
    case "/ielts/reading":
      return ieltsEngine.generateReadingPassage(difficulty);
    case "/ielts/writing/task-1":
      return ieltsEngine.generateWritingTask1(difficulty);
    case "/ielts/writing/task-2":
      return ieltsEngine.generateWritingTask2(difficulty);
    case "/ielts/complete-listening":
      return ieltsEngine.generateCompleteListeningTest(difficulty);
    case "/ielts/complete-writing":
      return ieltsEngine.generateCompleteWritingTest(difficulty);
    default:
      throw new Error("Unsupported endpoint");
  }
}

export async function reviewIeltsWriting(task: unknown, answer: string) {
  if (!task) {
    throw new Error("task is required");
  }
  return ieltsEngine.reviewWritingAnswer(task, answer || "");
}

export function createSession(body: {
  examType: "toefl" | "ielts";
  difficulty: Difficulty;
  payload?: Record<string, unknown>;
}) {
  const { examType, difficulty, payload } = body;
  if (!examType || !difficulty) {
    throw new Error("examType and difficulty are required");
  }
  return createSimulationSession({ examType, difficulty, payload });
}

export function getSession(id: string) {
  return getSimulationSession(id);
}

export function updateSession(id: string, payload: Record<string, unknown>) {
  return updateSimulationSession(id, payload || {});
}

export function finishSession(id: string) {
  return finishSimulationSession(id);
}

export function exitSession(id: string) {
  return exitSimulationSession(id);
}
