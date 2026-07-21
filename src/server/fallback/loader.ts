import { z } from 'zod';
import {
  TOEFLListeningPartASchema,
  TOEFLListeningPartBSchema,
  TOEFLListeningPartCSchema,
  TOEFLListeningPartDSchema,
  TOEFLListeningPartESchema,
  TOEFLReadingPassageOnlySchema,
  TOEFLReadingQuestionItemSchema,
  TOEFLReadingSchema,
  TOEFLStructureQuestionItemSchema,
} from '../schemas/toefl';
import {
  IELTSListeningSectionSchema,
  IELTSReadingPassageSchema,
  IELTSReadingPassageOnlySchema,
  IELTSReadingQuestionItemSchema,
} from '../schemas/ielts';
import type {
  TOEFLListeningPartA,
  TOEFLListeningPartB,
  TOEFLListeningPartC,
  TOEFLListeningPartD,
  TOEFLListeningPartE,
  TOEFLReading,
  TOEFLStructure,
} from '../schemas/toefl';
import type {
  IELTSListeningSection,
  IELTSReadingPassage,
} from '../schemas/ielts';

// JSON banks imported statically so they are bundled and available at runtime
// even when the AI provider is unreachable.
import toeflListeningPartA from './toefl/listening/part-a/bank.json';
import toeflListeningPartB from './toefl/listening/part-b/bank.json';
import toeflListeningPartC from './toefl/listening/part-c/bank.json';
import toeflListeningPartD from './toefl/listening/part-d/bank.json';
import toeflListeningPartE from './toefl/listening/part-e/bank.json';
import toeflReadingPassage1 from './toefl/reading/passage-1.json';
import toeflReadingPassage2 from './toefl/reading/passage-2.json';
import toeflReadingPassage3 from './toefl/reading/passage-3.json';
import toeflStructureAll from './toefl/structure/bank.json';

import ieltsListeningSection1 from './ielts/listening/section-1.json';
import ieltsListeningSection2 from './ielts/listening/section-2.json';
import ieltsListeningSection3 from './ielts/listening/section-3.json';
import ieltsListeningSection4 from './ielts/listening/section-4.json';
import ieltsListeningSection5 from './ielts/listening/section-5.json';
import ieltsReadingPassage1 from './ielts/reading/passage-1.json';
import ieltsReadingPassage2 from './ielts/reading/passage-2.json';
import ieltsReadingPassage3 from './ielts/reading/passage-3.json';

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

/**
 * Returns true when the environment explicitly disables AI generation.
 * Accepts "false", "0", "no", "off" (case-insensitive). Any other value
 * (including unset) keeps AI generation enabled.
 */
export function isFallbackMode(): boolean {
  const raw = (process.env.AI_GENERATE ?? '').trim().toLowerCase();
  return raw === 'false' || raw === '0' || raw === 'no' || raw === 'off';
}

