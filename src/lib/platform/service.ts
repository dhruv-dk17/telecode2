import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAuthUser, authenticateAuthUser, consumePasswordReset, createPasswordResetRequest } from "@/lib/auth-store";
import { getMockStore } from "@/lib/platform/mock-data";
import { hashPassword, verifyPassword } from "@/lib/security";
import type {
  DealState,
  InviteRole,
  PlatformAiSummary,
  PlatformDeal,
  PlatformDirectMessage,
  PlatformInvite,
  PlatformPost,
  PlatformProfile,
  Role,
  SessionUser,
} from "@/lib/platform/types";
import {
  normalizeEmail,
  validateEmail,
  validateMoney,
  validateName,
  validatePassword,
  validatePercentage,
  validateRequiredText,
  validateTimelineWeeks,
  validateUpiId,
} from "@/lib/validation";

const transitions: Partial<Record<DealState, DealState[]>> = {
  CREATED: ["INVITED", "PENDING_PAYMENT", "CANCELLED"],
  INVITED: ["PENDING_PAYMENT", "CANCELLED"],
  PENDING_PAYMENT: ["FUNDED", "CANCELLED"],
  FUNDED: ["ONBOARDING", "IN_PROGRESS", "DISPUTED", "REFUNDED"],
  ONBOARDING: ["IN_PROGRESS", "DISPUTED", "CANCELLED"],
  IN_PROGRESS: ["MILESTONE_REVIEW", "PARTIALLY_RELEASED", "DISPUTED"],
  MILESTONE_REVIEW: ["PARTIALLY_RELEASED", "IN_PROGRESS", "DISPUTED"],
  PARTIALLY_RELEASED: ["MILESTONE_REVIEW", "COMPLETED", "DISPUTED"],
  COMPLETED: [],
  DISPUTED: ["PARTIALLY_RELEASED", "REFUNDED", "CANCELLED"],
  REFUNDED: [],
  CANCELLED: [],
};

type ProfileUpdateInput = Partial<
  NonNullable<PlatformProfile["devProfile"]> & NonNullable<PlatformProfile["clientProfile"]>
>;

type DbUserProfileRecord = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  devProfile?: {
    headline: string | null;
    bio: string | null;
    location: string | null;
    skills: string[];
    stack: string[];
    experience: Prisma.JsonValue | null;
    education: Prisma.JsonValue | null;
    earningsTotal: number;
    availability: boolean;
    isVerified: boolean;
    ratingAvg: number;
    completedProjects: number;
  } | null;
  hunterProfile?: {
    industries: string[];
    closedDealsCount: number;
    conversionRate: number;
    ratingAvg: number;
  } | null;
  clientProfile?: {
    companyName: string | null;
    headline: string | null;
    location: string | null;
    website: string | null;
    bio: string | null;
    teamSize: number;
    fundingStage: string | null;
    isVerified: boolean;
    paymentReliability: number;
  } | null;
};

type DbInviteRecord = {
  id: string;
  dealId: string;
  token: string;
  recipientEmail: string;
  recipientRole: Role;
  invitedByUserId: string;
  invitedUserId: string | null;
  status: PlatformInvite["status"];
  createdAt: Date | string;
  acceptedAt: Date | string | null;
  explanation: string | null;
};

type DbDirectMessageRecord = {
  id: string;
  toUserId: string;
  fromUserId: string;
  title: string;
  body: string;
  ctaUrl: string | null;
  relatedInviteId: string | null;
  readAt: Date | null;
  createdAt: Date;
};

type DbDealRecord = {
  id: string;
  title: string;
  description: string;
  budget: number;
  state: DealState;
  developerSplit: number;
  hunterSplit: number;
  platformSplit: number;
  timelineWeeks: number;
  createdAt: Date | string;
  completedAt: Date | string | null;
  clientId: string | null;
  developerId: string | null;
  hunterId: string;
  inviteLink: string;
  milestones?: Array<{
    id: string;
    title: string;
    amount: number;
    dueDate: Date;
    deliverables: string[];
    status: PlatformDeal["milestones"][number]["status"];
    revisionCount: number;
    maxRevisions: number;
  }>;
  messages?: Array<{
    id: string;
    dealId: string;
    userId: string;
    content: string;
    createdAt: Date;
    user?: {
      name: string | null;
      email?: string;
      role: Role;
    } | null;
  }>;
  aiSummary?: {
    summary: string;
    deliverables: string[];
    revisionRules: string[];
  } | null;
  developerAcceptanceMessage?: string | null;
  clientRequirements?: string | null;
  developerMarkedDone?: boolean;
  clientApprovedDone?: boolean;
  hunterApprovedDone?: boolean;
  paymentProvider?: string | null;
  paymentReference?: string | null;
  fundedAt?: Date | null;
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function toIsoString(value: Date | string | null | undefined) {
  if (!value) {
    return undefined;
  }

  return value instanceof Date ? value.toISOString() : value;
}

function toSessionUser(user: { id: string; email: string; name: string | null; role: Role }) {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? user.email.split("@")[0] ?? "Telecode User",
    role: user.role,
  } satisfies SessionUser;
}

function stripPassword<T extends { passwordHash?: string | null }>(value: T) {
  const rest = { ...value };
  delete rest.passwordHash;
  return rest;
}

function assertSelfServiceRole(role: Role) {
  if (!["CLIENT", "DEVELOPER", "HUNTER"].includes(role)) {
    throw new Error("This role cannot be created through self-service signup.");
  }
}

function isPendingInviteForUser(user: SessionUser, invite: PlatformInvite) {
  return (
    invite.status === "PENDING" &&
    invite.recipientEmail === user.email &&
    invite.recipientRole === user.role
  );
}

function canAccessDeal(user: SessionUser, deal: PlatformDeal, invites: PlatformInvite[]) {
  if (user.role === "ADMIN") {
    return true;
  }

  if (deal.hunterId === user.id || deal.developerId === user.id || deal.clientId === user.id) {
    return true;
  }

  return invites.some((invite) => invite.dealId === deal.id && isPendingInviteForUser(user, invite));
}

function assertDealAccess(
  user: SessionUser,
  deal: PlatformDeal,
  invites: PlatformInvite[],
  allowedRoles?: Role[],
) {
  if (!canAccessDeal(user, deal, invites)) {
    throw new Error("You do not have access to this workspace.");
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new Error("You are not allowed to perform this action.");
  }
}

