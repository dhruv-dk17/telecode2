const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UPPERCASE_PATTERN = /[A-Z]/;
const LOWERCASE_PATTERN = /[a-z]/;
const NUMBER_PATTERN = /\d/;
const SYMBOL_PATTERN = /[^A-Za-z0-9]/;
const UPI_PATTERN = /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/;

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

export function validateRequiredText(value: string, label: string, min = 2, max = 5000) {
  const normalized = value.trim();
  if (normalized.length < min) {
    throw new Error(`${label} must be at least ${min} characters.`);
  }
  if (normalized.length > max) {
    throw new Error(`${label} must be less than ${max} characters.`);
  }

  return normalized;
}

export function validateMoney(value: number, label: string, min = 1) {
  if (!Number.isFinite(value) || value < min) {
    throw new Error(`${label} must be at least ${min}.`);
  }

  return Math.round(value * 100) / 100;
}

export function validatePercentage(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`${label} must be between 0 and 100.`);
  }

  return value;
}

export function validateTimelineWeeks(value: number) {
  if (!Number.isFinite(value) || value < 1 || value > 52) {
    throw new Error("Timeline must be between 1 and 52 weeks.");
  }

  return Math.round(value);
}

export function validateUpiId(value: string) {
  const normalized = value.trim();
  if (!UPI_PATTERN.test(normalized)) {
    throw new Error("Enter a valid UPI ID.");
  }

  return normalized;
}
