"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BriefcaseBusiness,
  Clock3,
  Plus,
  Radar,
  Shield,
  TrendingUp,
  UserRoundCog,
  WalletCards,
  User,
  Star,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Zap,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { AppSurface } from "@/components/ui/AppSurface";
import { TiltCard } from "@/components/ui/TiltCard";
import { getCurrentUserAction } from "@/app/actions/auth";
import {
  createDealAction,
  getDealsAction,
  getDevelopersAction,
  respondProposalAction,
} from "@/app/actions/deals";
import {
  getProfileDetailsAction,
  updateClientProfileAction,
  updateProfileDetailsAction,
} from "@/app/actions/profiles";
import { useStore } from "@/store/useStore";
import type { PlatformDeal, PlatformProfile } from "@/lib/platform/types";

type TabKey = "deals" | "developers" | "proposals" | "profile";

export default function DashboardPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { currentUser, setCurrentUser } = useStore();
  const [deals, setDeals] = useState<PlatformDeal[]>([]);
  const [developers, setDevelopers] = useState<PlatformProfile[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("deals");
  const [loading, setLoading] = useState(true);
  const [creatingDeal, setCreatingDeal] = useState(false);
  const [error, setError] = useState("");
  
  // Proposal Response Dialog State
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseDealId, setResponseDealId] = useState("");
  const [responseAccept, setResponseAccept] = useState(true);
  const [responseExplanation, setResponseExplanation] = useState("");
  const [submittingResponse, setSubmittingResponse] = useState(false);

  const [dealForm, setDealForm] = useState({
    title: "",
    description: "",
    budget: 8000,
    timelineWeeks: 6,
    developerSplit: 60, // Default 60/30/10 as requested
    hunterSplit: 30,
  });
  const [profileForm, setProfileForm] = useState({
    headline: "",
    bio: "",
    location: "",
    website: "",
    teamSize: 5,
    fundingStage: "Bootstrapped",
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const session = await getCurrentUserAction();
      if (!session) {
        setCurrentUser(null);
        router.push("/");
        return;
      }

      const [dealData, profileData, devList] = await Promise.all([
        getDealsAction(),
        getProfileDetailsAction(),
        getDevelopersAction(),
      ]);

      if (cancelled) {
        return;
      }

      setCurrentUser(session);
      setDeals(dealData);
      setDevelopers(devList);
      
      setProfileForm({
        headline: profileData?.devProfile?.headline || profileData?.clientProfile?.headline || "",
        bio: profileData?.devProfile?.bio || profileData?.clientProfile?.bio || "",
        location: profileData?.devProfile?.location || profileData?.clientProfile?.location || "",
        website: profileData?.clientProfile?.website || "",
        teamSize: profileData?.clientProfile?.teamSize || 5,
        fundingStage: profileData?.clientProfile?.fundingStage || "Bootstrapped",
      });
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [router, setCurrentUser]);

  async function refreshData() {
    const [dealData, devList] = await Promise.all([getDealsAction(), getDevelopersAction()]);
    setDeals(dealData);
    setDevelopers(devList);
  }

  async function handleCreateDeal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const response = await createDealAction(dealForm);
    if (!response.success) {
      setError(response.error || "Unable to create deal.");
      return;
    }

    setDealForm({
      title: "",
      description: "",
      budget: 8000,
      timelineWeeks: 6,
      developerSplit: 60,
      hunterSplit: 30,
    });
    setCreatingDeal(false);
    await refreshData();
  }

  async function handleSaveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const response =
      currentUser?.role === "CLIENT"
        ? await updateClientProfileAction(profileForm)
        : await updateProfileDetailsAction(profileForm);

    if (!response.success) {
      setError(response.error || "Unable to update profile.");
      return;
    }

    setActiveTab("deals");
  }

  async function handleConfirmProposalResponse(e: React.FormEvent) {
    e.preventDefault();
    if (!responseDealId || !responseExplanation.trim()) return;

    setSubmittingResponse(true);
    const response = await respondProposalAction(responseDealId, responseAccept, responseExplanation);
    setSubmittingResponse(false);

    if (response.success) {
      setShowResponseModal(false);
      setResponseExplanation("");
      await refreshData();
    } else {
      setError(response.error || "Failed to submit proposal response.");
    }
  }

  const metrics = useMemo(() => {
    const totalVolume = deals.reduce((sum, deal) => sum + deal.budget, 0);
    const activeDeals = deals.filter(
      (deal) => !["COMPLETED", "CANCELLED", "REFUNDED"].includes(deal.state),
    ).length;
    const approvalRate = deals.length
      ? Math.round(
          (deals.flatMap((deal) => deal.milestones).filter((item) => item.status === "APPROVED").length /
            Math.max(deals.flatMap((deal) => deal.milestones).length, 1)) *
            100,
        )
      : 0;

    return [
      { label: "Active deals", value: String(activeDeals), icon: Radar, accent: "amber" as const },
      { label: "Total volume", value: `$${totalVolume.toLocaleString()}`, icon: TrendingUp, accent: "violet" as const },
      { label: "Approval rate", value: `${approvalRate}%`, icon: Shield, accent: "cyan" as const },
    ];
  }, [deals]);

  // Filters incoming proposals where current user is the invited developer and invite status is PENDING
  const pendingProposals = useMemo(() => {
    if (currentUser?.role !== "DEVELOPER") return [];
    return deals.filter(deal => {
      const pendingDeveloperInvite = deal.invites?.find(
        inv => inv.invitedUserId === currentUser.id && inv.status === "PENDING"
      );
      return !!pendingDeveloperInvite;
    });
  }, [deals, currentUser]);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen">
      <div className="noise-overlay" />
      <div className="app-grid min-h-screen">
        <Navbar />
        <main className="relative z-[1] mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6">
          
          {/* Header */}
          <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <AppSurface accent="violet" className="rounded-[2rem] p-7 sm:p-8">
              <div className="text-xs uppercase tracking-[0.28em] text-violet-200">Deal command</div>
              <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
                {currentUser?.name}, welcome to your marketplace pipeline dashboard.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                Operating a trust-centered marketplace. Sourcing elite coders, locking verified escrow funding, and ensuring clean sign-off payouts with stronger audit visibility.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="action-button action-button--primary text-sm"
                  onClick={() => setActiveTab("deals")}
                >
                  <WalletCards className="h-4 w-4" />
                  Escrow Workspace
                </button>

                {currentUser?.role === "HUNTER" && (
                  <button
                    type="button"
                    className="action-button action-button--secondary text-sm"
                    onClick={() => setActiveTab("developers")}
                  >
                    <User className="h-4 w-4 text-cyan-300" />
                    Browse Developers
                  </button>
                )}

                {currentUser?.role === "DEVELOPER" && pendingProposals.length > 0 && (
                  <button
                    type="button"
                    className="action-button action-button--secondary text-sm border-cyan-400 bg-cyan-400/10 text-cyan-300"
                    onClick={() => setActiveTab("proposals")}
                  >
                    <Zap className="h-4 w-4" />
                    Work Proposals ({pendingProposals.length})
                  </button>
                )}

                {(currentUser?.role === "CLIENT" || currentUser?.role === "DEVELOPER") && (
                  <button
                    type="button"
                    className="action-button action-button--secondary text-sm"
                    onClick={() => setActiveTab("profile")}
                  >
                    <UserRoundCog className="h-4 w-4" />
                    Profile settings
                  </button>
                )}
                
                <Link href="/feed" className="ghost-button text-sm">
                  Network feed
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </AppSurface>

            <div className="grid gap-4">
              {metrics.map((metric, index) => (
                <motion.div
                  key={metric.label}
                  initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <TiltCard className="rounded-[1.65rem]">
                    <AppSurface accent={metric.accent} className="rounded-[1.65rem] px-5 py-5">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">{metric.label}</div>
                          <div className="metric-value mt-3 text-3xl text-white">{metric.value}</div>
                        </div>
                        <metric.icon className="h-6 w-6 text-white/80" />
                      </div>
                    </AppSurface>
                  </TiltCard>
                </motion.div>
              ))}
            </div>
          </section>

          {error ? (
            <div className="mt-6 rounded-[1.4rem] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          {/* Main workspace section */}
          <section className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_0.6fr]">
            <div className="space-y-5">
              
              {/* Tab Selector */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2 rounded-full border border-white/10 bg-black/20 p-1">
                  <button
                    type="button"
                    className="tab-button min-w-32"
                    data-active={activeTab === "deals"}
                    onClick={() => setActiveTab("deals")}
                  >
                    Escrow Workspace
                  </button>

                  {currentUser?.role === "HUNTER" && (
                    <button
                      type="button"
                      className="tab-button min-w-32"
                      data-active={activeTab === "developers"}
                      onClick={() => setActiveTab("developers")}
                    >
                      Browse Developers
                    </button>
                  )}

                  {currentUser?.role === "DEVELOPER" && (
                    <button
                      type="button"
                      className="tab-button min-w-32"
                      data-active={activeTab === "proposals"}
                      onClick={() => setActiveTab("proposals")}
                    >
                      Work Proposals {pendingProposals.length > 0 && `(${pendingProposals.length})`}
                    </button>
                  )}

                  {currentUser?.role !== "HUNTER" && (
                    <button
                      type="button"
                      className="tab-button min-w-32"
                      data-active={activeTab === "profile"}
                      onClick={() => setActiveTab("profile")}
                    >
                      Profile Settings
                    </button>
                  )}
                </div>

                {activeTab === "deals" && currentUser?.role === "HUNTER" ? (
                  <button
                    type="button"
                    className="action-button action-button--primary text-sm"
                    onClick={() => setCreatingDeal((value) => !value)}
                  >
                    <Plus className="h-4 w-4" />
                    {creatingDeal ? "Close composer" : "Create new deal"}
                  </button>
                ) : null}
              </div>

              {/* Deals tab */}
              {activeTab === "deals" && (
                <>
                  {creatingDeal ? (
                    <AppSurface accent="amber" className="rounded-[2rem] p-6">
                      <form onSubmit={handleCreateDeal} className="grid gap-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <FormField
                            label="Project title"
                            value={dealForm.title}
                            onChange={(value) => setDealForm((current) => ({ ...current, title: value }))}
                            placeholder="Fintech dashboard landing page"
                          />
                          <FormField
                            label="Budget"
                            type="number"
                            value={String(dealForm.budget)}
                            onChange={(value) =>
                              setDealForm((current) => ({ ...current, budget: Number(value) || 0 }))
                            }
                            placeholder="8000"
                          />
                        </div>

                        <FormField
                          label="Deal summary"
                          value={dealForm.description}
                          onChange={(value) => setDealForm((current) => ({ ...current, description: value }))}
                          placeholder="Provide overview of milestones and deliverables..."
                          multiline
                        />

                        <div className="grid gap-4 md:grid-cols-3">
                          <FormField
                            label="Timeline weeks"
                            type="number"
                            value={String(dealForm.timelineWeeks)}
                            onChange={(value) =>
                              setDealForm((current) => ({ ...current, timelineWeeks: Number(value) || 0 }))
                            }
                            placeholder="6"
                          />
                          <FormField
                            label="Developer split (%)"
                            type="number"
                            value={String(dealForm.developerSplit)}
                            onChange={(value) =>
                              setDealForm((current) => ({ ...current, developerSplit: Number(value) || 0 }))
                            }
                            placeholder="60"
                          />
                          <FormField
                            label="Hunter split (%)"
                            type="number"
                            value={String(dealForm.hunterSplit)}
                            onChange={(value) =>
                              setDealForm((current) => ({ ...current, hunterSplit: Number(value) || 0 }))
                            }
                            placeholder="30"
                          />
                        </div>

                        <button type="submit" className="action-button action-button--primary w-full sm:w-fit text-sm">
                          Lock split and create workspace
                        </button>
                      </form>
                    </AppSurface>
                  ) : null}

                  {deals.length ? (
                    deals.map((deal, index) => {
                      const clientLabel = seededClientMock(deal.clientId);
                      const devLabel = seededDevMock(deal.developerId);

                      return (
                        <motion.div
                          key={deal.id}
                          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <TiltCard className="rounded-[2rem]">
                            <AppSurface accent={index % 3 === 0 ? "amber" : index % 3 === 1 ? "violet" : "cyan"} className="rounded-[2rem] p-6">
                              <div className="flex flex-wrap items-start justify-between gap-4">
                                <div className="max-w-2xl">
                                  <div className="flex gap-2 items-center flex-wrap">
                                    <span className={`status-pill status-${deal.state.toLowerCase()}`}>{deal.state}</span>
                                    {devLabel && (
                                      <span className="text-[0.6rem] uppercase tracking-wider bg-cyan-300/10 text-cyan-300 px-2 py-0.5 rounded border border-cyan-400/20">
                                        Coder: {devLabel}
                                      </span>
                                    )}
                                    {clientLabel && (
                                      <span className="text-[0.6rem] uppercase tracking-wider bg-violet-300/10 text-violet-300 px-2 py-0.5 rounded border border-violet-400/20">
                                        Client: {clientLabel}
                                      </span>
                                    )}
                                  </div>
                                  <h2 className="mt-4 text-2xl font-semibold text-white">{deal.title}</h2>
                                  <p className="mt-3 text-sm leading-7 text-slate-300">{deal.description}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="metric-value text-3xl text-white">${deal.budget.toLocaleString()}</div>
                                  <div className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-400 font-semibold">
                                    {deal.developerSplit}/{deal.hunterSplit}/{deal.platformSplit} split
                                  </div>
                                </div>
                              </div>

                              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                                <MiniData label="Milestones" value={String(deal.milestones.length)} />
                                <MiniData label="Timeline" value={`${deal.timelineWeeks} weeks`} />
                                <MiniData
                                  label="Escrow Split Status"
                                  value={`${deal.developerSplit}% Coder / ${deal.hunterSplit}% Hunter`}
                                />
                              </div>

                              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
                                <div className="text-sm text-slate-400">
                                  Pipeline registered: {new Date(deal.createdAt).toLocaleDateString()}
                                </div>
                                <Link href={`/workspace/${deal.id}`} className="ghost-button text-xs">
                                  Open workspace
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
                              </div>
                            </AppSurface>
                          </TiltCard>
                        </motion.div>
                      );
                    })
                  ) : (
                    <AppSurface accent="amber" className="rounded-[2rem] p-6 text-center">
                      <div className="text-lg font-semibold text-white">No active workspaces</div>
                      <p className="mt-2 text-sm leading-7 text-slate-400">
                        Hunters can click &quot;Create new deal&quot; or &quot;Browse Developers&quot; to select a coder and initiate a project.
                      </p>
                    </AppSurface>
                  )}
                </>
              )}

              {/* Browse Developers tab (Hunters only) */}
              {activeTab === "developers" && (
                <div className="space-y-4">
                  <div className="mb-2">
                    <div className="text-xs uppercase tracking-widest text-cyan-300 font-bold mb-1">Elite Sourced Coders</div>
                    <h2 className="text-xl font-bold text-white">Browse profiles and propose pipeline projects.</h2>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    {developers.map((dev) => (
                      <AppSurface key={dev.id} accent="cyan" className="rounded-[2rem] p-5 developer-card flex flex-col justify-between h-full">
                        <div>
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 text-cyan-300 text-lg font-black">
                              {dev.name?.charAt(0)}
                            </div>
                            <div>
                              <h3 className="font-semibold text-white text-base">{dev.name}</h3>
                              <div className="text-xs text-slate-400 mt-0.5">{dev.devProfile?.location || "Remote"}</div>
                            </div>
                          </div>

                          <p className="text-xs text-slate-300 mt-4 leading-6 line-clamp-2">
                            {dev.devProfile?.bio || "No bio details shared yet."}
                          </p>

                          <div className="mt-4 flex flex-wrap gap-1.5">
                            {dev.devProfile?.skills?.map(skill => (
                              <span key={skill} className="rounded-full bg-cyan-400/10 border border-cyan-400/20 text-cyan-300 px-2 py-0.5 text-[0.65rem]">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="mt-6 border-t border-white/5 pt-4 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-1 text-[0.7rem] text-slate-400">
                            <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                            <span className="text-white font-bold">{dev.devProfile?.ratingAvg} rating</span>
                          </div>

                          <Link href={`/profile/${dev.id}`} className="ghost-button py-1.5 px-3 text-[0.7rem]">
                            View Portfolio
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </AppSurface>
                    ))}
                  </div>
                </div>
              )}

              {/* Work Proposals tab (Developers only) */}
              {activeTab === "proposals" && (
                <div className="space-y-4">
                  <div className="mb-2">
                    <div className="text-xs uppercase tracking-widest text-cyan-300 font-bold mb-1">Work Proposals Inbox</div>
                    <h2 className="text-xl font-bold text-white">Review incoming deal offers and split percentages.</h2>
                  </div>

                  {pendingProposals.length > 0 ? (
                    pendingProposals.map((deal) => {
                      const hunterInvite = deal.invites?.find(
                        inv => inv.invitedUserId === currentUser?.id && inv.status === "PENDING"
                      );
                      
                      return (
                        <AppSurface key={deal.id} accent="amber" className="rounded-[2rem] p-6">
                          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4 mb-4">
                            <div>
                              <div className="text-[0.65rem] uppercase tracking-widest bg-amber-400/10 border border-amber-400/20 text-amber-300 px-2 py-1 rounded w-fit">
                                Pending Proposal Offer
                              </div>
                              <h3 className="text-xl font-bold text-white mt-2.5">{deal.title}</h3>
                              <p className="text-xs text-slate-400 mt-1 leading-5">{deal.description}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="metric-value text-2xl font-bold text-white">${deal.budget.toLocaleString()}</div>
                              <div className="text-[0.65rem] uppercase tracking-wider text-cyan-300 font-semibold mt-1">
                                {deal.developerSplit}% Coder split ($${deal.budget * (deal.developerSplit / 100)})
                              </div>
                            </div>
                          </div>

                          {hunterInvite?.explanation && (
                            <div className="mb-6 rounded-xl border border-white/5 bg-white/5 p-4 text-xs">
                              <div className="text-[0.65rem] uppercase tracking-widest text-slate-400 font-bold mb-1">Hunter message</div>
                              <p className="text-slate-200 leading-6 italic">&ldquo;{hunterInvite.explanation}&rdquo;</p>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setResponseDealId(deal.id);
                                setResponseAccept(false);
                                setShowResponseModal(true);
                              }}
                              className="ghost-button border-rose-400/20 bg-rose-400/10 text-rose-300 py-2 px-4 text-xs"
                            >
                              <ThumbsDown className="h-3.5 w-3.5" />
                              <span>Reject Proposal</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setResponseDealId(deal.id);
                                setResponseAccept(true);
                                setShowResponseModal(true);
                              }}
                              className="action-button action-button--primary py-2 px-4 text-xs"
                            >
                              <ThumbsUp className="h-3.5 w-3.5" />
                              <span>Accept & Join Workspace</span>
                            </button>
                          </div>
                        </AppSurface>
                      );
                    })
                  ) : (
                    <AppSurface accent="cyan" className="rounded-[2rem] p-6 text-center">
                      <p className="text-slate-400 text-sm">No incoming deal proposals found at this moment.</p>
                    </AppSurface>
                  )}
                </div>
              )}

              {/* Profile settings tab */}
              {activeTab === "profile" && (
                <AppSurface accent="cyan" className="rounded-[2rem] p-6">
                  <div className="mb-5">
                    <div className="text-xs uppercase tracking-[0.26em] text-cyan-200">Profile control</div>
                    <h2 className="mt-2 text-2xl font-semibold text-white">Tune your public-facing operating profile.</h2>
                  </div>
                  <form onSubmit={handleSaveProfile} className="grid gap-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        label="Headline"
                        value={profileForm.headline}
                        onChange={(value) => setProfileForm((current) => ({ ...current, headline: value }))}
                        placeholder="Elite product builder"
                      />
                      <FormField
                        label="Location"
                        value={profileForm.location}
                        onChange={(value) => setProfileForm((current) => ({ ...current, location: value }))}
                        placeholder="Paris, France"
                      />
                    </div>

                    <FormField
                      label="Bio / Professional Description"
                      value={profileForm.bio}
                      onChange={(value) => setProfileForm((current) => ({ ...current, bio: value }))}
                      placeholder="Describe your strengths, workflow, and trust credentials..."
                      multiline
                    />

                    {currentUser?.role === "CLIENT" ? (
                      <div className="grid gap-4 md:grid-cols-3">
                        <FormField
                          label="Website"
                          value={profileForm.website}
                          onChange={(value) => setProfileForm((current) => ({ ...current, website: value }))}
                          placeholder="https://company.com"
                        />
                        <FormField
                          label="Team size"
                          type="number"
                          value={String(profileForm.teamSize)}
                          onChange={(value) =>
                            setProfileForm((current) => ({ ...current, teamSize: Number(value) || 0 }))
                          }
                          placeholder="5"
                        />
                        <FormField
                          label="Funding stage"
                          value={profileForm.fundingStage}
                          onChange={(value) =>
                            setProfileForm((current) => ({ ...current, fundingStage: value }))
                          }
                          placeholder="Seed"
                        />
                      </div>
                    ) : null}

                    <button type="submit" className="action-button action-button--primary w-full sm:w-fit text-sm">
                      Save profile details
                    </button>
                  </form>
                </AppSurface>
              )}
            </div>

            {/* Right column sidebar */}
            <div className="space-y-5">
              <AppSurface accent="violet" className="rounded-[2rem] p-5">
                <div className="flex items-center gap-3">
                  <BriefcaseBusiness className="h-5 w-5 text-violet-200" />
                  <div className="font-semibold text-white">Marketplace ledger</div>
                </div>
                <p className="mt-3 text-xs leading-6 text-slate-400">
                  Matches coders and marketing hunters. Hunters generate pipeline deals, lock splits (60% Coder / 30% Hunter / 10% Platform), and trigger secure payouts.
                </p>
              </AppSurface>

              <AppSurface accent="amber" className="rounded-[2rem] p-5">
                <div className="flex items-center gap-3">
                  <Clock3 className="h-5 w-5 text-amber-200" />
                  <div className="font-semibold text-white">Your Profile Card</div>
                </div>
                <div className="mt-4 space-y-3 text-xs text-slate-400">
                  <div className="flex items-center justify-between gap-3">
                    <span>Active Role</span>
                    <span className="text-white uppercase tracking-wider font-semibold">{currentUser?.role || "Guest"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Name</span>
                    <span className="text-white">{currentUser?.name}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Email</span>
                    <span className="text-white">{currentUser?.email}</span>
                  </div>
                  {currentUser?.role === "DEVELOPER" && (
                    <div className="flex items-center justify-between gap-3 border-t border-white/5 pt-3">
                      <span>Coder Portfolio</span>
                      <Link href={`/profile/${currentUser?.id}`} className="text-cyan-300 hover:underline flex items-center gap-1">
                        <span>View Portfolio</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  )}
                </div>
              </AppSurface>
            </div>
          </section>
        </main>
      </div>

      {/* Accept/Reject Response Modal */}
      {showResponseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-[2rem] overflow-hidden upi-gate p-6"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {responseAccept ? <ThumbsUp className="h-5 w-5 text-cyan-300" /> : <ThumbsDown className="h-5 w-5 text-rose-300" />}
                <span>{responseAccept ? "Accept Proposal Offer" : "Reject Proposal Offer"}</span>
              </h3>
              <button onClick={() => setShowResponseModal(false)} className="text-slate-400 hover:text-white font-bold">Close</button>
            </div>

            <form onSubmit={handleConfirmProposalResponse} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-slate-400 mb-2">
                  Explain your reasoning (sent to Hunter)
                </label>
                <textarea
                  value={responseExplanation}
                  onChange={(e) => setResponseExplanation(e.target.value)}
                  placeholder={responseAccept ? "e.g. Excited to work on this wireframe. Timeline is lock!" : "e.g. Schedule is full this month. Apologies!"}
                  className="glass-input bg-black/30 min-h-24 resize-none border-white/10 text-xs"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submittingResponse}
                className={`action-button w-full text-xs font-semibold py-2 px-4 rounded-full ${
                  responseAccept ? 'action-button--primary' : 'bg-rose-400/10 border border-rose-400/20 text-rose-300'
                }`}
              >
                {submittingResponse ? "Submitting response..." : responseAccept ? "Confirm Accept & Join Workspace" : "Confirm Reject Offer"}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function PageLoader() {
  return (
    <div className="min-h-screen">
      <div className="noise-overlay" />
      <div className="app-grid flex min-h-screen items-center justify-center">
        <div className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-slate-300">
          Loading pipeline command...
        </div>
      </div>
    </div>
  );
}

function MiniData({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-4">
      <div className="text-xs uppercase tracking-[0.22em] text-slate-400">{label}</div>
      <div className="mt-2 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: "text" | "number";
  multiline?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-slate-400">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="glass-input min-h-32 resize-none"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="glass-input"
        />
      )}
    </label>
  );
}

// Seed lookup mapping helpers to display names inside pipeline deal lists
function seededDevMock(id?: string) {
  if (!id) return null;
  const list: Record<string, string> = {
    "developer-1": "Elena Rostova",
    "developer-2": "Arjun Mehta",
    "developer-3": "Sarah Lin",
    "dev-1": "Elena Rostova",
  };
  return list[id] || id;
}

function seededClientMock(id?: string) {
  if (!id) return null;
  const list: Record<string, string> = {
    "client-1": "Robert Kim",
  };
  return list[id] || id;
}
