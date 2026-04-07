export type WritingReview = {
  overallBand: number;
  criteria: {
    taskAchievement: number;
    coherenceAndCohesion: number;
    lexicalResource: number;
    grammaticalRangeAndAccuracy: number;
  };
  checks: {
    wordCount: number;
    minWordCount: number;
    wordCountOk: boolean;
    relevanceToPrompt: number;
    structureQuality: number;
    grammarQuality: number;
  };
  strengths: string[];
  improvements: string[];
  summary: string;
};
