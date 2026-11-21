import test from "node:test";
import assert from "node:assert/strict";
import {
  AUTH_NOTICE_STORAGE_KEY,
  handleAuthenticationFailure,
} from "./authSession.js";

function makeBrowser() {
  const local = new Map([["token", "old-token"], ["user", '{"role":"resident"}']]);
  const session = new Map();
  const redirects = [];
  return {
    localStorage: {
      getItem: (key) => local.get(key) ?? null,
      removeItem: (key) => local.delete(key),
      setItem: (key, value) => local.set(key, value),
    },
    sessionStorage: {
      getItem: (key) => session.get(key) ?? null,
      removeItem: (key) => session.delete(key),
      setItem: (key, value) => session.set(key, value),
    },
    location: { replace: (path) => redirects.push(path) },
    local,
    session,
    redirects,
  };
}

test("deleted-account response clears resident data and shows the specified login notice", () => {
  const browser = makeBrowser();
  const handled = handleAuthenticationFailure(
    { code: "ACCOUNT_DELETED" },
    { hadToken: true, browser }
  );

  assert.equal(handled, true);
  assert.equal(browser.localStorage.getItem("token"), null);
  assert.equal(browser.localStorage.getItem("user"), null);
  assert.match(browser.sessionStorage.getItem(AUTH_NOTICE_STORAGE_KEY), /account has been deleted/i);
  assert.deepEqual(browser.redirects, ["/resident-login"]);
});

test("expired and deactivated sessions are handled with their own notices", () => {
  for (const [code, expected] of [
    ["TOKEN_EXPIRED", /session has expired/i],
    ["ACCOUNT_DEACTIVATED", /account is deactivated/i],
  ]) {
    const browser = makeBrowser();
    assert.equal(handleAuthenticationFailure({ code }, { hadToken: true, browser }), true);
    assert.match(browser.sessionStorage.getItem(AUTH_NOTICE_STORAGE_KEY), expected);
    assert.equal(browser.localStorage.getItem("token"), null);
  }
});

test("temporary verification errors preserve the saved session for retry", () => {
  const browser = makeBrowser();
  const handled = handleAuthenticationFailure(
    { code: "AUTH_CHECK_UNAVAILABLE" },
    { hadToken: true, browser }
  );

  assert.equal(handled, false);
  assert.equal(browser.localStorage.getItem("token"), "old-token");
  assert.equal(browser.localStorage.getItem("user"), '{"role":"resident"}');
  assert.deepEqual(browser.redirects, []);
});

test("a delayed failure for the previous account cannot clear a newly signed-in account", () => {
  const browser = makeBrowser();
  browser.localStorage.setItem("token", "new-token");
  browser.localStorage.setItem("user", '{"role":"resident","user_id":87}');

  assert.equal(
    handleAuthenticationFailure(
      { code: "ACCOUNT_DELETED" },
      { hadToken: true, token: "old-token", browser }
    ),
    false
  );
  assert.equal(browser.localStorage.getItem("token"), "new-token");
  assert.equal(browser.localStorage.getItem("user"), '{"role":"resident","user_id":87}');
  assert.deepEqual(browser.redirects, []);
});

test("a missing token on a public request does not redirect to resident login", () => {
  const browser = makeBrowser();
  browser.local.clear();

  assert.equal(
    handleAuthenticationFailure(
      { code: "AUTHENTICATION_REQUIRED" },
      { hadToken: false, browser }
    ),
    false
  );
  assert.deepEqual(browser.redirects, []);
});
