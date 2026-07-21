import { ieltsEngine } from "@/server/engines/ielts";
import { toeflEngine } from "@/server/engines/toefl";
import {
  createSimulationSession,
  exitSimulationSession,
  finishSimulationSession,
  getSimulationSession,
  updateSimulationSession,
} from "@/server/session/store";
import {
  isFallbackMode,
  loadIeltsListeningSection,
  loadIeltsReadingPassage,
  loadIeltsReadingPassageUnit,
  loadToeflListeningPartA,
  loadToeflListeningPartB,
  loadToeflListeningPartC,
  loadToeflListeningPartD,
  loadToeflListeningPartE,
  loadToeflReading,
  loadToeflReadingPassageUnit,
  loadToeflStructure,
} from "@/server/fallback/loader";

export type Difficulty = "EASY" | "MEDIUM" | "HARD";
export type ListeningSection =
  | "SECTION_1"
  | "SECTION_2"
  | "SECTION_3"
  | "SECTION_4"
  | "SECTION_5";

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

    const useFallback = isFallbackMode();

    if (useFallback) {
      console.log("[question-gen][dispatch] fallback mode active (AI_GENERATE=false)", {
        endpoint,
        difficulty,
        section,
        passageIndex,
      });
    }

    switch (endpoint) {
      case "/toefl/listening/part-a":
        result = useFallback
          ? loadToeflListeningPartA(difficulty)
          : await toeflEngine.generateListeningPartA(difficulty);
        break;
      case "/toefl/listening/part-b":
        result = useFallback
          ? loadToeflListeningPartB(difficulty)
          : await toeflEngine.generateListeningPartB(difficulty);
        break;
      case "/toefl/listening/part-c":
        result = useFallback
          ? loadToeflListeningPartC(difficulty)
          : await toeflEngine.generateListeningPartC(difficulty);
        break;
      case "/toefl/listening/part-d":
        result = useFallback
          ? loadToeflListeningPartD(difficulty)
          : await toeflEngine.generateListeningPartD(difficulty);
        break;
      case "/toefl/listening/part-e":
        result = useFallback
          ? loadToeflListeningPartE(difficulty)
          : await toeflEngine.generateListeningPartE(difficulty);
        break;
      case "/toefl/reading":
        result = useFallback
          ? loadToeflReading(difficulty)
          : await toeflEngine.generateReading(difficulty);
        break;
      case "/toefl/reading/passage":
        result = useFallback
          ? loadToeflReadingPassageUnit(passageIndex, difficulty)
          : await toeflEngine.generateReadingPassageUnit(passageIndex, difficulty);
        break;
      case "/toefl/structure":
        result = useFallback
          ? loadToeflStructure(difficulty)
          : await toeflEngine.generateStructure(difficulty);
        break;
      case "/ielts/listening":
        result = useFallback
          ? loadIeltsListeningSection(section, difficulty)
          : await ieltsEngine.generateListeningSection(section, difficulty);
        break;
      case "/ielts/reading":
        result = useFallback
          ? loadIeltsReadingPassage(difficulty)
          : await ieltsEngine.generateReadingPassage(difficulty);
        break;
      case "/ielts/reading/passage":
        result = useFallback
          ? loadIeltsReadingPassageUnit(passageIndex, difficulty)
          : await ieltsEngine.generateReadingPassageUnit(passageIndex, difficulty);
        break;
      case "/ielts/writing/task-1":
        // Writing tasks have no static fallback; AI generation only.
        result = await ieltsEngine.generateWritingTask1(difficulty);
        break;
      case "/ielts/writing/task-2":
        // Writing tasks have no static fallback; AI generation only.
        result = await ieltsEngine.generateWritingTask2(difficulty);
        break;
      case "/ielts/complete-listening":
        if (useFallback) {
          const sections = (["SECTION_1", "SECTION_2", "SECTION_3", "SECTION_4", "SECTION_5"] as const).map(
            (s) => loadIeltsListeningSection(s, difficulty),
          );
          result = {
            sections,
            totalQuestions: sections.reduce((sum, s) => sum + s.questions.length, 0),
            duration: 30,
          };
        } else {
          result = await ieltsEngine.generateCompleteListeningTest(difficulty);
        }
        break;
      case "/ielts/complete-writing":
        // Writing tasks have no static fallback; AI generation only.
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
