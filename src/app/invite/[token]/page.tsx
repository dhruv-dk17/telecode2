"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Mail, ShieldCheck, XCircle } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { AppSurface } from "@/components/ui/AppSurface";
import { acceptInviteAction, getInviteByTokenAction } from "@/app/actions/invitations";
import { getCurrentUserAction } from "@/app/actions/auth";
import { useStore } from "@/store/useStore";
import type { PlatformDeal, PlatformInvite } from "@/lib/platform/types";

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const { setCurrentUser } = useStore();
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<PlatformInvite | null>(null);
  const [deal, setDeal] = useState<PlatformDeal | null>(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const session = await getCurrentUserAction();
      if (!session) {
        router.push("/");
        return;
      }

      setCurrentUser(session);
      const result = await getInviteByTokenAction(token);
      if (cancelled) {
        return;
      }

      setInvite(result?.invite || null);
      setDeal(result?.deal || null);
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [router, setCurrentUser, token]);

  async function handleAccept() {
    setAccepting(true);
    setError("");
    const response = await acceptInviteAction(token);
    setAccepting(false);

    if (!response.success) {
      setError(response.error || "Unable to accept invite.");
      return;
    }

    const acceptedDealId = "deal" in response ? response.deal.id : undefined;
    setFeedback("Invite accepted. You can continue inside the workspace now.");
    setTimeout(() => {
      router.push(acceptedDealId ? `/workspace/${acceptedDealId}` : "/dashboard");
    }, 1000);
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="noise-overlay" />
        <div className="app-grid flex min-h-screen items-center justify-center">
          <div className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-slate-300">
            Loading invite...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="noise-overlay" />
      <div className="app-grid min-h-screen">
        <Navbar />
        <main className="relative z-[1] mx-auto flex min-h-[80vh] max-w-3xl items-center px-4 py-10 sm:px-6">
          <AppSurface accent="amber" className="w-full rounded-[2rem] p-8">
            {!invite || !deal ? (
              <div className="text-center">
                <XCircle className="mx-auto h-10 w-10 text-rose-300" />
                <h1 className="mt-4 text-3xl font-semibold text-white">Invite not found</h1>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  This invite is invalid or no longer available.
                </p>
                <Link href="/dashboard" className="action-button action-button--primary mt-6">
                  Back to dashboard
                </Link>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-amber-300" />
                  <div className="text-xs uppercase tracking-[0.28em] text-amber-200">Workspace invite</div>
                </div>
                <h1 className="mt-4 text-3xl font-semibold text-white">{deal.title}</h1>
                <p className="mt-3 text-sm leading-7 text-slate-300">{deal.description}</p>

                <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
                  <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Invite details</div>
                  <div className="mt-3 space-y-2 text-sm text-slate-200">
                    <div>Role: {invite.recipientRole}</div>
                    <div>Status: {invite.status}</div>
                    <div>Email: {invite.recipientEmail}</div>
                  </div>
                </div>

                {feedback ? (
                  <div className="mt-5 rounded-[1.3rem] border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
                    {feedback}
                  </div>
                ) : null}
                {error ? (
                  <div className="mt-5 rounded-[1.3rem] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                    {error}
                  </div>
                ) : null}

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleAccept}
                    disabled={accepting || invite.status !== "PENDING"}
                    className="action-button action-button--primary"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {accepting ? "Accepting..." : "Accept invite"}
                  </button>
                  <Link href="/dashboard" className="action-button action-button--secondary">
                    <ShieldCheck className="h-4 w-4" />
                    Review later
                  </Link>
                </div>
              </>
            )}
          </AppSurface>
        </main>
      </div>
    </div>
  );
}
