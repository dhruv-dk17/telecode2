"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore, Deal, DealState } from "@/store/useStore";
import { Navbar } from "@/components/Navbar";
import {
  Briefcase,
  Zap,
  TrendingUp,
  Clock,
  Plus,
  ShieldAlert,
  ArrowUpRight,
  UserCheck,
  CheckCircle2,
} from "lucide-react";

export default function Dashboard() {
  const { currentUser, deals, createDeal, updateDealState } = useStore();
  const [isCreatingDeal, setIsCreatingDeal] = useState(false);

  // Deal creation form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState(3000);
  const [timelineWeeks, setTimelineWeeks] = useState(4);
  const [devSplit, setDevSplit] = useState(70);
  const [hunterSplit, setHunterSplit] = useState(20);

  const handleCreateDealSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    createDeal({
      title,
      description,
      budget: Number(budget),
      timelineWeeks: Number(timelineWeeks),
      developerSplit: Number(devSplit),
      hunterSplit: Number(hunterSplit),
      platformSplit: 100 - Number(devSplit) - Number(hunterSplit),
      hunterId: currentUser?.id || "hunter-1",
      milestones: [
        {
          id: `m-${Date.now()}-1`,
          title: "Initial Requirements Alignment",
          amount: budget * 0.3,
          dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split("T")[0],
          deliverables: ["Project definition documentation", "Milestone checkpoints approval"],
          status: "PENDING",
          revisionCount: 0,
          maxRevisions: 3,
        },
        {
          id: `m-${Date.now()}-2`,
          title: "Production Deployment",
          amount: budget * 0.7,
          dueDate: new Date(Date.now() + 21 * 24 * 3600 * 1000).toISOString().split("T")[0],
          deliverables: ["Fully operational digital platform", "Vercel live instance link"],
          status: "PENDING",
          revisionCount: 0,
          maxRevisions: 3,
        },
      ],
    });

    setIsCreatingDeal(false);
    setTitle("");
    setDescription("");
  };

  const getStatusColor = (state: DealState) => {
    switch (state) {
      case "FUNDED":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      case "PENDING_PAYMENT":
        return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      case "IN_PROGRESS":
        return "text-blue-400 bg-blue-500/10 border-blue-500/20";
      default:
        return "text-zinc-400 bg-zinc-500/10 border-zinc-500/20";
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#030303] text-foreground">
      <Navbar />

      <main className="mx-auto max-w-7xl w-full px-6 py-10 flex-1">
        {/* User Identity Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 border-b border-border pb-8">
          <div className="flex items-center space-x-4">
            {currentUser?.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="h-16 w-16 rounded-full object-cover border-2 border-primary"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-zinc-800 flex items-center justify-center border-2 border-primary">
                <Briefcase className="h-8 w-8 text-primary" />
              </div>
            )}
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-display text-2xl font-bold text-white md:text-3xl">
                  Welcome back, {currentUser?.name || "Partner"}
                </h1>
                <span className="rounded-full bg-primary/10 border border-primary/20 text-primary px-3 py-0.5 text-xs font-semibold uppercase">
                  {currentUser?.role || "HUNTER"}
                </span>
              </div>
              <p className="text-muted-foreground text-sm font-light mt-1">
                Active workspace session monitor • {currentUser?.email}
              </p>
            </div>
          </div>

          {/* Action button for Hunter */}
          {currentUser?.role === "HUNTER" && (
            <button
              onClick={() => setIsCreatingDeal(!isCreatingDeal)}
              className="flex items-center space-x-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-blue-600"
            >
              <Plus className="h-4 w-4" />
              <span>Create Partnership Deal</span>
            </button>
          )}
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Deals Workspace */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="font-display text-xl font-bold text-white flex items-center space-x-2">
              <Clock className="h-5 w-5 text-primary" />
              <span>Active Partnership Workspaces</span>
            </h2>

            {/* If Creating Deal Form is open */}
            {isCreatingDeal && (
              <div className="glass-panel rounded-3xl p-6 glow-blue animate-in fade-in slide-in-from-top-4 duration-300">
                <h3 className="font-display text-lg font-bold text-white mb-4">
                  New Partnership Escrow Agreement
                </h3>
                <form onSubmit={handleCreateDealSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                      Deal Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Premium Dentistry Web App"
                      className="w-full rounded-lg border border-border bg-black px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                      Deal Outline / Brief
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Detailed deliverables requirements..."
                      className="w-full rounded-lg border border-border bg-black px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary min-h-[100px]"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                        Budget ($)
                      </label>
                      <input
                        type="number"
                        value={budget}
                        onChange={(e) => setBudget(Number(e.target.value))}
                        className="w-full rounded-lg border border-border bg-black px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                        Timeline (Weeks)
                      </label>
                      <input
                        type="number"
                        value={timelineWeeks}
                        onChange={(e) => setTimelineWeeks(Number(e.target.value))}
                        className="w-full rounded-lg border border-border bg-black px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-2">
                      Immutable Revenue Split Distributions
                    </label>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-black/40 rounded-xl p-3 border border-border">
                        <span className="block text-[10px] text-muted-foreground font-semibold">
                          Developer %
                        </span>
                        <input
                          type="number"
                          value={devSplit}
                          onChange={(e) => setDevSplit(Number(e.target.value))}
                          className="w-full text-center font-bold text-white bg-transparent focus:outline-none text-lg mt-1"
                        />
                      </div>
                      <div className="bg-black/40 rounded-xl p-3 border border-border">
                        <span className="block text-[10px] text-muted-foreground font-semibold">
                          Lead Hunter %
                        </span>
                        <input
                          type="number"
                          value={hunterSplit}
                          onChange={(e) => setHunterSplit(Number(e.target.value))}
                          className="w-full text-center font-bold text-white bg-transparent focus:outline-none text-lg mt-1"
                        />
                      </div>
                      <div className="bg-black/40 rounded-xl p-3 border border-border">
                        <span className="block text-[10px] text-muted-foreground font-semibold">
                          Platform split %
                        </span>
                        <div className="font-bold text-primary text-lg mt-1.5">
                          {100 - devSplit - hunterSplit}%
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCreatingDeal(false)}
                      className="rounded-full bg-zinc-900 border border-border px-5 py-2 text-sm font-semibold hover:bg-zinc-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-blue-600"
                    >
                      Establish Deal
                    </button>
                  </div>
                </form>
              </div>
            )}

            {deals.length === 0 ? (
              <div className="glass-panel rounded-3xl p-12 text-center text-muted-foreground font-light">
                No active digital partnerships found. Initialize one above.
              </div>
            ) : (
              <div className="space-y-4">
                {deals.map((deal) => (
                  <div
                    key={deal.id}
                    className="glass-panel glass-panel-hover rounded-3xl p-6 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <div className="flex items-center space-x-3 flex-wrap gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(
                              deal.state
                            )}`}
                          >
                            {deal.state}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Created {new Date(deal.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="font-display text-lg font-bold text-white mt-2">
                          {deal.title}
                        </h3>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-extrabold text-white block">
                          ${deal.budget.toLocaleString()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Escrow Target
                        </span>
                      </div>
                    </div>

                    <p className="text-muted-foreground text-sm font-light mb-6 line-clamp-2">
                      {deal.description}
                    </p>

                    <div className="flex flex-wrap items-center justify-between border-t border-border/60 pt-4 gap-4">
                      {/* Splits showcase */}
                      <div className="flex items-center space-x-6 text-xs text-muted-foreground font-medium">
                        <div>
                          Dev split: <span className="text-white font-semibold">{deal.developerSplit}%</span>
                        </div>
                        <div>
                          Hunter split: <span className="text-white font-semibold">{deal.hunterSplit}%</span>
                        </div>
                        <div>
                          Platform split: <span className="text-white font-semibold">{deal.platformSplit}%</span>
                        </div>
                      </div>

                      <Link
                        href={`/workspace/${deal.id}`}
                        className="inline-flex items-center space-x-1.5 rounded-full bg-zinc-900 border border-border hover:border-primary/50 text-xs font-bold text-white px-4 py-2 transition-all"
                      >
                        <span>Open OS Workspace</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Earnings Summary & Platform Actions */}
          <div className="space-y-8">
            <h2 className="font-display text-xl font-bold text-white flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span>Fintech Escrow Analytics</span>
            </h2>

            {/* Escrow Card summary */}
            <div className="glass-panel rounded-3xl p-6 glow-blue">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">
                Total Revenue Generated
              </span>
              <div className="text-4xl font-extrabold text-white mt-2">$85,250</div>
              <p className="text-emerald-400 text-xs mt-2 flex items-center font-semibold">
                <span>+12.4% this quarter</span>
              </p>

              <div className="border-t border-border mt-6 pt-4 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">
                    Escrow Holding
                  </span>
                  <span className="text-lg font-bold text-white mt-1 block">
                    $12,500
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">
                    Completed Splits
                  </span>
                  <span className="text-lg font-bold text-white mt-1 block">
                    $72,750
                  </span>
                </div>
              </div>
            </div>

            {/* Direct access switches to test other flows */}
            <div className="glass-panel rounded-3xl p-6 space-y-4">
              <h3 className="font-display text-sm font-bold text-white flex items-center space-x-2">
                <UserCheck className="h-4 w-4 text-primary" />
                <span>Simulation Quick Switcher</span>
              </h3>
              <p className="text-xs text-muted-foreground font-light leading-relaxed">
                Click a user category to simulate dynamic capabilities (e.g. only Clients can approve milestones, only Hunters create deals, Admins arbitrate disputes).
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() =>
                    useStore.getState().setCurrentUser({
                      id: "hunter-1",
                      email: "marcus.hunter@nexus.io",
                      name: "Marcus Vane",
                      role: "HUNTER",
                      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
                    })
                  }
                  className="rounded-lg bg-black p-2 border border-border text-left hover:border-primary/50 text-white font-medium"
                >
                  Hunter Mode
                </button>
                <button
                  onClick={() =>
                    useStore.getState().setCurrentUser({
                      id: "dev-1",
                      email: "elena.dev@nexus.io",
                      name: "Elena Rostova",
                      role: "DEVELOPER",
                      avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80",
                    })
                  }
                  className="rounded-lg bg-black p-2 border border-border text-left hover:border-primary/50 text-white font-medium"
                >
                  Developer Mode
                </button>
                <button
                  onClick={() =>
                    useStore.getState().setCurrentUser({
                      id: "client-1",
                      email: "robert.client@nexus.io",
                      name: "Robert K.",
                      role: "CLIENT",
                      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
                    })
                  }
                  className="rounded-lg bg-black p-2 border border-border text-left hover:border-primary/50 text-white font-medium"
                >
                  Client Mode
                </button>
                <button
                  onClick={() =>
                    useStore.getState().setCurrentUser({
                      id: "admin-1",
                      email: "admin@nexus.io",
                      name: "System Admin",
                      role: "ADMIN",
                      avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80",
                    })
                  }
                  className="rounded-lg bg-black p-2 border border-border text-left hover:border-primary/50 text-white font-medium"
                >
                  Admin Mode
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
