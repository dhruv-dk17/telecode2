"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserAction } from "@/app/actions/auth";
import {
  createDealForHunter,
  getDealsForUser,
  transitionDealState,
  updateMilestoneStatus,
  getDevelopers,
  proposeDealToDeveloper,
  respondToDealProposal,
  updateClientRequirementsAndPayUPI,
  submitFinalDelivery,
  approveFinalDelivery,
} from "@/lib/platform/service";
import type { DealState } from "@/lib/platform/types";

function requireUser<T>(user: T | null): T {
  if (!user) {
    throw new Error("Unauthorized.");
  }

  return user;
}

export async function createDealAction(data: {
  title: string;
  description: string;
  budget: number;
  timelineWeeks: number;
  developerSplit: number;
  hunterSplit: number;
}) {
  try {
    const user = requireUser(await getCurrentUserAction());
    const deal = await createDealForHunter(user, data);
    revalidatePath("/dashboard");
    return { success: true, dealId: deal.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create deal.";
    return { success: false, error: message };
  }
}

export async function getDealsAction() {
  try {
    const user = await getCurrentUserAction();
    if (!user) {
      return [];
    }

    return getDealsForUser(user);
  } catch {
    return [];
  }
}

export async function updateDealStateAction(dealId: string, state: DealState) {
  try {
    const user = requireUser(await getCurrentUserAction());
    await transitionDealState(user, dealId, state);
    revalidatePath("/dashboard");
    revalidatePath(`/workspace/${dealId}`);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to change deal state.";
    return { success: false, error: message };
  }
}

export async function submitMilestoneAction(dealId: string, milestoneId: string) {
  try {
    const user = requireUser(await getCurrentUserAction());
    await updateMilestoneStatus(user, dealId, milestoneId, "submit");
    revalidatePath(`/workspace/${dealId}`);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit milestone.";
    return { success: false, error: message };
  }
}

export async function approveMilestoneAction(dealId: string, milestoneId: string) {
  try {
    const user = requireUser(await getCurrentUserAction());
    await updateMilestoneStatus(user, dealId, milestoneId, "approve");
    revalidatePath(`/workspace/${dealId}`);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to approve milestone.";
    return { success: false, error: message };
  }
}

export async function requestRevisionAction(dealId: string, milestoneId: string) {
  try {
    const user = requireUser(await getCurrentUserAction());
    await updateMilestoneStatus(user, dealId, milestoneId, "revision");
    revalidatePath(`/workspace/${dealId}`);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to request revision.";
    return { success: false, error: message };
  }
}

export async function getDevelopersAction() {
  try {
    return await getDevelopers();
  } catch {
    return [];
  }
}

export async function proposeDealAction(developerId: string, dealId: string, message: string) {
  try {
    const user = requireUser(await getCurrentUserAction());
    await proposeDealToDeveloper(user, developerId, dealId, message);
    revalidatePath("/dashboard");
    revalidatePath(`/workspace/${dealId}`);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to propose deal.";
    return { success: false, error: message };
  }
}

export async function respondProposalAction(dealId: string, accept: boolean, explanation: string) {
  try {
    const user = requireUser(await getCurrentUserAction());
    await respondToDealProposal(user, dealId, accept, explanation);
    revalidatePath("/dashboard");
    revalidatePath(`/workspace/${dealId}`);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to respond to proposal.";
    return { success: false, error: message };
  }
}

export async function submitUpiPaymentAction(dealId: string, requirements: string, upiId: string) {
  try {
    const user = requireUser(await getCurrentUserAction());
    await updateClientRequirementsAndPayUPI(user, dealId, requirements, upiId);
    revalidatePath("/dashboard");
    revalidatePath(`/workspace/${dealId}`);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process UPI payment.";
    return { success: false, error: message };
  }
}

export async function markFinalDoneAction(dealId: string) {
  try {
    const user = requireUser(await getCurrentUserAction());
    await submitFinalDelivery(user, dealId);
    revalidatePath(`/workspace/${dealId}`);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit final work.";
    return { success: false, error: message };
  }
}

export async function signOffAction(dealId: string) {
  try {
    const user = requireUser(await getCurrentUserAction());
    await approveFinalDelivery(user, dealId);
    revalidatePath(`/workspace/${dealId}`);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit sign-off approval.";
    return { success: false, error: message };
  }
}
