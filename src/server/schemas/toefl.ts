import { z } from 'zod';

// Base schemas
export const BaseQuestionSchema = z.object({
  id: z.string().uuid().optional(),
  questionText: z.string().min(10, 'Question text must be at least 10 characters'),
  instructions: z.string().optional(),
  points: z.number().int().min(1).max(5).default(1),
  estimatedTime: z.number().int().min(30).max(300).default(60),
});

// TOEFL Specific Schemas
export const TOEFLListeningPartASchema = BaseQuestionSchema.extend({
  type: z.literal('LISTENING_PART_A'),
  audioScript: z.string().min(200),
  speakers: z.array(z.object({
    name: z.string(),
    role: z.string().optional(),
  })).min(2).max(2),
  setting: z.enum(['CAFETERIA', 'STUDENT_CENTER','CAMPUS', 'ACADEMIC_OFFICE', 'LIBRARY', ]),
  questions: z.array(z.object({
    questionNumber: z.number().int().min(1).max(5),
    questionText: z.string().min(10),
    options: z.array(z.string().min(1)).length(4),
    correctAnswer: z.number().int().min(0).max(3),
    questionType: z.enum(['MAIN_TOPIC', 'DETAIL', 'INFERENCE', 'PURPOSE', 'ATTITUDE']),
    explanation: z.string().min(30),
  })).length(5),
  keyVocabulary: z.array(z.string()).min(3),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
});

export const TOEFLListeningPartBSchema = BaseQuestionSchema.extend({
  type: z.literal('LISTENING_PART_B'),
  audioScript: z.string().min(260),
  speakers: z.array(z.object({
    name: z.string(),
    role: z.string(),
  })).min(2).max(3),
  setting: z.enum(['CAFETERIA', 'STUDENT_CENTER','CAMPUS', 'ACADEMIC_OFFICE', 'LIBRARY', ]),
  questions: z.array(z.object({
    questionNumber: z.number().int().min(1).max(7),
    questionText: z.string().min(10),
    options: z.array(z.string().min(1)).length(4),
    correctAnswer: z.number().int().min(0).max(3),
    questionType: z.enum(['MAIN_TOPIC', 'DETAIL', 'INFERENCE', 'PURPOSE', 'ATTITUDE']),
    explanation: z.string().min(30),
  })).length(7),
  keyVocabulary: z.array(z.string()).min(5),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
});

export const TOEFLListeningPartDSchema = BaseQuestionSchema.extend({
  type: z.literal('LISTENING_PART_D'),
  audioScript: z.string().min(350),
  speakers: z.array(z.object({
    name: z.string(),
    role: z.string(),
  })).min(2).max(4),
  setting: z.enum(['CAFETERIA', 'STUDENT_CENTER','CAMPUS', 'ACADEMIC_OFFICE', 'LIBRARY', ]),
  questions: z.array(z.object({
    questionNumber: z.number().int().min(1).max(10),
    questionText: z.string().min(10),
    options: z.array(z.string().min(1)).length(4),
    correctAnswer: z.number().int().min(0).max(3),
    questionType: z.enum(['MAIN_TOPIC', 'DETAIL', 'INFERENCE', 'PURPOSE', 'ATTITUDE']),
    explanation: z.string().min(30),
  })).length(10),
  keyVocabulary: z.array(z.string()).min(6),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
});

const TOEFLListeningPartEQuestionItemSchema = z.object({
  questionNumber: z.number().int().min(1).max(15),
  questionText: z.string().min(10),
  options: z.array(z.string().min(1)).length(4),
  correctAnswer: z.number().int().min(0).max(3),
  questionType: z.enum(['MAIN_TOPIC', 'DETAIL', 'INFERENCE', 'ORGANIZATION', 'ATTITUDE', 'FUNCTION']),
  relatedTimestamp: z.string().optional(),
  explanation: z.string().min(30),
});

