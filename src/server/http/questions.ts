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
  passageIndex: 1 | 2 | 3 = 1,
) {
  const startedAt = Date.now();
  console.log("[question-gen][dispatch] start", { endpoint, difficulty, section, passageIndex });

  try {
    let result;

    switch (endpoint) {
      case "/toefl/listening/part-a":
        result = await toeflEngine.generateListeningPartA(difficulty);
        break;
      case "/toefl/listening/part-b":
        result = await toeflEngine.generateListeningPartB(difficulty);
        break;
      case "/toefl/listening/part-c":
        result = await toeflEngine.generateListeningPartC(difficulty);
        break;
      case "/toefl/listening/part-d":
        result = await toeflEngine.generateListeningPartD(difficulty);
        break;
      case "/toefl/listening/part-e":
        result = await toeflEngine.generateListeningPartE(difficulty);
        break;
      case "/toefl/reading":
        result = await toeflEngine.generateReading(difficulty);
        break;
      case "/toefl/reading/passage":
        result = await toeflEngine.generateReadingPassageUnit(passageIndex, difficulty);
        break;
      case "/toefl/structure":
        result = await toeflEngine.generateStructure(difficulty);
        break;
      case "/ielts/listening":
        result = await ieltsEngine.generateListeningSection(section, difficulty);
        break;
      case "/ielts/reading":
        result = await ieltsEngine.generateReadingPassage(difficulty);
        break;
      case "/ielts/reading/passage":
        result = await ieltsEngine.generateReadingPassageUnit(passageIndex, difficulty);
        break;
      case "/ielts/writing/task-1":
        result = await ieltsEngine.generateWritingTask1(difficulty);
        break;
      case "/ielts/writing/task-2":
        result = await ieltsEngine.generateWritingTask2(difficulty);
        break;
      case "/ielts/complete-listening":
        result = await ieltsEngine.generateCompleteListeningTest(difficulty);
        break;
      case "/ielts/complete-writing":
        result = await ieltsEngine.generateCompleteWritingTest(difficulty);
        break;
      default:
        throw new Error("Unsupported endpoint");
    }

    console.log("[question-gen][dispatch] success", {
      endpoint,
      difficulty,
      section,
      passageIndex,
      durationMs: Date.now() - startedAt,
    });

    return result;
  } catch (error) {
    console.error("[question-gen][dispatch] error", {
      endpoint,
      difficulty,
      section,
      passageIndex,
      durationMs: Date.now() - startedAt,
      error,
    });
    throw error;
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
