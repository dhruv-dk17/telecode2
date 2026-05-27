import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

function toBuffer(value: string) {
  return Buffer.from(value, "hex");
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, hashedPassword: string) {
  const [salt, storedHash] = hashedPassword.split(":");
  if (!salt || !storedHash) {
    return false;
  }

  const derivedHash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return timingSafeEqual(toBuffer(storedHash), toBuffer(derivedHash));
}

export function createResetToken() {
  return randomBytes(24).toString("hex");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
