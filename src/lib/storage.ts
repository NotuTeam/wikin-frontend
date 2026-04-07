import {
  SESSION_DB_NAME,
  SESSION_ENCRYPTION_KEY,
  SESSION_RECORD_ID,
  SESSION_STORE_NAME,
  LOCAL_SESSION_TTL_MS,
} from "./constants";
import { SimulationSessionPayload, LocalEncryptedSession } from "@/types";
import { bytesToBase64, base64ToBytes, encoder, decoder } from "./utils";

function openSessionDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SESSION_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SESSION_STORE_NAME)) {
        db.createObjectStore(SESSION_STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function idbSetSession(
  data: LocalEncryptedSession
): Promise<void> {
  const db = await openSessionDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SESSION_STORE_NAME, "readwrite");
    const store = tx.objectStore(SESSION_STORE_NAME);
    store.put({ id: SESSION_RECORD_ID, ...data });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbGetSession(): Promise<LocalEncryptedSession | null> {
  const db = await openSessionDb();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(SESSION_STORE_NAME, "readonly");
    const store = tx.objectStore(SESSION_STORE_NAME);
    const request = store.get(SESSION_RECORD_ID);
    request.onsuccess = () => {
      const value = request.result;
      if (!value) {
        resolve(null);
        return;
      }
      const { id: _id, ...rest } = value;
      resolve(rest as LocalEncryptedSession);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function idbDeleteSession(): Promise<void> {
  const db = await openSessionDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SESSION_STORE_NAME, "readwrite");
    const store = tx.objectStore(SESSION_STORE_NAME);
    store.delete(SESSION_RECORD_ID);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deriveLocalSessionKey(salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SESSION_ENCRYPTION_KEY),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: Uint8Array.from(salt).buffer,
      iterations: 120000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptLocalSession(
  payload: SimulationSessionPayload
): Promise<LocalEncryptedSession> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveLocalSessionKey(salt);
  const plain = encoder.encode(JSON.stringify(payload));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plain
  );

  return {
    v: 1,
    expiresAt: Date.now() + LOCAL_SESSION_TTL_MS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    cipher: bytesToBase64(new Uint8Array(encrypted)),
  };
}

export async function decryptLocalSession(
  data: LocalEncryptedSession
): Promise<SimulationSessionPayload | null> {
  if (data.v !== 1) return null;
  if (Date.now() > data.expiresAt) return null;

  const salt = base64ToBytes(data.salt);
  const iv = base64ToBytes(data.iv);
  const cipher = base64ToBytes(data.cipher);
  const key = await deriveLocalSessionKey(salt);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    cipher
  );
  const text = decoder.decode(decrypted);
  return JSON.parse(text) as SimulationSessionPayload;
}
