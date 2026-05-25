import { create } from "zustand";

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

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarUrl: string;
}

export interface Milestone {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  deliverables: string[];
  status: "PENDING" | "SUBMITTED" | "APPROVED" | "REVISION_REQUESTED";
  revisionCount: number;
  maxRevisions: number;
}

export interface Message {
  id: string;
  dealId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  createdAt: string;
}

export interface Deal {
  id: string;
  title: string;
  description: string;
  budget: number;
  state: DealState;
  developerSplit: number;
  hunterSplit: number;
  platformSplit: number;
  timelineWeeks: number;
  clientId?: string;
  developerId?: string;
  hunterId: string;
  createdAt: string;
  milestones: Milestone[];
  messages: Message[];
  aiSummary?: {
    summary: string;
    deliverables: string[];
    revisionRules: string[];
  };
}

interface PlatformState {
  currentUser: User | null;
  deals: Deal[];
  activeDealId: string | null;
  setCurrentUser: (user: User | null) => void;
  createDeal: (deal: Omit<Deal, "id" | "createdAt" | "messages" | "state">) => void;
  updateDealState: (dealId: string, state: DealState) => void;
  submitMilestone: (dealId: string, milestoneId: string) => void;
  approveMilestone: (dealId: string, milestoneId: string) => void;
  requestRevision: (dealId: string, milestoneId: string) => void;
  addMessage: (dealId: string, message: Omit<Message, "id" | "createdAt" | "dealId">) => void;
  saveAiSummary: (dealId: string, summary: NonNullable<Deal["aiSummary"]>) => void;
}

// Initial mockup seed data for out-of-the-box premium experience
const initialDeals: Deal[] = [
  {
    id: "deal-1",
    title: "Cinematic Gym Web Experience",
    description: "Build an ultra-luxurious, animation-rich website for 'IronPulse Athletics' brand.",
    budget: 4500,
    state: "FUNDED",
    developerSplit: 70,
    hunterSplit: 20,
    platformSplit: 10,
    timelineWeeks: 4,
    hunterId: "hunter-1",
    clientId: "client-1",
    developerId: "dev-1",
    createdAt: new Date().toISOString(),
    milestones: [
      {
        id: "m-1",
        title: "Brand Strategy & Interactive Wireframes",
        amount: 1500,
        dueDate: "2026-06-05",
        deliverables: ["Figma high-fidelity prototype", "Typography system guide"],
        status: "APPROVED",
        revisionCount: 0,
        maxRevisions: 3,
      },
      {
        id: "m-2",
        title: "WebGL Hero Section & Core UI",
        amount: 2000,
        dueDate: "2026-06-15",
        deliverables: ["Next.js code base", "Three.js animation implementation"],
        status: "SUBMITTED",
        revisionCount: 1,
        maxRevisions: 3,
      },
      {
        id: "m-3",
        title: "Production Optimization & Escrow Release",
        amount: 1000,
        dueDate: "2026-06-25",
        deliverables: ["Vercel production build", "SEO tags schema structured data"],
        status: "PENDING",
        revisionCount: 0,
        maxRevisions: 3,
      },
    ],
    messages: [
      {
        id: "msg-1",
        dealId: "deal-1",
        userId: "hunter-1",
        userName: "Marcus Vane (Hunter)",
        userAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
        content: "Deal successfully negotiated and split locked at 70/20/10. Client is thrilled!",
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      },
      {
        id: "msg-2",
        dealId: "deal-1",
        userId: "client-1",
        userName: "Robert K. (Client)",
        userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
        content: "Escrow funds deposited. Milestone 1 approved. Looking forward to the WebGL demo!",
        createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      },
    ],
  },
];

export const useStore = create<PlatformState>((set) => ({
  currentUser: {
    id: "hunter-1",
    email: "marcus.hunter@nexus.io",
    name: "Marcus Vane",
    role: "HUNTER",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
  },
  deals: initialDeals,
  activeDealId: "deal-1",
  setCurrentUser: (user) => set({ currentUser: user }),
  createDeal: (dealData) =>
    set((state) => {
      const newDeal: Deal = {
        ...dealData,
        id: `deal-${Date.now()}`,
        state: "CREATED",
        createdAt: new Date().toISOString(),
        messages: [
          {
            id: `msg-${Date.now()}`,
            dealId: "",
            userId: "system",
            userName: "Nexus OS",
            userAvatar: "",
            content: "Deal Workspace created successfully. Pending client funding invitation.",
            createdAt: new Date().toISOString(),
          },
        ],
      };
      return {
        deals: [...state.deals, newDeal],
        activeDealId: newDeal.id,
      };
    }),
  updateDealState: (dealId, dealState) =>
    set((state) => ({
      deals: state.deals.map((d) => (d.id === dealId ? { ...d, state: dealState } : d)),
    })),
  submitMilestone: (dealId, milestoneId) =>
    set((state) => ({
      deals: state.deals.map((d) => {
        if (d.id !== dealId) return d;
        return {
          ...d,
          milestones: d.milestones.map((m) =>
            m.id === milestoneId ? { ...m, status: "SUBMITTED" } : m
          ),
        };
      }),
    })),
  approveMilestone: (dealId, milestoneId) =>
    set((state) => ({
      deals: state.deals.map((d) => {
        if (d.id !== dealId) return d;
        return {
          ...d,
          milestones: d.milestones.map((m) =>
            m.id === milestoneId ? { ...m, status: "APPROVED" } : m
          ),
        };
      }),
    })),
  requestRevision: (dealId, milestoneId) =>
    set((state) => ({
      deals: state.deals.map((d) => {
        if (d.id !== dealId) return d;
        return {
          ...d,
          milestones: d.milestones.map((m) =>
            m.id === milestoneId
              ? {
                  ...m,
                  status: "REVISION_REQUESTED",
                  revisionCount: m.revisionCount + 1,
                }
              : m
          ),
        };
      }),
    })),
  addMessage: (dealId, msg) =>
    set((state) => ({
      deals: state.deals.map((d) => {
        if (d.id !== dealId) return d;
        const newMsg: Message = {
          ...msg,
          id: `msg-${Date.now()}`,
          dealId,
          createdAt: new Date().toISOString(),
        };
        return {
          ...d,
          messages: [...d.messages, newMsg],
        };
      }),
    })),
  saveAiSummary: (dealId, summary) =>
    set((state) => ({
      deals: state.deals.map((d) => (d.id === dealId ? { ...d, aiSummary: summary } : d)),
    })),
}));
