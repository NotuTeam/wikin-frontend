import { z } from 'zod';

export const BaseQuestionSchema = z.object({
  id: z.string().uuid().optional(),
  questionText: z.string().min(10),
  instructions: z.string().optional(),
  points: z.number().int().min(1).max(5).default(1),
  estimatedTime: z.number().int().min(30).max(300).default(60),
});

export const IELTSListeningSectionSchema = BaseQuestionSchema.extend({
  type: z.literal('LISTENING'),
  section: z.enum(['SECTION_1', 'SECTION_2', 'SECTION_3', 'SECTION_4']),
  audioScript: z.string().min(100),
  context: z.object({
    setting: z.enum([
      'SOCIAL_SURVIVAL', 'EDUCATIONAL_SURVIVAL',
      'ACADEMIC_DISCUSSION', 'ACADEMIC_LECTURE'
    ]),
    speakers: z.array(z.object({
      name: z.string().optional(),
      accent: z.enum(['BRITISH', 'AMERICAN', 'AUSTRALIAN', 'CANADIAN']),
      gender: z.enum(['MALE', 'FEMALE']).optional(),
      role: z.string().optional(),
    })).min(1).max(4),
  }),
  questions: z.array(z.object({
    questionNumber: z.number().int().min(1).max(10),
    questionType: z.enum([
      'FORM_COMPLETION', 'NOTE_COMPLETION', 'TABLE_COMPLETION',
      'FLOW_CHART_COMPLETION', 'SUMMARY_COMPLETION', 'DIAGRAM_LABELING',
      'MATCHING', 'MULTIPLE_CHOICE', 'SHORT_ANSWER'
    ]),
    questionText: z.string(),
    answerFormat: z.enum(['SINGLE_WORD', 'NUMBERS', 'MULTIPLE_WORDS', 'LETTER']),
    correctAnswer: z.union([z.string(), z.number(), z.array(z.string())]),
    wordLimit: z.number().int().min(1).max(3).optional(),
    options: z.array(z.string()).optional(),
    keywords: z.array(z.string()).min(1),
    synonymsUsed: z.array(z.string()),
  })).length(10),
  keyVocabulary: z.array(z.object({
    word: z.string(),
    pronunciationNote: z.string().optional(),
    meaning: z.string(),
  })).min(5),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
});

export const IELTSReadingPassageContentSchema = z.object({
  title: z.string().min(10),
  subtitle: z.string().optional(),
  source: z.string().optional(),
  author: z.string().optional(),
  date: z.string().optional(),
  wordCount: z.number().int().min(500).max(850),
  content: z.string().min(500),
  topicCategory: z.enum([
    'SCIENCE_TECHNOLOGY', 'SOCIAL_ISSUES', 'EDUCATION', 'ENVIRONMENT',
    'HEALTH_MEDICINE', 'HISTORY_CULTURE', 'BUSINESS_ECONOMICS', 'PSYCHOLOGY'
  ]),
  textType: z.enum(['DESCRIPTIVE', 'DISCURSIVE', 'NARRATIVE', 'ARGUMENTATIVE']),
  hasDiagram: z.boolean().default(false),
  hasChart: z.boolean().default(false),
  questionStart: z.number().int().min(1).max(40).optional(),
  questionEnd: z.number().int().min(1).max(40).optional(),
});

export const IELTSReadingQuestionItemSchema = z.object({
  questionNumber: z.number().int().min(1).max(40),
  questionType: z.enum([
    'MULTIPLE_CHOICE', 'TRUE_FALSE_NOT_GIVEN', 'YES_NO_NOT_GIVEN',
    'MATCHING_HEADINGS', 'MATCHING_INFORMATION', 'MATCHING_FEATURES',
    'MATCHING_SENTENCE_ENDINGS', 'SENTENCE_COMPLETION', 'SUMMARY_COMPLETION',
    'NOTE_COMPLETION', 'TABLE_COMPLETION', 'FLOW_CHART_COMPLETION',
    'DIAGRAM_LABELING', 'SHORT_ANSWER'
  ]),
  questionText: z.string().min(5),
  paragraphReference: z.number().int().min(1).optional(),
  options: z.array(z.string()).optional(),
  correctAnswer: z.union([z.string(), z.number(), z.array(z.string()), z.boolean()]),
  wordLimit: z.number().int().min(1).max(3).optional(),
  explanation: z.string().min(20),
  keywordsInPassage: z.array(z.string()).min(1),
  paraphrasing: z.string().min(8),
});

export const IELTSReadingPassageOnlySchema = BaseQuestionSchema.extend({
  type: z.literal('READING_PASSAGE'),
  passage: IELTSReadingPassageContentSchema,
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
});

export const IELTSReadingQuestionBatchSchema = z.object({
  questions: z.array(IELTSReadingQuestionItemSchema),
});

export const IELTSReadingPassageSchema = BaseQuestionSchema.extend({
  type: z.literal('READING'),
  passage: IELTSReadingPassageContentSchema,
  passages: z.array(IELTSReadingPassageContentSchema).optional(),
  questions: z.array(IELTSReadingQuestionItemSchema).length(40),
  questionDistribution: z.object({
    multipleChoice: z.number().int(),
    trueFalseNotGiven: z.number().int(),
    matching: z.number().int(),
    completion: z.number().int(),
    shortAnswer: z.number().int(),
  }).optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
});

