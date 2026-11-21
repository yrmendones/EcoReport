export const AUTH_NOTICE_STORAGE_KEY = "ecoreport.authNotice";

const AUTH_FAILURE_MESSAGES = {
  ACCOUNT_DELETED:
    "Your account has been deleted or is no longer available. Please contact the administrator if you believe this is a mistake.",
  ACCOUNT_DEACTIVATED:
    "Your account is deactivated. Please contact the administrator.",
  TOKEN_EXPIRED: "Your session has expired. Please sign in again.",
  INVALID_TOKEN: "Your session is no longer valid. Please sign in again.",
  AUTHENTICATION_REQUIRED: "Please sign in again to continue.",
};

export function clearResidentSession(message, browser = globalThis.window) {
  if (!browser) return;

  try {
    browser.localStorage.removeItem("token");
    browser.localStorage.removeItem("user");
  } catch {
    // Continue to the login screen even if browser storage is unavailable.
  }

  try {
    browser.sessionStorage.setItem(AUTH_NOTICE_STORAGE_KEY, message);
  } catch {
    // The redirect still clears the protected view if sessionStorage is blocked.
  }

  browser.location.replace("/resident-login");
}

export function handleAuthenticationFailure(data, { hadToken, token, browser = globalThis.window } = {}) {
  const code = data?.code;
  const message = AUTH_FAILURE_MESSAGES[code];
  if (!message || (code === "AUTHENTICATION_REQUIRED" && !hadToken)) return false;

  // Ignore a delayed response from an earlier account after another account
  // has signed in in a different tab.
  if (token) {
    try {
      if (browser?.localStorage.getItem("token") !== token) return false;
    } catch {
      return false;
    }
  }

  clearResidentSession(message, browser);
  return true;
}
