import { prisma } from "@/lib/prisma";
import { createResetToken, hashPassword, hashToken, verifyPassword } from "@/lib/security";
import { getMockStore } from "@/lib/platform/mock-data";
import type {
  DealState,
  PlatformAiSummary,
  PlatformDeal,
  PlatformDirectMessage,
  PlatformInvite,
  PlatformPost,
  PlatformProfile,
  Role,
  SessionUser,
  InviteRole,
} from "@/lib/platform/types";
import { normalizeEmail, validateEmail, validateName, validatePassword } from "@/lib/validation";

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
      skills: ["Next.js", "TypeScript"],
      stack: ["Next.js", "Prisma"],
      availability: true,
      isVerified: false,
      ratingAvg: 0,
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
      companyName: `${input.name.trim()} Studio`,
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
  let deals = store.deals;

  if (user.role === "HUNTER") {
    deals = deals.filter((deal) => deal.hunterId === user.id);
  }

  if (user.role === "DEVELOPER") {
    deals = deals.filter((deal) => deal.developerId === user.id || !deal.developerId);
  }

  if (user.role === "CLIENT") {
    deals = deals.filter((deal) => deal.clientId === user.id || deal.state === "INVITED");
  }

  return clone(
    deals.map((deal) => ({
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

  const platformSplit = 100 - input.developerSplit - input.hunterSplit;
  if (platformSplit < 0) {
    throw new Error("Revenue split exceeds 100%.");
  }

  const store = getMockStore();
  const dealId = `deal-${Date.now()}`;
  const deal: PlatformDeal = {
    id: dealId,
    title: input.title.trim(),
    description: input.description.trim(),
    budget: input.budget,
    state: "CREATED",
    developerSplit: input.developerSplit,
    hunterSplit: input.hunterSplit,
    platformSplit,
    timelineWeeks: input.timelineWeeks,
    createdAt: new Date().toISOString(),
    hunterId: user.id,
    inviteLink: `invite-${Date.now()}`,
    milestones: [
      {
        id: `${dealId}-milestone-1`,
        title: "Discovery and scope lock",
        amount: Math.round(input.budget * 0.3),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        deliverables: ["Requirements brief", "Milestone breakdown", "Call summary"],
        status: "PENDING",
        revisionCount: 0,
        maxRevisions: 2,
      },
      {
        id: `${dealId}-milestone-2`,
        title: "Build and launch",
        amount: input.budget - Math.round(input.budget * 0.3),
        dueDate: new Date(
          Date.now() + input.timelineWeeks * 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
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
        content: "Deal created. Client invite and split lock are ready for funding.",
        createdAt: new Date().toISOString(),
        user: { name: user.name, role: user.role },
      },
    ],
    invites: [],
    aiSummary: null,
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
  const recipientEmail = normalizeEmail(input.recipientEmail);
  const deal = store.deals.find((item) => item.id === input.dealId);
  if (!deal) {
    throw new Error("Deal not found.");
  }
  if (deal.hunterId !== user.id) {
    throw new Error("You can only invite users into your own deals.");
  }

  const invitedUser = store.users.find(
    (candidate) => candidate.email === recipientEmail && candidate.role === input.recipientRole,
  );
  if (!invitedUser) {
    throw new Error(`No ${input.recipientRole.toLowerCase()} account exists for that email yet.`);
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
    invitedUserId: invitedUser.id,
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

  return clone({
    invite,
    dm,
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
  } else {
    deal.clientId = user.id;
  }

  if (deal.state === "CREATED") {
    deal.state = "INVITED";
  }

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

  const relatedDm = store.directMessages.find((item) => item.relatedInviteId === invite.id && !item.readAt);
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

  if (!(transitions[deal.state] || []).includes(nextState)) {
    throw new Error(`Invalid transition from ${deal.state} to ${nextState}.`);
  }

  if (nextState === "PENDING_PAYMENT" && user.role !== "HUNTER") {
    throw new Error("Only hunters can send the client invite.");
  }

  if (nextState === "FUNDED" && user.role !== "CLIENT") {
    throw new Error("Only the client can fund escrow.");
  }

  if (nextState === "IN_PROGRESS" && user.role !== "DEVELOPER") {
    throw new Error("Only the developer can start delivery.");
  }

  deal.state = nextState;
  if (user.role === "CLIENT" && !deal.clientId) {
    deal.clientId = user.id;
  }
  if (user.role === "DEVELOPER" && !deal.developerId) {
    deal.developerId = user.id;
  }

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

  const message = {
    id: `message-${Date.now()}`,
    dealId,
    userId: user.id,
    content: content.trim(),
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

  deal.aiSummary = summary;
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

  if (action === "submit" && user.role !== "DEVELOPER") {
    throw new Error("Only the developer can submit milestones.");
  }

  if ((action === "approve" || action === "revision") && user.role !== "CLIENT") {
    throw new Error("Only the client can review milestones.");
  }

  if (action === "submit") {
    milestone.status = "SUBMITTED";
    deal.state = "MILESTONE_REVIEW";
  }

  if (action === "approve") {
    milestone.status = "APPROVED";
    deal.state =
      deal.milestones.every((item) => item.id === milestoneId || item.status === "APPROVED")
        ? "COMPLETED"
        : "PARTIALLY_RELEASED";
  }

  if (action === "revision") {
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
    content: content.trim(),
    imageUrl,
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
  return clone(
    store.users
      .filter((user) => user.role === "DEVELOPER")
      .map(stripPassword)
  );
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

  // Check for any existing pending proposal
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
    explanation: message.trim(),
    createdAt: new Date().toISOString(),
  };

  store.invites.unshift(invite);
  deal.invites = store.invites.filter((item) => item.dealId === deal.id);
  
  deal.messages.push({
    id: `message-${Date.now()}`,
    dealId,
    userId: user.id,
    content: `Proposed deal to Developer ${developer.name} with message: "${message.trim()}"`,
    createdAt: new Date().toISOString(),
    user: { name: user.name, role: user.role },
  });

  const dm: PlatformDirectMessage = {
    id: `dm-${Date.now()}`,
    toUserId: developerId,
    fromUserId: user.id,
    title: "New Work Proposal",
    body: `${user.name} proposed you the deal "${deal.title}" with split ${deal.developerSplit}%.`,
    ctaUrl: `/workspace/${dealId}`,
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
    (item) => item.dealId === dealId && item.invitedUserId === user.id && item.status === "PENDING"
  );
  if (!invite) {
    throw new Error("No pending proposal found for this deal.");
  }

  if (accept) {
    invite.status = "ACCEPTED";
    invite.acceptedAt = new Date().toISOString();
    invite.explanation = explanation.trim();
    
    deal.developerId = user.id;
    deal.developerAcceptanceMessage = explanation.trim();
    deal.state = "INVITED"; // Progress deal state
    
    deal.messages.push({
      id: `message-${Date.now()}`,
      dealId,
      userId: user.id,
      content: `Accepted proposal with explanation: "${explanation.trim()}"`,
      createdAt: new Date().toISOString(),
      user: { name: user.name, role: user.role },
    });
  } else {
    invite.status = "REJECTED";
    invite.explanation = explanation.trim();
    
    deal.messages.push({
      id: `message-${Date.now()}`,
      dealId,
      userId: user.id,
      content: `Rejected proposal with explanation: "${explanation.trim()}"`,
      createdAt: new Date().toISOString(),
      user: { name: user.name, role: user.role },
    });
  }

  // Mark related DM as read
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

  deal.clientId = user.id;
  deal.clientRequirements = requirements.trim();
  deal.upiPaymentDetails = {
    upiId: upiId.trim(),
    transactionId: `UPI-TXN-${Date.now()}`,
    paidAt: new Date().toISOString(),
  };
  deal.state = "FUNDED";

  deal.messages.push({
    id: `message-${Date.now()}`,
    dealId,
    userId: user.id,
    content: `Escrow funded successfully via UPI ID: ${upiId.trim()}. Project Brief locked: "${requirements.trim()}". Workspace Chat unlocked for Client, Coder, and Hunter.`,
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

  deal.developerMarkedDone = true;
  deal.state = "MILESTONE_REVIEW";

  deal.messages.push({
    id: `message-${Date.now()}`,
    dealId,
    userId: user.id,
    content: "Developer Elena Rostova marked the project as DELIVERED & DONE. Hunter and Client approvals are required to release escrow.",
    createdAt: new Date().toISOString(),
    user: { name: user.name, role: user.role },
  });

  return clone(deal);
}

export async function approveFinalDelivery(user: SessionUser, dealId: string) {
  if (user.role !== "CLIENT" && user.role !== "HUNTER") {
    throw new Error("Only Client or Hunter can sign off on final delivery.");
  }

  const store = getMockStore();
  const deal = store.deals.find((item) => item.id === dealId);
  if (!deal) {
    throw new Error("Deal not found.");
  }

  if (user.role === "CLIENT") {
    deal.clientApprovedDone = true;
  } else if (user.role === "HUNTER") {
    deal.hunterApprovedDone = true;
  }

  deal.messages.push({
    id: `message-${Date.now()}`,
    dealId,
    userId: user.id,
    content: `${user.name} (${user.role === "CLIENT" ? "Client" : "Hunter"}) signed off and approved final delivery.`,
    createdAt: new Date().toISOString(),
    user: { name: user.name, role: user.role },
  });

  if (deal.clientApprovedDone && deal.hunterApprovedDone) {
    deal.state = "COMPLETED";
    deal.completedAt = new Date().toISOString();

    // release payout to developer and update stats
    const developer = store.users.find((item) => item.id === deal.developerId);
    if (developer && developer.devProfile) {
      developer.devProfile.earningsTotal = (developer.devProfile.earningsTotal || 0) + (deal.budget * (deal.developerSplit / 100));
      developer.devProfile.completedProjects = (developer.devProfile.completedProjects || 0) + 1;
    }

    // update hunter stats
    const hunter = store.users.find((item) => item.id === deal.hunterId);
    if (hunter && hunter.hunterProfile) {
      hunter.hunterProfile.closedDealsCount = (hunter.hunterProfile.closedDealsCount || 0) + 1;
    }

    deal.messages.push({
      id: `message-${Date.now()}`,
      dealId,
      userId: "system",
      content: `Ledger Released! Escrow splits completely distributed: 60% ($${deal.budget * 0.6}) to Developer, 30% ($${deal.budget * 0.3}) to Hunter, 10% ($${deal.budget * 0.1}) platform fee. Deal state COMPLETED.`,
      createdAt: new Date().toISOString(),
    });
  }

  return clone(deal);
}
