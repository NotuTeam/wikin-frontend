export const SESSION_DB_NAME = "wikin-session";
export const SESSION_STORE_NAME = "sessions";
export const SESSION_RECORD_ID = "active-session-v1";
export const SESSION_ENCRYPTION_KEY =
  process.env.NEXT_PUBLIC_SESSION_ENCRYPTION_KEY ||
  "wikin2-local-session-encryption";

export const LOCAL_SESSION_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours
