import { z } from 'zod';
import { generateStructured, TOEFL_SYSTEM_PROMPT } from '../ai';
import {
  TOEFLListeningPartASchema,
  TOEFLListeningPartBSchema,
  TOEFLListeningPartCSchema,
  TOEFLListeningPartDSchema,
  TOEFLListeningPartESchema,
  TOEFLReadingSchema,
  TOEFLReadingPassageOnlySchema,
  TOEFLReadingQuestionBatchSchema,
  TOEFLReadingQuestionItemSchema,
  TOEFLStructureSchema,
  TOEFLStructureBatchSchema,
  TOEFLListeningPartEBaseSchema,
  TOEFLListeningPartEQuestionBatchSchema,
  type TOEFLListeningPartE,
  type TOEFLReading,
} from '../schemas/toefl';

export class TOEFLEngine {
  private static readonly LISTENING_SETTINGS = ['CAFETERIA', 'STUDENT_CENTER', 'CAMPUS', 'ACADEMIC_OFFICE', 'LIBRARY'] as const;
  private lastListeningSetting: (typeof TOEFLEngine.LISTENING_SETTINGS)[number] | null = null;

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

  private async generateListeningWithFixedSetting<T extends { setting: string }>(
    prompt: string,
    schema: z.ZodSchema<T>,
    setting: string,
    options: { temperature: number; maxTokens: number }
  ) {
    const strictPrompt = `${prompt}\n\nCRITICAL: setting MUST be exactly ${setting}.`;

    const first = await generateStructured(strictPrompt, schema, {
      system: TOEFL_SYSTEM_PROMPT,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    });

    if (first.setting === setting) return first;

    const retryPrompt = `${strictPrompt}\n\nRETRY: previous output used wrong setting. Return JSON with setting exactly ${setting}.`;
    return generateStructured(retryPrompt, schema, {
      system: TOEFL_SYSTEM_PROMPT,
      temperature: Math.max(0.1, options.temperature - 0.1),
      maxTokens: options.maxTokens,
    });
  }

  async generateListeningPartA(difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM') {
    const setting = this.pickListeningSetting();

    const prompt = `Generate a TOEFL Listening Part A set with EXACTLY 5 questions.

Setting: ${setting}

Difficulty: ${difficulty}

${difficulty === 'EASY' ? 'Use clear, straightforward language with obvious context clues.' : ''}
${difficulty === 'MEDIUM' ? 'Use natural academic language requiring inference.' : ''}
${difficulty === 'HARD' ? 'Use complex language with subtle implications and idiomatic expressions.' : ''}

Output rules:
1. Return type LISTENING_PART_A
2. Provide one conversation audioScript for the part
3. speakers must contain exactly 2 people
4. setting must match provided setting enum exactly: ${setting}
5. questions array must contain EXACTLY 5 items
6. Each item must include: questionNumber (1-5), questionText, 4 options, correctAnswer, questionType, explanation
7. Keep explanations concise (1-2 sentences) to control token size
8. keyVocabulary min 3 items
9. ${this.buildListeningScriptRules()}`;

    return this.generateListeningWithFixedSetting(
      prompt,
      TOEFLListeningPartASchema,
      setting,
      { temperature: 0.4, maxTokens: 3000 }
    );
  }

  async generateListeningPartB(difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM') {
    const setting = this.pickListeningSetting();

    const prompt = `Generate a TOEFL Listening Part B set with EXACTLY 7 questions.

Setting: ${setting}
Difficulty: ${difficulty}

Output rules:
1. Return type LISTENING_PART_B
2. Provide one longer conversation audioScript
3. speakers 2-3 people
4. setting must match provided setting enum
5. questions array must contain EXACTLY 7 items
6. Each item must include: questionNumber (1-7), questionText, 4 options, correctAnswer, questionType, explanation
7. keyVocabulary minimum 5 items
8. ${this.buildListeningScriptRules()}`;

    return this.generateListeningWithFixedSetting(
      prompt,
      TOEFLListeningPartBSchema,
      setting,
      { temperature: 0.4, maxTokens: 3300 }
    );
  }

