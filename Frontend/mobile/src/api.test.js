import test from "node:test";
import assert from "node:assert/strict";

globalThis.localStorage = {
  getItem: () => null,
};

const { apiFetch } = await import("./api.js");

test("coalesces identical in-flight GET requests", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  let completeRequest;
  globalThis.fetch = () => {
    calls += 1;
    return new Promise((resolve) => {
      completeRequest = () => resolve({
        ok: true,
        status: 200,
        json: async () => ({ value: 7 }),
      });
    });
  };

  try {
    const first = apiFetch("/api/test");
    const second = apiFetch("/api/test");
    await Promise.resolve();
    assert.equal(calls, 1);

    completeRequest();
    assert.deepEqual(await Promise.all([first, second]), [
      { value: 7 },
      { value: 7 },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("aborts a GET that remains pending past the request timeout", async () => {
  const originalFetch = globalThis.fetch;
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  globalThis.setTimeout = (callback, delay) => {
    if (delay === 30_000) {
      queueMicrotask(callback);
      return 1;
    }
    return originalSetTimeout(callback, delay);
  };
  globalThis.clearTimeout = () => {};
  globalThis.fetch = (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener(
      "abort",
      () => reject(new DOMException("The request timed out.", "AbortError")),
      { once: true }
    );
  });

  try {
    await assert.rejects(apiFetch("/api/notifications"), { name: "AbortError" });
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});
