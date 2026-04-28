import { formatStructuredOutput, generateStructured, IELTS_SYSTEM_PROMPT } from '../ai';
import {
  IELTSListeningSectionSchema,
  IELTSReadingPassageOnlySchema,
  IELTSReadingQuestionItemSchema,
  IELTSWritingTask1Schema,
  IELTSWritingTask2Schema,
  IELTSWritingReviewSchema,
} from '../schemas/ielts';
import { z } from 'zod';

export class IELTSEngine {
  private static readonly DEFAULT_POINTS = 1;
  private static readonly DEFAULT_ESTIMATED_TIME = 60;

  private withDefaults<T extends Record<string, unknown>>(data: T) {
    return {
      points: IELTSEngine.DEFAULT_POINTS,
      estimatedTime: IELTSEngine.DEFAULT_ESTIMATED_TIME,
      ...data,
    };
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
      system: IELTS_SYSTEM_PROMPT,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    });

    try {
      return hydrate(first);
    } catch {
      const retryPrompt = `${prompt}\n\nRETRY: Return strict valid JSON matching schema. Avoid extra keys and keep only required fields.`;
      const second = await generateStructured(retryPrompt, leanSchema, {
        system: IELTS_SYSTEM_PROMPT,
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
    console.log('[question-gen][ielts][formatter] start', {
      maxTokens: options.maxTokens,
      temperature: options.temperature,
      promptPreview: sourcePrompt.replace(/\s+/g, ' ').trim().slice(0, 120),
    });

    try {
      const result = await formatStructuredOutput(sourcePrompt, schema, {
        system: IELTS_SYSTEM_PROMPT,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        formattingInstructions: options.formattingInstructions,
      });
      console.log('[question-gen][ielts][formatter] success', {
        durationMs: Date.now() - startedAt,
      });
      return result;
    } catch (error) {
      console.warn('[question-gen][ielts][formatter] retry', {
        durationMs: Date.now() - startedAt,
        message: error instanceof Error ? error.message : 'Unknown formatter failure',
      });
      const result = await formatStructuredOutput(sourcePrompt, schema, {
        system: IELTS_SYSTEM_PROMPT,
        temperature: Math.max(0.1, options.temperature - 0.1),
        maxTokens: Math.min(options.maxTokens, 2400),
        formattingInstructions: options.formattingInstructions,
      });
      console.log('[question-gen][ielts][formatter] success-after-retry', {
        durationMs: Date.now() - startedAt,
      });
      return result;
    }
  }

  async generateListeningSection(
    section: 'SECTION_1' | 'SECTION_2' | 'SECTION_3' | 'SECTION_4',
    difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM'
  ) {
    const configs = {
      SECTION_1: 'Everyday social conversation (travel, accommodation)',
      SECTION_2: 'Monologue about general academic topic (campus tour, event)',
      SECTION_3: 'Discussion between students and tutor about coursework',
      SECTION_4: 'Academic lecture on specialized topic',
    };

    const sectionSettingMap = {
      SECTION_1: 'SOCIAL_SURVIVAL',
      SECTION_2: 'EDUCATIONAL_SURVIVAL',
      SECTION_3: 'ACADEMIC_DISCUSSION',
      SECTION_4: 'ACADEMIC_LECTURE',
    } as const;
    const requiredSetting = sectionSettingMap[section];

    const leanSchema = z.object({
      type: z.literal('LISTENING'),
      section: z.enum(['SECTION_1', 'SECTION_2', 'SECTION_3', 'SECTION_4']),
      questionText: z.string().min(10),
      audioScript: z.string().min(100),
      context: z.object({
        speakers: z.array(z.object({
          name: z.string().optional(),
          accent: z.enum(['BRITISH', 'AMERICAN', 'AUSTRALIAN', 'CANADIAN']),
          gender: z.enum(['MALE', 'FEMALE']).optional(),
          role: z.string().optional(),
        })).min(1).max(4),
      }),
      questions: z.array(z.object({
        questionNumber: z.number().int().min(1).max(10),
        questionType: z.literal('MULTIPLE_CHOICE'),
        questionText: z.string(),
        answerFormat: z.literal('LETTER'),
        correctAnswer: z.number().int().min(0).max(3),
        options: z.array(z.string()).length(4),
        keywords: z.array(z.string()).min(1),
        synonymsUsed: z.array(z.string()),
      })).length(10),
      keyVocabulary: z.array(z.object({
        word: z.string(),
        pronunciationNote: z.string().optional(),
        meaning: z.string(),
      })).min(5),
    });

    const baseRules = `Generate an IELTS Listening ${section} question set with EXACTLY 10 questions in TOEFL-like multiple-choice style.

Context: ${configs[section]}
Difficulty: ${difficulty}
Required context.setting: ${requiredSetting}

Output rules:
1. Return only keys: type, section, questionText, audioScript, context, questions, keyVocabulary
2. type must be LISTENING and section must be exactly ${section}
3. context.speakers must be 1-4 items, accent in BRITISH|AMERICAN|AUSTRALIAN|CANADIAN
4. questions must be EXACTLY 10 items with questionNumber 1..10
5. Every question MUST be MULTIPLE_CHOICE with exactly 4 options
6. answerFormat MUST be LETTER and correctAnswer MUST be numeric 0..3
7. Include keywords (>=1) and synonymsUsed array in each question
8. ${this.buildListeningScriptRules()}`;

    return this.generateListeningWithFixedSetting(
      baseRules,
      leanSchema,
      (data) => IELTSListeningSectionSchema.parse(this.withDefaults({
        ...data,
        difficulty,
        context: {
          ...data.context,
          setting: requiredSetting,
        },
      })),
      { temperature: 0.25, maxTokens: 3600 }
    );
  }

  async generateReadingPassage(difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM') {
    const topics = ['SCIENCE_TECHNOLOGY', 'SOCIAL_ISSUES', 'EDUCATION', 'ENVIRONMENT', 'HEALTH_MEDICINE', 'HISTORY_CULTURE', 'BUSINESS_ECONOMICS'];
    const passages: any[] = [];
    const allQuestions: any[] = [];

    const generateWithRetry = async <T>(
      prompt: string,
      schema: z.ZodSchema<T>,
      base: { temperature: number; maxTokens: number }
    ) => {
      try {
        return await generateStructured(prompt, schema, {
          system: IELTS_SYSTEM_PROMPT,
          temperature: base.temperature,
          maxTokens: base.maxTokens,
        });
      } catch {
        const retryPrompt = `${prompt}\n\nRETRY MODE:\n- Return strictly valid JSON matching schema.\n- Do not add markdown, code fences, or extra commentary.\n- Keep explanations concise.`;
        return generateStructured(retryPrompt, schema, {
          system: IELTS_SYSTEM_PROMPT,
          temperature: Math.max(0.1, base.temperature - 0.1),
          maxTokens: Math.min(base.maxTokens, 2200),
        });
      }
    };

    const passageConfigs = [
      { questionCount: 15, startIndex: 1 },
      { questionCount: 15, startIndex: 16 },
      { questionCount: 10, startIndex: 31 },
    ];

    for (let i = 0; i < passageConfigs.length; i += 1) {
      const config = passageConfigs[i];
      const topic = topics[Math.floor(Math.random() * topics.length)];

      const passagePrompt = `Generate IELTS Academic Reading passage ${i + 1} metadata and content only.

Topic: ${topic}
Difficulty: ${difficulty}
This is passage ${i + 1} of 3.

Output rules:
1. Return type READING_PASSAGE
2. passage content 500-800 words
3. Include passage.questionStart=${config.startIndex} and passage.questionEnd=${config.startIndex + config.questionCount - 1}
4. Do not include questions array`;

      const passageResult = await generateWithRetry(
        passagePrompt,
        IELTSReadingPassageOnlySchema,
        { temperature: 0.3, maxTokens: 2600 }
      );

      passages.push({
        ...passageResult.passage,
        questionStart: config.startIndex,
        questionEnd: config.startIndex + config.questionCount - 1,
      });

      const batches = config.questionCount === 15 ? [8, 7] : [5, 5];
      let currentStart = config.startIndex;

      for (let batch = 0; batch < batches.length; batch += 1) {
        const count = batches[batch];
        const end = currentStart + count - 1;

        const questionPrompt = `Generate IELTS Academic Reading questions for passage ${i + 1}, batch ${batch + 1}.

Difficulty: ${difficulty}
Passage title: ${passageResult.passage.title}
Passage excerpt:\n${passageResult.passage.content.slice(0, 1900)}

Output rules (STRICT):
1. Return exactly ${count} questions in questions array
2. questionNumber must be ${currentStart}..${end}
3. Every questionType MUST be MULTIPLE_CHOICE
4. Every question MUST include exactly 4 options
5. correctAnswer MUST be number index 0..3
6. explanation minimum 20 chars, paraphrasing minimum 8 chars
7. Questions must strictly match the provided passage`; 

        const batchSchema = z.object({
          questions: z.array(IELTSReadingQuestionItemSchema).length(count),
        });

        const questionBatch = await this.generateFormattedWithRetry(
          questionPrompt,
          batchSchema,
          {
            temperature: 0.3,
            maxTokens: 2500,
            formattingInstructions:
              `Return an object with a questions array of exactly ${count} items. Preserve questionNumber range ${currentStart}..${end}, use MULTIPLE_CHOICE, exactly 4 options, numeric correctAnswer, explanation, keywordsInPassage, and paraphrasing.`,
          }
        );

        allQuestions.push(...questionBatch.questions);
        currentStart = end + 1;
      }
    }

    allQuestions.sort((a, b) => a.questionNumber - b.questionNumber);

    return {
      type: 'READING',
      questionText: 'IELTS Academic Reading - Multiple Passages',
      points: 1,
      estimatedTime: 60,
      difficulty,
      passage: passages[0],
      passages,
      questions: allQuestions,
      questionDistribution: {
        multipleChoice: allQuestions.filter((q) => q.questionType === 'MULTIPLE_CHOICE').length,
        trueFalseNotGiven: allQuestions.filter((q) => q.questionType === 'TRUE_FALSE_NOT_GIVEN').length,
        matching: allQuestions.filter((q) => String(q.questionType).startsWith('MATCHING')).length,
        completion: allQuestions.filter((q) => String(q.questionType).includes('COMPLETION')).length,
        shortAnswer: allQuestions.filter((q) => q.questionType === 'SHORT_ANSWER').length,
      },
    };
  }

  async generateWritingTask1(difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM') {
    const types = ['LINE_GRAPH', 'BAR_CHART', 'PIE_CHART', 'TABLE', 'DIAGRAM', 'MAP', 'PROCESS'];
    const type = types[Math.floor(Math.random() * types.length)];

    const prompt = `Generate an IELTS Academic Writing Task 1 question.

Task Type: ${type}
Difficulty: ${difficulty}

Create output optimized for frontend visualization with Chart.js/Table (NOT image description):
1. visualData must be structured data with fields:
   - chartType (line|bar|pie|table|process)
   - title
   - optional xAxisLabel and yAxisLabel
   - categories (array)
   - series: [{ name, data:number[] }] with each data length exactly equal to categories length
   - optional units
   - keyFeatures (insight bullets)
2. chartType mapping:
   - LINE_GRAPH -> line
   - BAR_CHART -> bar
   - PIE_CHART -> pie
   - TABLE -> table
   - DIAGRAM/MAP/PROCESS -> process (still structured data, no image narrative)
3. Do not return visualData.description or any image-generation instructions.
4. Suggested approach: introduction, overview, body paragraphs
5. Band 8-9 sample answer (150-200 words)
6. Examiner comments on why it's high-scoring`;

    return this.generateFormattedWithRetry(prompt, IELTSWritingTask1Schema, {
      temperature: 0.3,
      maxTokens: 3000,
      formattingInstructions:
        'Return exactly one WRITING_TASK_1 object with visualData, rubricFocus, suggestedApproach, sampleAnswer, timeLimit, wordRequirement, and difficulty matching the schema. visualData.series lengths must match categories length.',
    });
  }

  async generateWritingTask2(difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM') {
    const essayTypes = ['OPINION', 'DISCUSSION', 'PROBLEM_SOLUTION', 'ADVANTAGES_DISADVANTAGES', 'DIRECT_QUESTION'] as const;
    const topics = ['EDUCATION', 'TECHNOLOGY', 'ENVIRONMENT', 'HEALTH', 'WORK', 'URBANIZATION', 'GLOBALIZATION', 'CULTURE'];
    const essayType = essayTypes[Math.floor(Math.random() * essayTypes.length)];
    const topic = topics[Math.floor(Math.random() * topics.length)];

    const typeDesc = {
      OPINION: 'Present clear opinion with supporting arguments. Agree/disagree.',
      DISCUSSION: 'Discuss both views and give your own opinion.',
      PROBLEM_SOLUTION: 'Identify problems and propose solutions.',
      ADVANTAGES_DISADVANTAGES: 'Discuss pros and cons. State if advantages outweigh.',
      DIRECT_QUESTION: 'Answer specific questions asked in prompt.',
    };

    const prompt = `Generate an IELTS Academic Writing Task 2 question.

Essay Type: ${essayType} - ${typeDesc[essayType]}
Topic: ${topic}
Difficulty: ${difficulty}

Create:
1. Essay prompt with statement and question
2. Suggested structure: introduction, body paragraphs (2-3), conclusion
3. 10+ key vocabulary words with formal usage notes
4. Band 8-9 sample answer (250-300 words) demonstrating clear position, coherent paragraphs, wide vocabulary, complex grammar
5. Examiner comments on task response, coherence, vocabulary, grammar
6. 3-5 common mistakes with corrections`;

    return generateStructured(prompt, IELTSWritingTask2Schema, {
      system: IELTS_SYSTEM_PROMPT,
      temperature: 0.4,
      maxTokens: 4000,
    });
  }

  async reviewWritingAnswer(task: any, userAnswer: string) {
    const answer = userAnswer?.trim() || '';
    const minWordCount = task?.wordRequirement || (task?.type === 'WRITING_TASK_1' ? 150 : 250);
    const wordCount = answer ? answer.split(/\s+/).length : 0;

    if (!answer) {
      return {
        overallBand: 0,
        criteria: {
          taskAchievement: 0,
          coherenceAndCohesion: 0,
          lexicalResource: 0,
          grammaticalRangeAndAccuracy: 0,
        },
        checks: {
          wordCount,
          minWordCount,
          wordCountOk: false,
          relevanceToPrompt: 0,
          structureQuality: 0,
          grammarQuality: 0,
        },
        strengths: ['No written response submitted.'],
        improvements: ['Submit an answer that addresses the task prompt.'],
        summary: 'No answer was provided, so this task cannot be graded for quality.',
      };
    }

    const prompt = `Evaluate this IELTS writing answer based on the original task and rubric.

Task Type: ${task?.type || 'WRITING_TASK_2'}
Minimum word requirement: ${minWordCount}
Candidate word count: ${wordCount}

Original task JSON:
${JSON.stringify(task, null, 2)}

Candidate answer:
${answer}

Scoring instructions:
1. Score with IELTS-like logic (0-9) for each criterion.
2. Check whether answer length meets instruction.
3. Evaluate relevance to prompt/context, structure quality, and grammar quality (0-100).
4. Return practical strengths and improvements.
5. Keep summary concise and actionable.`;

    return generateStructured(prompt, IELTSWritingReviewSchema, {
      system: IELTS_SYSTEM_PROMPT,
      temperature: 0.2,
      maxTokens: 2200,
    });
  }

  async generateCompleteListeningTest(difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM') {
    const sections = await Promise.all([
      this.generateListeningSection('SECTION_1', difficulty),
      this.generateListeningSection('SECTION_2', difficulty),
      this.generateListeningSection('SECTION_3', difficulty),
      this.generateListeningSection('SECTION_4', difficulty),
    ]);

    return {
      sections,
      totalQuestions: sections.reduce((sum, s) => sum + s.questions.length, 0),
      duration: 30,
    };
  }

  async generateCompleteWritingTest(difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM') {
    const [task1, task2] = await Promise.all([
      this.generateWritingTask1(difficulty),
      this.generateWritingTask2(difficulty),
    ]);

    return { task1, task2, totalTime: 60 };
  }
}

export const ieltsEngine = new IELTSEngine();
