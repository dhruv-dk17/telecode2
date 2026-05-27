"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  Bot,
  Check,
  CircleDollarSign,
  Layers3,
  Send,
  ShieldCheck,
  QrCode,
  Sparkles,
  Smartphone,
  CheckCircle,
  Clock,
  User,
  Users,
  Award,
  Wallet,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { AppSurface } from "@/components/ui/AppSurface";
import { TiltCard } from "@/components/ui/TiltCard";
import { getCurrentUserAction } from "@/app/actions/auth";
import {
  getDealsAction,
  submitUpiPaymentAction,
  markFinalDoneAction,
  signOffAction,
} from "@/app/actions/deals";
import { getMessagesAction, sendMessageAction } from "@/app/actions/chat";
import { createInviteAction } from "@/app/actions/invitations";
import { useStore } from "@/store/useStore";
import type { DealState, PlatformDeal, PlatformMessage } from "@/lib/platform/types";

export default function WorkspacePage({ params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = use(params);
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { setCurrentUser, currentUser } = useStore();
  
  // State
  const [deal, setDeal] = useState<PlatformDeal | null>(null);
  const [messages, setMessages] = useState<PlatformMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<"chat" | "brief" | "payments">("chat");
  const endRef = useRef<HTMLDivElement | null>(null);
  
  // Client Onboarding & UPI payment forms
  const [clientRequirements, setClientRequirements] = useState("");
  const [clientUpiId, setClientUpiId] = useState("");
  const [payingEscrow, setPayingEscrow] = useState(false);
  const [paymentFeedback, setPaymentFeedback] = useState("");

  // Hunter invite form
  const [clientEmail, setClientEmail] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState("");
  const [inviteLink, setInviteLink] = useState("");

  // Final delivery sign-off response state
  const [submittingSignOff, setSubmittingSignOff] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const session = await getCurrentUserAction();
      if (!session) {
        setCurrentUser(null);
        router.push("/");
        return;
      }

      const [deals, nextMessages] = await Promise.all([getDealsAction(), getMessagesAction(dealId)]);
      const match = deals.find((item) => item.id === dealId) || null;

      if (cancelled) return;

      setCurrentUser(session);
      setDeal(match);
      setMessages(nextMessages);
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [dealId, router, setCurrentUser]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  }, [messages, reduceMotion, tab]);

  async function refresh() {
    const [deals, nextMessages] = await Promise.all([getDealsAction(), getMessagesAction(dealId)]);
    setDeal(deals.find((item) => item.id === dealId) || null);
    setMessages(nextMessages);
  }

  async function handleSendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim()) return;

    const response = await sendMessageAction(dealId, message);
    if (response.success) {
      setMessage("");
      await refresh();
    }
  }

  async function handleInviteClient(e: React.FormEvent) {
    e.preventDefault();
    if (!clientEmail.trim() || !currentUser || !deal) return;

    setSendingInvite(true);
    setInviteFeedback("");
    setInviteLink("");

    try {
      const response = await createInviteAction({
        dealId,
        recipientEmail: clientEmail,
        recipientRole: "CLIENT",
      });
      if (response.success) {
        setInviteFeedback("Client invited successfully. They must accept the invite before funding escrow.");
        setInviteLink("acceptUrl" in response ? response.acceptUrl : "");
        setClientEmail("");
        await refresh();
      } else {
        setInviteFeedback(response.error || "Failed to invite client.");
      }
    } catch {
      setInviteFeedback("Failed to invite client.");
    } finally {
      setSendingInvite(false);
    }
  }

  // Client UPI escow payment
  async function handleUpiPaymentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientRequirements.trim() || !clientUpiId.trim() || !deal) return;

    setPayingEscrow(true);
    setPaymentFeedback("");

    const response = await submitUpiPaymentAction(dealId, clientRequirements, clientUpiId);
    setPayingEscrow(false);

    if (response.success) {
      setPaymentFeedback("UPI Escrow deposit funded successfully! Workspace is active.");
      await refresh();
    } else {
      setPaymentFeedback(response.error || "Failed to complete payment.");
    }
  }

  // Developer submits final project work
  async function handleMarkDone() {
    if (!deal) return;
    const response = await markFinalDoneAction(dealId);
    if (response.success) {
      await refresh();
    }
  }

  // Client or Hunter sign-off delivery
  async function handleSignOff() {
    if (!deal) return;
    setSubmittingSignOff(true);
    const response = await signOffAction(dealId);
    setSubmittingSignOff(false);
    if (response.success) {
      await refresh();
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="noise-overlay" />
        <div className="app-grid flex min-h-screen items-center justify-center">
          <div className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-slate-300">
            Loading workspace...
          </div>
        </div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="min-h-screen">
        <div className="noise-overlay" />
        <div className="app-grid min-h-screen">
          <Navbar />
          <div className="relative z-[1] flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
            <div className="text-3xl font-semibold text-white">Workspace not found</div>
            <Link href="/dashboard" className="action-button action-button--primary">
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Map role styling helper for group chat bubbles
  const chatBubbleRoleClass = (role?: string) => {
    if (role === "HUNTER") return "chat-bubble-hunter border-amber-300/30 bg-amber-400/5";
    if (role === "DEVELOPER") return "chat-bubble-developer border-cyan-400/30 bg-cyan-400/5";
    if (role === "CLIENT") return "chat-bubble-client border-violet-400/30 bg-violet-400/5";
    return "border-white/10 bg-black/20";
  };

  const formattedDevSplit = deal.budget * (deal.developerSplit / 100);
  const formattedHunterSplit = deal.budget * (deal.hunterSplit / 100);
  const formattedPlatformSplit = deal.budget * (deal.platformSplit / 100);

  return (
    <div className="min-h-screen">
      <div className="noise-overlay" />
      <div className="app-grid min-h-screen">
        <Navbar />
        <main className="relative z-[1] mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6">
          
          {/* Top Panel: Deal Meta and Split Ledger */}
          <section className="grid gap-6 lg:grid-cols-[1.12fr_0.88fr]">
            <AppSurface accent="amber" className="rounded-[2rem] p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-3">
                <Link href="/dashboard" className="ghost-button">
                  <ArrowLeft className="h-4 w-4" />
                  Dashboard
                </Link>
                <div className={`status-pill status-${deal.state.toLowerCase()}`}>{deal.state}</div>
              </div>

              <h1 className="mt-5 max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {deal.title}
              </h1>
              <p className="mt-3 max-w-2xl text-xs leading-6 text-slate-300">{deal.description}</p>

              {/* Visually Divided Ledger Splits Bar (60/30/10 Split Visualizer) */}
              <div className="mt-6">
                <div className="flex justify-between text-[0.65rem] uppercase tracking-widest text-slate-400 mb-2 font-bold">
                  <span>Visual Escrow Split Bar</span>
                  <span>{deal.developerSplit}/{deal.hunterSplit}/{deal.platformSplit} distribution</span>
                </div>
                <div className="ledger-split-bar">
                  <div className="ledger-split-dev" style={{ width: `${deal.developerSplit}%` }} title={`Developer: ${deal.developerSplit}%`} />
                  <div className="ledger-split-hunter" style={{ width: `${deal.hunterSplit}%` }} title={`Hunter: ${deal.hunterSplit}%`} />
                  <div className="ledger-split-platform" style={{ width: `${deal.platformSplit}%` }} title={`Platform: ${deal.platformSplit}%`} />
                </div>
                <div className="flex justify-between text-[0.62rem] text-slate-400 mt-2 font-semibold">
                  <span className="text-cyan-300">Coder Split (${formattedDevSplit.toLocaleString()})</span>
                  <span className="text-amber-300">Hunter Split (${formattedHunterSplit.toLocaleString()})</span>
                  <span className="text-violet-300">Platform Split (${formattedPlatformSplit.toLocaleString()})</span>
                </div>
              </div>
            </AppSurface>

            {/* Escrow Activity Summary Card */}
            <div className="grid gap-4">
              <AppSurface accent="violet" className="rounded-[1.7rem] p-5">
                <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.24em] text-violet-200">Ledger balance</div>
                    <div className="mt-1 text-2xl font-black text-white">${deal.budget.toLocaleString()}</div>
                  </div>
                  <CircleDollarSign className="h-7 w-7 text-violet-200" />
                </div>

                <div className="mt-4 space-y-2 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span>Active Escrow Hold</span>
                    <span className="text-white font-bold">
                      {deal.state === "CREATED" || deal.state === "INVITED" || deal.state === "PENDING_PAYMENT" ? "$0" : `$${deal.budget.toLocaleString()}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Simulated Gateway</span>
                    <span className="text-cyan-300 font-bold">UPI Checkout Active</span>
                  </div>
                  {deal.upiPaymentDetails?.upiId && (
                    <div className="flex justify-between border-t border-white/5 pt-2 mt-2">
                      <span>Paid From UPI</span>
                      <span className="text-white font-mono">{deal.upiPaymentDetails.upiId}</span>
                    </div>
                  )}
                </div>
              </AppSurface>

              <AppSurface accent="cyan" className="rounded-[1.7rem] p-5">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-cyan-200" />
                  <div className="font-semibold text-white">Trust escrow safeguards</div>
                </div>
                <p className="text-xs leading-6 text-slate-400 mt-2">
                   escrow split payouts are governed by dual Client + Hunter completion checks. Coder receives exactly 60% upon dual sign-offs.
                </p>
              </AppSurface>
            </div>
          </section>

          {/* Matches & Onboarding Workspace Lanes */}
          <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px] items-start">
            
            {/* Left lane: Matchmaking and Workspace steps */}
            <div className="space-y-6">
              
              {/* CREATED state: Waiting for Coder Acceptance */}
              {deal.state === "CREATED" && (
                <AppSurface accent="amber" className="rounded-[2rem] p-6 text-center">
                  <Clock className="h-8 w-8 text-amber-300 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-white">Pending Coder Proposal Response</h3>
                  <p className="text-xs text-slate-300 mt-2 max-w-lg mx-auto leading-6">
                    A work proposal has been sent to the developer. Elena Rostova is currently reviewing the deal splits and description. You will be notified instantly when she accepts or rejects.
                  </p>
                </AppSurface>
              )}

              {/* INVITED state: Hunter must Invite the Client */}
              {deal.state === "INVITED" && (
                <AppSurface accent="cyan" className="rounded-[2rem] p-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-cyan-300" />
                    <span>Developer accepted the proposal</span>
                  </h3>
                  {deal.developerAcceptanceMessage && (
                    <div className="mt-3 rounded-xl bg-cyan-400/5 border border-cyan-400/10 p-4 text-xs italic text-cyan-100">
                      &ldquo;{deal.developerAcceptanceMessage}&rdquo;
                    </div>
                  )}

                  {currentUser?.role === "HUNTER" ? (
                    <div className="mt-6 border-t border-white/10 pt-5">
                      <div className="text-xs uppercase tracking-[0.24em] text-slate-400 mb-3">Onboard Client to Workspace</div>
                      <form onSubmit={handleInviteClient} className="flex gap-2">
                        <input
                          type="email"
                          value={clientEmail}
                          onChange={(e) => setClientEmail(e.target.value)}
                          placeholder="client@company.com"
                          className="glass-input text-xs"
                          required
                        />
                        <button type="submit" disabled={sendingInvite} className="action-button action-button--primary py-2 px-5 text-xs shrink-0 font-semibold">
                          {sendingInvite ? "Inviting..." : "Onboard Client"}
                        </button>
                      </form>
                      {inviteFeedback && (
                        <div className="mt-2 space-y-2">
                          <p className="text-[0.7rem] text-cyan-300">{inviteFeedback}</p>
                          {inviteLink ? (
                            <Link href={inviteLink} className="text-[0.7rem] text-amber-300 underline underline-offset-4">
                              Open invite preview
                            </Link>
                          ) : null}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 mt-5 leading-6 border-t border-white/5 pt-4">
                      * Hunter Marcus Vane has been notified to send the onboarding invitation to client Robert Kim.
                    </p>
                  )}
                </AppSurface>
              )}

              {/* PENDING_PAYMENT state: Client inputs requirements & pays via UPI */}
              {deal.state === "PENDING_PAYMENT" && (
                <AppSurface accent="violet" className="rounded-[2rem] p-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Bot className="h-5 w-5 text-violet-300" />
                    <span>Client Onboarding and UPI Funding Gate</span>
                  </h3>

                  {currentUser?.role === "CLIENT" ? (
                    <form onSubmit={handleUpiPaymentSubmit} className="mt-5 space-y-4">
                      <div>
                        <label className="block text-xs uppercase tracking-[0.24em] text-slate-400 mb-2">Project Brief / Website Requirements</label>
                        <textarea
                          value={clientRequirements}
                          onChange={(e) => setClientRequirements(e.target.value)}
                          placeholder="Detail the type of website, pages, styling and motion expectations..."
                          className="glass-input bg-black/20 text-xs min-h-20"
                          required
                        />
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 items-center border-t border-white/10 pt-5">
                        
                        {/* Simulated UPI QR Code visual */}
                        <div className="upi-gate rounded-2xl p-4 text-center border border-white/5 relative overflow-hidden">
                          <div className="upi-scanner-line" />
                          <QrCode className="h-28 w-28 text-white mx-auto my-2" />
                          <div className="text-[0.62rem] uppercase tracking-wider text-slate-400">Scan QR via GPay / PhonePe / Paytm</div>
                        </div>

                        {/* UPI ID input */}
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs uppercase tracking-[0.24em] text-slate-400 mb-2">Enter UPI ID</label>
                            <input
                              type="text"
                              value={clientUpiId}
                              onChange={(e) => setClientUpiId(e.target.value)}
                              placeholder="robert@okaxis"
                              className="glass-input py-2.5 text-xs bg-black/20"
                              required
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={payingEscrow || !clientRequirements.trim() || !clientUpiId.trim()}
                            className="action-button action-button--primary w-full py-2.5 text-xs font-semibold"
                          >
                            {payingEscrow ? "Verifying Deposit..." : "Authorize Escrow Deposit via UPI"}
                          </button>
                        </div>
                      </div>

                      {paymentFeedback && (
                        <p className="text-[0.7rem] text-cyan-300 mt-2">{paymentFeedback}</p>
                      )}
                    </form>
                  ) : (
                    <div className="mt-5 text-center py-6 border border-dashed border-white/10 rounded-2xl">
                      <Smartphone className="h-8 w-8 text-slate-500 mx-auto mb-2" />
                      <p className="text-xs text-slate-400 max-w-sm mx-auto leading-6">
                        Waiting for Client (Robert Kim) to join the workspace, outline their website requirements, and fund the escrow via UPI.
                      </p>
                    </div>
                  )}
                </AppSurface>
              )}

              {/* FUNDED / IN_PROGRESS / MILESTONE_REVIEW state: Delivery lanes */}
              {["FUNDED", "ONBOARDING", "IN_PROGRESS", "MILESTONE_REVIEW", "PARTIALLY_RELEASED"].includes(deal.state) && (
                <AppSurface accent="cyan" className="rounded-[2rem] p-6">
                  
                  {/* Scope outline visual */}
                  <div className="mb-6 border-b border-white/5 pb-4">
                    <div className="text-[0.65rem] uppercase tracking-[0.24em] text-slate-400 font-bold mb-2">Active Project Brief</div>
                    <p className="text-xs text-slate-200 leading-6 italic">&ldquo;{deal.clientRequirements || "Custom corporate website with high end transitions"}&rdquo;</p>
                  </div>

                  {/* Delivery Actions based on deal.state and user role */}
                  {deal.state !== "MILESTONE_REVIEW" ? (
                    currentUser?.role === "DEVELOPER" ? (
                      <div className="text-center py-4">
                        <p className="text-xs text-slate-300 mb-4">Milestone is funded. Work is currently active. Once deliverables are complete, click below to submit for Hunter + Client sign-offs.</p>
                        <button
                          onClick={handleMarkDone}
                          className="action-button action-button--primary text-xs font-semibold py-2.5 px-6 rounded-full"
                        >
                          Submit Final Delivery Work
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-xs text-slate-400 leading-6">
                        <Clock className="h-5 w-5 text-cyan-300 shrink-0" />
                        <span>Developer is currently building. You will be notified when deliverables are marked done.</span>
                      </div>
                    )
                  ) : (
                    
                    /* MILESTONE_REVIEW: Dual Sign-off dashboard */
                    <div className="space-y-4">
                      <div className="text-xs uppercase tracking-widest text-cyan-300 font-bold">Review and Release Ledger Sign-offs</div>
                      
                      <div className="grid sm:grid-cols-2 gap-3 mt-3">
                        
                        {/* Client sign-off box */}
                        <div className={`rounded-xl border p-4 text-xs ${
                          deal.clientApprovedDone ? 'border-cyan-400/20 bg-cyan-400/5 text-cyan-300' : 'border-white/5 bg-black/10 text-slate-400'
                        }`}>
                          <div className="flex justify-between items-center">
                            <span className="font-bold">Client Sign-off</span>
                            <span className={`text-[0.6rem] uppercase tracking-wider px-2 py-0.5 rounded ${
                              deal.clientApprovedDone ? 'bg-cyan-400/10 text-cyan-300' : 'bg-slate-400/10 text-slate-400'
                            }`}>
                              {deal.clientApprovedDone ? 'Approved' : 'Pending'}
                            </span>
                          </div>
                          {deal.clientApprovedDone ? (
                            <p className="mt-2 text-[0.7rem] text-cyan-200">Robert Kim confirmed work completion.</p>
                          ) : (
                            <p className="mt-2 text-[0.7rem]">Awaiting client sign-off.</p>
                          )}
                        </div>

                        {/* Hunter sign-off box */}
                        <div className={`rounded-xl border p-4 text-xs ${
                          deal.hunterApprovedDone ? 'border-cyan-400/20 bg-cyan-400/5 text-cyan-300' : 'border-white/5 bg-black/10 text-slate-400'
                        }`}>
                          <div className="flex justify-between items-center">
                            <span className="font-bold">Hunter Sign-off</span>
                            <span className={`text-[0.6rem] uppercase tracking-wider px-2 py-0.5 rounded ${
                              deal.hunterApprovedDone ? 'bg-cyan-400/10 text-cyan-300' : 'bg-slate-400/10 text-slate-400'
                            }`}>
                              {deal.hunterApprovedDone ? 'Approved' : 'Pending'}
                            </span>
                          </div>
                          {deal.hunterApprovedDone ? (
                            <p className="mt-2 text-[0.7rem] text-cyan-200">Marcus Vane confirmed work completion.</p>
                          ) : (
                            <p className="mt-2 text-[0.7rem]">Awaiting hunter sign-off.</p>
                          )}
                        </div>
                      </div>

                      {/* Approval CTA */}
                      {((currentUser?.role === "CLIENT" && !deal.clientApprovedDone) ||
                        (currentUser?.role === "HUNTER" && !deal.hunterApprovedDone)) && (
                        <div className="mt-6 border-t border-white/5 pt-4 text-center">
                          <p className="text-xs text-slate-300 mb-3">Please verify the files and click below to sign off on final release payouts.</p>
                          <button
                            onClick={handleSignOff}
                            disabled={submittingSignOff}
                            className="action-button action-button--primary text-xs font-semibold py-2.5 px-6 rounded-full"
                          >
                            {submittingSignOff ? "Signing Off..." : "Sign Off & Release Escrow"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </AppSurface>
              )}

              {/* COMPLETED state: Payout Release logs and stats */}
              {deal.state === "COMPLETED" && (
                <AppSurface accent="cyan" className="rounded-[2rem] p-6 text-center">
                  <CheckCircle className="h-10 w-10 text-cyan-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white tracking-tight">Escrow Ledger Distributed & Closed</h3>
                  
                  <div className="mt-5 rounded-2xl bg-cyan-400/5 border border-cyan-400/10 p-5 text-xs text-slate-300 max-w-lg mx-auto text-left space-y-3">
                    <div className="flex justify-between font-semibold border-b border-cyan-400/10 pb-2 mb-2 text-cyan-300">
                      <span>UPI Escrow released</span>
                      <span>Total: ${deal.budget.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Coder Elena Rostova (60%)</span>
                      <span className="text-white font-bold">${formattedDevSplit.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Hunter Marcus Vane (30%)</span>
                      <span className="text-white font-bold">${formattedHunterSplit.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Telecode Fee (10%)</span>
                      <span className="text-white font-bold">${formattedPlatformSplit.toLocaleString()}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 mt-5 leading-6">
                    Dual Client (Robert Kim) and Hunter (Marcus Vane) ticks successfully completed. Platform fee locked. Thank you for using Telecode!
                  </p>
                </AppSurface>
              )}

            </div>

            {/* Right Panel Tabs: Group Chat / Project Brief / Split visualizer */}
            <div className="space-y-4 shrink-0 w-full md:w-[360px]">
              
              {/* Tab options selector */}
              <div className="grid grid-cols-3 gap-1 bg-black/25 border border-white/10 rounded-full p-1 text-center">
                <button
                  onClick={() => setTab("chat")}
                  className={`py-2 text-[0.68rem] font-bold rounded-full transition ${tab === "chat" ? "bg-white/10 text-white" : "text-slate-400"}`}
                >
                  Group Chat
                </button>
                <button
                  onClick={() => setTab("brief")}
                  className={`py-2 text-[0.68rem] font-bold rounded-full transition ${tab === "brief" ? "bg-white/10 text-white" : "text-slate-400"}`}
                >
                  Workspace
                </button>
                <button
                  onClick={() => setTab("payments")}
                  className={`py-2 text-[0.68rem] font-bold rounded-full transition ${tab === "payments" ? "bg-white/10 text-white" : "text-slate-400"}`}
                >
                  Splits
                </button>
              </div>

              {/* Tab 1: 3-Party Group Chat */}
              {tab === "chat" && (
                <AppSurface accent="violet" className="rounded-[2rem] p-5 flex flex-col h-[520px] justify-between">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                    <Users className="h-4 w-4 text-violet-300" />
                    <span className="text-xs uppercase tracking-widest font-bold text-white">Group Workspace Chat</span>
                  </div>

                  {/* Messages box list */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 my-3 scrollbar">
                    {messages.length > 0 ? (
                      messages.map((entry, idx) => (
                        <div
                          key={entry.id}
                          className={`rounded-2xl border p-3 text-xs leading-6 ${chatBubbleRoleClass(entry.user?.role)}`}
                        >
                          <div className="flex items-center justify-between text-[0.62rem] text-slate-400 font-bold mb-1">
                            <span>{entry.user?.name || "System"}</span>
                            <span className="opacity-80 font-normal">{new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-slate-200 whitespace-pre-wrap">{entry.content}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 text-center mt-20">No messages in project group chat yet.</p>
                    )}
                    <div ref={endRef} />
                  </div>

                  {/* Message submit form */}
                  <form onSubmit={handleSendMessage} className="flex gap-1.5 border-t border-white/5 pt-3">
                    <input
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      placeholder="Send workspace update..."
                      className="glass-input py-2 text-xs bg-black/20"
                    />
                    <button type="submit" className="action-button action-button--primary px-3 py-2 shrink-0">
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </AppSurface>
              )}

              {/* Tab 2: Project Brief / Requirements summary */}
              {tab === "brief" && (
                <AppSurface accent="cyan" className="rounded-[2rem] p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                    <Bot className="h-4 w-4 text-cyan-300" />
                    <span className="text-xs uppercase tracking-widest font-bold text-white">Onboarding Brief</span>
                  </div>

                  <div className="space-y-4 text-xs text-slate-300">
                    <div className="bg-black/20 rounded-xl p-3.5 border border-white/5">
                      <div className="font-bold text-white uppercase tracking-wider text-[0.65rem] mb-1.5 flex items-center gap-1">
                        <CheckCircle className="h-3.5 w-3.5 text-cyan-300" />
                        <span>Client Requirements</span>
                      </div>
                      <p className="leading-6 italic">
                        {deal.clientRequirements ? `“${deal.clientRequirements}”` : "Awaiting detailed client submission."}
                      </p>
                    </div>

                    {deal.developerAcceptanceMessage && (
                      <div className="bg-black/20 rounded-xl p-3.5 border border-white/5">
                        <div className="font-bold text-white uppercase tracking-wider text-[0.65rem] mb-1.5 flex items-center gap-1">
                          <CheckCircle className="h-3.5 w-3.5 text-cyan-300" />
                          <span>Coder Offer Accept Message</span>
                        </div>
                        <p className="leading-6 italic">&ldquo;{deal.developerAcceptanceMessage}&rdquo;</p>
                      </div>
                    )}

                    <div className="bg-black/20 rounded-xl p-3.5 border border-white/5">
                      <div className="font-bold text-white uppercase tracking-wider text-[0.65rem] mb-1.5">Escrow Milestones</div>
                      <div className="space-y-2 mt-2">
                        {deal.milestones.map((m, idx) => (
                          <div key={m.id} className="flex justify-between items-center text-[0.7rem] border-b border-white/5 pb-1.5 last:border-b-0 last:pb-0">
                            <span className="text-slate-300 truncate max-w-44">{m.title}</span>
                            <span className="font-bold text-white shrink-0">${m.amount.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </AppSurface>
              )}

              {/* Tab 3: Escrow split details */}
              {tab === "payments" && (
                <AppSurface accent="amber" className="rounded-[2rem] p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                    <Wallet className="h-4 w-4 text-amber-300" />
                    <span className="text-xs uppercase tracking-widest font-bold text-white">Escrow Distribution</span>
                  </div>

                  <div className="space-y-3.5 text-xs text-slate-300">
                    <div className="bg-black/20 rounded-xl p-4 border border-white/5 space-y-2.5">
                      <div className="flex justify-between items-center text-[0.7rem]">
                        <span>Escrow Hold State</span>
                        <span className={`text-[0.62rem] uppercase tracking-wider font-bold ${
                          deal.state === "COMPLETED" ? "text-cyan-300" : "text-amber-300"
                        }`}>{deal.state === "COMPLETED" ? "Released" : "Holding"}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>escrow deposits</span>
                        <span className="text-white font-bold">${deal.budget.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="bg-black/20 rounded-xl p-4 border border-white/5 space-y-3">
                      <div className="font-semibold text-white uppercase tracking-wider text-[0.65rem] border-b border-white/5 pb-2">
                        Distribution Ledger (60/30/10)
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-cyan-300 font-bold">Developer Split (60%)</span>
                        <span className="text-white font-bold">${formattedDevSplit.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-amber-300 font-bold">Hunter Split (30%)</span>
                        <span className="text-white font-bold">${formattedHunterSplit.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-violet-300 font-bold">Platform Split (10%)</span>
                        <span className="text-white font-bold">${formattedPlatformSplit.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </AppSurface>
              )}

            </div>
          </section>

        </main>
      </div>
    </div>
  );
}
