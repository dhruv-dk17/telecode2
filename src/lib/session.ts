import { createHmac, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/security";
import type { SessionUser } from "@/lib/platform/types";

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

function getSessionExpiryDate() {
  return new Date(Date.now() + ONE_WEEK * 1000);
}

function isDatabaseSessionCandidate(token: string) {
  return !token.includes(".");
}

async function isDatabaseConfigured() {
  const dbUrl = process.env.DATABASE_URL;
  return Boolean(dbUrl && !dbUrl.includes("[password]") && !dbUrl.includes("mock"));
}

async function getRequestMetadata() {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");

  return {
    ipAddress: forwardedFor?.split(",")[0]?.trim() || headerStore.get("x-real-ip") || undefined,
    userAgent: headerStore.get("user-agent") || undefined,
  };
}

async function readSessionTokenCookie() {
  const store = await cookies();
  return store.get(SESSION_COOKIE_NAME)?.value ?? null;
}

async function writeSignedSessionCookie(user: SessionUser) {
  const store = await cookies();
  const rawPayload = JSON.stringify(user);
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

function readSignedSessionToken(token: string) {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature || sign(encoded) !== signature) {
    return null;
  }

  try {
    return JSON.parse(decodeSegment(encoded)) as SessionUser;
  } catch {
    return null;
  }
}

export async function createSession(user: SessionUser) {
  if (!(await isDatabaseConfigured())) {
    await writeSignedSessionCookie(user);
    return;
  }

  try {
    const token = randomBytes(32).toString("base64url");
    const tokenHash = hashToken(token);
    const expiresAt = getSessionExpiryDate();
    const store = await cookies();
    const metadata = await getRequestMetadata();

    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      },
    });

    store.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: ONE_WEEK,
      path: "/",
    });
  } catch {
    await writeSignedSessionCookie(user);
  }
}

export async function getCurrentSessionUser() {
  const token = await readSessionTokenCookie();
  if (!token) {
    return null;
  }

  if (!isDatabaseSessionCandidate(token)) {
    return readSignedSessionToken(token);
  }

  if (!(await isDatabaseConfigured())) {
    return null;
  }

  try {
    const session = await prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isDeleted: true,
          },
        },
      },
    });

    if (!session) {
      return null;
    }

    if (session.revokedAt || session.expiresAt.getTime() <= Date.now() || session.user.isDeleted) {
      return null;
    }

    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name ?? session.user.email.split("@")[0] ?? "Telecode User",
      role: session.user.role,
    } satisfies SessionUser;
  } catch {
    return null;
  }
}

export async function revokeCurrentSession() {
  const token = await readSessionTokenCookie();
  const store = await cookies();

  if (token && isDatabaseSessionCandidate(token) && (await isDatabaseConfigured())) {
    try {
      await prisma.session.updateMany({
        where: {
          tokenHash: hashToken(token),
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    } catch {
      // Best effort; always clear the cookie.
    }
  }

  store.delete(SESSION_COOKIE_NAME);
}

export async function revokeAllSessionsForUser(userId: string) {
  if (!(await isDatabaseConfigured())) {
    return;
  }

  await prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}
