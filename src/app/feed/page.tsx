"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle,
  ExternalLink,
  Heart,
  Image as ImageIcon,
  Link2,
  MessageCircle,
  Send,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { AppSurface } from "@/components/ui/AppSurface";
import { getCurrentUserAction } from "@/app/actions/auth";
import { createPostAction, getPostsAction, likePostAction } from "@/app/actions/posts";
import { useStore } from "@/store/useStore";
import type { PlatformPost, Role } from "@/lib/platform/types";

interface MockComment {
  id: string;
  authorName: string;
  authorRole: Role;
  content: string;
  createdAt: string;
}

type FeedEntry = {
  post: PlatformPost;
  kind: "system" | "live";
  accent: "amber" | "cyan" | "violet";
  eyebrow: string;
};

const LINK_MARKERS = ["Live Website:", "ðŸ”— Live Website:"];
const ROADMAP_POST_ID = "telecode-roadmap-2026-05-27";

const roadmapPost: PlatformPost = {
  id: ROADMAP_POST_ID,
  content: [
    "Production-safety roadmap is now live across the platform surface.",
    "",
    "This upgrade track prioritizes guarded launches, stronger audit visibility, and cleaner release confidence for every client, hunter, and developer flow.",
    "",
    "Roadmap",
    "1. Action-level confirmation for funds, invites, and milestone state changes.",
    "2. Escrow and approval timelines surfaced directly in working views.",
    "3. Upgrade-safe UI refactors with visual trust cues before deeper backend hardening.",
    "4. Production diagnostics and rollback readiness for every critical path.",
    "",
    "Live Website: https://telecode.in/feed-safety-roadmap",
  ].join("\n"),
  likesCount: 84,
  createdAt: "2026-05-27T09:00:00.000Z",
  author: {
    id: "telecode-system",
    email: "system@telecode.in",
    name: "Telecode Platform",
    role: "ADMIN",
    clientProfile: {
      headline: "Operational safety, trust instrumentation, and product upgrades",
      companyName: "Telecode",
      isVerified: true,
    },
  },
};

const seededComments: Record<string, MockComment[]> = {
  [ROADMAP_POST_ID]: [
    {
      id: "roadmap-c-1",
      authorName: "Maya Lin",
      authorRole: "CLIENT",
      content: "This is the right order. Visibility before velocity makes approvals easier for our team.",
      createdAt: "18m ago",
    },
    {
      id: "roadmap-c-2",
      authorName: "Anish Rao",
      authorRole: "DEVELOPER",
      content: "The release confidence piece matters. Safer UI states reduce last-minute delivery friction immediately.",
      createdAt: "9m ago",
    },
  ],
  "post-1": [
    {
      id: "c-1",
      authorName: "Elena Rostova",
      authorRole: "DEVELOPER",
      content: "Excellent strategy Marcus. The milestone lock is already saving us hours of revision fatigue.",
      createdAt: "10h ago",
    },
    {
      id: "c-2",
      authorName: "Robert Kim",
      authorRole: "CLIENT",
      content: "Agreed. Clear visibility of deliverables in holding is exactly what I wanted.",
      createdAt: "6h ago",
    },
  ],
};

function getRoleChipClass(role: Role) {
  switch (role) {
    case "DEVELOPER":
      return "feed-role-chip feed-role-chip--cyan";
    case "HUNTER":
      return "feed-role-chip feed-role-chip--amber";
    case "ADMIN":
      return "feed-role-chip feed-role-chip--gold";
    default:
      return "feed-role-chip feed-role-chip--violet";
  }
}

function getAvatarClass(role: Role) {
  switch (role) {
    case "DEVELOPER":
      return "feed-avatar-ring feed-avatar-ring--cyan";
    case "HUNTER":
      return "feed-avatar-ring feed-avatar-ring--amber";
    case "ADMIN":
      return "feed-avatar-ring feed-avatar-ring--gold";
    default:
      return "feed-avatar-ring feed-avatar-ring--violet";
  }
}

