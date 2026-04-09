import crypto from 'crypto';

export type GoogleUserInfo = {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  email_verified?: boolean;
};

const STATE_TTL_SECONDS = 10 * 60;

function parseBooleanEnv(value: string | undefined) {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return undefined;
}

function resolveCookieSecure() {
  const fromEnv = parseBooleanEnv(process.env.AUTH_COOKIE_SECURE);
  if (typeof fromEnv === "boolean") return fromEnv;
  return process.env.NODE_ENV === "production";
}

function getCookieBaseAttributes() {
  return [
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    resolveCookieSecure() ? "Secure" : "",
  ].filter(Boolean);
}

export function createOAuthState() {
  return crypto.randomBytes(24).toString("hex");
}

export function getOAuthStateCookie(state: string) {
  return [
    `wikin_oauth_state=${state}`,
    ...getCookieBaseAttributes(),
    `Max-Age=${STATE_TTL_SECONDS}`,
  ]
    .filter(Boolean)
    .join("; ");
}

export function getClearOAuthStateCookie() {
  return ["wikin_oauth_state=", ...getCookieBaseAttributes(), "Max-Age=0"]
    .filter(Boolean)
    .join("; ");
}

export function isValidOAuthState(stateFromQuery?: string, stateFromCookie?: string) {
  if (!stateFromQuery || !stateFromCookie) return false;
  if (stateFromQuery.length < 24 || stateFromCookie.length < 24) return false;
  return stateFromQuery === stateFromCookie;
}

function getGoogleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Missing Google OAuth envs: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI');
  }

  return { clientId, clientSecret, redirectUri };
}

export function buildGoogleAuthUrl(state: string) {
  const { clientId, redirectUri } = getGoogleConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForGoogleToken(code: string) {
  const { clientId, clientSecret, redirectUri } = getGoogleConfig();

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed Google token exchange: ${text}`);
  }

  const data = (await res.json()) as { access_token: string };
  if (!data.access_token) {
    throw new Error('Google token response missing access_token');
  }

  return data.access_token;
}

export async function fetchGoogleUserInfo(accessToken: string) {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed Google userinfo fetch: ${text}`);
  }

  const profile = (await res.json()) as GoogleUserInfo;
  if (!profile.sub || !profile.email) {
    throw new Error('Invalid Google user profile');
  }

  return profile;
}