export const TOEFLListeningPartEBaseSchema = BaseQuestionSchema.extend({
  type: z.literal('LISTENING_PART_E'),
  audioScript: z.string().min(600),
  speakers: z.array(z.object({
    name: z.string(),
    role: z.string().optional(),
  })).min(1).max(2),
  setting: z.enum(['CAFETERIA', 'STUDENT_CENTER','CAMPUS', 'ACADEMIC_OFFICE', 'LIBRARY', ]),
  lectureTopic: z.string().min(20),
  academicField: z.enum([
    'BIOLOGY', 'HISTORY', 'LITERATURE', 'PSYCHOLOGY',
    'ANTHROPOLOGY', 'GEOLOGY', 'ART_HISTORY', 'ECONOMICS',
    'PHYSICS', 'CHEMISTRY', 'SOCIOLOGY', 'PHILOSOPHY'
  ]),
  keyVocabulary: z.array(z.string()).min(8),
  lectureOutline: z.array(z.object({
    timestamp: z.string(),
    topic: z.string(),
    keyPoints: z.array(z.string()),
  })).min(3),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
});

export const TOEFLListeningPartEQuestionBatchSchema = z.object({
  questions: z.array(TOEFLListeningPartEQuestionItemSchema).length(5),
});

export const TOEFLListeningPartESchema = TOEFLListeningPartEBaseSchema.extend({
  questions: z.array(TOEFLListeningPartEQuestionItemSchema).length(15),
});

export const TOEFLListeningPartCSchema = BaseQuestionSchema.extend({
  type: z.literal('LISTENING_PART_C'),
  audioScript: z.string().min(500),
  speakers: z.array(z.object({
    name: z.string(),
    role: z.string(),
  })).min(2).max(4),
  setting: z.enum(['CAFETERIA', 'STUDENT_CENTER','CAMPUS', 'ACADEMIC_OFFICE', 'LIBRARY', ]),
  questions: z.array(z.object({
    questionNumber: z.number().int().min(1).max(13),
    questionText: z.string().min(10),
    options: z.array(z.string().min(1)).length(4),
    correctAnswer: z.number().int().min(0).max(3),
    questionType: z.enum(['MAIN_TOPIC', 'DETAIL', 'INFERENCE', 'PURPOSE', 'ATTITUDE']),
    explanation: z.string().min(30),
  })).length(13),
  keyVocabulary: z.array(z.string()).min(6),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
});

export const TOEFLReadingPassageContentSchema = z.object({
  title: z.string().min(10),
  author: z.string().optional(),
  source: z.string().optional(),
  wordCount: z.number().int().min(500).max(800),
  content: z.string().min(500),
  topicCategory: z.enum([
    'NATURAL_SCIENCE', 'SOCIAL_SCIENCE', 'HUMANITIES', 'ARTS',
    'HISTORY', 'TECHNOLOGY', 'ENVIRONMENT', 'EDUCATION'
  ]),
  complexity: z.enum(['ACADEMIC', 'TECHNICAL', 'GENERAL']),
});

export const TOEFLReadingQuestionItemSchema = z.object({
  questionNumber: z.number().int().min(1).max(50),
  questionText: z.string().min(10),
  options: z.array(z.string().min(1)).length(4),
  correctAnswer: z.number().int().min(0).max(3),
  questionType: z.enum([
    'MAIN_IDEA', 'DETAIL', 'INFERENCE', 'RHETORICAL_PURPOSE',
    'VOCABULARY', 'REFERENCE', 'SENTENCE_SIMPLIFICATION',
    'INSERT_TEXT', 'PROSE_SUMMARY', 'TABLE_COMPLETION'
  ]),
  paragraphReference: z.number().int().min(1).optional(),
  explanation: z.string().min(30),
});

export const TOEFLReadingPassageOnlySchema = BaseQuestionSchema.extend({
  type: z.literal('READING_PASSAGE'),
  passage: TOEFLReadingPassageContentSchema,
  vocabularyInContext: z.array(z.object({
    word: z.string(),
    paragraph: z.number().int(),
    context: z.string(),
    meaningInContext: z.string(),
  })).min(5),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
});

