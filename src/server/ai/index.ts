import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import type { ZodSchema } from 'zod';
import { getMastraGatewayConfig } from '../mastra';

function getModel() {
  const config = getMastraGatewayConfig();
  const gateway = createOpenAI({
    apiKey: config.apiKey,
    baseURL: config.endpoint,
  });

  return gateway(config.model, {
    structuredOutputs: true,
  });
}

// Utility function to generate structured output
export async function generateStructured<T>(
  prompt: string,
  schema: ZodSchema<T>,
  options: {
    temperature?: number;
    maxTokens?: number;
    system?: string;
  } = {}
): Promise<T> {
  const temperature = options.temperature ?? 0.3;
  const requestedMaxTokens = options.maxTokens ?? 4000;
  const maxTokens = Math.min(requestedMaxTokens, 4096);

  const systemPrompt = options.system || `You are an expert exam preparation specialist. Generate high-quality, authentic test questions.

Guidelines:
- Questions must be unambiguous with ONE clearly correct answer
- Distractors must be plausible but clearly wrong
- Content should match official exam difficulty and format
- Include comprehensive explanations that teach
- Use natural, academic vocabulary appropriate for the test level`;

  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const variationNonce = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-a${attempt}`;
    const retryInstruction =
      attempt > 1
        ? "\n\nRETRY MODE: Return strictly valid JSON matching the schema. No markdown/code fences/explanations outside JSON."
        : "";

    const promptWithNonce = `${prompt}${retryInstruction}\n\nGeneration nonce: ${variationNonce}\n(Use this nonce only as a uniqueness marker; do not include it in the output.)`;

    try {
      const { object } = await generateObject({
        model: getModel(),
        schema,
        prompt: promptWithNonce,
        system: systemPrompt,
        temperature: Math.max(0.1, temperature - (attempt - 1) * 0.05),
        maxTokens,
      });

      return object;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to generate structured output after retries");
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
