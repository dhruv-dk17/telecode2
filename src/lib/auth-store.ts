import { prisma } from "@/lib/prisma";
import { createResetToken, hashPassword, hashToken, verifyPassword } from "@/lib/security";
import type { Role, SessionUser } from "@/lib/platform/types";
import { validateEmail, validateName, validatePassword } from "@/lib/validation";

function assertSelfServiceRole(role: Role) {
  if (!["CLIENT", "DEVELOPER", "HUNTER"].includes(role)) {
    throw new Error("This role cannot be created through self-service signup.");
  }
}

function toSessionUser(user: { id: string; email: string; name: string | null; role: Role }) {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? user.email.split("@")[0] ?? "Telecode User",
    role: user.role,
  } satisfies SessionUser;
}

export async function createAuthUser(input: {
  email: string;
  name: string;
  role: Role;
  password: string;
}) {
  assertSelfServiceRole(input.role);

  const email = validateEmail(input.email);
  const name = validateName(input.name);
  const password = validatePassword(input.password);

  try {
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          name,
          role: input.role,
          passwordHash: hashPassword(password),
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      });

      if (input.role === "DEVELOPER") {
        await tx.developerProfile.create({
          data: {
            userId: created.id,
            headline: "Product-focused developer",
            bio: "Builds clean, trustworthy product experiences and can join funded delivery immediately.",
            skills: ["Next.js", "TypeScript"],
            stack: ["Next.js", "Prisma"],
            availability: true,
            isVerified: false,
            ratingAvg: 0,
            completedProjects: 0,
          },
        });
      }

      if (input.role === "HUNTER") {
        await tx.hunterProfile.create({
          data: {
            userId: created.id,
            industries: ["Startups"],
            closedDealsCount: 0,
            conversionRate: 0,
            ratingAvg: 0,
          },
        });
      }

      if (input.role === "CLIENT") {
        await tx.clientProfile.create({
          data: {
            userId: created.id,
            companyName: `${name} Studio`,
            headline: `${name} team`,
            teamSize: 3,
            fundingStage: "Bootstrapped",
            paymentReliability: 100,
            isVerified: false,
          },
        });
      }

      return created;
    });

    return toSessionUser(user);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw new Error("An account already exists for this email.");
    }

    throw error;
  }
}

export async function authenticateAuthUser(email: string, password: string) {
  const normalizedEmail = validateEmail(email);
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      passwordHash: true,
      isDeleted: true,
    },
  });

  if (!user || user.isDeleted || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    throw new Error("Invalid email or password.");
  }

  return toSessionUser(user);
}

export async function createPasswordResetRequest(email: string) {
  const normalizedEmail = validateEmail(email);
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (!user) {
    return { sent: true } as const;
  }

  const rawToken = createResetToken();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
        OR: [{ consumedAt: null }, { expiresAt: { lte: new Date() } }],
      },
    }),
    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt,
      },
    }),
  ]);

  return {
    sent: true,
    tokenPreview: process.env.NODE_ENV === "production" ? undefined : rawToken,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function consumePasswordReset(input: {
  email: string;
  token: string;
  newPassword: string;
}) {
  const email = validateEmail(input.email);
  const password = validatePassword(input.newPassword);
  const tokenHash = hashToken(input.token.trim());
  const now = new Date();

  const resetRecord = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      consumedAt: null,
      expiresAt: { gt: now },
      user: {
        email,
        isDeleted: false,
      },
    },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!resetRecord) {
    throw new Error("Invalid or expired reset link.");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetRecord.userId },
      data: {
        passwordHash: hashPassword(password),
      },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetRecord.id },
      data: {
        consumedAt: now,
      },
    }),
    prisma.passwordResetToken.deleteMany({
      where: {
        userId: resetRecord.userId,
        id: { not: resetRecord.id },
      },
    }),
    prisma.session.updateMany({
      where: {
        userId: resetRecord.userId,
        revokedAt: null,
      },
      data: {
        revokedAt: now,
      },
    }),
  ]);

  return { success: true } as const;
}
