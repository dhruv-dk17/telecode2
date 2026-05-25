"use client";

import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { motion } from "framer-motion";
import {
  Briefcase,
  ShieldCheck,
  Zap,
  Bot,
  Users,
  CreditCard,
  ChevronRight,
  TrendingUp,
  Award,
} from "lucide-react";

export default function Home() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
      } as const,
    },
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#030303] text-foreground selection:bg-primary selection:text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden py-24 px-6 md:py-36">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 left-1/4 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mx-auto max-w-4xl text-center z-10"
        >
          {/* Tag */}
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center space-x-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary tracking-wide uppercase mb-6"
          >
            <Zap className="h-3 w-3" />
            <span>OPERATING SYSTEM FOR DIGITAL AGENCIES</span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            variants={itemVariants}
            className="font-display text-5xl font-extrabold tracking-tight text-white sm:text-7xl leading-none"
          >
            Create instantly. <br />
            <span className="text-gradient-blue">Collaborate globally.</span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            variants={itemVariants}
            className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto sm:text-xl font-light"
          >
            A high-performance fullstack partnership marketplace. Instantly spin up
            on-demand agencies, lock immutable revenue splits, secure funds with
            advanced escrow, and build projects in cinematic real-time.
          </motion.p>

          {/* Call to Actions */}
          <motion.div
            variants={itemVariants}
            className="mt-10 flex flex-wrap justify-center gap-4"
          >
            <Link
              href="/dashboard"
              className="group flex items-center space-x-2 rounded-full bg-primary px-8 py-4 font-semibold text-white transition-all hover:bg-blue-600 hover:shadow-lg hover:shadow-primary/25"
            >
              <span>Build A Partnership</span>
              <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="#how-it-works"
              className="flex items-center space-x-2 rounded-full glass-panel px-8 py-4 font-semibold text-white transition-all hover:bg-white/5"
            >
              <span>Explore Tech Stack</span>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Fintech Features Bento Grid */}
      <section id="features" className="py-20 px-6 max-w-7xl mx-auto w-full">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-5xl">
            SaaS Infrastructure, <span className="text-primary">Not a Gig Board</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-lg font-light">
            We combined premium fintech with realtime workspaces to build the platform for professional partners.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-panel glass-panel-hover rounded-3xl p-8 flex flex-col justify-between min-h-[300px] transition-all"
          >
            <div className="bg-primary/10 rounded-2xl w-12 h-12 flex items-center justify-center text-primary mb-6">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold text-white mb-2">
                Immutable Escrow Holds
              </h3>
              <p className="text-muted-foreground text-sm font-light leading-relaxed">
                Secure milestone-based transactions using Stripe Connect infrastructure. Releases happen only when clients approve, keeping developers completely protected.
              </p>
            </div>
          </motion.div>

          {/* Card 2 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="glass-panel glass-panel-hover rounded-3xl p-8 flex flex-col justify-between min-h-[300px] transition-all"
          >
            <div className="bg-emerald-500/10 rounded-2xl w-12 h-12 flex items-center justify-center text-emerald-400 mb-6">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold text-white mb-2">
                AI Requirements Extraction
              </h3>
              <p className="text-muted-foreground text-sm font-light leading-relaxed">
                Our embedded intelligence listens to partnership briefs, generates clear deliverables, extracts core milestones, and establishes exact project scope boundaries.
              </p>
            </div>
          </motion.div>

          {/* Card 3 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="glass-panel glass-panel-hover rounded-3xl p-8 flex flex-col justify-between min-h-[300px] transition-all"
          >
            <div className="bg-indigo-500/10 rounded-2xl w-12 h-12 flex items-center justify-center text-indigo-400 mb-6">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold text-white mb-2">
                On-Demand Agency Formations
              </h3>
              <p className="text-muted-foreground text-sm font-light leading-relaxed">
                Connect Lead Hunters with top developers. Seamlessly invite clients through private secure tokens. Everyone tracks progress, files, and payouts in one group.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Metrics Section */}
      <section className="py-16 border-t border-b border-border bg-[#09090b]/50">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="font-display text-4xl font-extrabold text-white md:text-5xl">$14.2M</div>
            <p className="text-sm text-muted-foreground mt-2 font-medium">Secured in Escrow</p>
          </div>
          <div>
            <div className="font-display text-4xl font-extrabold text-white md:text-5xl">99.8%</div>
            <p className="text-sm text-muted-foreground mt-2 font-medium">Successful Releases</p>
          </div>
          <div>
            <div className="font-display text-4xl font-extrabold text-white md:text-5xl">&lt; 4 Hours</div>
            <p className="text-sm text-muted-foreground mt-2 font-medium">Average Dispute Resolution</p>
          </div>
          <div>
            <div className="font-display text-4xl font-extrabold text-white md:text-5xl">45,000+</div>
            <p className="text-sm text-muted-foreground mt-2 font-medium">Global Partnerships</p>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="mt-auto py-12 border-t border-border bg-[#030303]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-muted-foreground">
          <div className="flex items-center space-x-2 text-white font-display font-semibold">
            <Briefcase className="h-5 w-5 text-primary" />
            <span>NEXUSAGENCY</span>
          </div>
          <div>© {new Date().getFullYear()} NexusAgency, Inc. All rights secured.</div>
          <div className="flex space-x-6">
            <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
