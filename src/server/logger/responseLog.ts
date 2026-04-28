import * as fs from "fs";
import * as path from "path";

const LOG_DIR = path.resolve(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "response_log.md");

let writeQueue: Promise<void> = Promise.resolve();

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toISOString().replace("T", " ").replace("Z", "UTC");
}

function truncateForDisplay(data: unknown, maxChars = 3000): string {
  const str = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  if (!str) return "(empty)";
  if (str.length <= maxChars) return str;
  return str.slice(0, maxChars) + `\n\n... [truncated, total ${str.length} chars]`;
}

export interface ResponseLogEntry {
  endpoint: string;
  difficulty: string;
  section?: string;
  attemptId?: string;
  success: boolean;
  durationMs: number;
  error?: string;
  data?: unknown;
}

export interface AttemptTraceLogEntry {
  flow: "native" | "text" | "repair" | "validate" | "pipeline";
  stage: "start" | "success" | "validation_failed" | "error" | "info";
  attempt?: number;
  durationMs?: number;
  model?: string;
  finishReason?: string;
  validationFeedback?: string;
  error?: string;
  meta?: unknown;
}

function renderEntry(entry: ResponseLogEntry): string {
  const timestamp = formatTimestamp(Date.now());
  const status = entry.success ? "SUCCESS" : "FAILED";
  const statusIcon = entry.success ? "✅" : "❌";

  let block = "";
  block += `## ${statusIcon} [${status}] ${entry.endpoint} — ${timestamp}\n\n`;
  block += `| Field | Value |\n`;
  block += `|-------|-------|\n`;
  block += `| **Endpoint** | \`${entry.endpoint}\` |\n`;
  block += `| **Difficulty** | ${entry.difficulty} |\n`;
  if (entry.section) block += `| **Section** | ${entry.section} |\n`;
  if (entry.attemptId) block += `| **Attempt ID** | ${entry.attemptId} |\n`;
  block += `| **Duration** | ${entry.durationMs}ms (${(entry.durationMs / 1000).toFixed(1)}s) |\n`;
  block += `| **Status** | ${status} |\n`;
  block += `\n`;

  if (entry.error) {
    block += `### Error\n\n\`\`\`\n${entry.error}\n\`\`\`\n\n`;
  }

  if (entry.data !== undefined) {
    block += `### Response Data\n\n\`\`\`json\n${truncateForDisplay(entry.data)}\n\`\`\`\n\n`;
  }

  block += "---\n\n";

  return block;
}

function appendToFile(content: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ensureLogDir();

    const fileExists = fs.existsSync(LOG_FILE);

    const writeStream = fs.createWriteStream(LOG_FILE, { flags: "a" });

    if (!fileExists) {
      writeStream.write(
        `# AI Response Log\n\n> Auto-generated log for tracing AI model generation responses.\n> File: \`response_log.md\`\n\n---\n\n`,
      );
    }

    writeStream.write(content);
    writeStream.end();

    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
  });
}

function renderAttemptTraceEntry(entry: AttemptTraceLogEntry): string {
  const timestamp = formatTimestamp(Date.now());
  let block = "";
  block += `### [ATTEMPT_TRACE] ${entry.flow}.${entry.stage} — ${timestamp}\n\n`;
  block += `| Field | Value |\n`;
  block += `|-------|-------|\n`;
  block += `| **Flow** | ${entry.flow} |\n`;
  block += `| **Stage** | ${entry.stage} |\n`;
  if (entry.attempt !== undefined) block += `| **Attempt** | ${entry.attempt} |\n`;
  if (entry.durationMs !== undefined) block += `| **Duration** | ${entry.durationMs}ms |\n`;
  if (entry.model) block += `| **Model** | ${entry.model} |\n`;
  if (entry.finishReason) block += `| **Finish Reason** | ${entry.finishReason} |\n`;
  block += `\n`;

  if (entry.validationFeedback) {
    block += `#### Validation Feedback\n\n\`\`\`\n${entry.validationFeedback}\n\`\`\`\n\n`;
  }

  if (entry.error) {
    block += `#### Error\n\n\`\`\`\n${entry.error}\n\`\`\`\n\n`;
  }

  if (entry.meta !== undefined) {
    block += `#### Meta\n\n\`\`\`json\n${truncateForDisplay(entry.meta, 2200)}\n\`\`\`\n\n`;
  }

  block += `---\n\n`;
  return block;
}

export async function logResponse(entry: ResponseLogEntry): Promise<void> {
  const content = renderEntry(entry);

  writeQueue = writeQueue
    .then(() => appendToFile(content))
    .catch((err) => {
      console.error("[response-log] failed to write log:", err);
    });

  await writeQueue;
}

export async function logAttemptTrace(entry: AttemptTraceLogEntry): Promise<void> {
  const content = renderAttemptTraceEntry(entry);

  writeQueue = writeQueue
    .then(() => appendToFile(content))
    .catch((err) => {
      console.error("[response-log] failed to write attempt trace:", err);
    });

  await writeQueue;
}
