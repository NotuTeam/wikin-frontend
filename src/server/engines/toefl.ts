import { z } from 'zod';
import { formatStructuredOutput, generateStructured, TOEFL_SYSTEM_PROMPT } from '../ai';
import {
  TOEFLListeningPartASchema,
  TOEFLListeningPartBSchema,
  TOEFLListeningPartCSchema,
  TOEFLListeningPartDSchema,
  TOEFLListeningPartESchema,
  TOEFLReadingPassageOnlySchema,
  TOEFLReadingQuestionItemSchema,
  TOEFLStructureBatchSchema,
  type TOEFLReading,
} from '../schemas/toefl';

export class TOEFLEngine {
  private static readonly LISTENING_SETTINGS = ['CAFETERIA', 'STUDENT_CENTER', 'CAMPUS', 'ACADEMIC_OFFICE', 'LIBRARY'] as const;
  private static readonly DEFAULT_POINTS = 1;
  private static readonly DEFAULT_ESTIMATED_TIME = 60;
  private lastListeningSetting: (typeof TOEFLEngine.LISTENING_SETTINGS)[number] | null = null;

  private withDefaults<T extends Record<string, unknown>>(data: T) {
    return {
      points: TOEFLEngine.DEFAULT_POINTS,
      estimatedTime: TOEFLEngine.DEFAULT_ESTIMATED_TIME,
      ...data,
    };
  }

  private pickListeningSetting() {
    const candidates = TOEFLEngine.LISTENING_SETTINGS.filter(
      (setting) => setting !== this.lastListeningSetting,
    );
    const next = candidates[Math.floor(Math.random() * candidates.length)] ?? TOEFLEngine.LISTENING_SETTINGS[0];
    this.lastListeningSetting = next;
    return next;
  }

  private buildListeningScriptRules() {
    return `AudioScript formatting rules:
- Start with one short context line in this exact style: "Situation: ..."
- After the situation line, write dialogue/lecture lines using FULL speaker names only (examples: "Mike:", "Professor Chen:", "Joko:")
- Never use initials or single letters as speakers (forbidden: "M:", "P:", "J:")
- Do not open with speaker introduction list; open with the situation/context first`;
  }

  private async generateListeningWithFixedSetting<TLean extends Record<string, unknown>, TFull>(
    prompt: string,
    leanSchema: z.ZodSchema<TLean>,
    hydrate: (data: TLean) => TFull,
    options: { temperature: number; maxTokens: number }
  ) {
    const first = await generateStructured(prompt, leanSchema, {
      system: TOEFL_SYSTEM_PROMPT,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    });

    try {
      return hydrate(first);
    } catch {
      const retryPrompt = `${prompt}\n\nRETRY: Return strict valid JSON matching schema. Avoid extra keys and keep only required fields.`;
      const second = await generateStructured(retryPrompt, leanSchema, {
        system: TOEFL_SYSTEM_PROMPT,
        temperature: Math.max(0.1, options.temperature - 0.1),
        maxTokens: options.maxTokens,
      });
      return hydrate(second);
    }
  }

  private async generateFormattedWithRetry<T>(
    sourcePrompt: string,
    schema: z.ZodSchema<T>,
    options: { temperature: number; maxTokens: number; formattingInstructions?: string },
  ) {
    const startedAt = Date.now();
    console.log('[question-gen][toefl][formatter] start', {
      maxTokens: options.maxTokens,
      temperature: options.temperature,
      promptPreview: sourcePrompt.replace(/\s+/g, ' ').trim().slice(0, 120),
    });

    try {
      const result = await formatStructuredOutput(sourcePrompt, schema, {
        system: TOEFL_SYSTEM_PROMPT,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        formattingInstructions: options.formattingInstructions,
      });
      console.log('[question-gen][toefl][formatter] success', {
        durationMs: Date.now() - startedAt,
      });
      return result;
    } catch (error) {
      console.warn('[question-gen][toefl][formatter] retry', {
        durationMs: Date.now() - startedAt,
        message: error instanceof Error ? error.message : 'Unknown formatter failure',
      });
      const result = await formatStructuredOutput(sourcePrompt, schema, {
        system: TOEFL_SYSTEM_PROMPT,
        temperature: Math.max(0.1, options.temperature - 0.1),
        maxTokens: Math.min(options.maxTokens, 2400),
        formattingInstructions: options.formattingInstructions,
      });
      console.log('[question-gen][toefl][formatter] success-after-retry', {
        durationMs: Date.now() - startedAt,
      });
      return result;
    }
  }


