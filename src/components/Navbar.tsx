"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, BellRing, LogOut, WalletCards } from "lucide-react";
import { getCurrentUserAction, logoutAction } from "@/app/actions/auth";
import { useStore } from "@/store/useStore";

export function Navbar() {
  const { currentUser, setCurrentUser } = useStore();
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      const user = await getCurrentUserAction();
      if (user) {
        setCurrentUser({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatarUrl: "",
        });
        return;
      }

      setCurrentUser(null);
    }

    void loadUser();
  }, [setCurrentUser]);

  async function handleLogout() {
    await logoutAction();
    setCurrentUser(null);
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-50 px-4 pt-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/10 bg-[rgba(7,17,31,0.7)] px-5 py-3 shadow-[0_18px_40px_rgba(2,8,23,0.28)] backdrop-blur-xl"
      >
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-amber-300/30 bg-amber-400/10 text-amber-300">
            <WalletCards className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-sm uppercase tracking-[0.36em] text-white">Telecode</div>
            <div className="text-[0.68rem] uppercase tracking-[0.24em] text-slate-400">
              Transaction OS
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
          <Link href="/#features" className="nav-link">
            Capabilities
          </Link>
          <Link href="/dashboard" className="nav-link">
            Deal Command
          </Link>
          <Link href="/feed" className="nav-link">
            Network Feed
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300 sm:flex">
                <BellRing className="h-3.5 w-3.5 text-cyan-300" />
                <span className="font-semibold uppercase tracking-[0.2em] text-white">
                  {currentUser.role}
                </span>
                <span className="text-slate-500">/</span>
                <span>{currentUser.name}</span>
              </div>

              <button onClick={handleLogout} className="ghost-button p-3" title="Logout">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link href="/#auth" className="action-button action-button--primary text-sm">
              <span>Secure Onboarding</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </motion.div>
    </header>
  );
}
