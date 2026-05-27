"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Inbox, MailOpen, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { AppSurface } from "@/components/ui/AppSurface";
import { getCurrentUserAction } from "@/app/actions/auth";
import { getInboxMessagesAction, markInboxMessageReadAction } from "@/app/actions/invitations";
import { useStore } from "@/store/useStore";
import type { PlatformDirectMessage } from "@/lib/platform/types";

export default function InboxPage() {
  const router = useRouter();
  const { setCurrentUser } = useStore();
  const [messages, setMessages] = useState<PlatformDirectMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const session = await getCurrentUserAction();
      if (!session) {
        router.push("/");
        return;
      }

      setCurrentUser(session);
      const inbox = await getInboxMessagesAction();
      if (cancelled) {
        return;
      }

      setMessages(inbox);
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [router, setCurrentUser]);

  async function handleRead(messageId: string) {
    await markInboxMessageReadAction(messageId);
    setMessages((current) =>
      current.map((item) =>
        item.id === messageId ? { ...item, readAt: item.readAt || new Date().toISOString() } : item,
      ),
    );
  }

  return (
    <div className="min-h-screen">
      <div className="noise-overlay" />
      <div className="app-grid min-h-screen">
        <Navbar />
        <main className="relative z-[1] mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">
          <div className="mb-8">
            <div className="text-xs uppercase tracking-[0.28em] text-slate-400">Direct inbox</div>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-white">Marketplace messages</h1>
          </div>

          {loading ? (
            <AppSurface accent="amber" className="rounded-[2rem] p-6 text-sm text-slate-300">
              Loading inbox...
            </AppSurface>
          ) : messages.length ? (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <AppSurface
                  key={message.id}
                  accent={index % 2 === 0 ? "violet" : "cyan"}
                  className="rounded-[2rem] p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
                        {message.readAt ? "Read" : "Unread"}
                      </div>
                      <h2 className="mt-2 text-xl font-semibold text-white">{message.title}</h2>
                      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">{message.body}</p>
                    </div>
                    <div className="text-sm text-slate-400">
                      {new Date(message.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    {message.ctaUrl ? (
                      <Link href={message.ctaUrl} className="action-button action-button--primary">
                        Open
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    ) : null}
                    {!message.readAt ? (
                      <button
                        type="button"
                        onClick={() => void handleRead(message.id)}
                        className="action-button action-button--secondary"
                      >
                        <MailOpen className="h-4 w-4" />
                        Mark as read
                      </button>
                    ) : null}
                  </div>
                </AppSurface>
              ))}
            </div>
          ) : (
            <AppSurface accent="amber" className="rounded-[2rem] p-8 text-center">
              <Inbox className="mx-auto h-10 w-10 text-amber-300" />
              <h2 className="mt-4 text-2xl font-semibold text-white">Inbox is clear</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Proposal requests and client onboarding invites will appear here.
              </p>
            </AppSurface>
          )}
        </main>
      </div>
    </div>
  );
}
