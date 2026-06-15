// UBP (biological passport): the calibrated baseline + attention stats. It lives
// ON DEVICE in IndexedDB. The optional cloud backup is encrypted client-side
// (WebCrypto, AES-GCM, PBKDF2) — the server stores `encryptedBlob` (opaque) +
// `keyHint` (salt+iv, NOT the key) and can never decrypt it (CLAUDE.md §2/§7).

import { type DBSchema, type IDBPDatabase, openDB } from 'idb';

import type { Baseline } from './score';

export interface Ubp {
  baseline: Baseline;
  updatedAt: string;
  sessionsSeen: number;
}

const DB_NAME = 'flamingo-seedum';
const STORE = 'ubp';
const KEY = 'self';

interface SeedumDb extends DBSchema {
  ubp: { key: string; value: Ubp };
}

let dbPromise: Promise<IDBPDatabase<SeedumDb>> | null = null;

function db(): Promise<IDBPDatabase<SeedumDb>> {
  dbPromise ??= openDB<SeedumDb>(DB_NAME, 1, {
    upgrade(database) {
      database.createObjectStore(STORE);
    },
  });
  return dbPromise;
}

export async function loadUbp(): Promise<Ubp | null> {
  return (await (await db()).get(STORE, KEY)) ?? null;
}

export async function saveUbp(ubp: Ubp): Promise<void> {
  await (await db()).put(STORE, ubp, KEY);
}

export async function clearUbp(): Promise<void> {
  await (await db()).delete(STORE, KEY);
}

// --- client-side encryption -------------------------------------------------
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function toBase64(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let out = '';
  for (const b of arr) out += String.fromCharCode(b);
  return btoa(out);
}

export function fromBase64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export interface EncryptedUbp {
  encryptedBlob: string; // base64 ciphertext (opaque to the server)
  keyHint: string; // "<saltB64>.<ivB64>" — public params, NOT the key
}

/** Encrypt the UBP entirely on-device for an opt-in cloud backup. */
export async function encryptUbp(ubp: Ubp, passphrase: string): Promise<EncryptedUbp> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(JSON.stringify(ubp)),
  );
  return { encryptedBlob: toBase64(ciphertext), keyHint: `${toBase64(salt)}.${toBase64(iv)}` };
}

/** Decrypt a backup retrieved from the server (used for device restore). */
export async function decryptUbp(blob: EncryptedUbp, passphrase: string): Promise<Ubp> {
  const [saltB64, ivB64] = blob.keyHint.split('.');
  const key = await deriveKey(passphrase, fromBase64(saltB64));
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(ivB64) },
    key,
    fromBase64(blob.encryptedBlob),
  );
  return JSON.parse(decoder.decode(plaintext)) as Ubp;
}
