function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseBooleanEnv(value?: string) {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  return undefined;
}

export function getMastraGatewayConfig() {
  const model = getRequiredEnv("CUSTOM_MODEL_NAME");
  const normalizedModel = model.toLowerCase();
  const isReasoningModel =
    normalizedModel.includes("gpt-5") ||
    normalizedModel.includes("codex") ||
    normalizedModel.includes("o1") ||
    normalizedModel.includes("o3") ||
    normalizedModel.includes("o4");

  return {
    apiKey: getRequiredEnv("CUSTOM_API_KEY"),
    endpoint: getRequiredEnv("CUSTOM_API_ENDPOINT"),
    model,
    supportsStructuredOutputs:
      parseBooleanEnv(process.env.CUSTOM_MODEL_SUPPORTS_STRUCTURED_OUTPUT) ?? true,
    isReasoningModel,
  };
}
