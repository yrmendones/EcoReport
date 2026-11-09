// Shared password policy helper.

export const DEFAULT_PASSWORD_POLICY = {
  min: 8,
  max: 16, // enforced by VARCHAR(255) + frontend maxLength; not configurable
  requireStrong: true,
};

/**
 * Fetch the current password policy from the backend.
 */
export const fetchPasswordPolicy = async (apiFetch) => {
  try {
    const data = await apiFetch("/api/public/status");
    return {
      min: Math.min(Math.max(Number(data.min_password_length) || 8, 6), 16),
      max: 16,
      requireStrong: data.require_strong_password !== false,
    };
  } catch {
    return DEFAULT_PASSWORD_POLICY;
  }
};

/**
 * Validate a password against the policy.
 */
export const validatePassword = (password, policy = DEFAULT_PASSWORD_POLICY) => {
  if (!password) {
    return { ok: false, error: "Password is required." };
  }
  if (password.length < policy.min) {
    return {
      ok: false,
      error: `Password must be at least ${policy.min} characters.`,
    };
  }
  if (password.length > policy.max) {
    return {
      ok: false,
      error: `Password must be at most ${policy.max} characters.`,
    };
  }
  if (policy.requireStrong) {
    const hasLetter = /[A-Za-z]/.test(password);
    const hasDigit = /\d/.test(password);
    if (!hasLetter || !hasDigit) {
      return {
        ok: false,
        error: "Password must contain both letters and numbers.",
      };
    }
  }
  return { ok: true };
};