export const IELTSWritingTask1Schema = BaseQuestionSchema.extend({
  type: z.literal('WRITING_TASK_1'),
  taskType: z.enum(['LINE_GRAPH', 'BAR_CHART', 'PIE_CHART', 'TABLE', 'DIAGRAM', 'MAP', 'PROCESS']),
  visualData: z.object({
    chartType: z.enum(['line', 'bar', 'pie', 'table', 'process']),
    title: z.string().min(10),
    xAxisLabel: z.string().optional(),
    yAxisLabel: z.string().optional(),
    categories: z.array(z.string()).min(1),
    series: z.array(z.object({
      name: z.string().min(1),
      data: z.array(z.number()).min(1),
    })).min(1),
    units: z.string().optional(),
    keyFeatures: z.array(z.string()).min(3),
  }),
  instructions: z.string().min(50),
  rubricFocus: z.array(z.enum([
    'TASK_ACHIEVEMENT', 'COHERENCE_COHESION', 'LEXICAL_RESOURCE', 'GRAMMATICAL_RANGE'
  ])),
  suggestedApproach: z.object({
    introduction: z.string().min(30),
    overview: z.string().min(30),
    bodyParagraphs: z.array(z.string()).min(1).max(2),
    keyLanguage: z.array(z.string()).min(5),
  }),
  sampleAnswer: z.object({
    bandScore: z.number().min(5).max(9),
    wordCount: z.number().int().min(150).max(200),
    content: z.string().min(150),
    examinerComments: z.string().min(50),
  }),
  timeLimit: z.number().int().default(20),
  wordRequirement: z.literal(150),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
});

export const IELTSWritingTask2Schema = BaseQuestionSchema.extend({
  type: z.literal('WRITING_TASK_2'),
  essayType: z.enum([
    'OPINION', 'DISCUSSION', 'PROBLEM_SOLUTION',
    'ADVANTAGES_DISADVANTAGES', 'DIRECT_QUESTION'
  ]),
  prompt: z.object({
    statement: z.string().min(50),
    question: z.string().min(20),
    context: z.string().optional(),
  }),
  topicCategory: z.enum([
    'EDUCATION', 'TECHNOLOGY', 'ENVIRONMENT', 'HEALTH', 'WORK',
    'URBANIZATION', 'GLOBALIZATION', 'CULTURE', 'GOVERNMENT', 'SOCIETY'
  ]),
  instructions: z.string().min(50),
  rubricFocus: z.array(z.enum([
    'TASK_RESPONSE', 'COHERENCE_COHESION', 'LEXICAL_RESOURCE', 'GRAMMATICAL_RANGE'
  ])),
  suggestedStructure: z.object({
    introduction: z.object({
      approach: z.string(),
      shouldAddress: z.array(z.string()),
    }),
    bodyParagraphs: z.array(z.object({
      purpose: z.string(),
      suggestedContent: z.string(),
      exampleType: z.enum(['PERSONAL', 'HYPOTHETICAL', 'RESEARCH', 'HISTORICAL']).optional(),
    })).min(2).max(3),
    conclusion: z.object({
      approach: z.string(),
      shouldAvoid: z.array(z.string()),
    }),
  }),
  keyVocabulary: z.array(z.object({
    word: z.string(),
    usage: z.string(),
    formality: z.enum(['FORMAL', 'NEUTRAL']),
  })).min(10),
  sampleAnswer: z.object({
    bandScore: z.number().min(5).max(9),
    wordCount: z.number().int().min(250).max(350),
    content: z.string().min(250),
    examinerComments: z.string().min(100),
    strengths: z.array(z.string()).min(2),
    areasForImprovement: z.array(z.string()).optional(),
  }),
  commonMistakes: z.array(z.object({
    mistake: z.string(),
    correction: z.string(),
    whyItMatters: z.string(),
  })).min(3),
  timeLimit: z.number().int().default(40),
  wordRequirement: z.literal(250),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
});

export const IELTSWritingReviewSchema = z.object({
  overallBand: z.number().min(0).max(9),
  criteria: z.object({
    taskAchievement: z.number().min(0).max(9),
    coherenceAndCohesion: z.number().min(0).max(9),
    lexicalResource: z.number().min(0).max(9),
    grammaticalRangeAndAccuracy: z.number().min(0).max(9),
  }),
  checks: z.object({
    wordCount: z.number().int().min(0),
    minWordCount: z.number().int().min(1),
    wordCountOk: z.boolean(),
    relevanceToPrompt: z.number().min(0).max(100),
    structureQuality: z.number().min(0).max(100),
    grammarQuality: z.number().min(0).max(100),
  }),
  strengths: z.array(z.string()).min(2).max(6),
  improvements: z.array(z.string()).min(2).max(8),
  summary: z.string().min(30),
});

export const IELTSQuestionSchema = z.discriminatedUnion('type', [
  IELTSListeningSectionSchema,
  IELTSReadingPassageSchema,
  IELTSReadingPassageOnlySchema,
  IELTSWritingTask1Schema,
  IELTSWritingTask2Schema,
]);

export type IELTSListeningSection = z.infer<typeof IELTSListeningSectionSchema>;
export type IELTSReadingPassage = z.infer<typeof IELTSReadingPassageSchema>;
export type IELTSReadingPassageOnly = z.infer<typeof IELTSReadingPassageOnlySchema>;
export type IELTSWritingTask1 = z.infer<typeof IELTSWritingTask1Schema>;
export type IELTSWritingTask2 = z.infer<typeof IELTSWritingTask2Schema>;
export type IELTSWritingReview = z.infer<typeof IELTSWritingReviewSchema>;
export type IELTSQuestion = z.infer<typeof IELTSQuestionSchema>;
