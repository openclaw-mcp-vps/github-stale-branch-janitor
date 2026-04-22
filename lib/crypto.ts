import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const DEFAULT_SECRET = "local-dev-secret-change-me";

function toBase64Url(input: Buffer): string {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(input: string): Buffer {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + padding, "base64");
}

function secretToKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

function getSecret(name: string): string {
  return process.env[name] ?? process.env.PAYWALL_COOKIE_SECRET ?? DEFAULT_SECRET;
}

export function signPayload(payload: string, secretName = "PAYWALL_COOKIE_SECRET"): string {
  const secret = getSecret(secretName);
  return toBase64Url(createHmac("sha256", secret).update(payload).digest());
}

export function verifySignedPayload(
  payload: string,
  signature: string,
  secretName = "PAYWALL_COOKIE_SECRET",
): boolean {
  const expected = signPayload(payload, secretName);
  const left = fromBase64Url(signature);
  const right = fromBase64Url(expected);

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

export function encryptText(plainText: string, secretName = "TOKEN_ENCRYPTION_SECRET"): string {
  const key = secretToKey(getSecret(secretName));
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${toBase64Url(iv)}.${toBase64Url(tag)}.${toBase64Url(encrypted)}`;
}

export function decryptText(cipherText: string, secretName = "TOKEN_ENCRYPTION_SECRET"): string {
  const parts = cipherText.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid ciphertext format");
  }

  const [ivPart, tagPart, encryptedPart] = parts;
  const key = secretToKey(getSecret(secretName));
  const iv = fromBase64Url(ivPart);
  const tag = fromBase64Url(tagPart);
  const encrypted = fromBase64Url(encryptedPart);

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