  async generateListeningPartA(difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM') {
    const setting = this.pickListeningSetting();
    const leanSchema = z.object({
      questionText: z.string().min(10),
      audioScript: z.string().min(200),
      speakers: z.array(z.object({ name: z.string(), role: z.string().optional() })).length(2),
      questions: z.array(z.object({
        questionNumber: z.number().int().min(1).max(10),
        questionText: z.string().min(10),
        options: z.array(z.string().min(1)).length(4),
        correctAnswer: z.number().int().min(0).max(3),
        questionType: z.enum(['MAIN_TOPIC', 'DETAIL', 'INFERENCE', 'PURPOSE', 'ATTITUDE']),
        explanation: z.string().min(30),
      })).length(10),
      keyVocabulary: z.array(z.string()).min(3),
    });

    const prompt = `Generate a TOEFL Listening Part A set with EXACTLY 10 questions.

Setting: ${setting}
Difficulty: ${difficulty}

${difficulty === 'EASY' ? 'Use clear, straightforward language with obvious context clues.' : ''}
${difficulty === 'MEDIUM' ? 'Use natural academic language requiring inference.' : ''}
${difficulty === 'HARD' ? 'Use complex language with subtle implications and idiomatic expressions.' : ''}

Output rules:
1. Return only keys: questionText, audioScript, speakers, questions, keyVocabulary
2. questions array must contain EXACTLY 10 items
3. Each item must include: questionNumber (1-10), questionText, 4 options, correctAnswer, questionType, explanation
4. Keep explanations concise (1-2 sentences)
5. ${this.buildListeningScriptRules()}`;

    return this.generateListeningWithFixedSetting(
      prompt,
      leanSchema,
      (data) => TOEFLListeningPartASchema.parse(this.withDefaults({ ...data, type: 'LISTENING_PART_A', setting, difficulty })),
      { temperature: 0.4, maxTokens: 3000 }
    );
  }

  async generateListeningPartB(difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM') {
    const setting = this.pickListeningSetting();
    const leanSchema = z.object({
      questionText: z.string().min(10),
      audioScript: z.string().min(260),
      speakers: z.array(z.object({ name: z.string(), role: z.string() })).min(2).max(3),
      questions: z.array(z.object({
        questionNumber: z.number().int().min(1).max(10),
        questionText: z.string().min(10),
        options: z.array(z.string().min(1)).length(4),
        correctAnswer: z.number().int().min(0).max(3),
        questionType: z.enum(['MAIN_TOPIC', 'DETAIL', 'INFERENCE', 'PURPOSE', 'ATTITUDE']),
        explanation: z.string().min(30),
      })).length(10),
      keyVocabulary: z.array(z.string()).min(5),
    });

    const prompt = `Generate a TOEFL Listening Part B set with EXACTLY 10 questions.

Setting: ${setting}
Difficulty: ${difficulty}

Output rules:
1. Return only keys: questionText, audioScript, speakers, questions, keyVocabulary
2. questions array must contain EXACTLY 10 items
3. Each item must include questionNumber (1-10), questionText, 4 options, correctAnswer numeric index 0..3, questionType, explanation
4. Keep explanations concise (1-2 sentences)
5. ${this.buildListeningScriptRules()}`;

    return this.generateListeningWithFixedSetting(
      prompt,
      leanSchema,
      (data) => TOEFLListeningPartBSchema.parse(this.withDefaults({ ...data, type: 'LISTENING_PART_B', setting, difficulty })),
      { temperature: 0.4, maxTokens: 3300 }
    );
  }

