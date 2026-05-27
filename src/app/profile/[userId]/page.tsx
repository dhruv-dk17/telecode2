"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  Briefcase,
  GraduationCap,
  MapPin,
  Star,
  Award,
  Wallet,
  CheckCircle,
  Link2,
  ExternalLink,
  Heart,
  MessageSquare,
  Sparkles,
  Send,
  Zap,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { AppSurface } from "@/components/ui/AppSurface";
import { TiltCard } from "@/components/ui/TiltCard";
import { getCurrentUserAction } from "@/app/actions/auth";
import { getProfileDetailsAction } from "@/app/actions/profiles";
import { getDealsAction, proposeDealAction } from "@/app/actions/deals";
import { getPostsAction } from "@/app/actions/posts";
import { useStore } from "@/store/useStore";
import type { PlatformProfile, PlatformPost, PlatformDeal } from "@/lib/platform/types";

export default function ProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { setCurrentUser, currentUser } = useStore();
  const [profile, setProfile] = useState<PlatformProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [developerPosts, setDeveloperPosts] = useState<PlatformPost[]>([]);
  const [myDeals, setMyDeals] = useState<PlatformDeal[]>([]);
  
  // Proposal Modal State
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [selectedDealId, setSelectedDealId] = useState("");
  const [proposalMessage, setProposalMessage] = useState("");
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [feedback, setFeedback] = useState({ error: "", success: "" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const session = await getCurrentUserAction();
      if (!session) {
        setCurrentUser(null);
        router.push("/");
        return;
      }
      setCurrentUser(session);

      const [profileData, allPosts, allDeals] = await Promise.all([
        getProfileDetailsAction(userId),
        getPostsAction(),
        getDealsAction(),
      ]);

      if (cancelled) return;

      setProfile(profileData);
      
      // Filter posts written by this developer
      const filteredPosts = allPosts.filter(p => p.author.id === userId);
      setDeveloperPosts(filteredPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      
      // Filter my deals where I am the hunter and deal state is CREATED
      const hunterDeals = allDeals.filter(d => d.hunterId === session.id && d.state === "CREATED");
      setMyDeals(hunterDeals);

      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [userId, router, setCurrentUser]);

  async function handleSendProposal(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDealId || !proposalMessage.trim()) return;

    setSubmittingProposal(true);
    setFeedback({ error: "", success: "" });

    const response = await proposeDealAction(userId, selectedDealId, proposalMessage);
    setSubmittingProposal(false);

    if (response.success) {
      setFeedback({ error: "", success: "Proposal sent successfully! Coder will be notified immediately." });
      setProposalMessage("");
      setTimeout(() => {
        setShowProposalModal(false);
        setFeedback({ error: "", success: "" });
      }, 2000);
    } else {
      setFeedback({ error: response.error || "Failed to send proposal.", success: "" });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="noise-overlay" />
        <div className="app-grid flex min-h-screen items-center justify-center">
          <div className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-slate-300">
            Loading operating profile...
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen">
        <div className="noise-overlay" />
        <div className="app-grid min-h-screen">
          <Navbar />
          <div className="relative z-[1] flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
            <div className="text-3xl font-semibold text-white">Profile not found</div>
            <Link href="/dashboard" className="action-button action-button--primary">
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isDev = profile.role === "DEVELOPER";

  return (
    <div className="min-h-screen">
      <div className="noise-overlay" />
      <div className="app-grid min-h-screen">
        <Navbar />
        <main className="relative z-[1] mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
          
          <div className="mb-6">
            <Link href="/dashboard" className="ghost-button">
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Link>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
            
            {/* Left Column: Profile Core, Experience, Education, and Posts */}
            <div className="space-y-6">
              
              {/* Profile Card Header */}
              <AppSurface accent="cyan" className="rounded-[2rem] p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-cyan-400/30 bg-cyan-400/10 text-cyan-300 text-3xl font-black shadow-lg">
                      {profile.name?.charAt(0) || "D"}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-3xl font-bold tracking-tight text-white">{profile.name}</h1>
                        <span className="text-[0.65rem] uppercase tracking-widest font-black bg-cyan-400/10 border border-cyan-400/20 text-cyan-300 px-2.5 py-1 rounded-full">
                          {profile.role}
                        </span>
                        {isDev && profile.devProfile?.isVerified && (
                          <span className="text-[0.6rem] uppercase tracking-widest font-bold bg-amber-400/10 border border-amber-400/25 text-amber-300 px-2 py-0.5 rounded">
                            Verified
                          </span>
                        )}
                      </div>
                      <p className="text-slate-300 text-sm mt-1 max-w-xl leading-7">
                        {profile.devProfile?.headline || profile.clientProfile?.headline || "Telecode Elite Member"}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-3">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          <span>{profile.devProfile?.location || profile.clientProfile?.location || "Remote"}</span>
                        </div>
                        {isDev && (
                          <div className="flex items-center gap-1.5">
                            <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                            <span className="text-white font-semibold">{profile.devProfile?.ratingAvg} rating</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Hire Button for Hunters */}
                  {currentUser?.role === "HUNTER" && isDev && (
                    <button
                      onClick={() => setShowProposalModal(true)}
                      className="action-button action-button--primary shrink-0 self-stretch sm:self-auto text-sm"
                    >
                      <Zap className="h-4 w-4" />
                      Propose Deal
                    </button>
                  )}
                </div>

                <div className="mt-8 border-t border-white/10 pt-6">
                  <div className="text-xs uppercase tracking-[0.24em] text-slate-400 mb-3">Operating Bio</div>
                  <p className="text-sm leading-8 text-slate-200 whitespace-pre-line">
                    {profile.devProfile?.bio || profile.clientProfile?.bio || "No biography details shared yet."}
                  </p>
                </div>
              </AppSurface>

              {/* Developer Specific Sections (Experience, Education) */}
              {isDev && (
                <>
                  {/* Experience Timeline */}
                  {profile.devProfile?.experience && (
                    <AppSurface accent="violet" className="rounded-[2rem] p-6 sm:p-7">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-violet-400/10 rounded-lg text-violet-300 border border-violet-400/20">
                          <Briefcase className="h-5 w-5" />
                        </div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Professional Handoff Path</h2>
                      </div>
                      
                      <div className="space-y-6 relative border-l border-white/5 pl-4 ml-3.5">
                        {(profile.devProfile.experience as any[]).map((exp, idx) => (
                          <div key={idx} className="relative">
                            <div className="absolute -left-[25px] top-1 h-3 w-3 rounded-full border-2 border-violet-400 bg-[#07111f]" />
                            <div className="text-xs text-violet-300 tracking-wider font-semibold">{exp.duration}</div>
                            <h3 className="text-base font-bold text-white mt-1">{exp.title}</h3>
                            <div className="text-sm text-slate-400">{exp.company}</div>
                            {exp.desc && <p className="text-xs leading-6 text-slate-300 mt-2">{exp.desc}</p>}
                          </div>
                        ))}
                      </div>
                    </AppSurface>
                  )}

                  {/* Skills and Stack Badges */}
                  <div className="grid gap-6 md:grid-cols-2">
                    <AppSurface accent="cyan" className="rounded-[2rem] p-6">
                      <div className="text-xs uppercase tracking-[0.24em] text-cyan-200 mb-4">Core Craft Skills</div>
                      <div className="flex flex-wrap gap-2">
                        {profile.devProfile?.skills?.map(skill => (
                          <span key={skill} className="rounded-full border border-cyan-400/20 bg-cyan-400/5 text-cyan-300 px-3 py-1.5 text-xs">
                            {skill}
                          </span>
                        )) || <span className="text-xs text-slate-400">No skills set</span>}
                      </div>
                    </AppSurface>

                    <AppSurface accent="amber" className="rounded-[2rem] p-6">
                      <div className="text-xs uppercase tracking-[0.24em] text-amber-200 mb-4">Database & Tech Stack</div>
                      <div className="flex flex-wrap gap-2">
                        {profile.devProfile?.stack?.map(tech => (
                          <span key={tech} className="rounded-full border border-amber-400/20 bg-amber-400/5 text-amber-300 px-3 py-1.5 text-xs">
                            {tech}
                          </span>
                        )) || <span className="text-xs text-slate-400">No stack set</span>}
                      </div>
                    </AppSurface>
                  </div>

                  {/* Education Timeline */}
                  {profile.devProfile?.education && (
                    <AppSurface accent="cyan" className="rounded-[2rem] p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <GraduationCap className="h-5 w-5 text-cyan-300" />
                        <h2 className="text-lg font-bold text-white">Academic Ledger</h2>
                      </div>
                      <div className="space-y-4">
                        {(profile.devProfile.education as any[]).map((edu, idx) => (
                          <div key={idx} className="border-b border-white/5 pb-3 last:border-b-0 last:pb-0">
                            <div className="flex justify-between items-start gap-4">
                              <div>
                                <div className="text-sm font-semibold text-white">{edu.school}</div>
                                <div className="text-xs text-slate-400 mt-1">{edu.degree}</div>
                              </div>
                              <span className="text-xs text-slate-500">{edu.year}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </AppSurface>
                  )}
                </>
              )}

              {/* Developer's Broadcast Posts */}
              <div className="space-y-5">
                <h2 className="text-xl font-bold tracking-tight text-white pl-1 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-300" />
                  <span>Broadcast History ({developerPosts.length})</span>
                </h2>

                {developerPosts.length > 0 ? (
                  developerPosts.map((post, index) => {
                    const hasLink = post.content.includes("🔗 Live Website:");
                    const cleanContent = hasLink ? post.content.split("🔗 Live Website:")[0] : post.content;
                    const linkPath = hasLink ? post.content.split("🔗 Live Website:")[1]?.trim() : "";

                    return (
                      <TiltCard key={post.id} className="rounded-[2rem]">
                        <AppSurface accent={index % 2 === 0 ? "amber" : "cyan"} className="rounded-[2rem] p-6">
                          <div className="flex justify-between items-center text-xs text-slate-500 mb-3">
                            <span>Proof of Delivery Update</span>
                            <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                          </div>
                          
                          <p className="text-sm leading-8 text-slate-200 whitespace-pre-line">{cleanContent}</p>

                          {hasLink && linkPath && (
                            <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-cyan-400/10 text-cyan-300 border border-cyan-400/20">
                                  <Link2 className="h-4 w-4" />
                                </div>
                                <div>
                                  <div className="text-xs text-slate-400 uppercase tracking-widest">Live Showcase Preview</div>
                                  <a href={linkPath} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-white flex items-center gap-1.5 hover:underline mt-0.5">
                                    {linkPath.replace(/^https?:\/\//i, "")}
                                    <ExternalLink className="h-3 w-3 text-slate-400" />
                                  </a>
                                </div>
                              </div>
                            </div>
                          )}

                          {post.imageUrl && (
                            <div className="mt-4 rounded-2xl overflow-hidden border border-white/5 bg-black/10">
                              <img src={post.imageUrl} alt="Proof image" className="w-full max-h-80 object-cover" />
                            </div>
                          )}

                          <div className="mt-4 flex gap-4 text-xs text-slate-400 border-t border-white/5 pt-3">
                            <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5 text-rose-400" /> {post.likesCount} likes</span>
                            <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5 text-cyan-400" /> Interactive broadcast</span>
                          </div>
                        </AppSurface>
                      </TiltCard>
                    );
                  })
                ) : (
                  <AppSurface accent="amber" className="rounded-[2rem] p-6 text-center">
                    <p className="text-slate-400 text-sm">No networking post broadcasted yet by this coder.</p>
                  </AppSurface>
                )}
              </div>
            </div>

            {/* Right Column: Key Stats & Summary Cards */}
            <div className="space-y-6">
              {isDev && (
                <AppSurface accent="amber" className="rounded-[2rem] p-5">
                  <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-amber-300" />
                      <span className="text-xs uppercase tracking-[0.24em] font-bold text-white">Trust Signals</span>
                    </div>
                  </div>

                  <div className="space-y-4 text-sm text-slate-300">
                    <div className="flex justify-between items-center">
                      <span>Total Earnings</span>
                      <div className="flex items-center gap-1 text-white font-semibold">
                        <Wallet className="h-4 w-4 text-amber-300" />
                        <span>${profile.devProfile?.earningsTotal?.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Completed Projects</span>
                      <span className="text-white font-semibold">{profile.devProfile?.completedProjects || 0} projects</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Coder Split locked</span>
                      <span className="text-cyan-300 font-semibold">60% Developer</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Availability</span>
                      <span className={`text-xs px-2 py-0.5 rounded font-bold ${profile.devProfile?.availability ? 'bg-cyan-400/10 text-cyan-300' : 'bg-rose-400/10 text-rose-300'}`}>
                        {profile.devProfile?.availability ? 'Available for work' : 'Busy'}
                      </span>
                    </div>
                  </div>
                </AppSurface>
              )}

              <AppSurface accent="violet" className="rounded-[2rem] p-5">
                <div className="flex items-center gap-2 text-violet-300 font-semibold mb-3">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-widest">Platform Escrow OS</span>
                </div>
                <p className="text-xs leading-6 text-slate-400">
                  Payments are locked in escrow upon Client onboarding and released systematically based on dual sign-offs. 60% Developer split and 30% Hunter split are fully active.
                </p>
              </AppSurface>
            </div>
          </div>

          {/* Proposal Modal */}
          {showProposalModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-lg rounded-[2.5rem] overflow-hidden upi-gate p-6 sm:p-8"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-amber-300" />
                    <h3 className="text-lg font-bold text-white">Propose Deal to {profile.name}</h3>
                  </div>
                  <button onClick={() => setShowProposalModal(false)} className="text-slate-400 hover:text-white font-bold text-sm">Close</button>
                </div>

                <form onSubmit={handleSendProposal} className="mt-5 space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-[0.24em] text-slate-400 mb-2">Select Pipeline Deal</label>
                    <select
                      value={selectedDealId}
                      onChange={(e) => setSelectedDealId(e.target.value)}
                      className="glass-input bg-black/30 py-3 pr-8 w-full border-white/10"
                      required
                    >
                      <option value="" disabled className="bg-slate-900 text-slate-400">-- Choose a Deal --</option>
                      {myDeals.map((d) => (
                        <option key={d.id} value={d.id} className="bg-slate-900 text-white">
                          {d.title} (${d.budget.toLocaleString()})
                        </option>
                      ))}
                    </select>
                    {myDeals.length === 0 && (
                      <p className="text-[0.7rem] text-rose-300 mt-1.5 leading-5">
                        * No active deal found in CREATED state. Please create a deal in your dashboard first before proposing it.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-[0.24em] text-slate-400 mb-2">Proposal Message / Offer Note</label>
                    <textarea
                      value={proposalMessage}
                      onChange={(e) => setProposalMessage(e.target.value)}
                      placeholder="Explain the scope and why they should work on this milestone..."
                      className="glass-input bg-black/30 min-h-24 resize-none border-white/10"
                      required
                    />
                  </div>

                  {feedback.error && (
                    <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">
                      {feedback.error}
                    </div>
                  )}

                  {feedback.success && (
                    <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-200">
                      {feedback.success}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submittingProposal || !selectedDealId}
                    className="action-button action-button--primary w-full disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {submittingProposal ? "Sending Proposal..." : "Send Proposal"}
                  </button>
                </form>
              </motion.div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
