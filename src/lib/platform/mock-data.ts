import { hashPassword } from "@/lib/security";
import type {
  PlatformDeal,
  PlatformDirectMessage,
  PlatformInvite,
  PlatformPost,
  PlatformProfile,
} from "@/lib/platform/types";

type MockUserRecord = PlatformProfile & { passwordHash: string };

type MockStore = {
  users: MockUserRecord[];
  deals: PlatformDeal[];
  posts: PlatformPost[];
  invites: PlatformInvite[];
  directMessages: PlatformDirectMessage[];
  passwordResetTokens: Array<{
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: string;
    consumedAt?: string;
    createdAt: string;
  }>;
};

const now = new Date();

function daysFromNow(days: number) {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function buildStore(): MockStore {
  const users: MockUserRecord[] = [
    {
      id: "hunter-1",
      email: "marcus@telecode.io",
      name: "Marcus Vane",
      role: "HUNTER",
      passwordHash: hashPassword("Telecode123!"),
      hunterProfile: {
        industries: ["Health", "Hospitality", "B2B SaaS"],
        closedDealsCount: 14,
        conversionRate: 32,
        ratingAvg: 4.9,
      },
    },
    {
      id: "developer-1",
      email: "elena@telecode.io",
      name: "Elena Rostova",
      role: "DEVELOPER",
      passwordHash: hashPassword("Telecode123!"),
      devProfile: {
        headline: "Senior product engineer for premium web systems",
        bio: "Builds polished, revenue-critical experiences with strong frontend craft and delivery discipline.",
        location: "Paris, France",
        skills: ["Next.js", "TypeScript", "Prisma", "WebRTC"],
        stack: ["Next.js", "PostgreSQL", "Redis", "Stripe"],
        experience: [
          {
            title: "Lead Engineer",
            company: "Northstar Studio",
            duration: "2024-Present",
            desc: "Owns product delivery for agency and SaaS builds.",
          },
        ],
        education: [{ school: "Ecole 42", degree: "Software Engineering", year: "2023" }],
        earningsTotal: 85250,
        availability: true,
        isVerified: true,
        ratingAvg: 5,
      },
    },
    {
      id: "developer-2",
      email: "arjun@telecode.io",
      name: "Arjun Mehta",
      role: "DEVELOPER",
      passwordHash: hashPassword("Telecode123!"),
      devProfile: {
        headline: "Fullstack Web3 & Fintech Developer",
        bio: "Specializes in secure transaction ledgers, smart contracts, and responsive dashboard UI.",
        location: "Bengaluru, India",
        skills: ["React", "Solidity", "Node.js", "Tailwind CSS"],
        stack: ["Next.js", "PostgreSQL", "Ethereum", "Prisma"],
        experience: [
          {
            title: "Smart Contract Engineer",
            company: "Defi Labs",
            duration: "2023-Present",
            desc: "Architected secure vault protocols and high-throughput transaction flows.",
          },
        ],
        education: [{ school: "IIT Bombay", degree: "Computer Science", year: "2022" }],
        earningsTotal: 43500,
        availability: true,
        isVerified: true,
        ratingAvg: 4.8,
      },
    },
    {
      id: "developer-3",
      email: "sarah@telecode.io",
      name: "Sarah Lin",
      role: "DEVELOPER",
      passwordHash: hashPassword("Telecode123!"),
      devProfile: {
        headline: "Creative Frontend Engineer & Motion Specialist",
        bio: "Crafts cinematic, highly interactive web experiences using WebGL, Three.js, and Framer Motion.",
        location: "San Francisco, CA",
        skills: ["WebGL", "Three.js", "Framer Motion", "GSAP"],
        stack: ["Vite", "React", "GSAP", "Tailwind CSS"],
        experience: [
          {
            title: "Frontend Lead",
            company: "Atmosphere Studio",
            duration: "2022-2025",
            desc: "Designed and implemented bespoke interactive brand marketing sites.",
          },
        ],
        education: [{ school: "Stanford University", degree: "Product Design", year: "2021" }],
        earningsTotal: 96000,
        availability: true,
        isVerified: true,
        ratingAvg: 4.9,
      },
    },
    {
      id: "client-1",
      email: "robert@ironpulse.com",
      name: "Robert Kim",
      role: "CLIENT",
      passwordHash: hashPassword("Telecode123!"),
      clientProfile: {
        companyName: "IronPulse Athletics",
        headline: "Founder building a high-end fitness brand",
        location: "Austin, TX",
        website: "https://ironpulse.example",
        bio: "Growth-minded fitness brand investing in differentiated digital experience.",
        teamSize: 12,
        fundingStage: "Bootstrapped",
        isVerified: true,
        paymentReliability: 98,
      },
    },
  ];

  const deal: PlatformDeal = {
    id: "deal-1",
    title: "IronPulse growth site and client portal",
    description:
      "Launch a conversion-led website, onboarding workspace, and premium internal client portal for a fast-growing fitness brand.",
    budget: 12500,
    state: "FUNDED",
    developerSplit: 60,
    hunterSplit: 30,
    platformSplit: 10,
    timelineWeeks: 6,
    createdAt: now.toISOString(),
    clientId: "client-1",
    developerId: "developer-1",
    hunterId: "hunter-1",
    inviteLink: "telecode-ironpulse-invite",
    milestones: [
      {
        id: "milestone-1",
        title: "Discovery, brand framing, and requirements brief",
        amount: 3000,
        dueDate: daysFromNow(5),
        deliverables: ["Recorded onboarding summary", "Technical scope", "Milestone plan"],
        status: "APPROVED",
        revisionCount: 0,
        maxRevisions: 2,
      },
      {
        id: "milestone-2",
        title: "Marketing site, CMS, and analytics stack",
        amount: 5500,
        dueDate: daysFromNow(18),
        deliverables: ["Responsive app", "CMS configuration", "Analytics events"],
        status: "SUBMITTED",
        revisionCount: 1,
        maxRevisions: 3,
      },
      {
        id: "milestone-3",
        title: "Client portal and production handoff",
        amount: 4000,
        dueDate: daysFromNow(32),
        deliverables: ["Client portal", "Admin guide", "Launch checklist"],
        status: "PENDING",
        revisionCount: 0,
        maxRevisions: 2,
      },
    ],
    messages: [
      {
        id: "message-1",
        dealId: "deal-1",
        userId: "hunter-1",
        content: "Deal is funded and the split is locked. Client is ready for the onboarding brief.",
        createdAt: daysFromNow(-1),
        user: { name: "Marcus Vane", role: "HUNTER" },
      },
      {
        id: "message-2",
        dealId: "deal-1",
        userId: "client-1",
        content: "Escrow deposit is complete. Please turn the onboarding notes into milestone-ready requirements.",
        createdAt: daysFromNow(-1),
        user: { name: "Robert Kim", role: "CLIENT" },
      },
    ],
    aiSummary: {
      summary:
        "Client wants a premium, conversion-first web presence with a clear handoff path, strong analytics, and milestone-driven delivery.",
      deliverables: [
        "Marketing site with premium motion",
        "Structured requirements summary",
        "Client portal for approvals and files",
      ],
      revisionRules: [
        "Visual revisions limited to agreed milestone scope",
        "Net-new features trigger milestone repricing",
      ],
    },
  };

  const posts: PlatformPost[] = [
    {
      id: "post-1",
      content: "Milestone 1 cleared. Requirements are locked and the product brief is now execution-ready.",
      likesCount: 18,
      createdAt: daysFromNow(-1),
      author: users[0],
    },
  ];

  const invites: PlatformInvite[] = [
    {
      id: "invite-1",
      dealId: "deal-1",
      token: "invite-telecode-dev-1",
      recipientEmail: "elena@telecode.io",
      recipientRole: "DEVELOPER",
      invitedByUserId: "hunter-1",
      invitedUserId: "developer-1",
      status: "PENDING",
      createdAt: daysFromNow(-1),
    },
    {
      id: "invite-2",
      dealId: "deal-1",
      token: "invite-telecode-client-1",
      recipientEmail: "robert@ironpulse.com",
      recipientRole: "CLIENT",
      invitedByUserId: "hunter-1",
      invitedUserId: "client-1",
      status: "PENDING",
      createdAt: daysFromNow(-1),
    },
  ];

  const directMessages: PlatformDirectMessage[] = [
    {
      id: "dm-1",
      toUserId: "developer-1",
      fromUserId: "hunter-1",
      title: "Developer invitation",
      body: "Marcus invited you to join the IronPulse growth site and client portal workspace.",
      ctaUrl: "/invite/invite-telecode-dev-1",
      relatedInviteId: "invite-1",
      createdAt: daysFromNow(-1),
    },
    {
      id: "dm-2",
      toUserId: "client-1",
      fromUserId: "hunter-1",
      title: "Client invitation",
      body: "Marcus invited you to join the IronPulse growth site and client portal workspace.",
      ctaUrl: "/invite/invite-telecode-client-1",
      relatedInviteId: "invite-2",
      createdAt: daysFromNow(-1),
    },
  ];

  deal.invites = invites.filter((item) => item.dealId === deal.id);

  return { users, deals: [deal], posts, invites, directMessages, passwordResetTokens: [] };
}

const globalStore = globalThis as typeof globalThis & { __telecodeMockStore?: MockStore };

export function getMockStore() {
  if (!globalStore.__telecodeMockStore) {
    globalStore.__telecodeMockStore = buildStore();
  }

  return globalStore.__telecodeMockStore;
}
