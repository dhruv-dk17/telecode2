"use server";

import {
  authenticateAuthUser,
  consumePasswordReset,
  createAuthUser,
  createPasswordResetRequest,
} from "@/lib/auth-store";
import { clearRateLimit, enforceRateLimit } from "@/lib/rate-limit";
import {
  authenticateUser as authenticateMockUser,
  createUser as createMockUser,
  isDatabaseReady,
  requestPasswordReset as requestMockPasswordReset,
  resetPassword as resetMockPasswordReset,
} from "@/lib/platform/service";
import { createSession, getCurrentSessionUser, revokeCurrentSession } from "@/lib/session";
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

    const user = (await isDatabaseReady())
      ? await createAuthUser({ email: normalizedEmail, name, role, password })
      : await createMockUser({ email: normalizedEmail, name, role, password });
    clearRateLimit(`signup:${normalizedEmail}`);
    await createSession(user);
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

    const user = (await isDatabaseReady())
      ? await authenticateAuthUser(normalizedEmail, password)
      : await authenticateMockUser(normalizedEmail, password);
    clearRateLimit(`login:${normalizedEmail}`);
    await createSession(user);
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
      "Google OAuth is scaffolded in the platform plan, but this repo is not yet wired to a live provider configuration.",
  };
}

export async function getCurrentUserAction(): Promise<UserSession | null> {
  return getCurrentSessionUser();
}

export async function requestPasswordResetAction(email: string): Promise<PasswordResetRequestResult> {
  try {
    const normalizedEmail = validateEmail(email);
    enforceRateLimit(`password-reset-request:${normalizedEmail}`, { maxAttempts: 3, blockMs: 30 * 60 * 1000 });
    const result = (await isDatabaseReady())
      ? await createPasswordResetRequest(normalizedEmail)
      : await requestMockPasswordReset(normalizedEmail);
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
    if (await isDatabaseReady()) {
      await consumePasswordReset({ email: normalizedEmail, token, newPassword });
    } else {
      await resetMockPasswordReset({ email: normalizedEmail, token, newPassword });
    }
    clearRateLimit(`password-reset-consume:${normalizedEmail}`);
    return { success: true, message: "Password updated. You can sign in now." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to reset password.";
    return { success: false, error: message };
  }
}

export async function logoutAction() {
  await revokeCurrentSession();
  return { success: true };
}