function mapProfile(user: DbUserProfileRecord): PlatformProfile {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? user.email.split("@")[0] ?? "Telecode User",
    role: user.role,
    devProfile: user.devProfile
      ? {
          headline: user.devProfile.headline ?? undefined,
          bio: user.devProfile.bio ?? undefined,
          location: user.devProfile.location ?? undefined,
          skills: user.devProfile.skills ?? [],
          stack: user.devProfile.stack ?? [],
          experience: Array.isArray(user.devProfile.experience)
            ? (user.devProfile.experience as NonNullable<PlatformProfile["devProfile"]>["experience"])
            : undefined,
          education: Array.isArray(user.devProfile.education)
            ? (user.devProfile.education as NonNullable<PlatformProfile["devProfile"]>["education"])
            : undefined,
          earningsTotal: user.devProfile.earningsTotal ?? 0,
          availability: user.devProfile.availability ?? true,
          isVerified: user.devProfile.isVerified ?? false,
          ratingAvg: user.devProfile.ratingAvg ?? 0,
          completedProjects: user.devProfile.completedProjects ?? 0,
        }
      : undefined,
    hunterProfile: user.hunterProfile
      ? {
          industries: user.hunterProfile.industries ?? [],
          closedDealsCount: user.hunterProfile.closedDealsCount ?? 0,
          conversionRate: user.hunterProfile.conversionRate ?? 0,
          ratingAvg: user.hunterProfile.ratingAvg ?? 0,
        }
      : undefined,
    clientProfile: user.clientProfile
      ? {
          companyName: user.clientProfile.companyName ?? undefined,
          headline: user.clientProfile.headline ?? undefined,
          location: user.clientProfile.location ?? undefined,
          website: user.clientProfile.website ?? undefined,
          bio: user.clientProfile.bio ?? undefined,
          teamSize: user.clientProfile.teamSize ?? 1,
          fundingStage: user.clientProfile.fundingStage ?? undefined,
          isVerified: user.clientProfile.isVerified ?? false,
          paymentReliability: user.clientProfile.paymentReliability ?? 100,
        }
      : undefined,
  };
}

function mapInvite(invite: DbInviteRecord): PlatformInvite {
  return {
    id: invite.id,
    dealId: invite.dealId,
    token: invite.token,
    recipientEmail: invite.recipientEmail,
    recipientRole: invite.recipientRole as InviteRole,
    invitedByUserId: invite.invitedByUserId,
    invitedUserId: invite.invitedUserId ?? undefined,
    status: invite.status,
    createdAt: toIsoString(invite.createdAt) || new Date().toISOString(),
    acceptedAt: toIsoString(invite.acceptedAt),
    explanation: invite.explanation ?? undefined,
  };
}

function mapDirectMessage(message: DbDirectMessageRecord): PlatformDirectMessage {
  return {
    id: message.id,
    toUserId: message.toUserId,
    fromUserId: message.fromUserId,
    title: message.title,
    body: message.body,
    ctaUrl: message.ctaUrl ?? undefined,
    relatedInviteId: message.relatedInviteId ?? undefined,
    readAt: toIsoString(message.readAt),
    createdAt: toIsoString(message.createdAt) || new Date().toISOString(),
  };
}

function mapDeal(deal: DbDealRecord, invites: PlatformInvite[]): PlatformDeal {
  return {
    id: deal.id,
    title: deal.title,
    description: deal.description,
    budget: deal.budget,
    state: deal.state,
    developerSplit: deal.developerSplit,
    hunterSplit: deal.hunterSplit,
    platformSplit: deal.platformSplit,
    timelineWeeks: deal.timelineWeeks,
    createdAt: toIsoString(deal.createdAt) || new Date().toISOString(),
    completedAt: toIsoString(deal.completedAt),
    clientId: deal.clientId ?? undefined,
    developerId: deal.developerId ?? undefined,
    hunterId: deal.hunterId,
    inviteLink: deal.inviteLink ?? undefined,
    milestones: (deal.milestones ?? []).map((milestone) => ({
      id: milestone.id,
      title: milestone.title,
      amount: milestone.amount,
      dueDate: toIsoString(milestone.dueDate) || new Date().toISOString(),
      deliverables: milestone.deliverables ?? [],
      status: milestone.status,
      revisionCount: milestone.revisionCount,
      maxRevisions: milestone.maxRevisions,
    })),
    messages: (deal.messages ?? []).map((message) => ({
      id: message.id,
      dealId: message.dealId,
      userId: message.userId,
      content: message.content,
      createdAt: toIsoString(message.createdAt) || new Date().toISOString(),
      user: message.user
        ? {
            name: message.user.name ?? message.user.email?.split("@")[0] ?? "Telecode User",
            role: message.user.role,
          }
        : undefined,
    })),
    invites,
    aiSummary: deal.aiSummary
      ? {
          summary: deal.aiSummary.summary,
          deliverables: deal.aiSummary.deliverables ?? [],
          revisionRules: deal.aiSummary.revisionRules ?? [],
        }
      : null,
    developerAcceptanceMessage: deal.developerAcceptanceMessage ?? undefined,
    clientRequirements: deal.clientRequirements ?? undefined,
    developerMarkedDone: deal.developerMarkedDone ?? false,
    clientApprovedDone: deal.clientApprovedDone ?? false,
    hunterApprovedDone: deal.hunterApprovedDone ?? false,
    upiPaymentDetails: deal.paymentReference
      ? {
          upiId: deal.paymentReference,
          transactionId: deal.paymentReference,
          paidAt: toIsoString(deal.fundedAt),
          provider: deal.paymentProvider ?? undefined,
        }
      : undefined,
  };
}

