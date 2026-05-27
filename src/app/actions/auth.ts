"use server";

import { clearSessionCookie, readSessionCookie, writeSessionCookie } from "@/lib/session";
import { clearRateLimit, enforceRateLimit } from "@/lib/rate-limit";
import {
  authenticateUser,
  createUser,
  isDatabaseReady,
  requestPasswordReset,
  resetPassword,
} from "@/lib/platform/service";
import type { Role, SessionUser } from "@/lib/platform/types";
import { normalizeEmail, validateEmail } from "@/lib/validation";

export type UserSession = SessionUser;

type PasswordResetRequestResult = {
  success: boolean;
  message?: string;
  devToken?: string;
  expiresAt?: string;
  error?: string;
};

export async function checkDbConnection() {
  return isDatabaseReady();
}

export async function signUpAction(
  email: string,
  name: string,
  role: Role,
  password?: string,
): Promise<{ success: boolean; user?: UserSession; error?: string }> {
  try {
    const normalizedEmail = validateEmail(email);
    enforceRateLimit(`signup:${normalizedEmail}`, { maxAttempts: 4 });

    if (!password) {
      throw new Error("Password is required.");
    }

    const user = await createUser({ email: normalizedEmail, name, role, password });
    clearRateLimit(`signup:${normalizedEmail}`);
    await writeSessionCookie(user);
    return { success: true, user };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Signup failed.";
    return { success: false, error: message };
  }
}

export async function loginAction(
  email: string,
  password?: string,
): Promise<{ success: boolean; user?: UserSession; error?: string }> {
  try {
    const normalizedEmail = normalizeEmail(email);
    enforceRateLimit(`login:${normalizedEmail}`, { maxAttempts: 5 });

    if (!password) {
      throw new Error("Password is required.");
    }

    const user = await authenticateUser(normalizedEmail, password);
    clearRateLimit(`login:${normalizedEmail}`);
    await writeSessionCookie(user);
    return { success: true, user };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed.";
    return { success: false, error: message };
  }
}

export async function signInWithGoogleAction() {
  return {
    success: false,
    error:
      "Google OAuth is scaffolded in the platform plan, but this local repo is currently running in signed-session mode only.",
  };
}

export async function getCurrentUserAction(): Promise<UserSession | null> {
  return readSessionCookie();
}

export async function requestPasswordResetAction(email: string): Promise<PasswordResetRequestResult> {
  try {
    const normalizedEmail = validateEmail(email);
    enforceRateLimit(`password-reset-request:${normalizedEmail}`, { maxAttempts: 3, blockMs: 30 * 60 * 1000 });
    const result = await requestPasswordReset(normalizedEmail);
    return {
      success: true,
      message: "If an account exists for this email, a reset link has been issued.",
      devToken: result.tokenPreview,
      expiresAt: result.expiresAt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process reset request.";
    return { success: false, error: message };
  }
}

export async function resetPasswordAction(
  email: string,
  token: string,
  newPassword: string,
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const normalizedEmail = validateEmail(email);
    enforceRateLimit(`password-reset-consume:${normalizedEmail}`, { maxAttempts: 5, blockMs: 30 * 60 * 1000 });
    await resetPassword({ email: normalizedEmail, token, newPassword });
    clearRateLimit(`password-reset-consume:${normalizedEmail}`);
    return { success: true, message: "Password updated. You can sign in now." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to reset password.";
    return { success: false, error: message };
  }
}

export async function logoutAction() {
  await clearSessionCookie();
  return { success: true };
}
