"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserAction } from "@/app/actions/auth";
import {
  acceptInviteByToken,
  createInviteForDeal,
  getDirectMessagesForUser,
  getInviteByToken,
  markDirectMessageRead,
} from "@/lib/platform/service";
import type { InviteRole } from "@/lib/platform/types";

function requireUser<T>(user: T | null): T {
  if (!user) {
    throw new Error("Unauthorized.");
  }

  return user;
}

export async function createInviteAction(input: {
  dealId: string;
  recipientEmail: string;
  recipientRole: InviteRole;
}) {
  try {
    const user = requireUser(await getCurrentUserAction());
    const result = await createInviteForDeal(user, input);
    revalidatePath("/dashboard");
    revalidatePath("/inbox");
    revalidatePath(`/workspace/${input.dealId}`);
    return { success: true, ...result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create invite.";
    return { success: false, error: message };
  }
}

export async function getInboxMessagesAction() {
  try {
    const user = await getCurrentUserAction();
    if (!user) {
      return [];
    }

    return getDirectMessagesForUser(user);
  } catch {
    return [];
  }
}

export async function getInviteByTokenAction(token: string) {
  return getInviteByToken(token);
}

export async function acceptInviteAction(token: string) {
  try {
    const user = requireUser(await getCurrentUserAction());
    const result = await acceptInviteByToken(user, token);
    revalidatePath("/dashboard");
    revalidatePath("/inbox");
    revalidatePath(`/workspace/${result.deal.id}`);
    revalidatePath(`/invite/${token}`);
    return { success: true, ...result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to accept invite.";
    return { success: false, error: message };
  }
}

export async function markInboxMessageReadAction(messageId: string) {
  try {
    const user = requireUser(await getCurrentUserAction());
    const message = await markDirectMessageRead(user, messageId);
    revalidatePath("/inbox");
    return { success: true, message };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update message.";
    return { success: false, error: message };
  }
}
