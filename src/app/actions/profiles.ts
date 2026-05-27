"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserAction } from "@/app/actions/auth";
import { getProfile, updateProfile } from "@/lib/platform/service";

function requireUser<T>(user: T | null): T {
  if (!user) {
    throw new Error("Unauthorized.");
  }

  return user;
}

export async function updateProfileDetailsAction(data: {
  headline?: string;
  bio?: string;
  location?: string;
  skills?: string[];
  stack?: string[];
  experience?: Array<{ title: string; company: string; duration: string; desc?: string }>;
  education?: Array<{ school: string; degree: string; year: string }>;
}) {
  try {
    const user = requireUser(await getCurrentUserAction());
    await updateProfile(user, data);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update profile.";
    return { success: false, error: message };
  }
}

export async function updateClientProfileAction(data: {
  companyName?: string;
  headline?: string;
  location?: string;
  website?: string;
  bio?: string;
  teamSize?: number;
  fundingStage?: string;
}) {
  try {
    const user = requireUser(await getCurrentUserAction());
    await updateProfile(user, data);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update client profile.";
    return { success: false, error: message };
  }
}

export async function getProfileDetailsAction(userId?: string) {
  const user = await getCurrentUserAction();
  const id = userId || user?.id;
  if (!id) {
    return null;
  }

  return getProfile(id);
}
