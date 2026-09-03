import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export type EncryptedValue = { ciphertext: string; iv: string; tag: string; keyVersion: number };

function encryptionKey(version: number) {
  const encoded = process.env[`CALENDAR_TOKEN_ENCRYPTION_KEY_V${version}`];
  if (!encoded) throw new Error("Calendar encryption key is not configured.");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("Calendar encryption key must be 32 bytes.");
  return key;
}

export function activeCalendarKeyVersion() {
  const version = Number(process.env.CALENDAR_TOKEN_ENCRYPTION_ACTIVE_VERSION || "1");
  if (!Number.isInteger(version) || version < 1) throw new Error("Invalid calendar encryption key version.");
  return version;
}

export function encryptCalendarSecret(plaintext: string, associatedData: string, keyVersion = activeCalendarKeyVersion()): EncryptedValue {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(keyVersion), iv);
  cipher.setAAD(Buffer.from(associatedData));
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return { ciphertext: encrypted.toString("base64"), iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), keyVersion };
}

export function decryptCalendarSecret(value: EncryptedValue, associatedData: string) {
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(value.keyVersion), Buffer.from(value.iv, "base64"));
  decipher.setAAD(Buffer.from(associatedData));
  decipher.setAuthTag(Buffer.from(value.tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(value.ciphertext, "base64")), decipher.final()]).toString("utf8");
}

export function sealCalendarTransaction(value: object) {
  const encrypted = encryptCalendarSecret(JSON.stringify(value), "google-oauth-transaction");
  return Buffer.from(JSON.stringify(encrypted)).toString("base64url");
}

export function openCalendarTransaction<T>(value: string): T {
  const encrypted = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as EncryptedValue;
  return JSON.parse(decryptCalendarSecret(encrypted, "google-oauth-transaction")) as T;
}
