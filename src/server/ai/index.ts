import { generateObject, generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import type { ZodSchema } from 'zod';
import { buildFormattingPrompt } from './formatter';
import { extractJsonCandidate, formatIssues, normalizeStructuredOutput } from './json';
import { getMastraGatewayConfig } from '../mastra';
import { logAttemptTrace } from '../logger/responseLog';

function summarizePrompt(prompt: string) {
  return prompt.replace(/\s+/g, ' ').trim().slice(0, 140);
}

function summarizeText(value: unknown, maxLength = 240) {
  if (typeof value !== 'string') return value;
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function getModel(structuredOutputs: boolean) {
  const config = getMastraGatewayConfig();
  const gateway = createOpenAI({
    apiKey: config.apiKey,
    baseURL: config.endpoint,
  });

  if (structuredOutputs) {
    return gateway(config.model, {
      structuredOutputs: true,
    });
  }

  return gateway(config.model);
}

function buildTextCallSettings(
  options: TextGenerationOptions,
  attempt: number,
  wasTruncated: boolean,
) {
  const config = getMastraGatewayConfig();
  const boostedMaxTokens = wasTruncated
    ? Math.min(options.maxTokens + 1200, 6000)
    : options.maxTokens;

  const settings: {
    maxTokens: number;
    temperature?: number;
  } = {
    maxTokens: boostedMaxTokens,
  };

  if (!config.isReasoningModel) {
    settings.temperature = Math.max(0.1, options.temperature - (attempt - 1) * 0.05);
  }

  return settings;
}

function getEmptyTextCompatibilityError(result: {
  text: string;
  finishReason: string;
  response?: {
    modelId?: string;
    body?: unknown;
    messages?: unknown[];
  };
  warnings?: unknown;
}) {
  if (result.text.trim().length > 0) return null;

  const rawBody = typeof result.response?.body === 'string'
    ? result.response.body
    : result.response?.body
      ? JSON.stringify(result.response.body)
      : '';

  if (result.finishReason === 'stop') {
    return new Error(
      `Model returned no text content. This usually indicates provider/model incompatibility for the current API mode. model=${result.response?.modelId || 'unknown'} warnings=${JSON.stringify(result.warnings || [])} rawPreview=${summarizeText(rawBody) || ''}`,
    );
  }

  return null;
}

function buildSystemPrompt(system?: string) {
  return system || `You are an expert exam preparation specialist. Generate high-quality, authentic test questions.

Guidelines:
- Questions must be unambiguous with ONE clearly correct answer
- Distractors must be plausible but clearly wrong
- Content should match official exam difficulty and format
- Include comprehensive explanations that teach
- Use natural, academic vocabulary appropriate for the test level`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as {
    statusCode?: number;
    data?: { error?: { code?: string; message?: string } };
    message?: string;
  };

  return (
    candidate.statusCode === 429 ||
    candidate.data?.error?.code === '1302' ||
    candidate.data?.error?.message?.toLowerCase().includes('rate limit') ||
    candidate.message?.toLowerCase().includes('rate limit')
  );
}

async function generateStructuredNative<T>(
  prompt: string,
  schema: ZodSchema<T>,
  options: {
    temperature: number;
    maxTokens: number;
    system: string;
  }
) {
  let lastError: unknown;
  const startedAt = Date.now();

  console.log('[question-gen][ai][native] start', {
    maxTokens: options.maxTokens,
    temperature: options.temperature,
    promptPreview: summarizePrompt(prompt),
  });

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const variationNonce = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-a${attempt}`;
    const retryInstruction =
      attempt > 1
        ? "\n\nRETRY MODE: Return strictly valid JSON matching the schema. No markdown/code fences/explanations outside JSON."
        : "";

    const promptWithNonce = `${prompt}${retryInstruction}\n\nGeneration nonce: ${variationNonce}\n(Use this nonce only as a uniqueness marker; do not include it in the output.)`;
    const attemptStartedAt = Date.now();

    try {
      console.log('[question-gen][ai][native] attempt:start', { attempt });
      await logAttemptTrace({
        flow: 'native',
        stage: 'start',
        attempt,
        model: getMastraGatewayConfig().model,
      });

      const { object } = await generateObject({
        model: getModel(true),
        schema,
        prompt: promptWithNonce,
        system: options.system,
        temperature: Math.max(0.1, options.temperature - (attempt - 1) * 0.05),
        maxTokens: options.maxTokens,
      });

      console.log('[question-gen][ai][native] attempt:success', {
        attempt,
        durationMs: Date.now() - attemptStartedAt,
        totalDurationMs: Date.now() - startedAt,
      });
      await logAttemptTrace({
        flow: 'native',
        stage: 'success',
        attempt,
        durationMs: Date.now() - attemptStartedAt,
        model: getMastraGatewayConfig().model,
      });

      return object;
    } catch (error) {
      lastError = error;
      console.error('[question-gen][ai][native] attempt:error', {
        attempt,
        durationMs: Date.now() - startedAt,
        message: error instanceof Error ? error.message : 'Unknown native generation error',
      });
      await logAttemptTrace({
        flow: 'native',
        stage: 'error',
        attempt,
        durationMs: Date.now() - attemptStartedAt,
        model: getMastraGatewayConfig().model,
        error: error instanceof Error ? error.message : 'Unknown native generation error',
      });
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Failed to generate structured output after retries');
}

type TextGenerationOptions = {
  temperature: number;
  maxTokens: number;
  system: string;
};

async function validateGeneratedText<T>(text: string, schema: ZodSchema<T>) {
  const startedAt = Date.now();
  const candidate = extractJsonCandidate(text);
  const parsed = JSON.parse(candidate);
  const normalized = normalizeStructuredOutput(parsed);
  const result = schema.safeParse(normalized);

  console.log('[question-gen][ai][text] validate:done', {
    durationMs: Date.now() - startedAt,
    rawLength: text.length,
    candidateLength: candidate.length,
    success: result.success,
  });

  return result;
}

async function repairStructuredOutputFromText<T>(
  text: string,
  schema: ZodSchema<T>,
  options: TextGenerationOptions & { validationFeedback: string },
) {
  const startedAt = Date.now();

  console.log('[question-gen][ai][repair] start', {
    textLength: text.length,
    validationFeedback: options.validationFeedback,
  });
  await logAttemptTrace({
    flow: 'repair',
    stage: 'start',
    model: getMastraGatewayConfig().model,
    validationFeedback: options.validationFeedback,
    meta: { textLength: text.length },
  });

  try {
    const repaired = await formatStructuredOutput(text, schema, {
      system: options.system,
      temperature: Math.max(0.1, options.temperature - 0.1),
      maxTokens: Math.min(options.maxTokens + 800, 6000),
      formattingInstructions: `You must preserve the same generated content and only repair the JSON structure so it matches the schema exactly. Do not invent fallback/default content. Fix only schema mismatches. Validation errors to fix:\n${options.validationFeedback}`,
    });

    console.log('[question-gen][ai][repair] success', {
      durationMs: Date.now() - startedAt,
    });
    await logAttemptTrace({
      flow: 'repair',
      stage: 'success',
      model: getMastraGatewayConfig().model,
      durationMs: Date.now() - startedAt,
    });

    return repaired;
  } catch (error) {
    await logAttemptTrace({
      flow: 'repair',
      stage: 'error',
      model: getMastraGatewayConfig().model,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : 'Unknown repair error',
    });
    throw error;
  }
}

async function generateStructuredFromText<T>(
  prompt: string,
  schema: ZodSchema<T>,
  options: TextGenerationOptions,
  priorError?: unknown,
) {
  let lastError: unknown = priorError;
  let validationFeedback = '';
  let lastFinishReason: string | undefined;
  const startedAt = Date.now();

  console.log('[question-gen][ai][text] start', {
    maxTokens: options.maxTokens,
    temperature: options.temperature,
    promptPreview: summarizePrompt(prompt),
    hasPriorError: Boolean(priorError),
  });

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const variationNonce = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-t${attempt}`;
    const retryBlock = validationFeedback
      ? `\n\nVALIDATION ERRORS TO FIX:\n${validationFeedback}`
      : '';
    const truncationBlock = lastFinishReason === 'length'
      ? '\n- Previous output was truncated. Shorten explanations and keep only fields required by the schema while still returning the full valid JSON object.'
      : '';
    const promptWithInstructions = `${prompt}\n\nOUTPUT FORMAT REQUIREMENTS:\n- Return exactly one raw JSON object matching the required structure.\n- Do not include markdown fences.\n- Do not include commentary before or after the JSON.\n- Keep enum values, array lengths, and field names exact.\n- Do not omit required fields.\n- speakers must use object items like {"name":"...","role":"..."}.\n- keyVocabulary must be an array of strings only.\n- correctAnswer must be a numeric index 0..3.\n- questionType must match the allowed enum values exactly.${truncationBlock}${retryBlock}\n\nGeneration nonce: ${variationNonce}\n(Use this nonce only as a uniqueness marker; do not include it in the output.)`;
    const attemptStartedAt = Date.now();

    try {
      console.log('[question-gen][ai][text] attempt:start', {
        attempt,
        hasValidationFeedback: Boolean(validationFeedback),
      });
      await logAttemptTrace({
        flow: 'text',
        stage: 'start',
        attempt,
        model: getMastraGatewayConfig().model,
        meta: {
          hasValidationFeedback: Boolean(validationFeedback),
        },
      });

      const result = await generateText({
        model: getModel(false),
        prompt: promptWithInstructions,
        system: options.system,
        ...buildTextCallSettings(options, attempt, lastFinishReason === 'length'),
      });

      const rawBody = typeof result.response?.body === 'string'
        ? result.response.body
        : result.response?.body
          ? JSON.stringify(result.response.body)
          : undefined;

      lastFinishReason = result.finishReason;

      console.log('[question-gen][ai][text] model-response:received', {
        attempt,
        durationMs: Date.now() - attemptStartedAt,
        textLength: result.text.length,
        textPreview: summarizeText(result.text),
        finishReason: result.finishReason,
        usage: result.usage,
        warnings: result.warnings,
        responseId: result.response?.id,
        responseModelId: result.response?.modelId,
        responseBodyPreview: summarizeText(rawBody),
        responseMessagesCount: result.response?.messages?.length,
        responseMessagesPreview: result.response?.messages?.slice(0, 2),
        stepsCount: result.steps?.length,
      });
      await logAttemptTrace({
        flow: 'text',
        stage: 'info',
        attempt,
        durationMs: Date.now() - attemptStartedAt,
        model: result.response?.modelId || getMastraGatewayConfig().model,
        finishReason: result.finishReason,
        meta: {
          event: 'model-response:received',
          textLength: result.text.length,
          textPreview: summarizeText(result.text),
          usage: result.usage,
          warnings: result.warnings,
          responseId: result.response?.id,
          responseBodyPreview: summarizeText(rawBody),
          responseMessagesCount: result.response?.messages?.length,
          stepsCount: result.steps?.length,
        },
      });

      const compatibilityError = getEmptyTextCompatibilityError(result);
      if (compatibilityError) {
        throw compatibilityError;
      }

      const validated = await validateGeneratedText(result.text, schema);
      await logAttemptTrace({
        flow: 'validate',
        stage: validated.success ? 'success' : 'validation_failed',
        attempt,
        durationMs: Date.now() - attemptStartedAt,
        model: result.response?.modelId || getMastraGatewayConfig().model,
        finishReason: result.finishReason,
        validationFeedback: validated.success ? undefined : formatIssues(validated.error.issues),
        meta: {
          event: 'validate:done',
          rawLength: result.text.length,
        },
      });

      if (validated.success) {
        console.log('[question-gen][ai][text] attempt:success', {
          attempt,
          durationMs: Date.now() - attemptStartedAt,
          totalDurationMs: Date.now() - startedAt,
        });
        await logAttemptTrace({
          flow: 'text',
          stage: 'success',
          attempt,
          durationMs: Date.now() - attemptStartedAt,
          model: getMastraGatewayConfig().model,
          finishReason: result.finishReason,
          meta: {
            textLength: result.text.length,
          },
        });
        return validated.data;
      }

      validationFeedback = formatIssues(validated.error.issues);
      lastError = validated.error;
      console.warn('[question-gen][ai][text] attempt:validation-failed', {
        attempt,
        durationMs: Date.now() - attemptStartedAt,
        validationFeedback,
      });

      if (attempt < 3 && result.text.trim().length > 0 && lastFinishReason !== 'length') {
        try {
          return await repairStructuredOutputFromText(result.text, schema, {
            ...options,
            validationFeedback,
          });
        } catch (repairError) {
          lastError = repairError;
          console.warn('[question-gen][ai][repair] failed', {
            attempt,
            message: repairError instanceof Error ? repairError.message : 'Unknown repair error',
          });
        }
      }
    } catch (error) {
      lastError = error;
      validationFeedback = error instanceof Error
        ? `- root: ${error.message}`
        : '- root: Unknown parsing error';
      console.error('[question-gen][ai][text] attempt:error', {
        attempt,
        durationMs: Date.now() - attemptStartedAt,
        message: error instanceof Error ? error.message : 'Unknown text generation error',
      });
      await logAttemptTrace({
        flow: 'text',
        stage: 'error',
        attempt,
        durationMs: Date.now() - attemptStartedAt,
        model: getMastraGatewayConfig().model,
        error: error instanceof Error ? error.message : 'Unknown text generation error',
      });
      if (error instanceof Error) {
        console.error('[question-gen][ai][text] parse-debug', {
          attempt,
          validationFeedback,
        });
        await logAttemptTrace({
          flow: 'validate',
          stage: 'info',
          attempt,
          model: getMastraGatewayConfig().model,
          meta: {
            event: 'parse-debug',
            validationFeedback,
          },
        });
      }
      if (isRateLimitError(error) && attempt < 3) {
        const backoffMs = attempt * 4000;
        console.warn('[question-gen][ai][text] rate-limit-backoff', {
          attempt,
          backoffMs,
        });
        await logAttemptTrace({
          flow: 'text',
          stage: 'info',
          attempt,
          model: getMastraGatewayConfig().model,
          meta: {
            event: 'rate-limit-backoff',
            backoffMs,
          },
        });
        await sleep(backoffMs);
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Failed to generate valid JSON output after retries');
}

export async function formatStructuredOutput<T>(
  sourceText: string,
  schema: ZodSchema<T>,
  options: {
    temperature?: number;
    maxTokens?: number;
    system?: string;
    formattingInstructions?: string;
  } = {},
): Promise<T> {
  const startedAt = Date.now();
  const systemPrompt = buildSystemPrompt(options.system);
  const temperature = options.temperature ?? 0.2;
  const requestedMaxTokens = options.maxTokens ?? 4000;
  const maxTokens = Math.min(requestedMaxTokens, 4096);

  console.log('[question-gen][ai][formatter] start', {
    maxTokens,
    temperature,
    sourceLength: sourceText.length,
  });

  const result = await generateStructuredFromText(
    buildFormattingPrompt(sourceText, options.formattingInstructions),
    schema,
    {
      temperature,
      maxTokens,
      system: systemPrompt,
    },
  );

  console.log('[question-gen][ai][formatter] success', {
    durationMs: Date.now() - startedAt,
  });

  return result;
}

export async function generateStructured<T>(
  prompt: string,
  schema: ZodSchema<T>,
  options: {
    temperature?: number;
    maxTokens?: number;
    system?: string;
  } = {}
): Promise<T> {
  const config = getMastraGatewayConfig();
  const temperature = options.temperature ?? 0.3;
  const requestedMaxTokens = options.maxTokens ?? 4000;
  const maxTokens = Math.min(requestedMaxTokens, 4096);
  const systemPrompt = buildSystemPrompt(options.system);

  if (config.supportsStructuredOutputs) {
    try {
      console.log('[question-gen][ai] generateStructured:start', {
        supportsStructuredOutputs: config.supportsStructuredOutputs,
        maxTokens,
        temperature,
        promptPreview: summarizePrompt(prompt),
      });

      return await generateStructuredNative(prompt, schema, {
        temperature,
        maxTokens,
        system: systemPrompt,
      });
    } catch (error) {
      console.warn('[question-gen][ai] native->text-fallback', {
        message: error instanceof Error ? error.message : 'Unknown native generation failure',
      });
      await logAttemptTrace({
        flow: 'pipeline',
        stage: 'info',
        model: config.model,
        error: error instanceof Error ? error.message : 'Unknown native generation failure',
        meta: { event: 'native->text-fallback' },
      });
      return generateStructuredFromText(prompt, schema, {
        temperature,
        maxTokens,
        system: systemPrompt,
      }, error);
    }
  }

  return generateStructuredFromText(prompt, schema, {
    temperature,
    maxTokens,
    system: systemPrompt,
  });
}

// TOEFL system prompt
export const TOEFL_SYSTEM_PROMPT = `You are an expert TOEFL test preparation specialist with deep knowledge of ETS TOEFL iBT test format.

Your role is to generate authentic, high-quality TOEFL practice questions that:
1. Match the exact format and difficulty of official ETS materials
2. Test specific academic English skills relevant to university success
3. Include comprehensive explanations that teach, not just tell
4. Use natural, academic vocabulary appropriate for the test level

Guidelines:
- Questions must be unambiguous with ONE clearly correct answer
- Distractors (wrong options) must be plausible and based on common errors
- Audio scripts should sound natural with authentic speech patterns
- Reading passages should mimic academic textbook style
- Grammar questions should target specific, identifiable rules

Always generate complete, realistic content that could appear on an actual TOEFL exam.`;

// IELTS system prompt
export const IELTS_SYSTEM_PROMPT = `You are an expert IELTS test preparation specialist with deep knowledge of British Council, IDP, and Cambridge IELTS test formats.

Your role is to generate authentic, high-quality IELTS practice questions that:
1. Match the exact format of official IELTS materials
2. Include appropriate variety of native speaker accents in listening
3. Feature academic reading passages with appropriate complexity
4. Provide writing tasks with clear rubric-aligned sample answers
5. Test paraphrasing and synonym recognition skills

Guidelines:
- Listening audio should reflect real native speaker conversations and lectures
- Reading questions MUST test paraphrasing (questions never use same words as passage)
- True/False/Not Given questions require careful evidence evaluation
- Writing samples should demonstrate clear band score characteristics
- Task 1 requires data interpretation, not opinion
- Task 2 requires clear position with supported arguments

Always generate complete, realistic content that could appear on an actual IELTS exam.`;
