export type Role = "CLIENT" | "DEVELOPER" | "HUNTER" | "ADMIN";

export type DealState =
  | "CREATED"
  | "INVITED"
  | "PENDING_PAYMENT"
  | "FUNDED"
  | "ONBOARDING"
  | "IN_PROGRESS"
  | "MILESTONE_REVIEW"
  | "PARTIALLY_RELEASED"
  | "COMPLETED"
  | "DISPUTED"
  | "REFUNDED"
  | "CANCELLED";

export type MilestoneStatus =
  | "PENDING"
  | "SUBMITTED"
  | "APPROVED"
  | "REVISION_REQUESTED";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export type PlatformMessage = {
  id: string;
  dealId: string;
  userId: string;
  content: string;
  createdAt: string;
  user?: {
    name: string;
    role: Role;
  };
};

export type PlatformMilestone = {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  deliverables: string[];
  status: MilestoneStatus;
  revisionCount: number;
  maxRevisions: number;
};

export type PlatformAiSummary = {
  summary: string;
  deliverables: string[];
  revisionRules: string[];
};

export type InviteRole = "DEVELOPER" | "CLIENT";

export type InviteStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED";

export type PlatformInvite = {
  id: string;
  dealId: string;
  token: string;
  recipientEmail: string;
  recipientRole: InviteRole;
  invitedByUserId: string;
  invitedUserId?: string;
  status: InviteStatus;
  createdAt: string;
  acceptedAt?: string;
  explanation?: string;
};

export type PlatformDirectMessage = {
  id: string;
  toUserId: string;
  fromUserId: string;
  title: string;
  body: string;
  ctaUrl?: string;
  relatedInviteId?: string;
  readAt?: string;
  createdAt: string;
};

export type PlatformDeal = {
  id: string;
  title: string;
  description: string;
  budget: number;
  state: DealState;
  developerSplit: number;
  hunterSplit: number;
  platformSplit: number;
  timelineWeeks: number;
  createdAt: string;
  completedAt?: string;
  clientId?: string;
  developerId?: string;
  hunterId: string;
  inviteLink?: string;
  milestones: PlatformMilestone[];
  messages: PlatformMessage[];
  invites?: PlatformInvite[];
  aiSummary?: PlatformAiSummary | null;
  developerAcceptanceMessage?: string;
  clientRequirements?: string;
  developerMarkedDone?: boolean;
  clientApprovedDone?: boolean;
  hunterApprovedDone?: boolean;
  upiPaymentDetails?: {
    upiId?: string;
    transactionId?: string;
    paidAt?: string;
  };
};

export type PlatformProfile = {
  id: string;
  email: string;
  name: string;
  role: Role;
  devProfile?: {
    headline?: string;
    bio?: string;
    location?: string;
    skills?: string[];
    stack?: string[];
    experience?: Array<{ title: string; company: string; duration: string; desc?: string }>;
    education?: Array<{ school: string; degree: string; year: string }>;
    earningsTotal?: number;
    availability?: boolean;
    isVerified?: boolean;
    ratingAvg?: number;
    completedProjects?: number;
  };
  hunterProfile?: {
    industries?: string[];
    closedDealsCount?: number;
    conversionRate?: number;
    ratingAvg?: number;
  };
  clientProfile?: {
    companyName?: string;
    headline?: string;
    location?: string;
    website?: string;
    bio?: string;
    teamSize?: number;
    fundingStage?: string;
    isVerified?: boolean;
    paymentReliability?: number;
  };
};

export type PlatformPost = {
  id: string;
  content: string;
  imageUrl?: string;
  likesCount: number;
  createdAt: string;
  author: PlatformProfile;
};
