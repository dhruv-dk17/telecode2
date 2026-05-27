"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Share2,
  Send,
  Sparkles,
  Link2,
  Image as ImageIcon,
  CheckCircle,
  User,
  ExternalLink,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { AppSurface } from "@/components/ui/AppSurface";
import { TiltCard } from "@/components/ui/TiltCard";
import { getCurrentUserAction } from "@/app/actions/auth";
import { createPostAction, getPostsAction, likePostAction } from "@/app/actions/posts";
import { useStore } from "@/store/useStore";
import type { PlatformPost } from "@/lib/platform/types";

// Seed some highly visual mock comments to make the feed feel active
interface MockComment {
  id: string;
  authorName: string;
  authorRole: string;
  content: string;
  createdAt: string;
}

const seededComments: Record<string, MockComment[]> = {
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
      content: "Agrred. Clear visibility of deliverables in holding is exactly what I wanted.",
      createdAt: "6h ago",
    },
  ],
};

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
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
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
      // Sort posts by createdAt desc to show newest first
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
    if (!content.trim()) return;

    // We can embed link descriptions directly in content if both are provided
    let finalContent = content;
    if (linkUrl.trim()) {
      finalContent += `\n\n🔗 Live Website: ${linkUrl.trim()}`;
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
    // Optimistic UI updates
    setLikedPosts(current => ({ ...current, [postId]: !current[postId] }));
    setPosts(current =>
      current.map(p => {
        if (p.id === postId) {
          const isLiked = likedPosts[postId];
          return {
            ...p,
            likesCount: isLiked ? p.likesCount - 1 : p.likesCount + 1,
          };
        }
        return p;
      })
    );
    await likePostAction(postId);
  }

  function handleAddComment(postId: string) {
    const text = newCommentText[postId] || "";
    if (!text.trim() || !currentUser) return;

    const newComment: MockComment = {
      id: `c-${Date.now()}`,
      authorName: currentUser.name || "User",
      authorRole: currentUser.role,
      content: text.trim(),
      createdAt: "Just now",
    };

    setPostComments(current => ({
      ...current,
      [postId]: [...(current[postId] || []), newComment],
    }));

    setNewCommentText(current => ({ ...current, [postId]: "" }));
  }

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
        <main className="relative z-[1] mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6">
          
          {/* Header */}
          <div className="mb-8 flex flex-wrap items-center gap-4">
            <Link href="/dashboard" className="ghost-button">
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Link>
            <div>
              <div className="text-xs uppercase tracking-[0.28em] text-slate-400">Networking & Work Proofs</div>
              <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-white">The Telecode Ledger Feed</h1>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-[1fr_300px] items-start">
            
            {/* Main feed */}
            <div className="space-y-6">
              
              {/* Post composer */}
              <AppSurface accent="violet" className="rounded-[2rem] p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-violet-400/20 bg-violet-400/10 text-violet-300 font-bold">
                    {currentUser?.name?.charAt(0) || "U"}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{currentUser?.name}</div>
                    <div className="text-xs text-slate-400 uppercase tracking-wider">{currentUser?.role}</div>
                  </div>
                </div>

                <form onSubmit={handleSubmit}>
                  <textarea
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    placeholder="Broadcast a launch, proof-of-work, or coding win..."
                    className="glass-input min-h-24 resize-none bg-black/10 border-white/5 focus:border-violet-400/30"
                  />

                  {/* Optional Attachments */}
                  {showAttachImage && (
                    <div className="mt-3">
                      <label className="block text-xs uppercase tracking-widest text-slate-400 mb-1">Image URL (Unsplash/Imgur)</label>
                      <input
                        type="text"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/photo-..."
                        className="glass-input py-2 text-sm bg-black/20"
                      />
                    </div>
                  )}

                  {showAttachUrl && (
                    <div className="mt-3">
                      <label className="block text-xs uppercase tracking-widest text-slate-400 mb-1">Live Website URL</label>
                      <input
                        type="text"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="https://mywebsite.com"
                        className="glass-input py-2 text-sm bg-black/20"
                      />
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAttachImage(!showAttachImage)}
                        className={`ghost-button py-2 px-3 text-xs ${showAttachImage ? 'border-violet-400 bg-violet-400/10 text-violet-300' : ''}`}
                      >
                        <ImageIcon className="h-3.5 w-3.5" />
                        <span>Media</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAttachUrl(!showAttachUrl)}
                        className={`ghost-button py-2 px-3 text-xs ${showAttachUrl ? 'border-violet-400 bg-violet-400/10 text-violet-300' : ''}`}
                      >
                        <Link2 className="h-3.5 w-3.5" />
                        <span>Link</span>
                      </button>
                    </div>

                    <button type="submit" className="action-button action-button--primary py-2 px-5 text-sm">
                      <Send className="h-3.5 w-3.5" />
                      <span>Post</span>
                    </button>
                  </div>
                </form>
              </AppSurface>

              {/* Feed posts */}
              <div className="space-y-5">
                {posts.map((post, index) => {
                  const comments = postComments[post.id] || [];
                  const isPostLiked = likedPosts[post.id] || false;
                  
                  // Simple link preview parser
                  const hasLink = post.content.includes("🔗 Live Website:");
                  const cleanContent = hasLink ? post.content.split("🔗 Live Website:")[0] : post.content;
                  const linkPath = hasLink ? post.content.split("🔗 Live Website:")[1]?.trim() : "";

                  return (
                    <motion.div
                      key={post.id}
                      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                    >
                      <AppSurface accent={index % 2 === 0 ? "amber" : "cyan"} className="rounded-[2rem] p-6 developer-card">
                        
                        {/* Author info */}
                        <div className="flex items-center justify-between gap-4 mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-11 w-11 items-center justify-center rounded-full border text-white font-bold text-lg bg-white/5 ${
                              post.author.role === "DEVELOPER" ? "border-cyan-400/20" : 
                              post.author.role === "HUNTER" ? "border-amber-400/20" : "border-violet-400/20"
                            }`}>
                              {post.author.name?.charAt(0) || "U"}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-white hover:underline cursor-pointer" onClick={() => router.push(`/profile/${post.author.id}`)}>
                                  {post.author.name}
                                </span>
                                <span className={`text-[0.6rem] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border ${
                                  post.author.role === "DEVELOPER" ? "text-cyan-300 border-cyan-400/20 bg-cyan-400/5" :
                                  post.author.role === "HUNTER" ? "text-amber-300 border-amber-400/20 bg-amber-400/5" :
                                  "text-violet-300 border-violet-400/20 bg-violet-400/5"
                                }`}>
                                  {post.author.role}
                                </span>
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5">
                                {post.author.devProfile?.headline || post.author.clientProfile?.headline || "Telecode Member"}
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-slate-500">
                            {new Date(post.createdAt).toLocaleDateString()}
                          </div>
                        </div>

                        {/* Post content */}
                        <p className="text-sm leading-8 text-slate-200 whitespace-pre-line">{cleanContent}</p>

                        {/* Link Preview Card */}
                        {hasLink && linkPath && (
                          <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4 hover:bg-black/40 transition">
                            <div className="flex items-center justify-between gap-3">
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
                              <span className="text-[0.65rem] uppercase tracking-wider bg-cyan-300/10 text-cyan-200 px-2 py-1 rounded">Proof-of-work</span>
                            </div>
                          </div>
                        )}

                        {/* Image Attachment Mocks */}
                        {post.imageUrl && (
                          <div className="mt-4 rounded-2xl overflow-hidden border border-white/5 bg-black/10">
                            <img src={post.imageUrl} alt="Attached Work Preview" className="w-full max-h-96 object-cover hover:scale-[1.01] transition duration-300" />
                          </div>
                        )}

                        {/* Post Interactions */}
                        <div className="mt-6 flex flex-wrap gap-2 border-t border-white/5 pt-4 justify-between">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => void handleLike(post.id)}
                              className={`ghost-button py-1.5 px-3 text-xs gap-1.5 ${isPostLiked ? 'border-rose-400/30 bg-rose-400/10 text-rose-300' : ''}`}
                            >
                              <Heart className={`h-3.5 w-3.5 ${isPostLiked ? 'fill-rose-400 text-rose-400' : 'text-rose-300'}`} />
                              <span>{post.likesCount} Likes</span>
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => setActiveCommentPostId(activeCommentPostId === post.id ? null : post.id)}
                              className={`ghost-button py-1.5 px-3 text-xs gap-1.5 ${activeCommentPostId === post.id ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300' : ''}`}
                            >
                              <MessageCircle className="h-3.5 w-3.5 text-cyan-300" />
                              <span>{comments.length} Comments</span>
                            </button>
                          </div>

                          <div className="ghost-button py-1.5 px-3 text-xs gap-1.5 cursor-default select-none border-white/5 bg-white/5">
                            <Sparkles className="h-3.5 w-3.5 text-violet-300" />
                            <span>Proof of Delivery</span>
                          </div>
                        </div>

                        {/* Comment section */}
                        {activeCommentPostId === post.id && (
                          <div className="mt-4 border-t border-white/5 pt-4 space-y-4">
                            
                            {/* Existing comments */}
                            {comments.length > 0 && (
                              <div className="space-y-3">
                                {comments.map((comment) => (
                                  <div key={comment.id} className="rounded-xl bg-black/20 p-3.5 border border-white/5 text-xs">
                                    <div className="flex items-center justify-between gap-3 mb-1.5">
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold text-white">{comment.authorName}</span>
                                        <span className="text-[0.55rem] uppercase tracking-wider px-1.5 py-0.5 rounded border border-white/10 text-slate-400 bg-white/5">
                                          {comment.authorRole}
                                        </span>
                                      </div>
                                      <span className="text-slate-500">{comment.createdAt}</span>
                                    </div>
                                    <p className="text-slate-300 leading-6">{comment.content}</p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Create comment form */}
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={newCommentText[post.id] || ""}
                                onChange={(e) => setNewCommentText(current => ({ ...current, [post.id]: e.target.value }))}
                                placeholder="Add a thoughtful review or comment..."
                                className="glass-input py-2 text-xs bg-black/30 border-white/10"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddComment(post.id);
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleAddComment(post.id)}
                                className="action-button action-button--primary py-1 px-4 text-xs shrink-0"
                              >
                                <Send className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </AppSurface>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Sidebar Stats Panel */}
            <div className="space-y-5">
              
              <AppSurface accent="cyan" className="rounded-[2rem] p-5">
                <div className="flex items-center gap-2 text-cyan-300 font-semibold mb-3">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-widest">Network Pulse</span>
                </div>
                <div className="text-sm leading-6 text-slate-300">
                  Every post shown here is cryptographic proof of delivery. Developers showcase their live web products and client sign-offs.
                </div>
              </AppSurface>

              <AppSurface accent="amber" className="rounded-[2rem] p-5">
                <div className="flex items-center gap-2 text-amber-300 font-semibold mb-3">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-widest">Trust Index</span>
                </div>
                <div className="space-y-3 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>Verified Coder Splits</span>
                    <span className="text-white font-semibold">60% Developer</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Escrow Ledger</span>
                    <span className="text-white font-semibold">$145,200</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Hunters Connected</span>
                    <span className="text-white font-semibold">48 Hunters</span>
                  </div>
                </div>
              </AppSurface>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