function shuffle<T>(arr: readonly T[]): T[] {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Filters a bank by difficulty when possible. Falls back to the full bank
 * if no exact difficulty match exists, so the caller always gets content.
 */
function filterByDifficulty<T extends { difficulty?: string }>(
  bank: readonly T[],
  difficulty: Difficulty,
): T[] {
  const matched = bank.filter((item) => item.difficulty === difficulty);
  return matched.length > 0 ? matched : bank.slice();
}

/**
 * Shuffle options for every question in a MCQ-style item and keep the
 * correctAnswer index in sync with the new order.
 */
function shuffleMcqOptions<T extends { options: string[]; correctAnswer: number }>(
  question: T,
): T {
  const correctText = question.options[question.correctAnswer];
  const shuffledOptions = shuffle(question.options);
  const newCorrect = shuffledOptions.indexOf(correctText);
  return { ...question, options: shuffledOptions, correctAnswer: newCorrect };
}

function renumberQuestions<T extends { questionNumber: number }>(
  questions: readonly T[],
  startIndex = 1,
): T[] {
  return questions.map((q, idx) => ({ ...q, questionNumber: idx + startIndex }));
}

// ---------------------------------------------------------------------------
// TOEFL Listening
// ---------------------------------------------------------------------------

function pickToeflListeningUnit<TLean extends { difficulty: string }>(
  bank: readonly TLean[],
  difficulty: Difficulty,
): TLean {
  const pool = filterByDifficulty(bank, difficulty);
  return pickRandom(pool);
}

export function loadToeflListeningPartA(difficulty: Difficulty): TOEFLListeningPartA {
  const bank = toeflListeningPartA as unknown as TOEFLListeningPartA[];
  const unit = pickToeflListeningUnit(bank, difficulty);
  const shuffledQuestions = shuffle(unit.questions).map(shuffleMcqOptions);
  const questions = renumberQuestions(shuffledQuestions);
  const result: TOEFLListeningPartA = {
    ...unit,
    questions,
  };
  return TOEFLListeningPartASchema.parse(result);
}

export function loadToeflListeningPartB(difficulty: Difficulty): TOEFLListeningPartB {
  const bank = toeflListeningPartB as unknown as TOEFLListeningPartB[];
  const unit = pickToeflListeningUnit(bank, difficulty);
  const shuffledQuestions = shuffle(unit.questions).map(shuffleMcqOptions);
  const questions = renumberQuestions(shuffledQuestions);
  const result: TOEFLListeningPartB = {
    ...unit,
    questions,
  };
  return TOEFLListeningPartBSchema.parse(result);
}

export function loadToeflListeningPartC(difficulty: Difficulty): TOEFLListeningPartC {
  const bank = toeflListeningPartC as unknown as TOEFLListeningPartC[];
  const unit = pickToeflListeningUnit(bank, difficulty);
  const shuffledQuestions = shuffle(unit.questions).map(shuffleMcqOptions);
  const questions = renumberQuestions(shuffledQuestions);
  const result: TOEFLListeningPartC = {
    ...unit,
    questions,
  };
  return TOEFLListeningPartCSchema.parse(result);
}

export function loadToeflListeningPartD(difficulty: Difficulty): TOEFLListeningPartD {
  const bank = toeflListeningPartD as unknown as TOEFLListeningPartD[];
  const unit = pickToeflListeningUnit(bank, difficulty);
  const shuffledQuestions = shuffle(unit.questions).map(shuffleMcqOptions);
  const questions = renumberQuestions(shuffledQuestions);
  const result: TOEFLListeningPartD = {
    ...unit,
    questions,
  };
  return TOEFLListeningPartDSchema.parse(result);
}

export function loadToeflListeningPartE(difficulty: Difficulty): TOEFLListeningPartE {
  const bank = toeflListeningPartE as unknown as TOEFLListeningPartE[];
  const unit = pickToeflListeningUnit(bank, difficulty);
  const shuffledQuestions = shuffle(unit.questions).map(shuffleMcqOptions);
  const questions = renumberQuestions(shuffledQuestions);
  const result: TOEFLListeningPartE = {
    ...unit,
    questions,
  };
  return TOEFLListeningPartESchema.parse(result);
}

// ---------------------------------------------------------------------------
// TOEFL Reading
// ---------------------------------------------------------------------------

type ToeflReadingBankEntry = z.infer<typeof TOEFLReadingPassageOnlySchema> & {
  questions: z.infer<typeof TOEFLReadingQuestionItemSchema>[];
  difficulty?: string;
  type?: string;
};

/**
 * Some legacy bank files omit root-level `questionText`/`points`/
 * `estimatedTime`/`type`/`difficulty` because they were authored as
 * passage-only units. Inject sane defaults so the entry always satisfies
 * `TOEFLReadingPassageOnlySchema` without forcing a massive bank rewrite.
 */
function normalizeToeflReadingEntry(
  entry: unknown,
  difficulty: Difficulty,
): ToeflReadingBankEntry {
  const source = (entry ?? {}) as Record<string, unknown>;
  return {
    type: 'READING_PASSAGE',
    questionText: 'TOEFL Reading Passage',
    points: 1,
    estimatedTime: 60,
    difficulty,
    ...(source as object),
  } as ToeflReadingBankEntry;
}

export function loadToeflReadingPassageUnit(
  passageIndex: 1 | 2 | 3,
  difficulty: Difficulty,
) {
  const banks: Record<1 | 2 | 3, unknown[]> = {
    1: toeflReadingPassage1 as unknown[],
    2: toeflReadingPassage2 as unknown[],
    3: toeflReadingPassage3 as unknown[],
  };
  const rawBank = banks[passageIndex];
  const bank = rawBank.map((entry) => normalizeToeflReadingEntry(entry, difficulty));
  const pool = filterByDifficulty(bank, difficulty);
  const unit = pickRandom(pool);

  const validated = {
    ...TOEFLReadingPassageOnlySchema.parse(unit),
    questions: unit.questions,
  };

  const config = [
    { questionCount: 15, startIndex: 1 },
    { questionCount: 15, startIndex: 16 },
    { questionCount: 20, startIndex: 31 },
  ][passageIndex - 1];

  // Take a random subset of the passage's questions if the bank has more,
  // otherwise use all available. Then shuffle, renumber, shuffle options.
  const allShuffled = shuffle(validated.questions).map(shuffleMcqOptions);
  const chosen = allShuffled.slice(0, Math.min(config.questionCount, allShuffled.length));
  const questions = renumberQuestions(chosen, config.startIndex);

  return {
    passage: validated.passage,
    vocabularyInContext: validated.vocabularyInContext,
    questions,
  };
}

export function loadToeflReading(difficulty: Difficulty): TOEFLReading {
  const passageUnits = [1, 2, 3].map((idx) =>
    loadToeflReadingPassageUnit(idx as 1 | 2 | 3, difficulty),
  );

  const allQuestions = passageUnits.flatMap((u) => u.questions);
  allQuestions.sort((a, b) => a.questionNumber - b.questionNumber);

  const result = {
    type: 'READING' as const,
    questionText: 'TOEFL Reading Section - Multiple Passages',
    points: 1,
    estimatedTime: 60,
    difficulty,
    passage: passageUnits[0].passage,
    passages: passageUnits.map((u) => u.passage),
    vocabularyInContext: passageUnits.flatMap((u) => u.vocabularyInContext),
    questions: allQuestions,
  };

  return TOEFLReadingSchema.parse(result);
}

// ---------------------------------------------------------------------------
// TOEFL Structure
// ---------------------------------------------------------------------------

type ToeflStructureBankEntry = {
  type: 'STRUCTURE';
  questionText: string;
  difficulty: string;
  questions: z.infer<typeof TOEFLStructureQuestionItemSchema>[];
};

export function loadToeflStructure(difficulty: Difficulty): TOEFLStructure {
  const bank = (toeflStructureAll as unknown as ToeflStructureBankEntry[]).flatMap(
    (entry) => entry.questions,
  );
  const pool = bank.filter(
    (q) => (q as { grammarTopic?: string }).grammarTopic !== undefined,
  );
  const shuffled = shuffle(pool);
  const chosen = shuffled.slice(0, 40).map(shuffleMcqOptions);
  const questions = renumberQuestions(chosen);

  const result: TOEFLStructure = {
    type: 'STRUCTURE',
    questionText: 'TOEFL Structure & Written Expression',
    points: 1,
    estimatedTime: 60,
    difficulty,
    questions,
  } as TOEFLStructure;

  return result;
}

// ---------------------------------------------------------------------------
// IELTS Listening
// ---------------------------------------------------------------------------

type IeltsListeningBankEntry = IELTSListeningSection;

export function loadIeltsListeningSection(
  section: 'SECTION_1' | 'SECTION_2' | 'SECTION_3' | 'SECTION_4' | 'SECTION_5',
  difficulty: Difficulty,
): IELTSListeningSection {
  const banks = {
    SECTION_1: ieltsListeningSection1 as unknown as IeltsListeningBankEntry[],
    SECTION_2: ieltsListeningSection2 as unknown as IeltsListeningBankEntry[],
    SECTION_3: ieltsListeningSection3 as unknown as IeltsListeningBankEntry[],
    SECTION_4: ieltsListeningSection4 as unknown as IeltsListeningBankEntry[],
    SECTION_5: ieltsListeningSection5 as unknown as IeltsListeningBankEntry[],
  } as const;
  const bank = banks[section];
  const pool = filterByDifficulty(bank, difficulty);
  const unit = pickRandom(pool);
  const shuffledQuestions = shuffle(unit.questions);
  const questions = renumberQuestions(shuffledQuestions);
  const result: IELTSListeningSection = {
    ...unit,
    section,
    questions,
  };
  return IELTSListeningSectionSchema.parse(result);
}

// ---------------------------------------------------------------------------
// IELTS Reading
// ---------------------------------------------------------------------------

type IeltsReadingBankEntry = z.infer<typeof IELTSReadingPassageOnlySchema> & {
  questions: z.infer<typeof IELTSReadingQuestionItemSchema>[];
  difficulty?: string;
  type?: string;
};

/**
 * Inject defaults for root-level BaseQuestion fields that some legacy IELTS
 * reading bank files omit (e.g. `questionText`). `points` and `estimatedTime`
 * are filled by Zod defaults but we set them explicitly here for clarity.
 */
function normalizeIeltsReadingEntry(
  entry: unknown,
  difficulty: Difficulty,
): IeltsReadingBankEntry {
  const source = (entry ?? {}) as Record<string, unknown>;
  return {
    type: 'READING_PASSAGE',
    questionText: 'IELTS Academic Reading Passage',
    points: 1,
    estimatedTime: 60,
    difficulty,
    ...(source as object),
  } as IeltsReadingBankEntry;
}

export function loadIeltsReadingPassageUnit(
  passageIndex: 1 | 2 | 3,
  difficulty: Difficulty,
) {
  const banks: Record<1 | 2 | 3, unknown[]> = {
    1: ieltsReadingPassage1 as unknown[],
    2: ieltsReadingPassage2 as unknown[],
    3: ieltsReadingPassage3 as unknown[],
  };
  const rawBank = banks[passageIndex];
  const bank = rawBank.map((entry) => normalizeIeltsReadingEntry(entry, difficulty));
  const pool = filterByDifficulty(bank, difficulty);
  const unit = pickRandom(pool);
  const validated = {
    ...IELTSReadingPassageOnlySchema.parse(unit),
    questions: unit.questions,
  };

  const config = [
    { questionCount: 15, startIndex: 1 },
    { questionCount: 15, startIndex: 16 },
    { questionCount: 10, startIndex: 31 },
  ][passageIndex - 1];

  // IELTS reading questions use mixed types; shuffle options only when present.
  const allShuffled: z.infer<typeof IELTSReadingQuestionItemSchema>[] = shuffle(
    validated.questions,
  ).map((q) => {
    if (Array.isArray(q.options) && typeof q.correctAnswer === 'number') {
      return {
        ...q,
        options: shuffle(q.options),
        correctAnswer: shuffle(q.options).indexOf(q.options[q.correctAnswer]),
      };
    }
    return q;
  });
  const chosen = allShuffled.slice(0, Math.min(config.questionCount, allShuffled.length));
  const questions = renumberQuestions(chosen, config.startIndex);

  return {
    passage: validated.passage,
    questions,
  };
}

export function loadIeltsReadingPassage(difficulty: Difficulty): IELTSReadingPassage {
  const passageUnits = [1, 2, 3].map((idx) =>
    loadIeltsReadingPassageUnit(idx as 1 | 2 | 3, difficulty),
  );

  const allQuestions = passageUnits.flatMap((u) => u.questions);
  allQuestions.sort((a, b) => a.questionNumber - b.questionNumber);

  const result = {
    type: 'READING' as const,
    questionText: 'IELTS Academic Reading - Multiple Passages',
    points: 1,
    estimatedTime: 60,
    difficulty,
    passage: passageUnits[0].passage,
    passages: passageUnits.map((u) => u.passage),
    questions: allQuestions,
    questionDistribution: {
      multipleChoice: allQuestions.filter((q) => q.questionType === 'MULTIPLE_CHOICE').length,
      trueFalseNotGiven: allQuestions.filter((q) => q.questionType === 'TRUE_FALSE_NOT_GIVEN').length,
      matching: allQuestions.filter((q) => String(q.questionType).startsWith('MATCHING')).length,
      completion: allQuestions.filter((q) => String(q.questionType).includes('COMPLETION')).length,
      shortAnswer: allQuestions.filter((q) => q.questionType === 'SHORT_ANSWER').length,
    },
  };

  return IELTSReadingPassageSchema.parse(result);
}
