"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserAction } from "@/app/actions/auth";
import { getDealForUser, saveAiSummary, submitMessage } from "@/lib/platform/service";
import type { PlatformAiSummary } from "@/lib/platform/types";

function requireUser<T>(user: T | null): T {
  if (!user) {
    throw new Error("Unauthorized.");
  }

  return user;
}

export async function sendMessageAction(dealId: string, content: string) {
  try {
    const user = requireUser(await getCurrentUserAction());
    const message = await submitMessage(user, dealId, content);
    revalidatePath(`/workspace/${dealId}`);
    return { success: true, message };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send message.";
    return { success: false, error: message };
  }
}

export async function getMessagesAction(dealId: string) {
  try {
    const user = await getCurrentUserAction();
    if (!user) {
      return [];
    }

    const deal = await getDealForUser(user, dealId);
    return deal?.messages || [];
  } catch {
    return [];
  }
}

export async function saveAiSummaryAction(dealId: string, data: PlatformAiSummary) {
  try {
    const user = requireUser(await getCurrentUserAction());
    const aiSummary = await saveAiSummary(user, dealId, data);
    revalidatePath(`/workspace/${dealId}`);
    return { success: true, aiSummary };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save AI summary.";
    return { success: false, error: message };
  }
}