  async generateListeningPartC(difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM') {
    const setting = this.pickListeningSetting();
    const leanSchema = z.object({
      questionText: z.string().min(10),
      audioScript: z.string().min(500),
      speakers: z.array(z.object({ name: z.string(), role: z.string() })).min(2).max(4),
      questions: z.array(z.object({
        questionNumber: z.number().int().min(1).max(10),
        questionText: z.string().min(10),
        options: z.array(z.string().min(1)).length(4),
        correctAnswer: z.number().int().min(0).max(3),
        questionType: z.enum(['MAIN_TOPIC', 'DETAIL', 'INFERENCE', 'PURPOSE', 'ATTITUDE']),
        explanation: z.string().min(30),
      })).length(10),
      keyVocabulary: z.array(z.string()).min(6),
    });

    const basePrompt = `Generate a TOEFL Listening Part C set with EXACTLY 10 questions.

Setting: ${setting}
Difficulty: ${difficulty}

Output rules:
1. Return only keys: questionText, audioScript, speakers, questions, keyVocabulary
2. questions array must contain EXACTLY 10 items with questionNumber 1..10
3. Keep explanations concise (1-2 sentences)
4. ${this.buildListeningScriptRules()}`;

    try {
      return await this.generateListeningWithFixedSetting(
        basePrompt,
        leanSchema,
        (data) => TOEFLListeningPartCSchema.parse(this.withDefaults({ ...data, type: 'LISTENING_PART_C', setting, difficulty })),
        { temperature: 0.25, maxTokens: 3600 }
      );
    } catch {
      const retryPrompt = `${basePrompt}\n\nRETRY MODE: avoid extra keys and ensure valid enums + numeric correctAnswer.`;

      const retry = await generateStructured(retryPrompt, leanSchema, {
        system: TOEFL_SYSTEM_PROMPT,
        temperature: 0.1,
        maxTokens: 3400,
      });

      return TOEFLListeningPartCSchema.parse(this.withDefaults({ ...retry, type: 'LISTENING_PART_C', setting, difficulty }));
    }
  }

  async generateListeningPartD(difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM') {
    const setting = this.pickListeningSetting();
    const leanSchema = z.object({
      questionText: z.string().min(10),
      audioScript: z.string().min(350),
      speakers: z.array(z.object({ name: z.string(), role: z.string() })).min(2).max(4),
      questions: z.array(z.object({
        questionNumber: z.number().int().min(1).max(10),
        questionText: z.string().min(10),
        options: z.array(z.string().min(1)).length(4),
        correctAnswer: z.number().int().min(0).max(3),
        questionType: z.enum(['MAIN_TOPIC', 'DETAIL', 'INFERENCE', 'PURPOSE', 'ATTITUDE']),
        explanation: z.string().min(30),
      })).length(10),
      keyVocabulary: z.array(z.string()).min(6),
    });

    const basePrompt = `Generate a TOEFL Listening Part D set with EXACTLY 10 questions.

Setting: ${setting}
Difficulty: ${difficulty}

Output rules:
1. Return only keys: questionText, audioScript, speakers, questions, keyVocabulary
2. questions array must contain EXACTLY 10 items with questionNumber 1..10
3. Keep explanations concise (1-2 sentences)
4. ${this.buildListeningScriptRules()}`;

    try {
      return await this.generateListeningWithFixedSetting(
        basePrompt,
        leanSchema,
        (data) => TOEFLListeningPartDSchema.parse(this.withDefaults({ ...data, type: 'LISTENING_PART_D', setting, difficulty })),
        { temperature: 0.25, maxTokens: 3500 }
      );
    } catch {
      const retryPrompt = `${basePrompt}\n\nRETRY MODE: avoid extra keys and ensure valid enums + numeric correctAnswer.`;
      const retry = await generateStructured(retryPrompt, leanSchema, {
        system: TOEFL_SYSTEM_PROMPT,
        temperature: 0.1,
        maxTokens: 3300,
      });
      return TOEFLListeningPartDSchema.parse(this.withDefaults({ ...retry, type: 'LISTENING_PART_D', setting, difficulty }));
    }
  }

