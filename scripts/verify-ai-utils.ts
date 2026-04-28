import assert from "node:assert/strict";
import { buildFormattingPrompt } from "../src/server/ai/formatter";
import {
  extractJsonCandidate,
  formatIssues,
  normalizeStructuredOutput,
} from "../src/server/ai/json";

function run() {
  const directJson = extractJsonCandidate('{"ok":true}');
  assert.equal(directJson, '{"ok":true}');

  const fencedJson = extractJsonCandidate('```json\n{"value":"A"}\n```');
  assert.equal(fencedJson, '{"value":"A"}');

  const noisyJson = extractJsonCandidate('Intro text\n{"answer":"B","options":{"A":"One","B":"Two"}}\nThanks');
  assert.equal(noisyJson, '{"answer":"B","options":{"A":"One","B":"Two"}}');

  const normalized = normalizeStructuredOutput({
    data: {
      correctAnswer: "C",
      options: { A: " Alpha ", B: "Beta", C: "Gamma", D: "Delta" },
      nested: [{ correctAnswer: "2" }],
    },
  }) as Record<string, unknown>;

  assert.equal(normalized.correctAnswer, 2);
  assert.deepEqual(normalized.options, ["Alpha", "Beta", "Gamma", "Delta"]);
  assert.deepEqual(normalized.nested, [{ correctAnswer: 2 }]);

  const formattedPrompt = buildFormattingPrompt("draft source", "Use exact field names");
  assert.match(formattedPrompt, /Convert the source material below into exactly one JSON object/);
  assert.match(formattedPrompt, /FORMATTER RULES:/);
  assert.match(formattedPrompt, /draft source/);

  const issueText = formatIssues([
    {
      code: "invalid_type",
      expected: "number",
      received: "string",
      path: ["questions", 0, "correctAnswer"],
      message: "Expected number, received string",
    },
  ] as never);
  assert.match(issueText, /questions\.0\.correctAnswer/);
  assert.match(issueText, /expected number, received string/i);

  console.log("AI utility verification passed");
}

run();
