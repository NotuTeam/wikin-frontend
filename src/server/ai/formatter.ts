export function buildFormattingPrompt(sourceText: string, formattingInstructions?: string) {
  const extraInstructions = formattingInstructions
    ? `\n\nFORMATTER RULES:\n${formattingInstructions}`
    : "";

  return `Convert the source material below into exactly one JSON object that matches the required schema.${extraInstructions}

Critical requirements:
- Return raw JSON only.
- Do not use markdown fences.
- Do not add commentary before or after the JSON.
- Preserve the intended counts, enums, and field names exactly.

SOURCE MATERIAL:
${sourceText}`;
}
