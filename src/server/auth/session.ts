import crypto from 'crypto';

export type AuthUser = {
  sub: string;
  email: string;
  name: string;
  picture?: string;
};

type SessionPayload = {
  user: AuthUser;
  iat: number;
  exp: number;
};

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

type CookieSameSite = 'Lax' | 'Strict' | 'None';

function getSessionSecret() {
  const secret = process.env.AUTH_SESSION_SECRET || 'dev-auth-session-secret-change-me';
  return secret;
}

function isLocalHostUrl(url?: string) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

function parseBooleanEnv(value: string | undefined) {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return undefined;
}

function resolveSameSite(): CookieSameSite {
  const fromEnv = process.env.AUTH_COOKIE_SAMESITE?.trim().toLowerCase();
  if (fromEnv === 'none') return 'None';
  if (fromEnv === 'strict') return 'Strict';
  if (fromEnv === 'lax') return 'Lax';

  const frontendUrl = process.env.FRONTEND_URL;
  return isLocalHostUrl(frontendUrl) ? 'Lax' : 'None';
}

function resolveSecureFlag(sameSite: CookieSameSite) {
  const fromEnv = parseBooleanEnv(process.env.AUTH_COOKIE_SECURE);
  if (typeof fromEnv === 'boolean') return fromEnv;
  if (sameSite === 'None') return true;
  return process.env.NODE_ENV === 'production';
}

function getCookieBaseAttributes() {
  const sameSite = resolveSameSite();
  const secure = resolveSecureFlag(sameSite);
  const domain = process.env.AUTH_COOKIE_DOMAIN?.trim();

  return [
    'Path=/',
    'HttpOnly',
    `SameSite=${sameSite}`,
    secure ? 'Secure' : '',
    domain ? `Domain=${domain}` : '',
  ].filter(Boolean);
}

function buildCookie(name: string, value: string, maxAge: number) {
  return [`${name}=${value}`, ...getCookieBaseAttributes(), `Max-Age=${maxAge}`]
    .filter(Boolean)
    .join('; ');
}

function buildClearCookie(name: string) {
  return [`${name}=`, ...getCookieBaseAttributes(), 'Max-Age=0']
    .filter(Boolean)
    .join('; ');
}

function base64Url(input: string | Buffer) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function decodeBase64Url(input: string) {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

export function signSession(user: AuthUser) {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    user,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };

  const encodedPayload = base64Url(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encodedPayload)
    .digest();

  return `${encodedPayload}.${base64Url(signature)}`;
}

export function verifySession(token?: string | null): AuthUser | null {
  if (!token) return null;

  const [payloadPart, signaturePart] = token.split('.');
  if (!payloadPart || !signaturePart) return null;

  const expectedSig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(payloadPart)
    .digest();

  const incomingSig = Buffer.from(
    signaturePart.replace(/-/g, '+').replace(/_/g, '/'),
    'base64',
  );

  if (incomingSig.length !== expectedSig.length) return null;
  if (!crypto.timingSafeEqual(incomingSig, expectedSig)) return null;

  try {
    const parsed = JSON.parse(decodeBase64Url(payloadPart)) as SessionPayload;
    const now = Math.floor(Date.now() / 1000);
    if (parsed.exp < now) return null;
    return parsed.user;
  } catch {
    return null;
  }
}

export function getSessionCookie(token: string) {
  return buildCookie('wikin_auth', token, SESSION_TTL_SECONDS);
}

export function getClearSessionCookie() {
  return buildClearCookie('wikin_auth');
}

export function readCookie(cookieHeader: string | undefined, key: string) {
  if (!cookieHeader) return null;
  const chunks = cookieHeader.split(';').map((part) => part.trim());
  for (const chunk of chunks) {
    const [k, ...rest] = chunk.split('=');
    if (k === key) return rest.join('=');
  }
  return null;
}
