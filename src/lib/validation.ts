const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UPPERCASE_PATTERN = /[A-Z]/;
const LOWERCASE_PATTERN = /[a-z]/;
const NUMBER_PATTERN = /\d/;
const SYMBOL_PATTERN = /[^A-Za-z0-9]/;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function validateEmail(email: string) {
  const normalized = normalizeEmail(email);
  if (!EMAIL_PATTERN.test(normalized)) {
    throw new Error("Enter a valid email address.");
  }

  return normalized;
}

export function validateName(name: string) {
  const normalized = name.trim();
  if (normalized.length < 2) {
    throw new Error("Enter your full name.");
  }

  return normalized;
}

export function validatePassword(password: string) {
  const normalized = password.trim();
  if (normalized.length < 10) {
    throw new Error("Password must be at least 10 characters long.");
  }
  if (!UPPERCASE_PATTERN.test(normalized)) {
    throw new Error("Password must include an uppercase letter.");
  }
  if (!LOWERCASE_PATTERN.test(normalized)) {
    throw new Error("Password must include a lowercase letter.");
  }
  if (!NUMBER_PATTERN.test(normalized)) {
    throw new Error("Password must include a number.");
  }
  if (!SYMBOL_PATTERN.test(normalized)) {
    throw new Error("Password must include a symbol.");
  }

  return normalized;
}
