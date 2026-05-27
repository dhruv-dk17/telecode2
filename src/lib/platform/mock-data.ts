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

function userById(users: MockUserRecord[], userId: string) {
  const user = users.find((item) => item.id === userId);
  if (!user) {
    throw new Error(`User not found for seed id ${userId}`);
  }

  const { passwordHash: _passwordHash, ...profile } = user;
  return profile;
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
      id: "hunter-2",
      email: "nina@telecode.io",
      name: "Nina Alvarez",
      role: "HUNTER",
      passwordHash: hashPassword("Telecode123!"),
      hunterProfile: {
        industries: ["Fintech", "Developer Tools", "E-commerce"],
        closedDealsCount: 11,
        conversionRate: 28,
        ratingAvg: 4.8,
      },
    },
    {
      id: "hunter-3",
      email: "ibrahim@telecode.io",
      name: "Ibrahim Qureshi",
      role: "HUNTER",
      passwordHash: hashPassword("Telecode123!"),
      hunterProfile: {
        industries: ["Education", "Creator Economy"],
        closedDealsCount: 7,
        conversionRate: 24,
        ratingAvg: 4.6,
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
        completedProjects: 18,
      },
    },
    {
      id: "developer-2",
      email: "arjun@telecode.io",
      name: "Arjun Mehta",
      role: "DEVELOPER",
      passwordHash: hashPassword("Telecode123!"),
      devProfile: {
        headline: "Fullstack fintech developer and payments workflow architect",
        bio: "Specializes in secure transaction ledgers, payouts, and dashboard interfaces for trust-heavy products.",
        location: "Bengaluru, India",
        skills: ["React", "Node.js", "PostgreSQL", "Tailwind CSS"],
        stack: ["Next.js", "PostgreSQL", "Prisma", "Stripe"],
        experience: [
          {
            title: "Payments Engineer",
            company: "Vaultrail",
            duration: "2023-Present",
            desc: "Architected transaction state machines and payout audit logs.",
          },
        ],
        education: [{ school: "IIT Bombay", degree: "Computer Science", year: "2022" }],
        earningsTotal: 43500,
        availability: true,
        isVerified: true,
        ratingAvg: 4.8,
        completedProjects: 9,
      },
    },
    {
      id: "developer-3",
      email: "sarah@telecode.io",
      name: "Sarah Lin",
      role: "DEVELOPER",
      passwordHash: hashPassword("Telecode123!"),
      devProfile: {
        headline: "Motion-heavy frontend engineer for marketing and launch systems",
        bio: "Crafts cinematic brand experiences with deep interaction design and production-ready frontend performance.",
        location: "San Francisco, CA",
        skills: ["WebGL", "Framer Motion", "GSAP", "TypeScript"],
        stack: ["Next.js", "React", "GSAP", "Tailwind CSS"],
        experience: [
          {
            title: "Frontend Lead",
            company: "Atmosphere Studio",
            duration: "2022-2025",
            desc: "Delivered high-conviction interactive marketing launches.",
          },
        ],
        education: [{ school: "Stanford University", degree: "Product Design", year: "2021" }],
        earningsTotal: 96000,
        availability: true,
        isVerified: true,
        ratingAvg: 4.9,
        completedProjects: 21,
      },
    },
    {
      id: "developer-4",
      email: "fatima@telecode.io",
      name: "Fatima Noor",
      role: "DEVELOPER",
      passwordHash: hashPassword("Telecode123!"),
      devProfile: {
        headline: "Marketplace backend engineer focused on trust, auth, and anti-fraud",
        bio: "Designs secure collaboration systems, session flows, moderation rails, and audit-ready backends.",
        location: "Dubai, UAE",
        skills: ["Node.js", "Prisma", "Auth", "Security"],
        stack: ["Next.js", "Prisma", "PostgreSQL", "Redis"],
        experience: [
          {
            title: "Backend Engineer",
            company: "Trustgrid",
            duration: "2021-Present",
            desc: "Owned high-sensitivity workflow and risk systems.",
          },
        ],
        education: [{ school: "American University of Sharjah", degree: "Software Engineering", year: "2020" }],
        earningsTotal: 68100,
        availability: true,
        isVerified: true,
        ratingAvg: 4.7,
        completedProjects: 13,
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
        headline: "Founder building a premium fitness brand",
        location: "Austin, TX",
        website: "https://ironpulse.example",
        bio: "Growth-minded fitness brand investing in differentiated digital experience.",
        teamSize: 12,
        fundingStage: "Bootstrapped",
        isVerified: true,
        paymentReliability: 98,
      },
    },
    {
      id: "client-2",
      email: "julia@latticepay.com",
      name: "Julia Park",
      role: "CLIENT",
      passwordHash: hashPassword("Telecode123!"),
      clientProfile: {
        companyName: "LatticePay",
        headline: "Payments founder building merchant trust rails",
        location: "Singapore",
        website: "https://latticepay.example",
        bio: "Shipping a trust-first payments platform for cross-border merchant ops.",
        teamSize: 17,
        fundingStage: "Seed",
        isVerified: true,
        paymentReliability: 100,
      },
    },
    {
      id: "client-3",
      email: "maya@campusloop.io",
      name: "Maya Sethi",
      role: "CLIENT",
      passwordHash: hashPassword("Telecode123!"),
      clientProfile: {
        companyName: "CampusLoop",
        headline: "Education startup founder scaling community-led onboarding",
        location: "Delhi, India",
        website: "https://campusloop.example",
        bio: "Needs product-quality onboarding and a marketing site with clear activation loops.",
        teamSize: 8,
        fundingStage: "Pre-Seed",
        isVerified: true,
        paymentReliability: 96,
      },
    },
  ];

  const deals: PlatformDeal[] = [
    {
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
      createdAt: daysFromNow(-12),
      clientId: "client-1",
      developerId: "developer-1",
      hunterId: "hunter-1",
      inviteLink: "telecode-ironpulse-invite",
      clientRequirements:
        "We need a bold premium marketing site, class schedule discovery, CRM capture, and an approvals portal for our internal team.",
      developerAcceptanceMessage:
        "I can own the interaction-heavy frontend and structure the portal so approvals stay clean and traceable.",
      milestones: [
        {
          id: "milestone-1",
          title: "Discovery, brand framing, and requirements brief",
          amount: 3000,
          dueDate: daysFromNow(3),
          deliverables: ["Recorded onboarding summary", "Technical scope", "Milestone plan"],
          status: "APPROVED",
          revisionCount: 0,
          maxRevisions: 2,
        },
        {
          id: "milestone-2",
          title: "Marketing site, CMS, and analytics stack",
          amount: 5500,
          dueDate: daysFromNow(14),
          deliverables: ["Responsive app", "CMS configuration", "Analytics events"],
          status: "SUBMITTED",
          revisionCount: 1,
          maxRevisions: 3,
        },
        {
          id: "milestone-3",
          title: "Client portal and production handoff",
          amount: 4000,
          dueDate: daysFromNow(28),
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
          content: "Developer confirmed scope and the client has funded escrow. Execution is active.",
          createdAt: daysFromNow(-4),
          user: { name: "Marcus Vane", role: "HUNTER" },
        },
        {
          id: "message-2",
          dealId: "deal-1",
          userId: "client-1",
          content: "Please keep the hero cinematic, but make the lead capture flow brutally clear on mobile.",
          createdAt: daysFromNow(-3),
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
      developerMarkedDone: false,
      clientApprovedDone: false,
      hunterApprovedDone: false,
      upiPaymentDetails: {
        upiId: "robert@okicici",
        transactionId: "UPI-TXN-IRONPULSE-001",
        paidAt: daysFromNow(-5),
      },
    },
    {
      id: "deal-2",
      title: "LatticePay merchant dashboard launch",
      description:
        "Build a trust-heavy merchant operations dashboard with payout status, approval controls, and analytics.",
      budget: 18000,
      state: "CREATED",
      developerSplit: 60,
      hunterSplit: 30,
      platformSplit: 10,
      timelineWeeks: 8,
      createdAt: daysFromNow(-2),
      hunterId: "hunter-2",
      milestones: [
        {
          id: "deal-2-m1",
          title: "Requirements workshop and data map",
          amount: 5000,
          dueDate: daysFromNow(6),
          deliverables: ["Payout state map", "Information architecture", "Sprint plan"],
          status: "PENDING",
          revisionCount: 0,
          maxRevisions: 2,
        },
        {
          id: "deal-2-m2",
          title: "Merchant dashboard implementation",
          amount: 13000,
          dueDate: daysFromNow(28),
          deliverables: ["Dashboard app", "Payout reporting", "Responsive QA"],
          status: "PENDING",
          revisionCount: 0,
          maxRevisions: 3,
        },
      ],
      messages: [
        {
          id: "deal-2-message-1",
          dealId: "deal-2",
          userId: "hunter-2",
          content: "Deal created. Reviewing candidates with strong fintech and audit-trail experience.",
          createdAt: daysFromNow(-2),
          user: { name: "Nina Alvarez", role: "HUNTER" },
        },
      ],
      aiSummary: null,
      developerMarkedDone: false,
      clientApprovedDone: false,
      hunterApprovedDone: false,
    },
    {
      id: "deal-3",
      title: "CampusLoop onboarding and community website",
      description:
        "Create a student onboarding site with community sign-up flow, event feed, and activation-focused landing experience.",
      budget: 9000,
      state: "INVITED",
      developerSplit: 60,
      hunterSplit: 30,
      platformSplit: 10,
      timelineWeeks: 5,
      createdAt: daysFromNow(-4),
      developerId: "developer-3",
      hunterId: "hunter-3",
      developerAcceptanceMessage:
        "I’m in. This is a good fit for a motion-led landing page plus a clean onboarding experience.",
      milestones: [
        {
          id: "deal-3-m1",
          title: "Student onboarding flow and narrative map",
          amount: 2500,
          dueDate: daysFromNow(4),
          deliverables: ["Flow map", "Content framing", "Interaction references"],
          status: "PENDING",
          revisionCount: 0,
          maxRevisions: 2,
        },
        {
          id: "deal-3-m2",
          title: "Site build and launch prep",
          amount: 6500,
          dueDate: daysFromNow(21),
          deliverables: ["Production site", "Form handoff", "Launch QA"],
          status: "PENDING",
          revisionCount: 0,
          maxRevisions: 3,
        },
      ],
      messages: [
        {
          id: "deal-3-message-1",
          dealId: "deal-3",
          userId: "developer-3",
          content: "I accepted the proposal. Ready for the client briefing and payment gate.",
          createdAt: daysFromNow(-3),
          user: { name: "Sarah Lin", role: "DEVELOPER" },
        },
      ],
      aiSummary: null,
      developerMarkedDone: false,
      clientApprovedDone: false,
      hunterApprovedDone: false,
    },
  ];

  const invites: PlatformInvite[] = [
    {
      id: "invite-deal-2-dev",
      dealId: "deal-2",
      token: "proposal-deal-2-dev",
      recipientEmail: "arjun@telecode.io",
      recipientRole: "DEVELOPER",
      invitedByUserId: "hunter-2",
      invitedUserId: "developer-2",
      status: "PENDING",
      explanation:
        "You’re my first pick because this client needs a developer who can think about payout trust, not just dashboard polish.",
      createdAt: daysFromNow(-1),
    },
    {
      id: "invite-deal-3-client",
      dealId: "deal-3",
      token: "invite-deal-3-client",
      recipientEmail: "maya@campusloop.io",
      recipientRole: "CLIENT",
      invitedByUserId: "hunter-3",
      invitedUserId: "client-3",
      status: "PENDING",
      createdAt: daysFromNow(-1),
    },
  ];

  deals[0].invites = [];
  deals[1].invites = invites.filter((item) => item.dealId === "deal-2");
  deals[2].invites = invites.filter((item) => item.dealId === "deal-3");

  const posts: PlatformPost[] = [
    {
      id: "post-1",
      content:
        "Shipped a luxury wellness landing experience today. Motion pass is clean, Lighthouse still in the green. Live website: https://northstar.example/wellness",
      likesCount: 18,
      createdAt: daysFromNow(-1),
      author: userById(users, "developer-1"),
    },
    {
      id: "post-2",
      content:
        "Built a payout reconciliation screen that finally made support stop sending screenshots over Slack. Video walkthrough dropping next.",
      likesCount: 22,
      createdAt: daysFromNow(-1),
      author: userById(users, "developer-2"),
    },
    {
      id: "post-3",
      content:
        "Wrapped a WebGL hero for a consumer brand launch. The trick was keeping the drama without tanking mobile performance.",
      likesCount: 27,
      createdAt: daysFromNow(-2),
      author: userById(users, "developer-3"),
    },
    {
      id: "post-4",
      content:
        "If your marketplace has roles but no object-level authorization, it doesn’t have trust. It has vibes. Just finished a permissions hardening sprint.",
      likesCount: 31,
      createdAt: daysFromNow(-2),
      author: userById(users, "developer-4"),
    },
    {
      id: "post-5",
      content:
        "Closed a founder-led SaaS deal this morning. The coder shortlist quality on Telecode is getting seriously strong.",
      likesCount: 13,
      createdAt: daysFromNow(-3),
      author: userById(users, "hunter-1"),
    },
    {
      id: "post-6",
      content:
        "Need one fintech dashboard dev with serious audit-trail instincts. Reviewing profiles and proof-of-work today.",
      likesCount: 15,
      createdAt: daysFromNow(-3),
      author: userById(users, "hunter-2"),
    },
    {
      id: "post-7",
      content:
        "Posted a fresh brief for an education startup that needs onboarding conversion, not just another pretty site. Hunters know the difference.",
      likesCount: 8,
      createdAt: daysFromNow(-4),
      author: userById(users, "hunter-3"),
    },
    {
      id: "post-8",
      content:
        "We funded our first fully structured Telecode milestone today. The shared chat plus approvals flow makes vendor coordination way less messy.",
      likesCount: 19,
      createdAt: daysFromNow(-4),
      author: userById(users, "client-1"),
    },
    {
      id: "post-9",
      content:
        "Founder note: I care less about flashy pitch decks and more about whether the engineer can explain approval risk, payout state, and launch ownership.",
      likesCount: 24,
      createdAt: daysFromNow(-5),
      author: userById(users, "client-2"),
    },
    {
      id: "post-10",
      content:
        "Uploading our current onboarding screenshots for CampusLoop tomorrow. Looking for a developer who thinks about clarity before decoration.",
      likesCount: 11,
      createdAt: daysFromNow(-5),
      author: userById(users, "client-3"),
    },
  ];

  const directMessages: PlatformDirectMessage[] = [
    {
      id: "dm-1",
      toUserId: "developer-2",
      fromUserId: "hunter-2",
      title: "New Work Proposal",
      body: 'Nina proposed "LatticePay merchant dashboard launch" and wants your take on the scope.',
      ctaUrl: "/dashboard",
      relatedInviteId: "invite-deal-2-dev",
      createdAt: daysFromNow(-1),
    },
    {
      id: "dm-2",
      toUserId: "client-3",
      fromUserId: "hunter-3",
      title: "Client invitation",
      body: 'Ibrahim invited you to join "CampusLoop onboarding and community website" on Telecode.',
      ctaUrl: "/invite/invite-deal-3-client",
      relatedInviteId: "invite-deal-3-client",
      createdAt: daysFromNow(-1),
    },
  ];

  return { users, deals, posts, invites, directMessages, passwordResetTokens: [] };
}

const globalStore = globalThis as typeof globalThis & { __telecodeMockStore?: MockStore };

export function getMockStore() {
  if (!globalStore.__telecodeMockStore) {
    globalStore.__telecodeMockStore = buildStore();
  }

  return globalStore.__telecodeMockStore;
}