export const TOEFLReadingQuestionBatchSchema = z.object({
  questions: z.array(TOEFLReadingQuestionItemSchema).length(10),
});

export const TOEFLReadingSchema = BaseQuestionSchema.extend({
  type: z.literal('READING'),
  passage: TOEFLReadingPassageContentSchema,
  passages: z.array(TOEFLReadingPassageContentSchema).optional(),
  questions: z.array(TOEFLReadingQuestionItemSchema).min(40).max(50),
  vocabularyInContext: z.array(z.object({
    word: z.string(),
    paragraph: z.number().int(),
    context: z.string(),
    meaningInContext: z.string(),
  })).min(3),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
});

export const TOEFLStructureQuestionItemSchema = z.object({
  questionNumber: z.number().int().min(1).max(40),
  questionText: z.string().min(20),
  sentenceType: z.enum(['COMPLETION', 'ERROR_IDENTIFICATION']),
  sentence: z.string().min(20),
  underlinedParts: z.array(z.object({
    text: z.string(),
    index: z.number().int(),
    isCorrectAnswer: z.boolean(),
  })).optional(),
  options: z.array(z.string().min(1)).length(4),
  correctAnswer: z.number().int().min(0).max(3),
  grammarTopic: z.enum([
    'SUBJECT_VERB_AGREEMENT', 'VERB_TENSE', 'VERB_FORM', 'MODALS',
    'PARALLEL_STRUCTURE', 'COMPARATIVES_SUPERLATIVES', 'ADJECTIVE_ADVERB',
    'COUNT_NONCOUNT_NOUNS', 'PRONOUN_REFERENCE', 'PRONOUN_FORM',
    'PREPOSITIONS', 'WORD_ORDER', 'ARTICLES', 'GERUNDS_INFINITIVES',
    'PASSIVE_VOICE', 'CONDITIONAL', 'RELATIVE_CLAUSE', 'REDUCED_CLAUSE'
  ]),
  explanation: z.object({
    correctAnswer: z.string().min(30),
    grammarRule: z.string().min(30),
    example: z.string().min(20),
    commonMistake: z.string().min(20),
  }),
});

export const TOEFLStructureBatchSchema = z.object({
  questions: z.array(TOEFLStructureQuestionItemSchema).length(5),
});

export const TOEFLStructureBaseSchema = BaseQuestionSchema.extend({
  type: z.literal('STRUCTURE'),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
});

export const TOEFLStructureSchema = TOEFLStructureBaseSchema.extend({
  questions: z.array(TOEFLStructureQuestionItemSchema).length(40),
});

export const TOEFLQuestionSchema = z.discriminatedUnion('type', [
  TOEFLListeningPartASchema,
  TOEFLListeningPartBSchema,
  TOEFLListeningPartCSchema,
  TOEFLListeningPartDSchema,
  TOEFLListeningPartESchema,
  TOEFLReadingSchema,
  TOEFLReadingPassageOnlySchema,
  TOEFLStructureSchema,
]);

export type TOEFLListeningPartA = z.infer<typeof TOEFLListeningPartASchema>;
export type TOEFLListeningPartB = z.infer<typeof TOEFLListeningPartBSchema>;
export type TOEFLListeningPartC = z.infer<typeof TOEFLListeningPartCSchema>;
export type TOEFLListeningPartD = z.infer<typeof TOEFLListeningPartDSchema>;
export type TOEFLListeningPartE = z.infer<typeof TOEFLListeningPartESchema>;
export type TOEFLListeningPartEBase = z.infer<typeof TOEFLListeningPartEBaseSchema>;
export type TOEFLReading = z.infer<typeof TOEFLReadingSchema>;
export type TOEFLStructure = z.infer<typeof TOEFLStructureSchema>;
export type TOEFLQuestion = z.infer<typeof TOEFLQuestionSchema>;
