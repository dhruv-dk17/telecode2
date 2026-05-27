"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserAction } from "@/app/actions/auth";
import { createPost, getPosts, likePost } from "@/lib/platform/service";

function requireUser<T>(user: T | null): T {
  if (!user) {
    throw new Error("Unauthorized.");
  }

  return user;
}

export async function createPostAction(content: string, imageUrl?: string) {
  try {
    const user = requireUser(await getCurrentUserAction());
    const post = await createPost(user, content, imageUrl);
    revalidatePath("/feed");
    return { success: true, post };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create post.";
    return { success: false, error: message };
  }
}

export async function getPostsAction() {
  return getPosts();
}

export async function likePostAction(postId: string) {
  try {
    await likePost(postId);
    revalidatePath("/feed");
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to like post.";
    return { success: false, error: message };
  }
}