  async generateListeningPartE(difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM') {
    const fields = ['BIOLOGY', 'HISTORY', 'LITERATURE', 'PSYCHOLOGY', 'ANTHROPOLOGY', 'GEOLOGY', 'ART_HISTORY', 'ECONOMICS'];
    const field = fields[Math.floor(Math.random() * fields.length)];
    const setting = this.pickListeningSetting();

    const basePrompt = `Generate a TOEFL Listening Part E set with EXACTLY 10 questions.

Setting: ${setting}

Academic Field: ${field}
Difficulty: ${difficulty}

Output rules:
1. Return ONLY these keys: questionText, audioScript, speakers, lectureTopic, questions, keyVocabulary
2. lectureTopic must be a descriptive string (min 20 chars) about the lecture topic
3. questions array must contain EXACTLY 10 items with questionNumber 1..10
4. All options values must be strings, NOT numbers
5. Keep explanations concise (1-2 sentences)
6. ${this.buildListeningScriptRules()}`;


const leanSchema = z.object({
      questionText: z.string().min(10),
      audioScript: z.string().min(600),
      speakers: z.array(z.object({ name: z.string(), role: z.string().optional() })).min(1).max(2),
      lectureTopic: z.string().min(20),
      questions: z.array(z.object({
        questionNumber: z.number().int().min(1).max(10),
        questionText: z.string().min(10),
        options: z.array(z.string().min(1)).length(4),
        correctAnswer: z.number().int().min(0).max(3),
        questionType: z.enum(['MAIN_TOPIC', 'DETAIL', 'INFERENCE', 'PURPOSE', 'ATTITUDE']),
        explanation: z.string().min(30),
      })).length(10),
      keyVocabulary: z.array(z.string()).min(8),
    });

    try{
      return await this.generateListeningWithFixedSetting(
      basePrompt,
      leanSchema,
      (data) => TOEFLListeningPartESchema.parse(this.withDefaults({ ...data, type: 'LISTENING_PART_E', academicField: field, setting, difficulty })),
      { temperature: 0.3, maxTokens: 4500 }
    );
    }catch{
      const retryPrompt = `${basePrompt}\n\nRETRY MODE: avoid extra keys and ensure valid enums + numeric correctAnswer.`;
      const retry = await generateStructured(retryPrompt, leanSchema, {
        system: TOEFL_SYSTEM_PROMPT,
        temperature: 0.1,
        maxTokens: 4500,
      });
      return TOEFLListeningPartESchema.parse(this.withDefaults({ ...retry, type: 'LISTENING_PART_E', academicField: field, setting, difficulty }));
    }
  }

  private getToeflReadingPassageConfigs() {
    return [
      { questionCount: 15, startIndex: 1 },
      { questionCount: 15, startIndex: 16 },
      { questionCount: 20, startIndex: 31 },
    ] as const;
  }

  async generateReadingPassageUnit(
    passageIndex: 1 | 2 | 3,
    difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM'
  ) {
    const categories = ['NATURAL_SCIENCE', 'SOCIAL_SCIENCE', 'HUMANITIES', 'ARTS', 'HISTORY', 'TECHNOLOGY', 'ENVIRONMENT', 'EDUCATION'] as const;
    const category = categories[Math.floor(Math.random() * categories.length)];
    const config = this.getToeflReadingPassageConfigs()[passageIndex - 1];

    const passageLeanSchema = z.object({
      questionText: z.string().min(10),
      passage: z.object({
        title: z.string().min(10),
        author: z.string().optional(),
        source: z.string().optional(),
        wordCount: z.number().int().min(500).max(800),
        content: z.string().min(500),
        complexity: z.enum(['ACADEMIC', 'TECHNICAL', 'GENERAL']),
      }),
      vocabularyInContext: z.array(z.object({
        word: z.string(),
        paragraph: z.number().int(),
        context: z.string(),
        meaningInContext: z.string(),
      })).min(5),
    });

    const passagePrompt = `Generate TOEFL Reading passage ${passageIndex} metadata and context only.

Topic: ${category}
Difficulty: ${difficulty}
This is passage ${passageIndex} of 3 in the reading section.

Output rules:
1. Return only keys: questionText, passage, vocabularyInContext
2. passage content 500-700 words
3. Do not include questions
4. vocabularyInContext minimum 5 items`;

    const passageResult = await generateStructured(passagePrompt, passageLeanSchema, {
      system: TOEFL_SYSTEM_PROMPT,
      temperature: 0.3,
      maxTokens: 2600,
    });

    const questionsPerBatch = config.questionCount === 15 ? [8, 7] : [10, 10];
    const allQuestions: TOEFLReading['questions'] = [];

    let currentStart = config.startIndex;
    for (let batch = 0; batch < questionsPerBatch.length; batch += 1) {
      const count = questionsPerBatch[batch];
      const end = currentStart + count - 1;

      const batchPrompt = `Generate TOEFL Reading questions for passage ${passageIndex}, batch ${batch + 1}.

Topic: ${category}
Difficulty: ${difficulty}
Passage title: ${passageResult.passage.title}
Passage excerpt:\n${passageResult.passage.content.slice(0, 1800)}

Output rules:
1. Return exactly ${count} questions in questions array
2. questionNumber must be ${currentStart}..${end}
3. Each question must include questionText, 4 options, correctAnswer, questionType, explanation
4. Keep explanation concise (1-2 sentences)
5. Questions must be based on the provided passage excerpt
6. Use paragraphReference to indicate which paragraph the question refers to (1-based)`;

      const batchSchema = this.createBatchSchema(count);
      const batchResult = await this.generateFormattedWithRetry(
        batchPrompt,
        batchSchema,
        {
          temperature: 0.3,
          maxTokens: 2600,
          formattingInstructions:
            `Return an object with a questions array of exactly ${count} items. Preserve questionNumber range ${currentStart}..${end}, 4 options per question, numeric correctAnswer, and paragraphReference when relevant.`,
        }
      );

      allQuestions.push(...batchResult.questions);
      currentStart = end + 1;
    }

    return {
      passage: {
        ...passageResult.passage,
        topicCategory: category,
      },
      vocabularyInContext: passageResult.vocabularyInContext,
      questions: allQuestions,
    };
  }