async function logActivity(tx: { activityLog: typeof prisma.activityLog }, input: {
  userId: string;
  action: string;
  dealId?: string;
  details?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  await tx.activityLog.create({
    data: {
      userId: input.userId,
      dealId: input.dealId,
      action: input.action,
      details: input.details,
      metadata: input.metadata,
    },
  });
}

async function isDatabaseConfigured() {
  const dbUrl = process.env.DATABASE_URL;
  return Boolean(dbUrl && !dbUrl.includes("[password]") && !dbUrl.includes("mock"));
}

async function fetchDealInvites(dealIds: string[]) {
  if (!dealIds.length) {
    return [] as PlatformInvite[];
  }

  const invites = await prisma.dealInvite.findMany({
    where: {
      dealId: { in: dealIds },
    },
    orderBy: { createdAt: "desc" },
  });

  return invites.map(mapInvite);
}

async function fetchDealsByIds(dealIds: string[]) {
  if (!dealIds.length) {
    return [] as PlatformDeal[];
  }

  const deals = await prisma.deal.findMany({
    where: {
      id: { in: dealIds },
      isDeleted: false,
    },
    include: {
      milestones: {
        orderBy: { createdAt: "asc" },
      },
      messages: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      aiSummary: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const invites = await fetchDealInvites(dealIds);
  return deals.map((deal) => mapDeal(deal, invites.filter((invite) => invite.dealId === deal.id)));
}

export async function isDatabaseReady() {
  if (!(await isDatabaseConfigured())) {
    return false;
  }

  try {
    await prisma.user.findFirst();
    return true;
  } catch {
    return false;
  }
}

export async function createUser(input: {
  email: string;
  name: string;
  role: Role;
  password: string;
}) {
  if (await isDatabaseReady()) {
    return createAuthUser(input);
  }

  assertSelfServiceRole(input.role);
  const email = validateEmail(input.email);
  const name = validateName(input.name);
  const password = validatePassword(input.password);
  const store = getMockStore();
  const existing = store.users.find((user) => user.email === email);
  if (existing) {
    throw new Error("An account already exists for this email.");
  }

  const user: PlatformProfile & { passwordHash: string } = {
    id: `user-${Date.now()}`,
    email,
    name,
    role: input.role,
    passwordHash: hashPassword(password),
  };

  store.users.unshift(user);
  return toSessionUser(user);
}

export async function authenticateUser(email: string, password: string) {
  if (await isDatabaseReady()) {
    return authenticateAuthUser(email, password);
  }

  const store = getMockStore();
  const user = store.users.find((candidate) => candidate.email === normalizeEmail(email));
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new Error("Invalid email or password.");
  }

  return toSessionUser(user);
}

export async function requestPasswordReset(email: string) {
  if (await isDatabaseReady()) {
    return createPasswordResetRequest(email);
  }

  return { sent: true } as const;
}

export async function resetPassword(input: {
  email: string;
  token: string;
  newPassword: string;
}) {
  if (await isDatabaseReady()) {
    return consumePasswordReset(input);
  }

  return { success: true } as const;
}

export async function getDealsForUser(user: SessionUser) {
  if (!(await isDatabaseReady())) {
    const store = getMockStore();
    return clone(
      store.deals
        .filter((deal) => canAccessDeal(user, deal, store.invites))
        .map((deal) => ({
          ...deal,
          invites: store.invites.filter((invite) => invite.dealId === deal.id),
        })),
    );
  }

  const inviteMatches = await prisma.dealInvite.findMany({
    where: {
      recipientEmail: user.email,
      recipientRole: user.role,
      status: "PENDING",
    },
    select: {
      dealId: true,
    },
  });

  const deals = user.role === "ADMIN"
    ? await prisma.deal.findMany({
        where: {
          isDeleted: false,
        },
        select: {
          id: true,
        },
      })
    : await prisma.deal.findMany({
        where: {
          isDeleted: false,
          OR: [
            { hunterId: user.id },
            { developerId: user.id },
            { clientId: user.id },
            ...(inviteMatches.length
              ? [{ id: { in: inviteMatches.map((invite) => invite.dealId) } }]
              : []),
          ],
        },
        select: {
          id: true,
        },
      });

  return fetchDealsByIds(deals.map((deal) => deal.id));
}

export async function getDealForUser(user: SessionUser, dealId: string) {
  const deals = await getDealsForUser(user);
  return deals.find((deal) => deal.id === dealId) || null;
}

export async function createDealForHunter(
  user: SessionUser,
  input: {
    title: string;
    description: string;
    budget: number;
    timelineWeeks: number;
    developerSplit: number;
    hunterSplit: number;
  },
) {
  if (user.role !== "HUNTER") {
    throw new Error("Only hunters can create new deals.");
  }

  const title = validateRequiredText(input.title, "Project title", 4, 120);
  const description = validateRequiredText(input.description, "Deal summary", 20, 4000);
  const budget = validateMoney(input.budget, "Budget", 500);
  const timelineWeeks = validateTimelineWeeks(input.timelineWeeks);
  const developerSplit = validatePercentage(input.developerSplit, "Developer split");
  const hunterSplit = validatePercentage(input.hunterSplit, "Hunter split");
  const platformSplit = 100 - developerSplit - hunterSplit;

  if (platformSplit !== 10) {
    throw new Error("Telecode requires a 10% platform fee. Use a valid 60/30/10-style split.");
  }

  if (!(await isDatabaseReady())) {
    const store = getMockStore();
    const dealId = `deal-${Date.now()}`;
    const discoveryAmount = Math.round(budget * 0.3);
    const deliveryAmount = budget - discoveryAmount;
    const deal: PlatformDeal = {
      id: dealId,
      title,
      description,
      budget,
      state: "CREATED",
      developerSplit,
      hunterSplit,
      platformSplit,
      timelineWeeks,
      createdAt: new Date().toISOString(),
      hunterId: user.id,
      inviteLink: `invite-${Date.now()}`,
      milestones: [
        {
          id: `${dealId}-milestone-1`,
          title: "Discovery and scope lock",
          amount: discoveryAmount,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          deliverables: ["Requirements brief", "Milestone breakdown", "Call summary"],
          status: "PENDING",
          revisionCount: 0,
          maxRevisions: 2,
        },
        {
          id: `${dealId}-milestone-2`,
          title: "Build and launch",
          amount: deliveryAmount,
          dueDate: new Date(Date.now() + timelineWeeks * 7 * 24 * 60 * 60 * 1000).toISOString(),
          deliverables: ["Production application", "Documentation", "Launch support"],
          status: "PENDING",
          revisionCount: 0,
          maxRevisions: 3,
        },
      ],
      messages: [],
      invites: [],
      aiSummary: null,
      developerMarkedDone: false,
      clientApprovedDone: false,
      hunterApprovedDone: false,
    };
    store.deals.unshift(deal);
    return clone(deal);
  }

  const discoveryAmount = Math.round(budget * 0.3);
  const deliveryAmount = budget - discoveryAmount;
  const now = new Date();
  const dueDateOne = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const dueDateTwo = new Date(now.getTime() + timelineWeeks * 7 * 24 * 60 * 60 * 1000);

  const created = await prisma.$transaction(async (tx) => {
    const deal = await tx.deal.create({
      data: {
        title,
        description,
        budget,
        timelineWeeks,
        developerSplit,
        hunterSplit,
        platformSplit,
        splitLockedAt: now,
        hunterId: user.id,
        milestones: {
          create: [
            {
              title: "Discovery and scope lock",
              amount: discoveryAmount,
              dueDate: dueDateOne,
              deliverables: ["Requirements brief", "Milestone breakdown", "Call summary"],
              maxRevisions: 2,
            },
            {
              title: "Build and launch",
              amount: deliveryAmount,
              dueDate: dueDateTwo,
              deliverables: ["Production application", "Documentation", "Launch support"],
              maxRevisions: 3,
            },
          ],
        },
        messages: {
          create: {
            userId: user.id,
            content:
              "Deal created. Next step: choose a developer and send a proposal with clear project context.",
          },
        },
      },
      select: {
        id: true,
      },
    });

    await logActivity(tx, {
      userId: user.id,
      dealId: deal.id,
      action: "deal.created",
      details: "Deal created and milestone ledger initialized.",
      metadata: {
        developerSplit,
        hunterSplit,
        platformSplit,
        timelineWeeks,
      },
    });

    return deal;
  });

  const [deal] = await fetchDealsByIds([created.id]);
  return deal;
}

export async function createInviteForDeal(
  user: SessionUser,
  input: {
    dealId: string;
    recipientEmail: string;
    recipientRole: InviteRole;
  },
) {
  if (user.role !== "HUNTER") {
    throw new Error("Only hunters can send invitations.");
  }

  if (!(await isDatabaseReady())) {
    const store = getMockStore();
    const recipientEmail = validateEmail(input.recipientEmail);
    const deal = store.deals.find((item) => item.id === input.dealId);
    if (!deal) {
      throw new Error("Deal not found.");
    }

    const invitedUser = store.users.find(
      (candidate) => candidate.email === recipientEmail && candidate.role === input.recipientRole,
    );
    if (!invitedUser) {
      throw new Error(`No ${input.recipientRole.toLowerCase()} account exists for that email yet.`);
    }

    const token = `invite-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const invite: PlatformInvite = {
      id: `invite-${Date.now()}`,
      dealId: input.dealId,
      token,
      recipientEmail,
      recipientRole: input.recipientRole,
      invitedByUserId: user.id,
      invitedUserId: invitedUser.id,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };
    store.invites.unshift(invite);
    return clone({
      invite,
      acceptUrl: `/invite/${token}`,
    });
  }

  const recipientEmail = validateEmail(input.recipientEmail);
  const deal = await prisma.deal.findUnique({
    where: { id: input.dealId },
    select: {
      id: true,
      title: true,
      hunterId: true,
      developerId: true,
    },
  });

  if (!deal) {
    throw new Error("Deal not found.");
  }

  if (deal.hunterId !== user.id) {
    throw new Error("You can only invite users into your own deals.");
  }

  if (input.recipientRole === "CLIENT" && !deal.developerId) {
    throw new Error("A developer must accept the work before you invite the client.");
  }

  const invitedUser = await prisma.user.findFirst({
    where: {
      email: recipientEmail,
      role: input.recipientRole,
      isDeleted: false,
    },
    select: { id: true },
  });

  if (!invitedUser) {
    throw new Error(`No ${input.recipientRole.toLowerCase()} account exists for that email yet.`);
  }

  const existingInvite = await prisma.dealInvite.findFirst({
    where: {
      dealId: input.dealId,
      recipientEmail,
      recipientRole: input.recipientRole,
      status: "PENDING",
    },
    select: { id: true },
  });

  if (existingInvite) {
    throw new Error("A pending invitation already exists for this user.");
  }

  const token = `invite-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const invite = await prisma.$transaction(async (tx) => {
    const createdInvite = await tx.dealInvite.create({
      data: {
        dealId: input.dealId,
        token,
        recipientEmail,
        recipientRole: input.recipientRole,
        invitedByUserId: user.id,
        invitedUserId: invitedUser.id,
      },
    });

    await tx.directMessage.create({
      data: {
        toUserId: invitedUser.id,
        fromUserId: user.id,
        title: `${input.recipientRole === "DEVELOPER" ? "Developer" : "Client"} invitation`,
        body: `${user.name} invited you to join "${deal.title}" on Telecode.`,
        ctaUrl: `/invite/${token}`,
        relatedInviteId: createdInvite.id,
      },
    });

    await tx.message.create({
      data: {
        dealId: input.dealId,
        userId: user.id,
        content: `${input.recipientRole === "DEVELOPER" ? "Developer" : "Client"} invitation sent to ${recipientEmail}.`,
      },
    });

    await logActivity(tx, {
      userId: user.id,
      dealId: input.dealId,
      action: "invite.sent",
      details: `Invitation sent to ${recipientEmail}.`,
      metadata: {
        recipientRole: input.recipientRole,
      },
    });

    return createdInvite;
  });

  return {
    invite: mapInvite(invite),
    acceptUrl: `/invite/${token}`,
  };
}

export async function getInviteByToken(token: string) {
  if (!(await isDatabaseReady())) {
    const store = getMockStore();
    const invite = store.invites.find((item) => item.token === token);
    if (!invite) {
      return null;
    }

    const deal = store.deals.find((item) => item.id === invite.dealId) || null;
    return clone({ invite, deal });
  }

  const invite = await prisma.dealInvite.findUnique({
    where: { token },
    include: {
      deal: {
        include: {
          milestones: {
            orderBy: { createdAt: "asc" },
          },
          messages: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                  role: true,
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
          aiSummary: true,
        },
      },
    },
  });

  if (!invite) {
    return null;
  }

  const mappedInvite = mapInvite(invite);
  const mappedDeal = mapDeal(invite.deal, [mappedInvite]);
  return {
    invite: mappedInvite,
    deal: mappedDeal,
  };
}

export async function acceptInviteByToken(user: SessionUser, token: string) {
  if (!(await isDatabaseReady())) {
    const store = getMockStore();
    const invite = store.invites.find((item) => item.token === token);
    if (!invite || invite.status !== "PENDING") {
      throw new Error("This invitation is invalid or already used.");
    }

    if (invite.recipientEmail !== user.email || invite.recipientRole !== user.role) {
      throw new Error("This invitation does not belong to your account.");
    }

    const deal = store.deals.find((item) => item.id === invite.dealId);
    if (!deal) {
      throw new Error("Deal not found.");
    }

    if (invite.recipientRole === "DEVELOPER") {
      deal.developerId = user.id;
      if (deal.state === "CREATED") {
        deal.state = "INVITED";
      }
    } else {
      deal.clientId = user.id;
      if (deal.state === "INVITED") {
        deal.state = "PENDING_PAYMENT";
      }
    }

    invite.invitedUserId = user.id;
    invite.status = "ACCEPTED";
    invite.acceptedAt = new Date().toISOString();
    return clone({ invite, deal });
  }

  const invite = await prisma.dealInvite.findUnique({
    where: { token },
    include: {
      deal: {
        select: {
          id: true,
          state: true,
          hunterId: true,
          developerId: true,
          clientId: true,
        },
      },
    },
  });

  if (!invite || invite.status !== "PENDING") {
    throw new Error("This invitation is invalid or already used.");
  }

  if (invite.recipientEmail !== user.email || invite.recipientRole !== user.role) {
    throw new Error("This invitation does not belong to your account.");
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.dealInvite.update({
      where: { id: invite.id },
      data: {
        invitedUserId: user.id,
        status: "ACCEPTED",
        acceptedAt: now,
      },
    });

    await tx.deal.update({
      where: { id: invite.dealId },
      data:
        invite.recipientRole === "DEVELOPER"
          ? {
              developerId: user.id,
              state: invite.deal.state === "CREATED" ? "INVITED" : invite.deal.state,
            }
          : {
              clientId: user.id,
              state: invite.deal.state === "INVITED" ? "PENDING_PAYMENT" : invite.deal.state,
            },
    });

    await tx.message.create({
      data: {
        dealId: invite.dealId,
        userId: user.id,
        content: `${user.name} accepted the invitation and joined the workspace.`,
      },
    });

    await tx.directMessage.updateMany({
      where: {
        relatedInviteId: invite.id,
        toUserId: user.id,
        readAt: null,
      },
      data: {
        readAt: now,
      },
    });

    await logActivity(tx, {
      userId: user.id,
      dealId: invite.dealId,
      action: "invite.accepted",
      details: "Invitation accepted and access granted.",
      metadata: {
        recipientRole: invite.recipientRole,
      },
    });
  });

  const result = await getInviteByToken(token);
  if (!result) {
    throw new Error("Invite lookup failed after acceptance.");
  }

  return result;
}

export async function getDirectMessagesForUser(user: SessionUser) {
  if (!(await isDatabaseReady())) {
    const store = getMockStore();
    return clone(
      store.directMessages
        .filter((item) => item.toUserId === user.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    );
  }

  const messages = await prisma.directMessage.findMany({
    where: {
      toUserId: user.id,
    },
    orderBy: { createdAt: "desc" },
  });

  return messages.map(mapDirectMessage);
}

export async function markDirectMessageRead(user: SessionUser, messageId: string) {
  if (!(await isDatabaseReady())) {
    const store = getMockStore();
    const message = store.directMessages.find((item) => item.id === messageId && item.toUserId === user.id);
    if (!message) {
      throw new Error("Message not found.");
    }

    message.readAt = message.readAt || new Date().toISOString();
    return clone(message);
  }

  const message = await prisma.directMessage.findFirst({
    where: {
      id: messageId,
      toUserId: user.id,
    },
  });

  if (!message) {
    throw new Error("Message not found.");
  }

  const updated = await prisma.directMessage.update({
    where: { id: message.id },
    data: {
      readAt: message.readAt ?? new Date(),
    },
  });

  return mapDirectMessage(updated);
}

export async function transitionDealState(user: SessionUser, dealId: string, nextState: DealState) {
  const current = await getDealForUser(user, dealId);
  if (!current) {
    throw new Error("Deal not found.");
  }

  assertDealAccess(user, current, current.invites || []);

  if (!(transitions[current.state] || []).includes(nextState)) {
    throw new Error(`Invalid transition from ${current.state} to ${nextState}.`);
  }

  if (!(await isDatabaseReady())) {
    const store = getMockStore();
    const deal = store.deals.find((item) => item.id === dealId);
    if (!deal) {
      throw new Error("Deal not found.");
    }

    deal.state = nextState;
    return clone(deal);
  }

  await prisma.$transaction(async (tx) => {
    await tx.deal.update({
      where: { id: dealId },
      data: {
        state: nextState,
      },
    });

    await tx.message.create({
      data: {
        dealId,
        userId: user.id,
        content: `System updated the deal state to ${nextState}.`,
      },
    });

    await logActivity(tx, {
      userId: user.id,
      dealId,
      action: "deal.state_changed",
      details: `Deal transitioned to ${nextState}.`,
      metadata: {
        previousState: current.state,
        nextState,
      },
    });
  });

  const updated = await getDealForUser(user, dealId);
  if (!updated) {
    throw new Error("Deal not found after update.");
  }

  return updated;
}

export async function submitMessage(user: SessionUser, dealId: string, content: string) {
  const validatedContent = validateRequiredText(content, "Message", 1, 2000);
  const deal = await getDealForUser(user, dealId);
  if (!deal) {
    throw new Error("Deal not found.");
  }

  assertDealAccess(user, deal, deal.invites || []);

  if (!(await isDatabaseReady())) {
    const store = getMockStore();
    const localDeal = store.deals.find((item) => item.id === dealId);
    if (!localDeal) {
      throw new Error("Deal not found.");
    }

    const message = {
      id: `message-${Date.now()}`,
      dealId,
      userId: user.id,
      content: validatedContent,
      createdAt: new Date().toISOString(),
      user: { name: user.name, role: user.role },
    };
    localDeal.messages.push(message);
    return clone(message);
  }

  const message = await prisma.message.create({
    data: {
      dealId,
      userId: user.id,
      content: validatedContent,
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  return {
    id: message.id,
    dealId: message.dealId,
    userId: message.userId,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    user: {
      name: message.user.name ?? message.user.email.split("@")[0] ?? "Telecode User",
      role: message.user.role,
    },
  };
}

export async function saveAiSummary(user: SessionUser, dealId: string, summary: PlatformAiSummary) {
  const deal = await getDealForUser(user, dealId);
  if (!deal) {
    throw new Error("Deal not found.");
  }

  assertDealAccess(user, deal, deal.invites || []);

  const data = {
    summary: validateRequiredText(summary.summary, "AI summary", 20, 3000),
    deliverables: summary.deliverables.map((item) => validateRequiredText(item, "Deliverable", 2, 200)),
    revisionRules: summary.revisionRules.map((item) => validateRequiredText(item, "Revision rule", 2, 200)),
  };

  if (!(await isDatabaseReady())) {
    const store = getMockStore();
    const localDeal = store.deals.find((item) => item.id === dealId);
    if (!localDeal) {
      throw new Error("Deal not found.");
    }

    localDeal.aiSummary = data;
    return clone(data);
  }

  await prisma.$transaction(async (tx) => {
    await tx.aiSummary.upsert({
      where: { dealId },
      update: data,
      create: {
        dealId,
        ...data,
      },
    });

    await tx.message.create({
      data: {
        dealId,
        userId: user.id,
        content: "AI onboarding brief was generated and saved to the workspace.",
      },
    });

    await logActivity(tx, {
      userId: user.id,
      dealId,
      action: "ai.summary_saved",
      details: "Workspace AI summary updated.",
    });
  });

  return data;
}

export async function updateMilestoneStatus(
  user: SessionUser,
  dealId: string,
  milestoneId: string,
  action: "submit" | "approve" | "revision",
) {
  const deal = await getDealForUser(user, dealId);
  const milestone = deal?.milestones.find((item) => item.id === milestoneId);
  if (!deal || !milestone) {
    throw new Error("Milestone not found.");
  }

  assertDealAccess(user, deal, deal.invites || []);

  if (!(await isDatabaseReady())) {
    const store = getMockStore();
    const localDeal = store.deals.find((item) => item.id === dealId);
    const localMilestone = localDeal?.milestones.find((item) => item.id === milestoneId);
    if (!localDeal || !localMilestone) {
      throw new Error("Milestone not found.");
    }

    if (action === "submit") {
      localMilestone.status = "SUBMITTED";
      localDeal.state = "MILESTONE_REVIEW";
    }
    if (action === "approve") {
      localMilestone.status = "APPROVED";
      localDeal.state = "PARTIALLY_RELEASED";
    }
    if (action === "revision") {
      localMilestone.status = "REVISION_REQUESTED";
      localMilestone.revisionCount += 1;
      localDeal.state = "IN_PROGRESS";
    }

    return clone(localMilestone);
  }

  let nextStatus = milestone.status;
  let nextState = deal.state;
  let nextRevisionCount = milestone.revisionCount;

  if (action === "submit") {
    if (user.role !== "DEVELOPER" || deal.developerId !== user.id) {
      throw new Error("Only the assigned developer can submit milestones.");
    }

    nextStatus = "SUBMITTED";
    nextState = "MILESTONE_REVIEW";
  }

  if (action === "approve") {
    if (user.role !== "CLIENT" || deal.clientId !== user.id) {
      throw new Error("Only the assigned client can approve milestones.");
    }

    nextStatus = "APPROVED";
    nextState = "PARTIALLY_RELEASED";
  }

  if (action === "revision") {
    if (user.role !== "CLIENT" || deal.clientId !== user.id) {
      throw new Error("Only the assigned client can request revisions.");
    }

    nextStatus = "REVISION_REQUESTED";
    nextRevisionCount += 1;
    nextState = "IN_PROGRESS";
  }

  await prisma.$transaction(async (tx) => {
    await tx.milestone.update({
      where: { id: milestoneId },
      data: {
        status: nextStatus,
        revisionCount: nextRevisionCount,
        submittedAt: action === "submit" ? new Date() : undefined,
        approvedAt: action === "approve" ? new Date() : undefined,
      },
    });

    await tx.deal.update({
      where: { id: dealId },
      data: {
        state: nextState,
      },
    });

    await tx.message.create({
      data: {
        dealId,
        userId: user.id,
        content: `Milestone "${milestone.title}" was ${action === "revision" ? "sent back for revision" : `${action}ted`}.`,
      },
    });

    await logActivity(tx, {
      userId: user.id,
      dealId,
      action: `milestone.${action}`,
      details: `Milestone ${milestone.title} updated.`,
      metadata: {
        milestoneId,
        nextStatus,
      },
    });
  });

  const refreshed = await getDealForUser(user, dealId);
  const updatedMilestone = refreshed?.milestones.find((item) => item.id === milestoneId);
  if (!updatedMilestone) {
    throw new Error("Milestone not found after update.");
  }

  return updatedMilestone;
}

export async function getProfile(userId: string) {
  if (!(await isDatabaseReady())) {
    const store = getMockStore();
    const profile = store.users.find((item) => item.id === userId);
    return profile ? clone(stripPassword(profile)) : null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      devProfile: true,
      hunterProfile: true,
      clientProfile: true,
    },
  });

  return user ? mapProfile(user) : null;
}

export async function updateProfile(
  user: SessionUser,
  input: ProfileUpdateInput,
) {
  if (!(await isDatabaseReady())) {
    const store = getMockStore();
    const record = store.users.find((item) => item.id === user.id);
    if (!record) {
      throw new Error("User not found.");
    }

    if (user.role === "DEVELOPER") {
      record.devProfile = { ...record.devProfile, ...input };
    }

    if (user.role === "CLIENT") {
      record.clientProfile = { ...record.clientProfile, ...input };
    }

    return clone(stripPassword(record));
  }

  if (user.role === "DEVELOPER") {
    await prisma.developerProfile.upsert({
      where: { userId: user.id },
      update: {
        headline: input.headline ?? undefined,
        bio: input.bio ?? undefined,
        location: input.location ?? undefined,
        skills: input.skills ?? undefined,
        stack: input.stack ?? undefined,
        experience: input.experience as Prisma.InputJsonValue | undefined,
        education: input.education as Prisma.InputJsonValue | undefined,
      },
      create: {
        userId: user.id,
        headline: input.headline ?? undefined,
        bio: input.bio ?? undefined,
        location: input.location ?? undefined,
        skills: input.skills ?? [],
        stack: input.stack ?? [],
        experience: input.experience as Prisma.InputJsonValue | undefined,
        education: input.education as Prisma.InputJsonValue | undefined,
      },
    });
  }

  if (user.role === "CLIENT") {
    await prisma.clientProfile.upsert({
      where: { userId: user.id },
      update: {
        companyName: input.companyName ?? undefined,
        headline: input.headline ?? undefined,
        location: input.location ?? undefined,
        website: input.website ?? undefined,
        bio: input.bio ?? undefined,
        teamSize: input.teamSize ?? undefined,
        fundingStage: input.fundingStage ?? undefined,
      },
      create: {
        userId: user.id,
        companyName: input.companyName ?? undefined,
        headline: input.headline ?? undefined,
        location: input.location ?? undefined,
        website: input.website ?? undefined,
        bio: input.bio ?? undefined,
        teamSize: input.teamSize ?? 1,
        fundingStage: input.fundingStage ?? undefined,
      },
    });
  }

  const updated = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      devProfile: true,
      hunterProfile: true,
      clientProfile: true,
    },
  });

  if (!updated) {
    throw new Error("User not found.");
  }

  return mapProfile(updated);
}

export async function getPosts() {
  if (!(await isDatabaseReady())) {
    return clone(getMockStore().posts);
  }

  const posts = await prisma.post.findMany({
    where: {
      author: {
        isDeleted: false,
      },
    },
    include: {
      author: {
        include: {
          devProfile: true,
          hunterProfile: true,
          clientProfile: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return posts.map((post) => ({
    id: post.id,
    content: post.content,
    imageUrl: post.imageUrl ?? undefined,
    likesCount: post.likesCount,
    createdAt: post.createdAt.toISOString(),
    author: mapProfile(post.author),
  }));
}

export async function createPost(user: SessionUser, content: string, imageUrl?: string) {
  const normalizedContent = validateRequiredText(content, "Post", 8, 4000);

  if (!(await isDatabaseReady())) {
    const store = getMockStore();
    const author = store.users.find((item) => item.id === user.id);
    if (!author) {
      throw new Error("User not found.");
    }

    const post: PlatformPost = {
      id: `post-${Date.now()}`,
      content: normalizedContent,
      imageUrl: imageUrl?.trim() || undefined,
      likesCount: 0,
      createdAt: new Date().toISOString(),
      author: stripPassword(author),
    };
    store.posts.unshift(post);
    return clone(post);
  }

  const post = await prisma.post.create({
    data: {
      authorId: user.id,
      content: normalizedContent,
      imageUrl: imageUrl?.trim() || undefined,
    },
    include: {
      author: {
        include: {
          devProfile: true,
          hunterProfile: true,
          clientProfile: true,
        },
      },
    },
  });

  await logActivity(prisma, {
    userId: user.id,
    action: "post.created",
    details: "Feed post created.",
    metadata: {
      postId: post.id,
    },
  });

  return {
    id: post.id,
    content: post.content,
    imageUrl: post.imageUrl ?? undefined,
    likesCount: post.likesCount,
    createdAt: post.createdAt.toISOString(),
    author: mapProfile(post.author),
  };
}

export async function likePost(postId: string) {
  if (!(await isDatabaseReady())) {
    const store = getMockStore();
    const post = store.posts.find((item) => item.id === postId);
    if (!post) {
      throw new Error("Post not found.");
    }

    post.likesCount += 1;
    return clone(post);
  }

  const updated = await prisma.post.update({
    where: { id: postId },
    data: {
      likesCount: {
        increment: 1,
      },
    },
    include: {
      author: {
        include: {
          devProfile: true,
          hunterProfile: true,
          clientProfile: true,
        },
      },
    },
  });

  return {
    id: updated.id,
    content: updated.content,
    imageUrl: updated.imageUrl ?? undefined,
    likesCount: updated.likesCount,
    createdAt: updated.createdAt.toISOString(),
    author: mapProfile(updated.author),
  };
}

export async function getDevelopers() {
  if (!(await isDatabaseReady())) {
    const store = getMockStore();
    return clone(store.users.filter((dev) => dev.role === "DEVELOPER").map(stripPassword));
  }

  const developers = await prisma.user.findMany({
    where: {
      role: "DEVELOPER",
      isDeleted: false,
    },
    include: {
      devProfile: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return developers.map(mapProfile);
}

export async function proposeDealToDeveloper(
  user: SessionUser,
  developerId: string,
  dealId: string,
  message: string,
) {
  if (user.role !== "HUNTER") {
    throw new Error("Only hunters can propose deals.");
  }

  const proposalMessage = validateRequiredText(message, "Proposal message", 10, 1200);

  if (!(await isDatabaseReady())) {
    const store = getMockStore();
    const deal = store.deals.find((item) => item.id === dealId);
    const developer = store.users.find((item) => item.id === developerId && item.role === "DEVELOPER");
    if (!deal || !developer) {
      throw new Error("Deal or developer not found.");
    }

    const token = `proposal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const invite: PlatformInvite = {
      id: `invite-${Date.now()}`,
      dealId,
      token,
      recipientEmail: developer.email,
      recipientRole: "DEVELOPER",
      invitedByUserId: user.id,
      invitedUserId: developerId,
      status: "PENDING",
      explanation: proposalMessage,
      createdAt: new Date().toISOString(),
    };
    store.invites.unshift(invite);
    return clone(invite);
  }

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    select: {
      id: true,
      title: true,
      hunterId: true,
      state: true,
      developerId: true,
      developerSplit: true,
    },
  });

  const developer = await prisma.user.findFirst({
    where: {
      id: developerId,
      role: "DEVELOPER",
      isDeleted: false,
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  if (!deal || !developer) {
    throw new Error("Deal or developer not found.");
  }
  if (deal.hunterId !== user.id) {
    throw new Error("You can only propose developers on your own deals.");
  }
  if (deal.state !== "CREATED") {
    throw new Error("Developer proposals can only be sent while the deal is still open.");
  }
  if (deal.developerId) {
    throw new Error("A developer has already been selected for this deal.");
  }

  const existingInvite = await prisma.dealInvite.findFirst({
    where: {
      dealId,
      recipientEmail: developer.email,
      status: "PENDING",
    },
    select: { id: true },
  });

  if (existingInvite) {
    throw new Error("A pending proposal already exists for this developer.");
  }

  const token = `proposal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const invite = await prisma.$transaction(async (tx) => {
    const createdInvite = await tx.dealInvite.create({
      data: {
        dealId,
        token,
        recipientEmail: developer.email,
        recipientRole: "DEVELOPER",
        invitedByUserId: user.id,
        invitedUserId: developer.id,
        status: "PENDING",
        explanation: proposalMessage,
      },
    });

    await tx.directMessage.create({
      data: {
        toUserId: developer.id,
        fromUserId: user.id,
        title: "New Work Proposal",
        body: `${user.name} proposed "${deal.title}" with a ${deal.developerSplit}% developer split.`,
        ctaUrl: "/dashboard",
        relatedInviteId: createdInvite.id,
      },
    });

    await tx.message.create({
      data: {
        dealId,
        userId: user.id,
        content: `Proposal sent to ${developer.name}. Waiting for developer response.`,
      },
    });

    await logActivity(tx, {
      userId: user.id,
      dealId,
      action: "proposal.sent",
      details: "Developer proposal sent.",
      metadata: {
        developerId: developer.id,
      },
    });

    return createdInvite;
  });

  return mapInvite(invite);
}

export async function respondToDealProposal(
  user: SessionUser,
  dealId: string,
  accept: boolean,
  explanation: string,
) {
  if (user.role !== "DEVELOPER") {
    throw new Error("Only developers can respond to proposals.");
  }

  const normalizedExplanation = validateRequiredText(
    explanation,
    accept ? "Acceptance message" : "Rejection reason",
    5,
    1200,
  );

  if (!(await isDatabaseReady())) {
    const store = getMockStore();
    const deal = store.deals.find((item) => item.id === dealId);
    const invite = store.invites.find(
      (item) => item.dealId === dealId && item.invitedUserId === user.id && item.status === "PENDING",
    );
    if (!deal || !invite) {
      throw new Error("No pending proposal found for this deal.");
    }

    if (accept) {
      invite.status = "ACCEPTED";
      invite.acceptedAt = new Date().toISOString();
      invite.explanation = normalizedExplanation;
      deal.developerId = user.id;
      deal.developerAcceptanceMessage = normalizedExplanation;
      deal.state = "INVITED";
    } else {
      invite.status = "REJECTED";
      invite.explanation = normalizedExplanation;
    }

    return clone(deal);
  }

  const invite = await prisma.dealInvite.findFirst({
    where: {
      dealId,
      invitedUserId: user.id,
      status: "PENDING",
    },
    include: {
      deal: {
        select: {
          state: true,
        },
      },
    },
  });

  if (!invite) {
    throw new Error("No pending proposal found for this deal.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.dealInvite.update({
      where: { id: invite.id },
      data: {
        status: accept ? "ACCEPTED" : "REJECTED",
        acceptedAt: accept ? new Date() : undefined,
        explanation: normalizedExplanation,
      },
    });

    if (accept) {
      await tx.deal.update({
        where: { id: dealId },
        data: {
          developerId: user.id,
          developerAcceptanceMessage: normalizedExplanation,
          state: "INVITED",
        },
      });
    }

    await tx.message.create({
      data: {
        dealId,
        userId: user.id,
        content: accept
          ? `${user.name} accepted the proposal and is ready for client onboarding.`
          : `${user.name} declined the proposal and shared a reason with the hunter.`,
      },
    });

    await tx.directMessage.updateMany({
      where: {
        relatedInviteId: invite.id,
      },
      data: {
        readAt: new Date(),
      },
    });

    await logActivity(tx, {
      userId: user.id,
      dealId,
      action: accept ? "proposal.accepted" : "proposal.rejected",
      details: accept ? "Developer accepted proposal." : "Developer rejected proposal.",
    });
  });

  const updated = await getDealForUser(user, dealId);
  if (!updated) {
    throw new Error("Deal not found.");
  }

  return updated;
}

export async function updateClientRequirementsAndPayUPI(
  user: SessionUser,
  dealId: string,
  requirements: string,
  upiId: string,
) {
  if (user.role !== "CLIENT") {
    throw new Error("Only clients can provide requirements and fund escrow.");
  }

  const deal = await getDealForUser(user, dealId);
  if (!deal) {
    throw new Error("Deal not found.");
  }

  assertDealAccess(user, deal, deal.invites || [], ["CLIENT"]);

  const brief = validateRequiredText(requirements, "Project brief", 30, 5000);
  const paymentHandle = validateUpiId(upiId);

  if (!(await isDatabaseReady())) {
    const store = getMockStore();
    const localDeal = store.deals.find((item) => item.id === dealId);
    if (!localDeal) {
      throw new Error("Deal not found.");
    }

    localDeal.clientRequirements = brief;
    localDeal.clientId = user.id;
    localDeal.state = "FUNDED";
    localDeal.upiPaymentDetails = {
      upiId: paymentHandle,
      transactionId: `UPI-TXN-${Date.now()}`,
      paidAt: new Date().toISOString(),
    };
    return clone(localDeal);
  }

  const transactionId = `UPI-TXN-${Date.now()}`;
  const fundedAt = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.deal.update({
      where: { id: dealId },
      data: {
        clientId: user.id,
        clientRequirements: brief,
        paymentProvider: "UPI_MANUAL_REVIEW",
        paymentReference: transactionId,
        fundedAt,
        state: "FUNDED",
      },
    });

    await tx.payment.create({
      data: {
        dealId,
        amount: deal.budget,
        kind: "DEPOSIT",
        status: "HELD_IN_ESCROW",
        providerReference: transactionId,
        metadata: {
          payerHandle: paymentHandle,
          capturedBy: user.id,
          verificationMode: "manual-reference",
        },
        availableAt: fundedAt,
      },
    });

    await tx.message.create({
      data: {
        dealId,
        userId: user.id,
        content:
          "Escrow funded successfully. The project brief is now locked and the shared workspace is active.",
      },
    });

    await logActivity(tx, {
      userId: user.id,
      dealId,
      action: "payment.held_in_escrow",
      details: "Escrow deposit recorded and held.",
      metadata: {
        amount: deal.budget,
        providerReference: transactionId,
        payerHandle: paymentHandle,
      },
    });
  });

  const updated = await getDealForUser(user, dealId);
  if (!updated) {
    throw new Error("Deal not found after funding.");
  }

  return updated;
}

export async function submitFinalDelivery(user: SessionUser, dealId: string) {
  if (user.role !== "DEVELOPER") {
    throw new Error("Only the developer can submit final work.");
  }

  const deal = await getDealForUser(user, dealId);
  if (!deal) {
    throw new Error("Deal not found.");
  }

  assertDealAccess(user, deal, deal.invites || [], ["DEVELOPER"]);

  if (!(await isDatabaseReady())) {
    const store = getMockStore();
    const localDeal = store.deals.find((item) => item.id === dealId);
    if (!localDeal) {
      throw new Error("Deal not found.");
    }

    localDeal.developerMarkedDone = true;
    localDeal.clientApprovedDone = false;
    localDeal.hunterApprovedDone = false;
    localDeal.state = "MILESTONE_REVIEW";
    return clone(localDeal);
  }

  await prisma.$transaction(async (tx) => {
    await tx.deal.update({
      where: { id: dealId },
      data: {
        developerMarkedDone: true,
        clientApprovedDone: false,
        hunterApprovedDone: false,
        state: "MILESTONE_REVIEW",
      },
    });

    await tx.message.create({
      data: {
        dealId,
        userId: user.id,
        content: `${user.name} marked the project as delivered. Client and hunter approvals are now required before release.`,
      },
    });

    await logActivity(tx, {
      userId: user.id,
      dealId,
      action: "delivery.submitted",
      details: "Final delivery submitted for sign-off.",
    });
  });

  const updated = await getDealForUser(user, dealId);
  if (!updated) {
    throw new Error("Deal not found after delivery.");
  }

  return updated;
}

export async function approveFinalDelivery(user: SessionUser, dealId: string) {
  if (user.role !== "CLIENT" && user.role !== "HUNTER") {
    throw new Error("Only client or hunter can sign off on final delivery.");
  }

  const deal = await getDealForUser(user, dealId);
  if (!deal) {
    throw new Error("Deal not found.");
  }

  assertDealAccess(user, deal, deal.invites || [], ["CLIENT", "HUNTER"]);

  if (!deal.developerMarkedDone) {
    throw new Error("The developer must mark delivery complete before sign-off.");
  }

  if (!(await isDatabaseReady())) {
    const store = getMockStore();
    const localDeal = store.deals.find((item) => item.id === dealId);
    if (!localDeal) {
      throw new Error("Deal not found.");
    }

    if (user.role === "CLIENT") {
      localDeal.clientApprovedDone = true;
    } else {
      localDeal.hunterApprovedDone = true;
    }

    if (localDeal.clientApprovedDone && localDeal.hunterApprovedDone) {
      localDeal.state = "COMPLETED";
      localDeal.completedAt = new Date().toISOString();
    }

    return clone(localDeal);
  }

  const nextClientApprovedDone = user.role === "CLIENT" ? true : deal.clientApprovedDone;
  const nextHunterApprovedDone = user.role === "HUNTER" ? true : deal.hunterApprovedDone;
  const releasing = nextClientApprovedDone && nextHunterApprovedDone;
  const now = new Date();
  const developerAmount = deal.budget * (deal.developerSplit / 100);
  const hunterAmount = deal.budget * (deal.hunterSplit / 100);
  const platformAmount = deal.budget * (deal.platformSplit / 100);

  await prisma.$transaction(async (tx) => {
    await tx.deal.update({
      where: { id: dealId },
      data: {
        clientApprovedDone: nextClientApprovedDone,
        hunterApprovedDone: nextHunterApprovedDone,
        state: releasing ? "COMPLETED" : deal.state,
        completedAt: releasing ? now : undefined,
      },
    });

    await tx.message.create({
      data: {
        dealId,
        userId: user.id,
        content: `${user.name} signed off on the final delivery.`,
      },
    });

    if (releasing) {
      await tx.payment.createMany({
        data: [
          {
            dealId,
            amount: developerAmount,
            kind: "PAYOUT",
            status: "RELEASED",
            providerReference: `${dealId}-developer-payout`,
            releasedAt: now,
          },
          {
            dealId,
            amount: hunterAmount,
            kind: "PAYOUT",
            status: "RELEASED",
            providerReference: `${dealId}-hunter-payout`,
            releasedAt: now,
          },
          {
            dealId,
            amount: platformAmount,
            kind: "FEE",
            status: "RELEASED",
            providerReference: `${dealId}-platform-fee`,
            releasedAt: now,
          },
        ],
      });

      if (deal.developerId) {
        await tx.developerProfile.updateMany({
          where: { userId: deal.developerId },
          data: {
            earningsTotal: {
              increment: developerAmount,
            },
            completedProjects: {
              increment: 1,
            },
          },
        });
      }

      await tx.hunterProfile.updateMany({
        where: { userId: deal.hunterId },
        data: {
          closedDealsCount: {
            increment: 1,
          },
        },
      });
    }

    await logActivity(tx, {
      userId: user.id,
      dealId,
      action: releasing ? "payout.released" : "delivery.signoff_recorded",
      details: releasing
        ? "Dual approval complete and payouts released."
        : "Final delivery sign-off recorded.",
      metadata: releasing
        ? {
            developerAmount,
            hunterAmount,
            platformAmount,
          }
        : undefined,
    });
  });

  const updated = await getDealForUser(user, dealId);
  if (!updated) {
    throw new Error("Deal not found after sign-off.");
  }

  return updated;
}
