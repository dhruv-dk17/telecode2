import { createHmac } from "node:crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "telecode_session";
const ONE_WEEK = 60 * 60 * 24 * 7;

function getSessionSecret() {
  return process.env.SESSION_SECRET || "telecode-dev-session-secret";
}

function encodeSegment(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeSegment(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payload: string) {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

export type SessionPayload = {
  id: string;
  email: string;
  name: string;
  role: "CLIENT" | "DEVELOPER" | "HUNTER" | "ADMIN";
};

export async function writeSessionCookie(payload: SessionPayload) {
  const store = await cookies();
  const rawPayload = JSON.stringify(payload);
  const encoded = encodeSegment(rawPayload);
  const signature = sign(encoded);

  store.set(SESSION_COOKIE_NAME, `${encoded}.${signature}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ONE_WEEK,
    path: "/",
  });
}

export async function readSessionCookie() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature || sign(encoded) !== signature) {
    return null;
  }

  try {
    return JSON.parse(decodeSegment(encoded)) as SessionPayload;
  } catch {
    return null;
  }
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}