  async generateListeningPartC(difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM') {
    const setting = this.pickListeningSetting();

    const basePrompt = `Generate a TOEFL Listening Part C set with EXACTLY 13 questions.

Setting: ${setting}
Difficulty: ${difficulty}

STRICT SCHEMA RULES:
1. Return type LISTENING_PART_C
2. Provide one long academic discussion audioScript
3. speakers array 2-4 people
4. setting must match provided setting enum
5. questions array must contain EXACTLY 13 items with questionNumber 1..13
6. Each question must include questionText, options(4), correctAnswer(0..3), questionType, explanation
7. keyVocabulary minimum 6 items
8. ${this.buildListeningScriptRules()}
9. Return JSON matching schema only`;

    try {
      return await this.generateListeningWithFixedSetting(
        basePrompt,
        TOEFLListeningPartCSchema,
        setting,
        { temperature: 0.25, maxTokens: 3600 }
      );
    } catch {
      const retryPrompt = `${basePrompt}

RETRY MODE:
- Keep explanations concise.
- Avoid extra fields outside schema.
- Ensure correctAnswer is always numeric index.`;

      return generateStructured(retryPrompt, TOEFLListeningPartCSchema, {
        system: TOEFL_SYSTEM_PROMPT,
        temperature: 0.1,
        maxTokens: 3400,
      });
    }
  }

  async generateListeningPartD(difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM') {
    const setting = this.pickListeningSetting();

    const basePrompt = `Generate a TOEFL Listening Part D set with EXACTLY 10 questions.

Setting: ${setting}
Difficulty: ${difficulty}

STRICT SCHEMA RULES:
1. Return type LISTENING_PART_D
2. Provide one extended conversation audioScript
3. speakers array 2-4 people
4. setting must match provided setting enum
5. questions array must contain EXACTLY 10 items with questionNumber 1..10
6. Each question must include questionText, options(4), correctAnswer(0..3), questionType, explanation
7. keyVocabulary minimum 6 items
8. ${this.buildListeningScriptRules()}
9. Return JSON matching schema only`;

    try {
      return await this.generateListeningWithFixedSetting(
        basePrompt,
        TOEFLListeningPartDSchema,
        setting,
        { temperature: 0.25, maxTokens: 3500 }
      );
    } catch {
      const retryPrompt = `${basePrompt}

RETRY MODE:
- Keep explanations concise.
- Avoid extra fields outside schema.
- Ensure correctAnswer is always numeric index.`;

      return generateStructured(retryPrompt, TOEFLListeningPartDSchema, {
        system: TOEFL_SYSTEM_PROMPT,
        temperature: 0.1,
        maxTokens: 3300,
      });
    }
  }

  async generateListeningPartE(difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM') {
    const fields = ['BIOLOGY', 'HISTORY', 'LITERATURE', 'PSYCHOLOGY', 'ANTHROPOLOGY', 'GEOLOGY', 'ART_HISTORY', 'ECONOMICS'];
    const field = fields[Math.floor(Math.random() * fields.length)];
    const setting = this.pickListeningSetting();

    const basePrompt = `Generate TOEFL Listening Part E base content (without questions).

Setting: ${setting}

Academic Field: ${field}
Difficulty: ${difficulty}

Output rules:
1. Return type LISTENING_PART_E
2. Provide one lecture-style audioScript
3. speakers array includes lecturer name/role
4. setting must be valid enum
5. Include lectureOutline with at least 3 blocks and timestamps
6. keyVocabulary minimum 8 items
7. ${this.buildListeningScriptRules()}
8. Do not include questions`; 

    const base = await this.generateListeningWithFixedSetting(
      basePrompt,
      TOEFLListeningPartEBaseSchema,
      setting,
      { temperature: 0.3, maxTokens: 2800 }
    );

    const allQuestions: TOEFLListeningPartE['questions'] = [];

    for (let batch = 0; batch < 3; batch += 1) {
      const start = batch * 5 + 1;
      const end = start + 4;
      const batchPrompt = `Generate TOEFL Listening Part E questions batch ${batch + 1}.

Academic Field: ${field}
Difficulty: ${difficulty}
Lecture topic: ${base.lectureTopic}
Lecture excerpt:\n${base.audioScript.slice(0, 1800)}

Output rules:
1. Return exactly 5 questions in questions array
2. questionNumber must be ${start}..${end}
3. Each question must include questionText, 4 options, correctAnswer, questionType, optional relatedTimestamp, explanation
4. Keep explanation concise (1-2 sentences)
5. Questions must match the lecture excerpt`; 

      const batchResult = await generateStructured(batchPrompt, TOEFLListeningPartEQuestionBatchSchema, {
        system: TOEFL_SYSTEM_PROMPT,
        temperature: 0.3,
        maxTokens: 2200,
      });

      allQuestions.push(...batchResult.questions);
    }

    return {
      ...base,
      points: base.points ?? 1,
      estimatedTime: base.estimatedTime ?? 60,
      questions: allQuestions,
    };
  }

