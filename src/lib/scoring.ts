import { SimulationQuestion, SimulationSection, WritingReview } from "@/types";

type ToflSectionId = "listening" | "structure" | "reading";

const TOEFL_LISTENING_SCALED: Record<number, number> = {
  50: 68, 49: 67, 48: 66, 47: 65, 46: 63, 45: 62, 44: 61, 43: 60, 42: 59, 41: 58,
  40: 57, 39: 56, 38: 55, 37: 54, 36: 53, 35: 52, 34: 52, 33: 51, 32: 50, 31: 49,
  30: 48, 29: 47, 28: 46, 27: 45, 26: 44, 25: 43, 24: 42, 23: 41, 22: 40, 21: 39,
  20: 38, 19: 38, 18: 37, 17: 36, 16: 35, 15: 34, 14: 33, 13: 31, 12: 31, 11: 31,
  10: 31, 9: 31, 8: 31, 7: 31, 6: 31, 5: 31, 4: 31, 3: 31, 2: 31, 1: 31, 0: 31,
};

const TOEFL_STRUCTURE_SCALED: Record<number, number> = {
  40: 68, 39: 67, 38: 66, 37: 65, 36: 64, 35: 63, 34: 62, 33: 61, 32: 60, 31: 59,
  30: 58, 29: 57, 28: 56, 27: 55, 26: 54, 25: 53, 24: 51, 23: 50, 22: 48, 21: 47,
  20: 45, 19: 44, 18: 43, 17: 42, 16: 41, 15: 40, 14: 39, 13: 38, 12: 37, 11: 35,
  10: 33, 9: 32, 8: 31, 7: 31, 6: 31, 5: 31, 4: 31, 3: 31, 2: 31, 1: 31, 0: 31,
};

const TOEFL_READING_SCALED: Record<number, number> = {
  50: 67, 49: 66, 48: 65, 47: 64, 46: 63, 45: 62, 44: 61, 43: 60, 42: 59, 41: 58,
  40: 57, 39: 56, 38: 55, 37: 54, 36: 53, 35: 52, 34: 52, 33: 51, 32: 50, 31: 49,
  30: 48, 29: 47, 28: 46, 27: 45, 26: 44, 25: 43, 24: 42, 23: 41, 22: 40, 21: 39,
  20: 38, 19: 37, 18: 37, 17: 36, 16: 35, 15: 34, 14: 33, 13: 32, 12: 31, 11: 31,
  10: 31, 9: 31, 8: 31, 7: 31, 6: 31, 5: 31, 4: 31, 3: 31, 2: 31, 1: 31, 0: 31,
};

const IELTS_LISTENING_BANDS: Array<{ min: number; max: number; band: number }> = [
  { min: 39, max: 40, band: 9.0 },
  { min: 37, max: 38, band: 8.5 },
  { min: 35, max: 36, band: 8.0 },
  { min: 33, max: 34, band: 7.5 },
  { min: 30, max: 32, band: 7.0 },
  { min: 27, max: 29, band: 6.5 },
  { min: 23, max: 26, band: 6.0 },
  { min: 20, max: 22, band: 5.5 },
  { min: 16, max: 19, band: 5.0 },
  { min: 13, max: 15, band: 4.5 },
  { min: 10, max: 12, band: 4.0 },
  { min: 8, max: 9, band: 3.5 },
  { min: 6, max: 7, band: 3.0 },
  { min: 4, max: 5, band: 2.5 },
  { min: 0, max: 3, band: 2.0 },
];

const IELTS_READING_ACADEMIC_BANDS: Array<{ min: number; max: number; band: number }> = [
  { min: 40, max: 40, band: 9.0 },
  { min: 39, max: 39, band: 8.5 },
  { min: 37, max: 38, band: 8.0 },
  { min: 35, max: 36, band: 7.5 },
  { min: 33, max: 34, band: 7.0 },
  { min: 30, max: 32, band: 6.5 },
  { min: 27, max: 29, band: 6.0 },
  { min: 23, max: 26, band: 5.5 },
  { min: 19, max: 22, band: 5.0 },
  { min: 15, max: 18, band: 4.5 },
  { min: 13, max: 14, band: 4.0 },
  { min: 10, max: 12, band: 3.5 },
  { min: 8, max: 9, band: 3.0 },
  { min: 6, max: 7, band: 2.5 },
  { min: 0, max: 5, band: 2.0 },
];

