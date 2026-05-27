"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BadgeDollarSign,
  Bot,
  CheckCircle2,
  CreditCard,
  Lock,
  Mail,
  Orbit,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  User,
  Users2,
  Wallet,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { AppSurface } from "@/components/ui/AppSurface";
import { TiltCard } from "@/components/ui/TiltCard";
import {
  getCurrentUserAction,
  loginAction,
  requestPasswordResetAction,
  resetPasswordAction,
  signInWithGoogleAction,
  signUpAction,
} from "@/app/actions/auth";
import { useStore } from "@/store/useStore";
import type { Role } from "@/lib/platform/types";

type AuthMode = "signup" | "login" | "forgot" | "reset";

const roles: Array<{ id: Role; label: string; hint: string }> = [
  { id: "HUNTER", label: "Hunter", hint: "Owns sourcing, negotiation, and account control" },
  { id: "DEVELOPER", label: "Developer", hint: "Delivers milestones and ships production work" },
  { id: "CLIENT", label: "Client", hint: "Funds escrow and approves milestone releases" },
];

const heroStats = [
  { label: "Escrow visibility", value: "100%", tone: "amber" as const },
  { label: "Workflow compression", value: "3.2x", tone: "violet" as const },
  { label: "Payout confidence", value: "98%", tone: "cyan" as const },
];

const featureCards = [
  {
    icon: CreditCard,
    title: "Transaction layers",
    body: "Watch funding, split logic, and release thresholds from one visual control plane.",
  },
  {
    icon: Users2,
    title: "Multi-party workspaces",
    body: "Hunters, developers, and clients operate from the same ledger without losing role clarity.",
  },
  {
    icon: Bot,
    title: "AI onboarding rails",
    body: "Convert kickoff context into deliverables, review rules, and revision boundaries instantly.",
  },
];

