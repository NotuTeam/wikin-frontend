import type { ZodIssue } from "zod";

function normalizeJsonLikeText(text: string) {
  return text
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\r\n/g, "\n")
    .trim();
}

function tryParseJsonCandidate(candidate: string) {
  const normalized = normalizeJsonLikeText(candidate);

  try {
    return JSON.parse(normalized);
  } catch {}

  try {
    const parsedString = JSON.parse(normalized);
    if (typeof parsedString === "string") {
      return JSON.parse(parsedString);
    }
    return parsedString;
  } catch {}

  return null;
}

function extractBalancedJson(text: string, startIndex: number) {
  const opening = text[startIndex];
  const closing = opening === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaping = false;

  for (let i = startIndex; i < text.length; i += 1) {
    const char = text[i];

    if (escaping) {
      escaping = false;
      continue;
    }

    if (char === "\\") {
      escaping = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === opening) depth += 1;
    if (char === closing) depth -= 1;

    if (depth === 0) {
      return text.slice(startIndex, i + 1);
    }
  }

  return null;
}

export function extractJsonCandidate(text: string) {
  const trimmed = normalizeJsonLikeText(text);

  const directParsed = tryParseJsonCandidate(trimmed);
  if (directParsed !== null && typeof directParsed === "object") {
    return JSON.stringify(directParsed);
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    const candidate = normalizeJsonLikeText(fenced[1]);
    const parsed = tryParseJsonCandidate(candidate);
    if (parsed !== null && typeof parsed === "object") {
      return JSON.stringify(parsed);
    }
  }

  const quotedJsonMatch = trimmed.match(/(["'])(\s*[\[{][\s\S]*[\]}]\s*)\1/);
  if (quotedJsonMatch?.[2]) {
    const parsed = tryParseJsonCandidate(quotedJsonMatch[2]);
    if (parsed !== null && typeof parsed === "object") {
      return JSON.stringify(parsed);
    }
  }

  for (let i = 0; i < trimmed.length; i += 1) {
    const char = trimmed[i];
    if (char !== "{" && char !== "[") continue;

    const candidate = extractBalancedJson(trimmed, i);
    if (!candidate) continue;

    const parsed = tryParseJsonCandidate(candidate);
    if (parsed !== null && typeof parsed === "object") {
      return JSON.stringify(parsed);
    }
  }

  throw new Error(`Model did not return a valid JSON object/array. Raw preview: ${trimmed.slice(0, 240)}`);
}

function normalizeCorrectAnswer(entry: string) {
  const trimmed = entry.trim().toUpperCase();
  const answerMap: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
  if (trimmed in answerMap) {
    return answerMap[trimmed];
  }

  const optionMatch = trimmed.match(/^OPTION\s*([ABCD])$/);
  if (optionMatch?.[1]) {
    return answerMap[optionMatch[1]];
  }

  const choiceMatch = trimmed.match(/^CHOICE\s*([ABCD])$/);
  if (choiceMatch?.[1]) {
    return answerMap[choiceMatch[1]];
  }

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  return entry.trim();
}

function normalizeQuestionType(entry: string) {
  const normalized = entry.trim().toUpperCase().replace(/[\s-]+/g, "_");
  const questionTypeMap: Record<string, string> = {
    MAIN_IDEA: "MAIN_TOPIC",
    MAIN_POINT: "MAIN_TOPIC",
    MAIN_GIST: "MAIN_TOPIC",
    GIST: "MAIN_TOPIC",
    TOPIC: "MAIN_TOPIC",
    MAIN_TOPIC: "MAIN_TOPIC",
    DETAILS: "DETAIL",
    SPECIFIC_DETAIL: "DETAIL",
    SUPPORTING_DETAIL: "DETAIL",
    DETAIL: "DETAIL",
    INFERENCE: "INFERENCE",
    INFER: "INFERENCE",
    IMPLIED_MEANING: "INFERENCE",
    PURPOSE: "PURPOSE",
    GIST_PURPOSE: "PURPOSE",
    OVERALL_PURPOSE: "PURPOSE",
    SPEAKER_PURPOSE: "PURPOSE",
    AUTHOR_PURPOSE: "PURPOSE",
    FUNCTION: "PURPOSE",
    ATTITUDE: "ATTITUDE",
    SPEAKER_ATTITUDE: "ATTITUDE",
    TONE: "ATTITUDE",
  };

  return questionTypeMap[normalized] ?? normalized;
}

function normalizeSpeakerEntry(entry: unknown) {
  if (typeof entry === "string") {
    return { name: entry.trim() };
  }

  if (!entry || typeof entry !== "object") {
    return entry;
  }

  const record = entry as Record<string, unknown>;
  const name =
    typeof record.name === "string"
      ? record.name.trim()
      : typeof record.speaker === "string"
        ? record.speaker.trim()
        : typeof record.fullName === "string"
          ? record.fullName.trim()
          : undefined;

  const role =
    typeof record.role === "string"
      ? record.role.trim()
      : typeof record.title === "string"
        ? record.title.trim()
        : typeof record.relationship === "string"
          ? record.relationship.trim()
          : undefined;

  return {
    ...(name ? { name } : {}),
    ...(role ? { role } : {}),
  };
}

function normalizeKeyVocabularyEntry(entry: unknown) {
  if (typeof entry === "string") return entry.trim();
  if (!entry || typeof entry !== "object") return entry;

  const record = entry as Record<string, unknown>;
  if (typeof record.word === "string") return record.word.trim();
  if (typeof record.term === "string") return record.term.trim();
  if (typeof record.vocabulary === "string") return record.vocabulary.trim();
  return entry;
}

export function normalizeStructuredOutput(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeStructuredOutput);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    const upper = trimmed.toUpperCase();
    if (["A", "B", "C", "D"].includes(upper)) return normalizeCorrectAnswer(trimmed);
    if (/^\d+$/.test(trimmed)) return Number(trimmed);
    return trimmed;
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const wrappers = ["data", "result", "output", "response", "object"] as const;
  for (const wrapper of wrappers) {
    if (wrapper in value && Object.keys(value).length === 1) {
      return normalizeStructuredOutput((value as Record<string, unknown>)[wrapper]);
    }
  }

  const normalizedEntries = Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
    if (key === "options" && entry && !Array.isArray(entry) && typeof entry === "object") {
      return [key, Object.values(entry as Record<string, unknown>).map((item) => String(item).trim())];
    }

    if (key === "speakers" && Array.isArray(entry)) {
      return [key, entry.map(normalizeSpeakerEntry)];
    }

    if (key === "keyVocabulary" && Array.isArray(entry)) {
      return [key, entry.map(normalizeKeyVocabularyEntry)];
    }

    if (key === "correctAnswer" && typeof entry === "string") {
      return [key, normalizeCorrectAnswer(entry)];
    }

    if (key === "questionType" && typeof entry === "string") {
      return [key, normalizeQuestionType(entry)];
    }

    return [key, normalizeStructuredOutput(entry)];
  });

  return Object.fromEntries(normalizedEntries);
}

function describeIssue(issue: ZodIssue) {
  const path = issue.path.length ? issue.path.join(".") : "root";

  if (issue.code === "invalid_type") {
    return `- ${path}: expected ${issue.expected}, received ${issue.received}`;
  }

  if (issue.code === "invalid_enum_value") {
    return `- ${path}: invalid enum value. Expected one of ${issue.options.join(", ")}`;
  }

  if (issue.code === "too_small") {
    return `- ${path}: value is too small. Minimum is ${issue.minimum}`;
  }

  if (issue.code === "too_big") {
    return `- ${path}: value is too large. Maximum is ${issue.maximum}`;
  }

  if (issue.code === "invalid_union") {
    return `- ${path}: value does not match any allowed shape`;
  }

  return `- ${path}: ${issue.message}`;
}

export function formatIssues(issues: ZodIssue[]) {
  return issues.slice(0, 8).map(describeIssue).join("\n");
}
