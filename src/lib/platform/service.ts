import { prisma } from "@/lib/prisma";
import { createResetToken, hashPassword, hashToken, verifyPassword } from "@/lib/security";
import { getMockStore } from "@/lib/platform/mock-data";
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

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function toSessionUser(user: PlatformProfile) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  } as SessionUser;
}

function stripPassword<T extends { passwordHash?: string }>(value: T) {
  const rest = { ...value };
  delete rest.passwordHash;
  return rest;
}

function buildSystemMessage(dealId: string, content: string) {
  return {
    id: `message-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    dealId,
    userId: "system",
    content,
    createdAt: new Date().toISOString(),
    user: { name: "Telecode System", role: "ADMIN" as Role },
  };
}

function isPendingInviteForUser(user: SessionUser, invite: PlatformInvite) {
  return (
    invite.status === "PENDING" &&
    invite.recipientEmail === user.email &&
    invite.recipientRole === user.role
  );
}

function canAccessDeal(
  user: SessionUser,
  deal: PlatformDeal,
  invites: PlatformInvite[],
) {
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

function assertSelfServiceRole(role: Role) {
  if (!["CLIENT", "DEVELOPER", "HUNTER"].includes(role)) {
    throw new Error("This role cannot be created through self-service signup.");
  }
}

export async function isDatabaseReady() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || dbUrl.includes("[password]") || dbUrl.includes("mock")) {
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

  if (input.role === "DEVELOPER") {
    user.devProfile = {
      headline: "Product-focused developer",
      bio: "Builds clean, trustworthy product experiences and can join funded delivery immediately.",
      skills: ["Next.js", "TypeScript"],
      stack: ["Next.js", "Prisma"],
      availability: true,
      isVerified: false,
      ratingAvg: 0,
      completedProjects: 0,
    };
  }

  if (input.role === "HUNTER") {
    user.hunterProfile = {
      industries: ["Startups"],
      closedDealsCount: 0,
      conversionRate: 0,
      ratingAvg: 0,
    };
  }

  if (input.role === "CLIENT") {
    user.clientProfile = {
      companyName: `${name} Studio`,
      headline: `${name} team`,
      teamSize: 3,
      fundingStage: "Bootstrapped",
      paymentReliability: 100,
      isVerified: false,
    };
  }

  store.users.unshift(user);
  return toSessionUser(user);
}

export async function authenticateUser(email: string, password: string) {
  const store = getMockStore();
  const user = store.users.find((candidate) => candidate.email === normalizeEmail(email));
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new Error("Invalid email or password.");
  }

  return toSessionUser(user);
}

export async function requestPasswordReset(email: string) {
  const store = getMockStore();
  const normalizedEmail = validateEmail(email);
  const user = store.users.find((candidate) => candidate.email === normalizedEmail);

  if (!user) {
    return { sent: true };
  }

  const rawToken = createResetToken();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  store.passwordResetTokens = store.passwordResetTokens.filter(
    (item) => item.userId !== user.id || item.consumedAt,
  );
  store.passwordResetTokens.unshift({
    id: `reset-${Date.now()}`,
    userId: user.id,
    tokenHash: hashToken(rawToken),
    expiresAt,
    createdAt: new Date().toISOString(),
  });

  return {
    sent: true,
    tokenPreview: process.env.NODE_ENV === "production" ? undefined : rawToken,
    expiresAt,
  };
}

export async function resetPassword(input: {
  email: string;
  token: string;
  newPassword: string;
}) {
  const store = getMockStore();
  const normalizedEmail = validateEmail(input.email);
  const validatedPassword = validatePassword(input.newPassword);
  const user = store.users.find((candidate) => candidate.email === normalizedEmail);

  if (!user) {
    throw new Error("Invalid or expired reset link.");
  }

  const tokenHash = hashToken(input.token.trim());
  const resetRecord = store.passwordResetTokens.find(
    (item) =>
      item.userId === user.id &&
      item.tokenHash === tokenHash &&
      !item.consumedAt &&
      new Date(item.expiresAt).getTime() > Date.now(),
  );

  if (!resetRecord) {
    throw new Error("Invalid or expired reset link.");
  }

  user.passwordHash = hashPassword(validatedPassword);
  resetRecord.consumedAt = new Date().toISOString();
  return { success: true };
}

export async function getDealsForUser(user: SessionUser) {
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
    messages: [
      {
        id: `${dealId}-message-1`,
        dealId,
        userId: user.id,
        content: "Deal created. Next step: choose a developer and send a proposal with clear project context.",
        createdAt: new Date().toISOString(),
        user: { name: user.name, role: user.role },
      },
    ],
    invites: [],
    aiSummary: null,
    developerMarkedDone: false,
    clientApprovedDone: false,
    hunterApprovedDone: false,
  };

  store.deals.unshift(deal);
  return clone(deal);
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

  const store = getMockStore();
  const recipientEmail = validateEmail(input.recipientEmail);
  const deal = store.deals.find((item) => item.id === input.dealId);
  if (!deal) {
    throw new Error("Deal not found.");
  }
  if (deal.hunterId !== user.id) {
    throw new Error("You can only invite users into your own deals.");
  }
  if (input.recipientRole === "CLIENT" && !deal.developerId) {
    throw new Error("A developer must accept the work before you invite the client.");
  }

  const invitedUser = store.users.find(
    (candidate) => candidate.email === recipientEmail && candidate.role === input.recipientRole,
  );
  if (!invitedUser && input.recipientRole === "DEVELOPER") {
    throw new Error("No developer account exists for that email yet.");
  }

  const existingInvite = store.invites.find(
    (invite) =>
      invite.dealId === input.dealId &&
      invite.recipientEmail === recipientEmail &&
      invite.recipientRole === input.recipientRole &&
      invite.status === "PENDING",
  );
  if (existingInvite) {
    throw new Error("A pending invitation already exists for this user.");
  }

  const token = `invite-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const invite: PlatformInvite = {
    id: `invite-${Date.now()}`,
    dealId: input.dealId,
    token,
    recipientEmail,
    recipientRole: input.recipientRole,
    invitedByUserId: user.id,
    invitedUserId: invitedUser?.id,
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };

  store.invites.unshift(invite);
  deal.invites = store.invites.filter((item) => item.dealId === deal.id);
  deal.messages.push({
    id: `message-${Date.now()}`,
    dealId: deal.id,
    userId: user.id,
    content: `${input.recipientRole === "DEVELOPER" ? "Developer" : "Client"} invitation sent to ${recipientEmail}.`,
    createdAt: new Date().toISOString(),
    user: { name: user.name, role: user.role },
  });

  if (invitedUser) {
    const dm: PlatformDirectMessage = {
      id: `dm-${Date.now()}`,
      toUserId: invitedUser.id,
      fromUserId: user.id,
      title: `${input.recipientRole === "DEVELOPER" ? "Developer" : "Client"} invitation`,
      body: `${user.name} invited you to join "${deal.title}" on Telecode.`,
      ctaUrl: `/invite/${token}`,
      relatedInviteId: invite.id,
      createdAt: new Date().toISOString(),
    };
    store.directMessages.unshift(dm);
  }

  return clone({
    invite,
    acceptUrl: `/invite/${token}`,
  });
}

export async function getInviteByToken(token: string) {
  const store = getMockStore();
  const invite = store.invites.find((item) => item.token === token);
  if (!invite) {
    return null;
  }

  const deal = store.deals.find((item) => item.id === invite.dealId) || null;
  return clone({ invite, deal });
}

export async function acceptInviteByToken(user: SessionUser, token: string) {
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
  deal.invites = store.invites.filter((item) => item.dealId === deal.id);
  deal.messages.push({
    id: `message-${Date.now()}`,
    dealId: deal.id,
    userId: user.id,
    content: `${user.name} accepted the invitation and joined the workspace.`,
    createdAt: new Date().toISOString(),
    user: { name: user.name, role: user.role },
  });

  const relatedDm = store.directMessages.find(
    (item) => item.relatedInviteId === invite.id && item.toUserId === user.id,
  );
  if (relatedDm) {
    relatedDm.readAt = new Date().toISOString();
  }

  return clone({ invite, deal });
}

export async function getDirectMessagesForUser(user: SessionUser) {
  const store = getMockStore();
  return clone(
    store.directMessages
      .filter((item) => item.toUserId === user.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  );
}

export async function markDirectMessageRead(user: SessionUser, messageId: string) {
  const store = getMockStore();
  const message = store.directMessages.find((item) => item.id === messageId && item.toUserId === user.id);
  if (!message) {
    throw new Error("Message not found.");
  }

  message.readAt = message.readAt || new Date().toISOString();
  return clone(message);
}

export async function transitionDealState(user: SessionUser, dealId: string, nextState: DealState) {
  const store = getMockStore();
  const deal = store.deals.find((item) => item.id === dealId);
  if (!deal) {
    throw new Error("Deal not found.");
  }
  assertDealAccess(user, deal, store.invites);

  if (!(transitions[deal.state] || []).includes(nextState)) {
    throw new Error(`Invalid transition from ${deal.state} to ${nextState}.`);
  }

  if (nextState === "PENDING_PAYMENT") {
    if (user.role !== "HUNTER" || deal.hunterId !== user.id) {
      throw new Error("Only the assigned hunter can send the client invite.");
    }
    if (!deal.developerId) {
      throw new Error("A developer must accept before requesting payment.");
    }
  }

  if (nextState === "FUNDED") {
    if (user.role !== "CLIENT" || deal.clientId !== user.id) {
      throw new Error("Only the invited client can fund escrow.");
    }
  }

  if (nextState === "IN_PROGRESS") {
    if (user.role !== "DEVELOPER" || deal.developerId !== user.id) {
      throw new Error("Only the assigned developer can start delivery.");
    }
  }

  deal.state = nextState;
  deal.messages.push({
    id: `message-${Date.now()}`,
    dealId,
    userId: user.id,
    content: `System updated the deal state to ${nextState}.`,
    createdAt: new Date().toISOString(),
    user: { name: user.name, role: user.role },
  });

  return clone(deal);
}

export async function submitMessage(user: SessionUser, dealId: string, content: string) {
  const store = getMockStore();
  const deal = store.deals.find((item) => item.id === dealId);
  if (!deal) {
    throw new Error("Deal not found.");
  }
  assertDealAccess(user, deal, store.invites);

  const message = {
    id: `message-${Date.now()}`,
    dealId,
    userId: user.id,
    content: validateRequiredText(content, "Message", 1, 2000),
    createdAt: new Date().toISOString(),
    user: { name: user.name, role: user.role },
  };

  deal.messages.push(message);
  return clone(message);
}

export async function saveAiSummary(user: SessionUser, dealId: string, summary: PlatformAiSummary) {
  const store = getMockStore();
  const deal = store.deals.find((item) => item.id === dealId);
  if (!deal) {
    throw new Error("Deal not found.");
  }
  assertDealAccess(user, deal, store.invites);

  deal.aiSummary = {
    summary: validateRequiredText(summary.summary, "AI summary", 20, 3000),
    deliverables: summary.deliverables.map((item) => validateRequiredText(item, "Deliverable", 2, 200)),
    revisionRules: summary.revisionRules.map((item) => validateRequiredText(item, "Revision rule", 2, 200)),
  };
  deal.messages.push({
    id: `message-${Date.now()}`,
    dealId,
    userId: user.id,
    content: "AI onboarding brief was generated and saved to the workspace.",
    createdAt: new Date().toISOString(),
    user: { name: user.name, role: user.role },
  });
  return clone(deal.aiSummary);
}

export async function updateMilestoneStatus(
  user: SessionUser,
  dealId: string,
  milestoneId: string,
  action: "submit" | "approve" | "revision",
) {
  const store = getMockStore();
  const deal = store.deals.find((item) => item.id === dealId);
  const milestone = deal?.milestones.find((item) => item.id === milestoneId);
  if (!deal || !milestone) {
    throw new Error("Milestone not found.");
  }
  assertDealAccess(user, deal, store.invites);

  if (action === "submit") {
    if (user.role !== "DEVELOPER" || deal.developerId !== user.id) {
      throw new Error("Only the assigned developer can submit milestones.");
    }
    milestone.status = "SUBMITTED";
    deal.state = "MILESTONE_REVIEW";
  }

  if (action === "approve") {
    if (user.role !== "CLIENT" || deal.clientId !== user.id) {
      throw new Error("Only the assigned client can approve milestones.");
    }
    milestone.status = "APPROVED";
    deal.state =
      deal.milestones.every((item) => item.id === milestoneId || item.status === "APPROVED")
        ? "PARTIALLY_RELEASED"
        : "PARTIALLY_RELEASED";
  }

  if (action === "revision") {
    if (user.role !== "CLIENT" || deal.clientId !== user.id) {
      throw new Error("Only the assigned client can request revisions.");
    }
    milestone.status = "REVISION_REQUESTED";
    milestone.revisionCount += 1;
    deal.state = "IN_PROGRESS";
  }

  deal.messages.push({
    id: `message-${Date.now()}`,
    dealId,
    userId: user.id,
    content: `Milestone "${milestone.title}" was ${action === "revision" ? "sent back for revision" : `${action}ted`}.`,
    createdAt: new Date().toISOString(),
    user: { name: user.name, role: user.role },
  });

  return clone(milestone);
}

export async function getProfile(userId: string) {
  const store = getMockStore();
  const profile = store.users.find((item) => item.id === userId);
  return profile ? clone(stripPassword(profile)) : null;
}

export async function updateProfile(
  user: SessionUser,
  input: Partial<PlatformProfile["devProfile"] & PlatformProfile["clientProfile"]>,
) {
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

export async function getPosts() {
  return clone(getMockStore().posts);
}

export async function createPost(user: SessionUser, content: string, imageUrl?: string) {
  const store = getMockStore();
  const author = store.users.find((item) => item.id === user.id);
  if (!author) {
    throw new Error("User not found.");
  }

  const post: PlatformPost = {
    id: `post-${Date.now()}`,
    content: validateRequiredText(content, "Post", 8, 4000),
    imageUrl: imageUrl?.trim() || undefined,
    likesCount: 0,
    createdAt: new Date().toISOString(),
    author: stripPassword(author),
  };

  store.posts.unshift(post);
  return clone(post);
}

export async function likePost(postId: string) {
  const store = getMockStore();
  const post = store.posts.find((item) => item.id === postId);
  if (!post) {
    throw new Error("Post not found.");
  }

  post.likesCount += 1;
  return clone(post);
}

export async function getDevelopers() {
  const store = getMockStore();
  return clone(store.users.filter((user) => user.role === "DEVELOPER").map(stripPassword));
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

  const store = getMockStore();
  const deal = store.deals.find((item) => item.id === dealId);
  const developer = store.users.find((item) => item.id === developerId && item.role === "DEVELOPER");
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

  const proposalMessage = validateRequiredText(message, "Proposal message", 10, 1200);
  const existingInvite = store.invites.find(
    (invite) =>
      invite.dealId === dealId &&
      invite.recipientEmail === developer.email &&
      invite.status === "PENDING",
  );
  if (existingInvite) {
    throw new Error("A pending proposal already exists for this developer.");
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
  deal.invites = store.invites.filter((item) => item.dealId === deal.id);
  deal.messages.push({
    id: `message-${Date.now()}`,
    dealId,
    userId: user.id,
    content: `Proposal sent to ${developer.name}. Waiting for developer response.`,
    createdAt: new Date().toISOString(),
    user: { name: user.name, role: user.role },
  });

  const dm: PlatformDirectMessage = {
    id: `dm-${Date.now()}`,
    toUserId: developerId,
    fromUserId: user.id,
    title: "New Work Proposal",
    body: `${user.name} proposed "${deal.title}" with a ${deal.developerSplit}% developer split.`,
    ctaUrl: "/dashboard",
    relatedInviteId: invite.id,
    createdAt: new Date().toISOString(),
  };
  store.directMessages.unshift(dm);

  return clone(invite);
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

  const store = getMockStore();
  const deal = store.deals.find((item) => item.id === dealId);
  if (!deal) {
    throw new Error("Deal not found.");
  }

  const invite = store.invites.find(
    (item) => item.dealId === dealId && item.invitedUserId === user.id && item.status === "PENDING",
  );
  if (!invite) {
    throw new Error("No pending proposal found for this deal.");
  }

  const normalizedExplanation = validateRequiredText(
    explanation,
    accept ? "Acceptance message" : "Rejection reason",
    5,
    1200,
  );

  if (accept) {
    invite.status = "ACCEPTED";
    invite.acceptedAt = new Date().toISOString();
    invite.explanation = normalizedExplanation;

    deal.developerId = user.id;
    deal.developerAcceptanceMessage = normalizedExplanation;
    deal.state = "INVITED";
    deal.messages.push({
      id: `message-${Date.now()}`,
      dealId,
      userId: user.id,
      content: `${user.name} accepted the proposal and is ready for client onboarding.`,
      createdAt: new Date().toISOString(),
      user: { name: user.name, role: user.role },
    });
  } else {
    invite.status = "REJECTED";
    invite.explanation = normalizedExplanation;
    deal.messages.push({
      id: `message-${Date.now()}`,
      dealId,
      userId: user.id,
      content: `${user.name} declined the proposal and shared a reason with the hunter.`,
      createdAt: new Date().toISOString(),
      user: { name: user.name, role: user.role },
    });
  }

  const dm = store.directMessages.find((item) => item.relatedInviteId === invite.id);
  if (dm) {
    dm.readAt = new Date().toISOString();
  }

  deal.invites = store.invites.filter((item) => item.dealId === deal.id);
  return clone(deal);
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

  const store = getMockStore();
  const deal = store.deals.find((item) => item.id === dealId);
  if (!deal) {
    throw new Error("Deal not found.");
  }
  assertDealAccess(user, deal, store.invites, ["CLIENT"]);

  if (deal.clientId && deal.clientId !== user.id) {
    throw new Error("Only the invited client can fund this workspace.");
  }
  if (!deal.developerId) {
    throw new Error("A developer must be selected before the client can pay.");
  }

  deal.clientId = user.id;
  deal.clientRequirements = validateRequiredText(requirements, "Project brief", 30, 5000);
  deal.upiPaymentDetails = {
    upiId: validateUpiId(upiId),
    transactionId: `UPI-TXN-${Date.now()}`,
    paidAt: new Date().toISOString(),
  };
  deal.state = "FUNDED";

  deal.messages.push({
    id: `message-${Date.now()}`,
    dealId,
    userId: user.id,
    content: "Escrow funded successfully. The project brief is now locked and the shared workspace is active.",
    createdAt: new Date().toISOString(),
    user: { name: user.name, role: user.role },
  });

  return clone(deal);
}

export async function submitFinalDelivery(user: SessionUser, dealId: string) {
  if (user.role !== "DEVELOPER") {
    throw new Error("Only the developer can submit final work.");
  }

  const store = getMockStore();
  const deal = store.deals.find((item) => item.id === dealId);
  if (!deal) {
    throw new Error("Deal not found.");
  }
  assertDealAccess(user, deal, store.invites, ["DEVELOPER"]);

  if (deal.developerId !== user.id) {
    throw new Error("Only the assigned developer can submit final delivery.");
  }
  if (!["FUNDED", "ONBOARDING", "IN_PROGRESS", "PARTIALLY_RELEASED"].includes(deal.state)) {
    throw new Error("This workspace is not ready for final delivery.");
  }

  deal.developerMarkedDone = true;
  deal.clientApprovedDone = false;
  deal.hunterApprovedDone = false;
  deal.state = "MILESTONE_REVIEW";

  deal.messages.push({
    id: `message-${Date.now()}`,
    dealId,
    userId: user.id,
    content: `${user.name} marked the project as delivered. Client and hunter approvals are now required before release.`,
    createdAt: new Date().toISOString(),
    user: { name: user.name, role: user.role },
  });

  return clone(deal);
}

export async function approveFinalDelivery(user: SessionUser, dealId: string) {
  if (user.role !== "CLIENT" && user.role !== "HUNTER") {
    throw new Error("Only client or hunter can sign off on final delivery.");
  }

  const store = getMockStore();
  const deal = store.deals.find((item) => item.id === dealId);
  if (!deal) {
    throw new Error("Deal not found.");
  }
  assertDealAccess(user, deal, store.invites, ["CLIENT", "HUNTER"]);

  if (!deal.developerMarkedDone) {
    throw new Error("The developer must mark delivery complete before sign-off.");
  }

  if (user.role === "CLIENT") {
    if (deal.clientId !== user.id) {
      throw new Error("Only the assigned client can sign off.");
    }
    if (deal.clientApprovedDone) {
      throw new Error("Client sign-off has already been recorded.");
    }
    deal.clientApprovedDone = true;
  } else {
    if (deal.hunterId !== user.id) {
      throw new Error("Only the assigned hunter can sign off.");
    }
    if (deal.hunterApprovedDone) {
      throw new Error("Hunter sign-off has already been recorded.");
    }
    deal.hunterApprovedDone = true;
  }

  deal.messages.push({
    id: `message-${Date.now()}`,
    dealId,
    userId: user.id,
    content: `${user.name} signed off on the final delivery.`,
    createdAt: new Date().toISOString(),
    user: { name: user.name, role: user.role },
  });

  if (deal.clientApprovedDone && deal.hunterApprovedDone) {
    deal.state = "COMPLETED";
    deal.completedAt = new Date().toISOString();

    const developer = store.users.find((item) => item.id === deal.developerId);
    if (developer?.devProfile) {
      developer.devProfile.earningsTotal =
        (developer.devProfile.earningsTotal || 0) + deal.budget * (deal.developerSplit / 100);
      developer.devProfile.completedProjects =
        (developer.devProfile.completedProjects || 0) + 1;
    }

    const hunter = store.users.find((item) => item.id === deal.hunterId);
    if (hunter?.hunterProfile) {
      hunter.hunterProfile.closedDealsCount = (hunter.hunterProfile.closedDealsCount || 0) + 1;
    }

    deal.messages.push(
      buildSystemMessage(
        dealId,
        `Escrow released: ${deal.developerSplit}% to developer, ${deal.hunterSplit}% to hunter, ${deal.platformSplit}% retained as platform fee.`,
      ),
    );
  }

  return clone(deal);
}