export default function HomePage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { setCurrentUser } = useStore();

  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [role, setRole] = useState<Role>("HUNTER");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      const user = await getCurrentUserAction();
      if (!user || cancelled) {
        return;
      }

      setCurrentUser(user);
      router.push("/dashboard");
    }

    void checkSession();
    return () => {
      cancelled = true;
    };
  }, [router, setCurrentUser]);

  const passwordChecklist = useMemo(
    () => [
      { label: "10+ chars", ok: password.trim().length >= 10 },
      { label: "Uppercase", ok: /[A-Z]/.test(password) },
      { label: "Lowercase", ok: /[a-z]/.test(password) },
      { label: "Number", ok: /\d/.test(password) },
      { label: "Symbol", ok: /[^A-Za-z0-9]/.test(password) },
    ],
    [password],
  );

  function resetFeedback() {
    setMessage("");
    setError("");
  }

  function switchMode(mode: AuthMode) {
    setAuthMode(mode);
    resetFeedback();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    resetFeedback();

    try {
      if (authMode === "signup") {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }

        const response = await signUpAction(email, name, role, password);
        if (!response.success || !response.user) {
          throw new Error(response.error || "Unable to create account.");
        }

        setCurrentUser(response.user);
        router.push("/dashboard");
        return;
      }

      if (authMode === "login") {
        const response = await loginAction(email, password);
        if (!response.success || !response.user) {
          throw new Error(response.error || "Unable to sign in.");
        }

        setCurrentUser(response.user);
        router.push("/dashboard");
        return;
      }

      if (authMode === "forgot") {
        const response = await requestPasswordResetAction(email);
        if (!response.success) {
          throw new Error(response.error || "Unable to start password reset.");
        }

        setMessage(response.message || "Reset instructions sent.");
        if (response.devToken) {
          setResetToken(response.devToken);
          setMessage(
            `${response.message} Local token: ${response.devToken}${
              response.expiresAt ? ` (expires ${new Date(response.expiresAt).toLocaleTimeString()})` : ""
            }`,
          );
        }
        setAuthMode("reset");
        return;
      }

      if (password !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      const response = await resetPasswordAction(email, resetToken, password);
      if (!response.success) {
        throw new Error(response.error || "Unable to reset password.");
      }

      setMessage(response.message || "Password updated.");
      setPassword("");
      setConfirmPassword("");
      setResetToken("");
      setAuthMode("login");
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Authentication failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    resetFeedback();
    const response = await signInWithGoogleAction();
    if (!response.success) {
      setError(response.error || "Google sign-in is unavailable right now.");
    }
  }

  return (
    <div className="min-h-screen">
      <div className="noise-overlay" />
      <div className="app-grid min-h-screen">
        <Navbar />

        <main className="relative z-[1] mx-auto max-w-7xl px-4 pb-16 sm:px-6">
          <section className="grid gap-8 pb-10 pt-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:pt-14">
            <div className="orb-stack">
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                className="eyebrow"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Built for funded digital execution
              </motion.div>

              <motion.h1
                initial={reduceMotion ? false : { opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 }}
                className="mt-8 max-w-4xl text-5xl font-semibold tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl"
              >
                The cinematic control room for
                <span className="display-gradient"> transactions, delivery, and trust.</span>
              </motion.h1>

              <motion.p
                initial={reduceMotion ? false : { opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
                className="mt-6 max-w-2xl text-lg leading-8 text-slate-300"
              >
                Telecode turns fragmented agency ops into one premium workspace with escrow clarity,
                role-aware collaboration, and review-safe milestone motion.
              </motion.p>

              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
                className="mt-8 flex flex-wrap gap-3"
              >
                <button
                  type="button"
                  className="action-button action-button--primary"
                  onClick={() => document.getElementById("auth")?.scrollIntoView()}
                >
                  Open secure onboarding
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="action-button action-button--secondary"
                  onClick={() => document.getElementById("features")?.scrollIntoView()}
                >
                  Explore interface system
                </button>
              </motion.div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {heroStats.map((item, index) => (
                  <motion.div
                    key={item.label}
                    initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + index * 0.05 }}
                  >
                    <AppSurface
                      accent={item.tone}
                      className="rounded-[1.75rem] px-5 py-5"
                    >
                      <div className="text-xs uppercase tracking-[0.24em] text-slate-400">{item.label}</div>
                      <div className="metric-value mt-3 text-3xl text-white">{item.value}</div>
                    </AppSurface>
                  </motion.div>
                ))}
              </div>

              <div className="mt-10 grid gap-5 md:grid-cols-3">
                {featureCards.map((item, index) => (
                  <motion.div
                    key={item.title}
                    initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.26 + index * 0.06 }}
                  >
                    <TiltCard className="h-full rounded-[1.8rem]">
                      <AppSurface accent={index === 1 ? "violet" : index === 2 ? "cyan" : "amber"} className="h-full rounded-[1.8rem] p-5">
                        <item.icon className="h-6 w-6 text-amber-300" />
                        <h2 className="mt-5 text-lg font-semibold text-white">{item.title}</h2>
                        <p className="mt-3 text-sm leading-7 text-slate-300">{item.body}</p>
                      </AppSurface>
                    </TiltCard>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="grid gap-6">
              <TiltCard className="rounded-[2rem]">
                <AppSurface accent="violet" className="rounded-[2rem] p-6 sm:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.28em] text-violet-200">
                        Transaction cockpit
                      </div>
                      <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
                        Watch money move with depth, not spreadsheets.
                      </h2>
                    </div>
                    <Orbit className="h-8 w-8 text-violet-200" />
                  </div>

                  <div className="mt-6 space-y-4">
                    <TransactionPreview
                      title="Escrow funded"
                      subtitle="Client deposit verified in secure holding"
                      amount="$24,000"
                      status="FUNDED"
                    />
                    <TransactionPreview
                      title="Milestone 02 review"
                      subtitle="Frontend motion handoff awaiting approval"
                      amount="$8,500"
                      status="SUBMITTED"
                    />
                    <TransactionPreview
                      title="Split release"
                      subtitle="70 / 20 / 10 payout path locked"
                      amount="$5,950"
                      status="COMPLETED"
                    />
                  </div>
                </AppSurface>
              </TiltCard>

              <AppSurface id="auth" accent="amber" className="rounded-[2rem] p-6 sm:p-7">
                <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
                  <div>
                    <div className="text-xs uppercase tracking-[0.28em] text-amber-200">Secure access</div>
                    <h2 className="mt-2 text-2xl font-semibold text-white">
                      {authMode === "signup" && "Launch your workspace"}
                      {authMode === "login" && "Return to deal command"}
                      {authMode === "forgot" && "Recover credentials"}
                      {authMode === "reset" && "Finalize password reset"}
                    </h2>
                  </div>
                  <ShieldCheck className="h-8 w-8 text-amber-200" />
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2 rounded-full border border-white/10 bg-black/20 p-1">
                  <button
                    type="button"
                    className="tab-button"
                    data-active={authMode === "signup"}
                    onClick={() => switchMode("signup")}
                  >
                    Register
                  </button>
                  <button
                    type="button"
                    className="tab-button"
                    data-active={authMode === "login"}
                    onClick={() => switchMode("login")}
                  >
                    Login
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  <motion.form
                    key={authMode}
                    initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? {} : { opacity: 0, y: -10 }}
                    transition={{ duration: 0.18 }}
                    onSubmit={handleSubmit}
                    className="mt-6 space-y-4"
                  >
                    {authMode === "signup" ? (
                      <Field
                        label="Full name"
                        icon={User}
                        value={name}
                        onChange={setName}
                        placeholder="Ariana Cole"
                      />
                    ) : null}

                    <Field
                      label="Email"
                      icon={Mail}
                      value={email}
                      onChange={setEmail}
                      placeholder="name@company.com"
                      type="email"
                    />

                    {authMode !== "forgot" ? (
                      <Field
                        label={authMode === "reset" ? "New password" : "Password"}
                        icon={Lock}
                        value={password}
                        onChange={setPassword}
                        placeholder="Enter your password"
                        type="password"
                      />
                    ) : null}

                    {authMode === "signup" || authMode === "reset" ? (
                      <Field
                        label={authMode === "signup" ? "Confirm password" : "Confirm new password"}
                        icon={Lock}
                        value={confirmPassword}
                        onChange={setConfirmPassword}
                        placeholder="Re-enter your password"
                        type="password"
                      />
                    ) : null}

                    {authMode === "reset" ? (
                      <Field
                        label="Reset code"
                        icon={BadgeDollarSign}
                        value={resetToken}
                        onChange={setResetToken}
                        placeholder="Paste reset token"
                      />
                    ) : null}

                    {authMode === "signup" ? (
                      <div className="grid gap-3">
                        <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Choose your role</div>
                        <div className="grid gap-3">
                          {roles.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              className="cursor-pointer rounded-[1.4rem] border border-white/10 bg-white/5 p-4 text-left transition hover:border-amber-300/30 hover:bg-white/8"
                              onClick={() => setRole(item.id)}
                            >
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <div className="font-semibold text-white">{item.label}</div>
                                  <div className="mt-1 text-sm text-slate-300">{item.hint}</div>
                                </div>
                                <div
                                  className={`h-5 w-5 rounded-full border ${
                                    role === item.id
                                      ? "border-amber-300 bg-amber-300"
                                      : "border-white/20 bg-transparent"
                                  }`}
                                />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {authMode === "signup" ? (
                      <div className="grid grid-cols-2 gap-2 rounded-[1.4rem] border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
                        {passwordChecklist.map((item) => (
                          <div key={item.label} className="flex items-center gap-2">
                            <CheckCircle2
                              className={`h-4 w-4 ${item.ok ? "text-cyan-300" : "text-slate-500"}`}
                            />
                            <span>{item.label}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {message ? (
                      <Feedback tone="success">{message}</Feedback>
                    ) : null}
                    {error ? <Feedback tone="error">{error}</Feedback> : null}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="action-button action-button--primary w-full disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isSubmitting
                        ? "Processing..."
                        : authMode === "signup"
                          ? "Create secure account"
                          : authMode === "login"
                            ? "Enter workspace"
                            : authMode === "forgot"
                              ? "Send reset token"
                              : "Save new password"}
                    </button>
                  </motion.form>
                </AnimatePresence>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="ghost-button"
                  >
                    Continue with Google
                  </button>

                  {authMode === "login" ? (
                    <button
                      type="button"
                      className="text-slate-300 transition hover:text-white"
                      onClick={() => switchMode("forgot")}
                    >
                      Forgot password?
                    </button>
                  ) : authMode === "forgot" || authMode === "reset" ? (
                    <button
                      type="button"
                      className="text-slate-300 transition hover:text-white"
                      onClick={() => switchMode("login")}
                    >
                      Back to login
                    </button>
                  ) : null}
                </div>
              </AppSurface>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function TransactionPreview({
  title,
  subtitle,
  amount,
  status,
}: {
  title: string;
  subtitle: string;
  amount: string;
  status: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-white">{title}</div>
          <div className="mt-1 text-sm text-slate-300">{subtitle}</div>
        </div>
        <div className="text-right">
          <div className="font-display text-lg text-white">{amount}</div>
          <div className={`status-pill status-${status.toLowerCase()}`}>{status}</div>
        </div>
      </div>
    </div>
  );
}

function StepCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
      <div className="text-sm font-semibold text-white">{title}</div>
      <p className="mt-2 text-sm leading-7 text-slate-300">{body}</p>
    </div>
  );
}

function FeatureStrip({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof TrendingUp;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-1 rounded-full border border-white/10 bg-white/10 p-2 text-cyan-200">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="font-semibold text-white">{title}</div>
          <p className="mt-2 text-sm leading-7 text-slate-300">{body}</p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  icon: typeof Mail;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: "text" | "email" | "password";
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-slate-400">{label}</span>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="glass-input pl-11"
        />
      </div>
    </label>
  );
}

function Feedback({
  tone,
  children,
}: {
  tone: "success" | "error";
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-[1.3rem] border px-4 py-3 text-sm ${
        tone === "success"
          ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-100"
          : "border-rose-400/20 bg-rose-400/10 text-rose-100"
      }`}
    >
      {children}
    </div>
  );
}