function countCorrect(
  section: SimulationSection | undefined,
  answers: Record<string, string>,
) {
  if (!section) return 0;
  return section.questions.reduce((sum, question) => {
    if (question.type !== "mcq" || typeof question.correctAnswer !== "number") {
      return sum;
    }
    const key = `${section.id}:${question.id}`;
    const picked = answers[key];
    return picked === String(question.correctAnswer) ? sum + 1 : sum;
  }, 0);
}

export function calcToeflScore(sections: SimulationSection[], answers: Record<string, string>) {
  const listeningRaw = countCorrect(sections.find((section) => section.id === "listening"), answers);
  const structureRaw = countCorrect(sections.find((section) => section.id === "structure"), answers);
  const readingRaw = countCorrect(sections.find((section) => section.id === "reading"), answers);

  const listeningScaled = TOEFL_LISTENING_SCALED[Math.max(0, Math.min(50, listeningRaw))] ?? 24;
  const structureScaled = TOEFL_STRUCTURE_SCALED[Math.max(0, Math.min(40, structureRaw))] ?? 20;
  const readingScaled = TOEFL_READING_SCALED[Math.max(0, Math.min(50, readingRaw))] ?? 21;

  const overall = Math.max(310, Math.round(((listeningScaled + structureScaled + readingScaled) * 10) / 3));

  return {
    raw: {
      listening: listeningRaw,
      structure: structureRaw,
      reading: readingRaw,
    },
    scaled: {
      listening: listeningScaled,
      structure: structureScaled,
      reading: readingScaled,
    },
    overall,
  };
}

function lookupBand(raw: number, table: Array<{ min: number; max: number; band: number }>) {
  const found = table.find((row) => raw >= row.min && raw <= row.max);
  return found?.band ?? 2.0;
}

function roundToNearestHalf(value: number) {
  return Math.round(value * 2) / 2;
}

function getWritingBandFromReview(review: WritingReview | undefined) {
  if (!review) return 0;

  const criteriaAverage =
    (review.criteria.taskAchievement +
      review.criteria.coherenceAndCohesion +
      review.criteria.lexicalResource +
      review.criteria.grammaticalRangeAndAccuracy) /
    4;

  return roundToNearestHalf(criteriaAverage);
}

export function roundIeltsOverallBand(rawAverage: number) {
  const integerPart = Math.floor(rawAverage);
  const fraction = rawAverage - integerPart;
  const eps = 0.000001;

  if (fraction < 0.25 - eps) return integerPart;
  if (fraction < 0.75 - eps) return integerPart + 0.5;
  return integerPart + 1;
}

export function calcIeltsScore(sections: SimulationSection[], answers: Record<string, string>) {
  const listeningSection = sections.find((section) => section.id === "listening");
  const readingSection = sections.find((section) => section.id === "reading");
  const writingSection = sections.find((section) => section.id === "writing");

  const listeningRaw = countCorrect(listeningSection, answers);
  const readingRaw = countCorrect(readingSection, answers);

  const normalizedListeningRaw = Math.round((Math.max(0, listeningRaw) / 50) * 40);
  const listeningBand = lookupBand(normalizedListeningRaw, IELTS_LISTENING_BANDS);
  const readingBand = lookupBand(readingRaw, IELTS_READING_ACADEMIC_BANDS);

  const writingBands = (writingSection?.questions || [])
    .map((question: SimulationQuestion) => getWritingBandFromReview(question.details?.writingReview))
    .filter((band) => band > 0);

  const writingBand =
    writingBands.length > 0
      ? roundToNearestHalf(
          writingBands.reduce((sum, band) => sum + band, 0) / writingBands.length,
        )
      : 0;

  const rawAverage = (listeningBand + readingBand + writingBand) / 3;
  const overallBand = roundIeltsOverallBand(rawAverage);

  return {
    raw: {
      listening: listeningRaw,
      reading: readingRaw,
    },
    band: {
      listening: listeningBand,
      reading: readingBand,
      writing: writingBand,
      overall: overallBand,
      rawAverage,
    },
  };
}

export function getToeflScaledBySection(sectionId: ToflSectionId, raw: number) {
  if (sectionId === "listening") {
    return TOEFL_LISTENING_SCALED[Math.max(0, Math.min(50, raw))] ?? 24;
  }
  if (sectionId === "structure") {
    return TOEFL_STRUCTURE_SCALED[Math.max(0, Math.min(40, raw))] ?? 20;
  }
  return TOEFL_READING_SCALED[Math.max(0, Math.min(50, raw))] ?? 21;
}
