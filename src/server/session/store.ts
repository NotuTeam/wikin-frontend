import crypto from 'crypto';

type SessionStatus = 'active' | 'finished' | 'exited';

type SessionPayload = Record<string, unknown>;

type SessionRecord = {
  id: string;
  examType: 'toefl' | 'ielts';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  encryptedPayload: string;
  iv: string;
  authTag: string;
  payloadHash: string;
  lastWriteAt: number;
};

const SESSION_TTL_MS = 3 * 60 * 60 * 1000;
const MIN_WRITE_INTERVAL_MS = 1500;
const ALGORITHM = 'aes-256-gcm';
const sessionMap = new Map<string, SessionRecord>();

function getEncryptionKey() {
  const raw = process.env.SESSION_ENCRYPTION_KEY || 'wikin2-dev-session-key-change-me';
  return crypto.createHash('sha256').update(raw).digest();
}

function encryptPayload(payload: SessionPayload) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const serialized = JSON.stringify(payload);
  const encrypted = Buffer.concat([cipher.update(serialized, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    encryptedPayload: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

function decryptPayload(record: SessionRecord): SessionPayload {
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(record.iv, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(record.authTag, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(record.encryptedPayload, 'base64')),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString('utf8'));
}

function isExpired(record: SessionRecord) {
  return Date.now() > new Date(record.expiresAt).getTime();
}

function hashPayload(payload: SessionPayload) {
  const serialized = JSON.stringify(payload || {});
  return crypto.createHash('sha256').update(serialized).digest('hex');
}

function cleanupExpiredSessions() {
  for (const [id, record] of sessionMap.entries()) {
    if (isExpired(record)) {
      sessionMap.delete(id);
    }
  }
}

export function createSimulationSession(input: {
  examType: 'toefl' | 'ielts';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  payload?: SessionPayload;
}) {
  cleanupExpiredSessions();
  const now = new Date();
  const id = crypto.randomUUID();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS).toISOString();
  const encrypted = encryptPayload(input.payload || {});

  const record: SessionRecord = {
    id,
    examType: input.examType,
    difficulty: input.difficulty,
    status: 'active',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt,
    ...encrypted,
    payloadHash: hashPayload(input.payload || {}),
    lastWriteAt: now.getTime(),
  };

  sessionMap.set(id, record);
  return {
    id,
    examType: record.examType,
    difficulty: record.difficulty,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    expiresAt: record.expiresAt,
  };
}

export function getSimulationSession(id: string) {
  cleanupExpiredSessions();
  const record = sessionMap.get(id);
  if (!record) return null;
  if (record.status !== 'active') return null;
  if (isExpired(record)) {
    sessionMap.delete(id);
    return null;
  }

  return {
    id: record.id,
    examType: record.examType,
    difficulty: record.difficulty,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    expiresAt: record.expiresAt,
    payload: decryptPayload(record),
  };
}

export function updateSimulationSession(id: string, payload: SessionPayload) {
  cleanupExpiredSessions();
  const record = sessionMap.get(id);
  if (!record || record.status !== 'active') {
    return { ok: false as const, reason: 'not_found_or_inactive' as const };
  }
  if (isExpired(record)) {
    sessionMap.delete(id);
    return { ok: false as const, reason: 'expired' as const };
  }

  const nowMs = Date.now();
  const incomingHash = hashPayload(payload);

  if (incomingHash === record.payloadHash) {
    return {
      ok: true as const,
      data: {
        id: record.id,
        status: record.status,
        updatedAt: record.updatedAt,
        expiresAt: record.expiresAt,
      },
      skipped: true as const,
      reason: 'unchanged' as const,
    };
  }

  if (nowMs - record.lastWriteAt < MIN_WRITE_INTERVAL_MS) {
    return {
      ok: true as const,
      data: {
        id: record.id,
        status: record.status,
        updatedAt: record.updatedAt,
        expiresAt: record.expiresAt,
      },
      skipped: true as const,
      reason: 'throttled' as const,
    };
  }

  const encrypted = encryptPayload(payload);
  const updated: SessionRecord = {
    ...record,
    ...encrypted,
    payloadHash: incomingHash,
    lastWriteAt: nowMs,
    updatedAt: new Date(nowMs).toISOString(),
  };
  sessionMap.set(id, updated);

  return {
    ok: true as const,
    data: {
      id: updated.id,
      status: updated.status,
      updatedAt: updated.updatedAt,
      expiresAt: updated.expiresAt,
    },
    skipped: false as const,
  };
}

export function finishSimulationSession(id: string) {
  const record = sessionMap.get(id);
  if (!record) return null;
  const updated: SessionRecord = {
    ...record,
    status: 'finished',
    updatedAt: new Date().toISOString(),
  };
  sessionMap.set(id, updated);
  return {
    id: updated.id,
    status: updated.status,
    updatedAt: updated.updatedAt,
  };
}

export function exitSimulationSession(id: string) {
  const record = sessionMap.get(id);
  if (!record) return null;
  sessionMap.delete(id);
  return {
    id,
    status: 'exited' as const,
  };
}
