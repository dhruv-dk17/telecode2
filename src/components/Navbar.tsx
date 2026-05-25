"use client";

import Link from "next/link";
import { useStore } from "@/store/useStore";
import { Briefcase, ArrowRight, User as UserIcon } from "lucide-react";

export function Navbar() {
  const { currentUser, setCurrentUser } = useStore();

  const handleRoleChange = (role: "HUNTER" | "DEVELOPER" | "CLIENT" | "ADMIN") => {
    const rolesMap = {
      HUNTER: {
        id: "hunter-1",
        email: "marcus.hunter@nexus.io",
        name: "Marcus Vane",
        role: "HUNTER" as const,
        avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
      },
      DEVELOPER: {
        id: "dev-1",
        email: "elena.dev@nexus.io",
        name: "Elena Rostova",
        role: "DEVELOPER" as const,
        avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80",
      },
      CLIENT: {
        id: "client-1",
        email: "robert.client@nexus.io",
        name: "Robert K.",
        role: "CLIENT" as const,
        avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
      },
      ADMIN: {
        id: "admin-1",
        email: "admin@nexus.io",
        name: "System Admin",
        role: "ADMIN" as const,
        avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80",
      },
    };
    setCurrentUser(rolesMap[role]);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-[#030303]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Brand */}
        <Link href="/" className="flex items-center space-x-2">
          <Briefcase className="h-6 w-6 text-primary" />
          <span className="font-display text-xl font-bold tracking-tight text-white">
            NEXUS<span className="text-primary">AGENCY</span>
          </span>
        </Link>

        {/* Dynamic Navigation */}
        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-muted-foreground">
          <Link href="#features" className="transition-colors hover:text-white">
            Features
          </Link>
          <Link href="#how-it-works" className="transition-colors hover:text-white">
            How It Works
          </Link>
          <Link href="#escrow" className="transition-colors hover:text-white">
            Escrow Tech
          </Link>
        </nav>

        {/* Role Selector & CTA */}
        <div className="flex items-center space-x-4">
          <div className="hidden lg:flex items-center space-x-1 glass-panel rounded-full p-1 text-xs">
            <button
              onClick={() => handleRoleChange("HUNTER")}
              className={`rounded-full px-3 py-1 font-medium transition-all ${
                currentUser?.role === "HUNTER"
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              Hunter
            </button>
            <button
              onClick={() => handleRoleChange("DEVELOPER")}
              className={`rounded-full px-3 py-1 font-medium transition-all ${
                currentUser?.role === "DEVELOPER"
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              Dev
            </button>
            <button
              onClick={() => handleRoleChange("CLIENT")}
              className={`rounded-full px-3 py-1 font-medium transition-all ${
                currentUser?.role === "CLIENT"
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              Client
            </button>
            <button
              onClick={() => handleRoleChange("ADMIN")}
              className={`rounded-full px-3 py-1 font-medium transition-all ${
                currentUser?.role === "ADMIN"
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              Admin
            </button>
          </div>

          <Link
            href="/dashboard"
            className="flex items-center space-x-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition-all hover:bg-neutral-200"
          >
            <span>Enter App</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
