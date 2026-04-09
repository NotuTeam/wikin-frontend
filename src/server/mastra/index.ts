function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getMastraGatewayConfig() {
  return {
    apiKey: getRequiredEnv("CUSTOM_API_KEY"),
    endpoint: getRequiredEnv("CUSTOM_API_ENDPOINT"),
    model: getRequiredEnv("CUSTOM_MODEL_NAME"),
  };
}