  async generateReading(difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM'): Promise<TOEFLReading> {
    const categories = ['NATURAL_SCIENCE', 'SOCIAL_SCIENCE', 'HUMANITIES', 'ARTS', 'HISTORY', 'TECHNOLOGY', 'ENVIRONMENT', 'EDUCATION'];
    const passages: TOEFLReading['passage'][] = [];
    const allQuestions: TOEFLReading['questions'] = [];
    const allVocabulary: TOEFLReading['vocabularyInContext'] = [];

    const generateWithRetry = async <T>(
      prompt: string,
      schema: z.ZodSchema<T>,
      base: { temperature: number; maxTokens: number }
    ) => {
      try {
        return await generateStructured(prompt, schema, {
          system: TOEFL_SYSTEM_PROMPT,
          temperature: base.temperature,
          maxTokens: base.maxTokens,
        });
      } catch {
        const retryPrompt = `${prompt}\n\nRETRY MODE:\n- Return strictly valid JSON matching schema.\n- Do not add markdown, code fences, or extra commentary.\n- Keep explanations concise.`;
        return generateStructured(retryPrompt, schema, {
          system: TOEFL_SYSTEM_PROMPT,
          temperature: Math.max(0.1, base.temperature - 0.1),
          maxTokens: Math.min(base.maxTokens, 2200),
        });
      }
    };
    
    const passageConfigs = [
      { questionCount: 15, startIndex: 1 },
      { questionCount: 15, startIndex: 16 },
      { questionCount: 20, startIndex: 31 },
    ];

    for (let i = 0; i < 3; i += 1) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const config = passageConfigs[i];

      const passagePrompt = `Generate TOEFL Reading passage ${i + 1} metadata and context only.

Topic: ${category}
Difficulty: ${difficulty}
This is passage ${i + 1} of 3 in the reading section.

Output rules:
1. Return type READING_PASSAGE
2. passage content 500-700 words
3. Do not include questions
4. vocabularyInContext minimum 3 items`;

      const passageResult = await generateWithRetry(
        passagePrompt,
        TOEFLReadingPassageOnlySchema,
        { temperature: 0.3, maxTokens: 2600 }
      );

      passages.push(passageResult.passage);
      allVocabulary.push(...passageResult.vocabularyInContext);

      const batches = config.questionCount === 15 ? 2 : 2;
      const questionsPerBatch = config.questionCount === 15 ? [8, 7] : [10, 10];

      let currentStart = config.startIndex;
      for (let batch = 0; batch < batches; batch += 1) {
        const count = questionsPerBatch[batch];
        const end = currentStart + count - 1;
        
        const batchPrompt = `Generate TOEFL Reading questions for passage ${i + 1}, batch ${batch + 1}.

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
        const batchResult = await generateWithRetry(
          batchPrompt,
          batchSchema,
          { temperature: 0.3, maxTokens: 2600 }
        );

        allQuestions.push(...batchResult.questions);
        currentStart = end + 1;
      }
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
3. Each question must include questionText, sentenceType, sentence, 4 options, correctAnswer, grammarTopic, explanation object
4. Explanation fields must be short and clear
5. Mix COMPLETION and ERROR_IDENTIFICATION
6. Return valid JSON only`;

      const batchResult = await generateStructured(batchPrompt, TOEFLStructureBatchSchema, {
        system: TOEFL_SYSTEM_PROMPT,
        temperature: 0.2,
        maxTokens: 1300,
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