function getAuthorHeadline(post: PlatformPost) {
  return post.author.devProfile?.headline || post.author.clientProfile?.headline || "Telecode Member";
}

function getInitials(name?: string) {
  if (!name) {
    return "T";
  }

  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

function extractPostLink(content: string) {
  for (const marker of LINK_MARKERS) {
    if (content.includes(marker)) {
      const [body, link] = content.split(marker);
      return {
        cleanContent: body.trim(),
        linkPath: link?.trim() || "",
      };
    }
  }

  return {
    cleanContent: content,
    linkPath: "",
  };
}

function formatPostDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export default function FeedPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { setCurrentUser, currentUser } = useStore();
  const [posts, setPosts] = useState<PlatformPost[]>([]);
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [showAttachUrl, setShowAttachUrl] = useState(false);
  const [showAttachImage, setShowAttachImage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [postComments, setPostComments] = useState<Record<string, MockComment[]>>(seededComments);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(ROADMAP_POST_ID);
  const [newCommentText, setNewCommentText] = useState<Record<string, string>>({});
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const session = await getCurrentUserAction();
      if (!session) {
        setCurrentUser(null);
        router.push("/");
        return;
      }

      const nextPosts = await getPostsAction();
      if (cancelled) {
        return;
      }

      setCurrentUser(session);
      setPosts(nextPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [router, setCurrentUser]);

  async function refreshPosts() {
    const nextPosts = await getPostsAction();
    setPosts(nextPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!content.trim()) {
      return;
    }

    let finalContent = content.trim();
    if (linkUrl.trim()) {
      finalContent += `\n\nLive Website: ${linkUrl.trim()}`;
    }

    const response = await createPostAction(finalContent, imageUrl.trim() || undefined);
    if (!response.success) {
      return;
    }

    setContent("");
    setImageUrl("");
    setLinkUrl("");
    setShowAttachImage(false);
    setShowAttachUrl(false);
    await refreshPosts();
  }

  async function handleLike(postId: string) {
    setLikedPosts((current) => ({ ...current, [postId]: !current[postId] }));
    setPosts((current) =>
      current.map((post) => {
        if (post.id !== postId) {
          return post;
        }

        const isLiked = likedPosts[postId];
        return {
          ...post,
          likesCount: isLiked ? post.likesCount - 1 : post.likesCount + 1,
        };
      }),
    );
    await likePostAction(postId);
  }

  function handleAddComment(postId: string) {
    const text = newCommentText[postId] || "";
    if (!text.trim() || !currentUser) {
      return;
    }

    const newComment: MockComment = {
      id: `c-${Date.now()}`,
      authorName: currentUser.name || "User",
      authorRole: currentUser.role,
      content: text.trim(),
      createdAt: "Just now",
    };

    setPostComments((current) => ({
      ...current,
      [postId]: [...(current[postId] || []), newComment],
    }));

    setNewCommentText((current) => ({ ...current, [postId]: "" }));
  }

  const feedEntries: FeedEntry[] = [
    {
      post: roadmapPost,
      kind: "system",
      accent: "amber",
      eyebrow: "Pinned platform update",
    },
    ...posts
      .filter((post) => post.id !== ROADMAP_POST_ID)
      .map((post, index) => {
        const accent: FeedEntry["accent"] =
          index % 3 === 0 ? "cyan" : index % 3 === 1 ? "violet" : "amber";

        return {
          post,
          kind: "live" as const,
          accent,
          eyebrow: post.imageUrl ? "Visual proof" : "Live network post",
        };
      }),
  ];

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="noise-overlay" />
        <div className="app-grid flex min-h-screen items-center justify-center">
          <div className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-slate-300">
            Loading networking feed...
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
        <main className="feed-shell relative z-[1] mx-auto max-w-[1380px] px-4 pb-20 pt-8 sm:px-6 lg:px-8">
          <section className="feed-hero-grid mb-8">
            <AppSurface accent="violet" className="feed-header-card rounded-[2rem] p-6 sm:p-8">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <Link href="/dashboard" className="ghost-button">
                  <ArrowLeft className="h-4 w-4" />
                  Back to dashboard
                </Link>
                <div className="feed-kicker">
                  <ShieldCheck className="h-4 w-4" />
                  Trusted workstream feed
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div>
                  <div className="eyebrow mb-4">Networking and work proofs</div>
                  <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">
                    Beautiful delivery stories, proof-of-work, and platform trust in one intentional feed.
                  </h1>
                  <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                    Telecode posts should feel like production artifacts, not loose status updates. This surface now
                    highlights momentum, validation, and safety signals with more clarity and calm.
                  </p>
                </div>

                <div className="feed-summary-stack">
                  <div className="feed-summary-tile">
                    <span className="feed-summary-label">Live posts</span>
                    <span className="feed-summary-value">{posts.length}</span>
                  </div>
                  <div className="feed-summary-tile">
                    <span className="feed-summary-label">Trust layer</span>
                    <span className="feed-summary-value">Escrow-ready</span>
                  </div>
                  <div className="feed-summary-tile">
                    <span className="feed-summary-label">Pinned brief</span>
                    <span className="feed-summary-value">Safety roadmap</span>
                  </div>
                </div>
              </div>
            </AppSurface>
          </section>

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              <AppSurface accent="violet" className="feed-composer-shell rounded-[2rem] p-5 sm:p-6">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-semibold text-white ${getAvatarClass(currentUser?.role || "CLIENT")}`}>
                      {getInitials(currentUser?.name)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{currentUser?.name}</div>
                      <div className="text-xs uppercase tracking-[0.22em] text-slate-400">{currentUser?.role}</div>
                    </div>
                  </div>

                  <div className="feed-composer-aside">
                    <span className="feed-role-chip feed-role-chip--violet">Post with clarity</span>
                    <p className="text-xs leading-6 text-slate-400">
                      Share launch notes, delivery proof, or a clean handoff moment.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmit}>
                  <textarea
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    placeholder="Broadcast a launch, proof-of-work, milestone outcome, or upgrade note..."
                    className="glass-input min-h-32 resize-none border-white/8 bg-black/15 text-[15px] leading-7"
                  />

                  {(showAttachImage || showAttachUrl) && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {showAttachImage && (
                        <label className="feed-input-stack">
                          <span className="feed-input-label">Preview image URL</span>
                          <input
                            type="text"
                            value={imageUrl}
                            onChange={(event) => setImageUrl(event.target.value)}
                            placeholder="https://images.unsplash.com/photo-..."
                            className="glass-input py-3 text-sm"
                          />
                        </label>
                      )}

                      {showAttachUrl && (
                        <label className="feed-input-stack">
                          <span className="feed-input-label">Live website URL</span>
                          <input
                            type="text"
                            value={linkUrl}
                            onChange={(event) => setLinkUrl(event.target.value)}
                            placeholder="https://mywebsite.com"
                            className="glass-input py-3 text-sm"
                          />
                        </label>
                      )}
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAttachImage((current) => !current)}
                        className={`ghost-button px-3 py-2 text-xs ${showAttachImage ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-200" : ""}`}
                      >
                        <ImageIcon className="h-3.5 w-3.5" />
                        Media
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAttachUrl((current) => !current)}
                        className={`ghost-button px-3 py-2 text-xs ${showAttachUrl ? "border-amber-400/30 bg-amber-400/10 text-amber-200" : ""}`}
                      >
                        <Link2 className="h-3.5 w-3.5" />
                        Link
                      </button>
                    </div>

                    <button type="submit" className="action-button action-button--primary px-5 py-2.5 text-sm">
                      <Send className="h-3.5 w-3.5" />
                      Publish post
                    </button>
                  </div>
                </form>
              </AppSurface>

              <div className="space-y-5">
                {feedEntries.map(({ post, kind, accent, eyebrow }, index) => {
                  const comments = postComments[post.id] || [];
                  const isPostLiked = likedPosts[post.id] || false;
                  const { cleanContent, linkPath } = extractPostLink(post.content);
                  const canLike = kind === "live";
                  const interactionLabel = kind === "system" ? "Platform brief" : "Proof of delivery";

                  return (
                    <motion.div
                      key={post.id}
                      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: reduceMotion ? 0 : index * 0.05, duration: 0.32 }}
                    >
                      <AppSurface
                        accent={accent}
                        className={`feed-post-card rounded-[2rem] p-5 sm:p-6 ${kind === "system" ? "feed-post-card--featured" : ""}`}
                      >
                        <div className="feed-grid-lines" aria-hidden="true" />

                        <div className="relative z-[1]">
                          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold text-white ${getAvatarClass(post.author.role)}`}>
                                {getInitials(post.author.name)}
                              </div>

                              <div className="min-w-0">
                                <div className="mb-1 flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    className="truncate text-left text-base font-semibold text-white transition-colors duration-200 hover:text-amber-200"
                                    onClick={() => {
                                      if (kind === "live") {
                                        router.push(`/profile/${post.author.id}`);
                                      }
                                    }}
                                  >
                                    {post.author.name}
                                  </button>
                                  <span className={getRoleChipClass(post.author.role)}>{post.author.role}</span>
                                  <span className="feed-mini-badge">{eyebrow}</span>
                                </div>
                                <p className="truncate text-sm text-slate-400">{getAuthorHeadline(post)}</p>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Published</div>
                              <div className="mt-1 text-sm text-slate-300">{formatPostDate(post.createdAt)}</div>
                            </div>
                          </div>

                          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
                            <div>
                              <p className="text-[15px] leading-8 whitespace-pre-line text-slate-100">{cleanContent}</p>

                              {linkPath && (
                                <a
                                  href={linkPath}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="feed-link-card mt-5 flex items-center justify-between gap-4 rounded-[1.5rem] p-4"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="feed-link-icon">
                                      <Link2 className="h-4 w-4" />
                                    </div>
                                    <div>
                                      <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/80">
                                        Live showcase preview
                                      </div>
                                      <div className="mt-1 text-sm font-medium text-white">
                                        {linkPath.replace(/^https?:\/\//i, "")}
                                      </div>
                                    </div>
                                  </div>
                                  <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" />
                                </a>
                              )}

                              {post.imageUrl && (
                                <div className="mt-5 overflow-hidden rounded-[1.75rem] border border-white/8 bg-black/15">
                                  <img
                                    src={post.imageUrl}
                                    alt="Attached work preview"
                                    className="h-auto max-h-[28rem] w-full object-cover transition-transform duration-300 motion-reduce:transform-none hover:scale-[1.01]"
                                  />
                                </div>
                              )}
                            </div>

                            <div className="feed-side-rail">
                              <div className="feed-rail-block">
                                <span className="feed-rail-label">Signal</span>
                                <span className="feed-rail-value">{kind === "system" ? "Upgrade roadmap" : "Delivery evidence"}</span>
                              </div>
                              <div className="feed-rail-block">
                                <span className="feed-rail-label">Trust cue</span>
                                <span className="feed-rail-value">{kind === "system" ? "Admin verified" : "Profile attached"}</span>
                              </div>
                              <div className="feed-rail-block">
                                <span className="feed-rail-label">Format</span>
                                <span className="feed-rail-value">{linkPath ? "Linked post" : post.imageUrl ? "Visual post" : "Text post"}</span>
                              </div>
                            </div>
                          </div>

                          <div className="feed-action-strip mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-4">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (canLike) {
                                    void handleLike(post.id);
                                  }
                                }}
                                disabled={!canLike}
                                className={`ghost-button px-3 py-2 text-xs ${isPostLiked ? "border-rose-400/30 bg-rose-400/10 text-rose-200" : ""} ${!canLike ? "cursor-default opacity-80" : ""}`}
                              >
                                <Heart className={`h-3.5 w-3.5 ${isPostLiked ? "fill-rose-400 text-rose-400" : "text-rose-300"}`} />
                                {post.likesCount} {canLike ? "Likes" : "Acknowledgements"}
                              </button>

                              <button
                                type="button"
                                onClick={() => setActiveCommentPostId((current) => (current === post.id ? null : post.id))}
                                className={`ghost-button px-3 py-2 text-xs ${activeCommentPostId === post.id ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-200" : ""}`}
                              >
                                <MessageCircle className="h-3.5 w-3.5 text-cyan-300" />
                                {comments.length} Comments
                              </button>
                            </div>

                            <div className="feed-proof-pill">
                              {kind === "system" ? <Workflow className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
                              {interactionLabel}
                            </div>
                          </div>

                          {activeCommentPostId === post.id && (
                            <div className="mt-4 space-y-4 border-t border-white/8 pt-4">
                              {comments.length > 0 && (
                                <div className="space-y-3">
                                  {comments.map((comment) => (
                                    <div key={comment.id} className="feed-comment-card rounded-[1.25rem] p-3.5">
                                      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-semibold text-white">{comment.authorName}</span>
                                          <span className={getRoleChipClass(comment.authorRole)}>{comment.authorRole}</span>
                                        </div>
                                        <span className="text-xs text-slate-500">{comment.createdAt}</span>
                                      </div>
                                      <p className="text-sm leading-6 text-slate-300">{comment.content}</p>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={newCommentText[post.id] || ""}
                                  onChange={(event) =>
                                    setNewCommentText((current) => ({ ...current, [post.id]: event.target.value }))
                                  }
                                  placeholder="Add a thoughtful review or comment..."
                                  className="glass-input py-3 text-sm"
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      handleAddComment(post.id);
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleAddComment(post.id)}
                                  className="action-button action-button--primary px-4 py-2 text-xs shrink-0"
                                >
                                  <Send className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </AppSurface>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <aside className="space-y-5 xl:sticky xl:top-24">
              <AppSurface accent="cyan" className="rounded-[2rem] p-5">
                <div className="mb-3 flex items-center gap-2 text-cyan-300">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-[0.22em]">Network pulse</span>
                </div>
                <p className="text-sm leading-7 text-slate-300">
                  Every post is designed to read like a proof artifact: who shipped, what moved, and why it can be trusted.
                </p>
              </AppSurface>

              <AppSurface accent="amber" className="rounded-[2rem] p-5">
                <div className="mb-4 flex items-center gap-2 text-amber-300">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-[0.22em]">Trust index</span>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="feed-metric-row">
                    <span>Verified coder splits</span>
                    <strong>60% developer</strong>
                  </div>
                  <div className="feed-metric-row">
                    <span>Active escrow ledger</span>
                    <strong>$145,200</strong>
                  </div>
                  <div className="feed-metric-row">
                    <span>Hunters connected</span>
                    <strong>48 live</strong>
                  </div>
                </div>
              </AppSurface>

              <AppSurface accent="violet" className="rounded-[2rem] p-5">
                <div className="mb-4 flex items-center gap-2 text-violet-300">
                  <Workflow className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-[0.22em]">Upgrade brief</span>
                </div>
                <div className="space-y-3 text-sm leading-7 text-slate-300">
                  <p>Feed presentation now leans into stronger trust cues, larger reading rhythm, and calmer block structure.</p>
                  <p>Backend logic remains untouched. This pass is purely about how platform work is seen and understood.</p>
                </div>
              </AppSurface>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