  async generateReading(difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM'): Promise<TOEFLReading> {
    const passages: TOEFLReading['passage'][] = [];
    const allQuestions: TOEFLReading['questions'] = [];
    const allVocabulary: TOEFLReading['vocabularyInContext'] = [];

    for (const passageIndex of [1, 2, 3] as const) {
      const unit = await this.generateReadingPassageUnit(passageIndex, difficulty);
      passages.push(unit.passage);
      allQuestions.push(...unit.questions);
      allVocabulary.push(...unit.vocabularyInContext);
    }

    allQuestions.sort((a, b) => a.questionNumber - b.questionNumber);

    return {
      type: 'READING',
      questionText: 'TOEFL Reading Section - Multiple Passages',
      points: 1,
      estimatedTime: 60,
      difficulty,
      passage: passages[0],
      passages,
      vocabularyInContext: allVocabulary,
      questions: allQuestions,
    };
  }

  private createBatchSchema(count: number) {
    return z.object({
      questions: z.array(TOEFLReadingQuestionItemSchema).length(count),
    });
  }

  async generateStructure(difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM') {
    const topics = ['SUBJECT_VERB_AGREEMENT', 'VERB_TENSE', 'PARALLEL_STRUCTURE', 'PRONOUN_REFERENCE', 'PASSIVE_VOICE', 'CONDITIONAL', 'RELATIVE_CLAUSE'];
    const topic = topics[Math.floor(Math.random() * topics.length)];

    const allQuestions: any[] = [];

    for (let batch = 0; batch < 8; batch += 1) {
      const start = batch * 5 + 1;
      const end = start + 4;
      const batchPrompt = `Generate TOEFL Structure questions batch ${batch + 1}.

Grammar Focus Seed: ${topic}
Difficulty: ${difficulty}

Output rules:
1. Return exactly 5 questions in questions array
2. questionNumber must be ${start}..${end}
3. Each question must include questionText, sentenceType, sentence, 4 options, correctAnswer numeric index 0..3, grammarTopic, explanation object
4. sentenceType must be one of: COMPLETION, ERROR_IDENTIFICATION
5. grammarTopic must match the TOEFL grammar enum exactly
6. Explanation fields must be short and clear
7. Mix COMPLETION and ERROR_IDENTIFICATION
8. Return valid JSON only`;

      const batchResult = await this.generateFormattedWithRetry(batchPrompt, TOEFLStructureBatchSchema, {
        temperature: 0.2,
        maxTokens: 1300,
        formattingInstructions:
          'Return an object with a questions array of exactly 5 items. Each item must preserve sentenceType, sentence, 4 options, numeric correctAnswer, grammarTopic, and explanation object with fields correctAnswer, grammarRule, example, commonMistake.',
      });

      allQuestions.push(...batchResult.questions);
    }

    return {
      type: 'STRUCTURE',
      questionText: `TOEFL Structure & Written Expression - ${topic}`,
      points: 1,
      estimatedTime: 60,
      difficulty,
      questions: allQuestions,
    };
  }
}

export const toeflEngine = new TOEFLEngine();
