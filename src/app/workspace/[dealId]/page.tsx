"use client";

import { use, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useStore, Deal, Milestone, Message } from "@/store/useStore";
import { Navbar } from "@/components/Navbar";
import {
  MessageSquare,
  DollarSign,
  FileText,
  Activity,
  Bot,
  Video,
  Upload,
  Send,
  Check,
  RefreshCw,
  Plus,
  AlertTriangle,
  ArrowLeft,
  Settings,
} from "lucide-react";

export default function Workspace({ params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = use(params);
  const {
    currentUser,
    deals,
    updateDealState,
    submitMilestone,
    approveMilestone,
    requestRevision,
    addMessage,
    saveAiSummary,
  } = useStore();

  const deal = deals.find((d) => d.id === dealId);
  const [activeTab, setActiveTab] = useState<"chat" | "milestones" | "files" | "ai">("chat");

  // Chat state
  const [messageText, setMessageText] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // File upload state
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: string; date: string }[]>([
    { name: "Brand-Architecture-IronPulse.pdf", size: "2.4 MB", date: "2026-05-24" },
    { name: "Hero-Threejs-Proof.mov", size: "18.5 MB", date: "2026-05-25" },
  ]);
  const [newFileName, setNewFileName] = useState("");

  // AI requirements generation state
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [deal?.messages, activeTab]);

  if (!deal) {
    return (
      <div className="flex min-h-screen bg-[#030303] text-foreground items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-white mb-4">Workspace Not Found</h1>
          <Link href="/dashboard" className="text-primary hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !currentUser) return;

    addMessage(deal.id, {
      userId: currentUser.id,
      userName: `${currentUser.name} (${currentUser.role})`,
      userAvatar: currentUser.avatarUrl || "",
      content: messageText,
    });

    setMessageText("");
  };

  const handleUploadFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;

    setUploadedFiles([
      ...uploadedFiles,
      {
        name: newFileName,
        size: `${(Math.random() * 10 + 1).toFixed(1)} MB`,
        date: new Date().toISOString().split("T")[0],
      },
    ]);
    setNewFileName("");

    addMessage(deal.id, {
      userId: "system",
      userName: "Nexus OS",
      userAvatar: "",
      content: `System: File '${newFileName}' uploaded by ${currentUser?.name}.`,
    });
  };

  const handleAiGeneration = () => {
    setIsGeneratingAi(true);
    setTimeout(() => {
      saveAiSummary(deal.id, {
        summary: "IronPulse Athletics seeks an ultra-premium WebGL interactive system containing custom HSL-tailored colors, smooth Framer Motion transitions, and fully automated Stripe escrow splits.",
        deliverables: [
          "Interactive WebGL canvas landing page hero section",
          "Express API endpoint handling high-frequency webhook syncs",
          "Automated ledger split calculations with immutable revenue safeguards",
        ],
        revisionRules: [
          "Maximum of 3 major asset design modifications are authorized",
          "Any layout alteration must retain exact 70/20/10 split metrics",
        ],
      });
      setIsGeneratingAi(false);

      addMessage(deal.id, {
        userId: "system",
        userName: "Nexus AI Analyst",
        userAvatar: "",
        content: "AI Partnership Brief generated. Exact scope, milestones, and deliverables lock-in achieved.",
      });
    }, 2000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#030303] text-foreground">
      <Navbar />

      {/* Sub-Header / Workspace Title */}
      <div className="border-b border-border bg-[#09090b]/40 backdrop-blur-md px-6 py-4">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Link
              href="/dashboard"
              className="rounded-full bg-zinc-900 border border-border p-2 text-muted-foreground hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-display text-xl font-bold text-white">{deal.title}</h1>
                <span className="rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2.5 py-0.5 text-[10px] font-bold uppercase">
                  {deal.state}
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-light mt-1">
                Workspace deal ID: {deal.id} • Split: {deal.developerSplit}/{deal.hunterSplit}/10
              </p>
            </div>
          </div>

          {/* Quick status changes (Escrow transitions) */}
          <div className="flex items-center space-x-2">
            {deal.state === "PENDING_PAYMENT" && currentUser?.role === "CLIENT" && (
              <button
                onClick={() => updateDealState(deal.id, "FUNDED")}
                className="rounded-full bg-emerald-500 text-white font-semibold text-xs px-4 py-2 hover:bg-emerald-600 shadow-md shadow-emerald-500/20"
              >
                Deposit Escrow Funds
              </button>
            )}

            {deal.state === "FUNDED" && (
              <button
                onClick={() => updateDealState(deal.id, "IN_PROGRESS")}
                className="rounded-full bg-primary text-white font-semibold text-xs px-4 py-2 hover:bg-blue-600"
              >
                Unlock Work Scope
              </button>
            )}

            <div className="rounded-full bg-zinc-900 border border-border p-2 text-muted-foreground">
              <Settings className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace Workspace Layout */}
      <main className="mx-auto max-w-7xl w-full px-6 py-8 flex-1 grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1 space-y-3">
          <button
            onClick={() => setActiveTab("chat")}
            className={`w-full flex items-center space-x-3 rounded-2xl p-4 text-sm font-semibold transition-all ${
              activeTab === "chat"
                ? "bg-primary text-white"
                : "glass-panel text-muted-foreground hover:text-white"
            }`}
          >
            <MessageSquare className="h-5 w-5" />
            <span>Slack-grade Chat</span>
          </button>

          <button
            onClick={() => setActiveTab("milestones")}
            className={`w-full flex items-center space-x-3 rounded-2xl p-4 text-sm font-semibold transition-all ${
              activeTab === "milestones"
                ? "bg-primary text-white"
                : "glass-panel text-muted-foreground hover:text-white"
            }`}
          >
            <DollarSign className="h-5 w-5" />
            <span>Milestones & Escrow</span>
          </button>

          <button
            onClick={() => setActiveTab("files")}
            className={`w-full flex items-center space-x-3 rounded-2xl p-4 text-sm font-semibold transition-all ${
              activeTab === "files"
                ? "bg-primary text-white"
                : "glass-panel text-muted-foreground hover:text-white"
            }`}
          >
            <FileText className="h-5 w-5" />
            <span>Secure Files</span>
          </button>

          <button
            onClick={() => setActiveTab("ai")}
            className={`w-full flex items-center space-x-3 rounded-2xl p-4 text-sm font-semibold transition-all ${
              activeTab === "ai"
                ? "bg-primary text-white"
                : "glass-panel text-muted-foreground hover:text-white"
            }`}
          >
            <Bot className="h-5 w-5" />
            <span>AI OS Brief</span>
          </button>

          {/* Quick Active State Warning */}
          {deal.state === "PENDING_PAYMENT" && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-400">
              <div className="flex items-center space-x-2 font-bold mb-1">
                <AlertTriangle className="h-4 w-4" />
                <span>Escrow Funds Required</span>
              </div>
              Onboarding and chat are operational, but developer workspace code commits remain locked until initial client payment is completed.
            </div>
          )}
        </div>

        {/* Tab Content Display Area */}
        <div className="lg:col-span-3 min-h-[500px] flex flex-col glass-panel rounded-3xl p-6 overflow-hidden">
          {/* TAB 1: Real-time Group Chat */}
          {activeTab === "chat" && (
            <div className="flex-1 flex flex-col h-full">
              <div className="flex-1 overflow-y-auto space-y-4 max-h-[380px] mb-4 pr-2">
                {deal.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start space-x-3 ${
                      msg.userId === currentUser?.id ? "flex-row-reverse space-x-reverse" : ""
                    }`}
                  >
                    {msg.userAvatar ? (
                      <img
                        src={msg.userAvatar}
                        alt={msg.userName}
                        className="h-9 w-9 rounded-full object-cover border border-border"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-white border border-border">
                        OS
                      </div>
                    )}
                    <div
                      className={`rounded-2xl p-4 text-sm ${
                        msg.userId === currentUser?.id
                          ? "bg-primary text-white rounded-tr-none"
                          : "bg-black/60 border border-border text-zinc-300 rounded-tl-none"
                      }`}
                    >
                      <span className="block text-[10px] text-zinc-400 font-bold mb-1">
                        {msg.userName}
                      </span>
                      {msg.content}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} className="flex gap-2 border-t border-border pt-4">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Collaborate in real time..."
                  className="flex-1 rounded-full border border-border bg-black px-5 py-3 text-sm focus:outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  className="rounded-full bg-primary p-3 text-white hover:bg-blue-600 transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: Milestones & Escrow */}
          {activeTab === "milestones" && (
            <div className="space-y-6">
              <h2 className="font-display text-lg font-bold text-white">Escrow Payment Checkpoints</h2>
              <div className="space-y-4">
                {deal.milestones.map((m) => (
                  <div key={m.id} className="bg-black/40 border border-border rounded-2xl p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-white">{m.title}</h3>
                        <span className="text-xs text-muted-foreground block mt-1">
                          Due Date: {new Date(m.dueDate).toLocaleDateString()}
                        </span>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {m.deliverables.map((del, idx) => (
                            <span
                              key={idx}
                              className="rounded bg-zinc-900 border border-border text-[10px] text-zinc-400 px-2 py-0.5"
                            >
                              {del}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-lg font-extrabold text-white block">
                          ${m.amount.toLocaleString()}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-primary block mt-1">
                          {m.status}
                        </span>
                      </div>
                    </div>

                    {/* Milestone Actions based on User Roles */}
                    <div className="flex justify-end space-x-2 border-t border-border/60 mt-4 pt-3">
                      {m.status === "PENDING" && currentUser?.role === "DEVELOPER" && (
                        <button
                          onClick={() => submitMilestone(deal.id, m.id)}
                          className="rounded-full bg-primary text-white text-xs px-3.5 py-1.5 hover:bg-blue-600 font-semibold"
                        >
                          Submit Milestone Assets
                        </button>
                      )}

                      {m.status === "SUBMITTED" && currentUser?.role === "CLIENT" && (
                        <>
                          <button
                            onClick={() => requestRevision(deal.id, m.id)}
                            className="rounded-full bg-zinc-950 border border-border text-xs px-3.5 py-1.5 hover:bg-zinc-900 font-semibold text-zinc-300"
                          >
                            Request Scope Revision
                          </button>
                          <button
                            onClick={() => approveMilestone(deal.id, m.id)}
                            className="rounded-full bg-emerald-500 text-white text-xs px-3.5 py-1.5 hover:bg-emerald-600 font-semibold"
                          >
                            Approve & Release Funds
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Secure Files */}
          {activeTab === "files" && (
            <div className="space-y-6">
              <h2 className="font-display text-lg font-bold text-white">S3-compatible File Storage</h2>

              {/* Upload form */}
              <form onSubmit={handleUploadFile} className="flex gap-2">
                <input
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="e.g. Design-Brief-V2.fig"
                  className="flex-1 rounded-full border border-border bg-black px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  className="rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 flex items-center space-x-1.5"
                >
                  <Upload className="h-4 w-4" />
                  <span>Upload File</span>
                </button>
              </form>

              {/* Files table */}
              <div className="border border-border rounded-2xl overflow-hidden bg-black/20">
                <div className="grid grid-cols-3 gap-4 border-b border-border bg-zinc-950 p-4 text-xs font-semibold uppercase text-muted-foreground">
                  <div>Name</div>
                  <div>Size</div>
                  <div className="text-right">Date</div>
                </div>
                <div className="divide-y divide-border">
                  {uploadedFiles.map((file, idx) => (
                    <div key={idx} className="grid grid-cols-3 gap-4 p-4 text-sm text-zinc-300">
                      <div className="truncate font-medium">{file.name}</div>
                      <div>{file.size}</div>
                      <div className="text-right text-muted-foreground">{file.date}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AI OS Brief */}
          {activeTab === "ai" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <h2 className="font-display text-lg font-bold text-white flex items-center space-x-2">
                  <Bot className="h-5 w-5 text-primary" />
                  <span>Nexus AI Partnership Alignment</span>
                </h2>

                {!deal.aiSummary && (
                  <button
                    onClick={handleAiGeneration}
                    disabled={isGeneratingAi}
                    className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-blue-600 disabled:opacity-50"
                  >
                    {isGeneratingAi ? "Processing Call Transcription..." : "Extract Meeting Summary"}
                  </button>
                )}
              </div>

              {deal.aiSummary ? (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
                    <h3 className="font-semibold text-white mb-2">Scope Summary</h3>
                    <p className="text-zinc-300 text-sm font-light leading-relaxed">
                      {deal.aiSummary.summary}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-black/40 border border-border rounded-2xl p-5">
                      <h4 className="font-semibold text-white mb-3">Extracted Deliverables</h4>
                      <ul className="space-y-2 text-xs text-zinc-400">
                        {deal.aiSummary.deliverables.map((d, i) => (
                          <li key={i} className="flex items-center space-x-2">
                            <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-black/40 border border-border rounded-2xl p-5">
                      <h4 className="font-semibold text-white mb-3">Safety Revision Guardrails</h4>
                      <ul className="space-y-2 text-xs text-zinc-400">
                        {deal.aiSummary.revisionRules.map((r, i) => (
                          <li key={i} className="flex items-center space-x-2">
                            <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground font-light">
                  Click 'Extract Meeting Summary' to trigger AI transcription alignment of requirements.
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
