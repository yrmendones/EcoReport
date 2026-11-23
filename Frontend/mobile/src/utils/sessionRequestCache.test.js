import test from "node:test";
import assert from "node:assert/strict";
import { createSessionRequestCache } from "./sessionRequestCache.js";

test("coalesces slow requests for one session and caches the result", async () => {
  let calls = 0;
  let completeRequest;
  let currentTime = 100;
  const durations = [];
  const cache = createSessionRequestCache({
    isCurrentSession: (token) => token === "resident-a",
    now: () => currentTime,
    measure: () => currentTime,
    onDuration: (resource, duration) => durations.push([resource, duration]),
  });
  const fetcher = () => {
    calls += 1;
    return new Promise((resolve) => { completeRequest = resolve; });
  };

  const first = cache.fetch("GET /api/notifications", "resident-a", fetcher);
  const second = cache.fetch("GET /api/notifications", "resident-a", fetcher);
  assert.strictEqual(first, second);
  await Promise.resolve();
  assert.equal(calls, 1);
  assert.equal(cache.get("GET /api/notifications", "resident-a"), null);

  currentTime = 145;
  completeRequest([{ notification_id: 12 }]);
  const [firstResult, secondResult] = await Promise.all([first, second]);

  assert.deepEqual(firstResult, [{ notification_id: 12 }]);
  assert.deepEqual(secondResult, firstResult);
  assert.deepEqual(cache.get("GET /api/notifications", "resident-a"), {
    value: [{ notification_id: 12 }],
    fetchedAt: 145,
  });
  assert.deepEqual(durations, [["GET /api/notifications", 45]]);
});

test("does not cache a response after the active session changes", async () => {
  let activeToken = "resident-a";
  let completeRequest;
  const cache = createSessionRequestCache({
    isCurrentSession: (token) => token === activeToken,
  });

  const request = cache.fetch(
    "GET /api/notifications",
    "resident-a",
    () => new Promise((resolve) => { completeRequest = resolve; })
  );
  await Promise.resolve();
  activeToken = "resident-b";
  completeRequest([{ notification_id: 12 }]);
  await request;

  assert.equal(cache.get("GET /api/notifications", "resident-a"), null);
});

test("a late refresh cannot overwrite newer notification changes", async () => {
  let completeRequest;
  const cache = createSessionRequestCache();
  const request = cache.fetch(
    "GET /api/notifications",
    "resident-a",
    () => new Promise((resolve) => { completeRequest = resolve; })
  );
  await Promise.resolve();

  const updatedNotifications = [{ notification_id: 12, is_read: 1 }];
  cache.set("GET /api/notifications", "resident-a", updatedNotifications);
  completeRequest([{ notification_id: 12, is_read: 0 }]);

  assert.deepEqual(await request, updatedNotifications);
  assert.deepEqual(
    cache.get("GET /api/notifications", "resident-a")?.value,
    updatedNotifications
  );
});

test("a failed request is not cached and a later retry can succeed", async () => {
  let calls = 0;
  const cache = createSessionRequestCache();
  const fetcher = async () => {
    calls += 1;
    if (calls === 1) throw new Error("temporary network failure");
    return [{ notification_id: 13 }];
  };

  await assert.rejects(
    cache.fetch("GET /api/notifications", "resident-a", fetcher),
    /temporary network failure/
  );
  assert.equal(cache.get("GET /api/notifications", "resident-a"), null);

  assert.deepEqual(
    await cache.fetch("GET /api/notifications", "resident-a", fetcher),
    [{ notification_id: 13 }]
  );
  assert.equal(calls, 2);
});

test("cache freshness expires so callers can refresh data in the background", () => {
  let currentTime = 500;
  const cache = createSessionRequestCache({ now: () => currentTime });
  cache.set("GET /api/notifications", "resident-a", []);

  assert.equal(cache.isFresh("GET /api/notifications", "resident-a", 30), true);
  currentTime = 531;
  assert.equal(cache.isFresh("GET /api/notifications", "resident-a", 30), false);
});

test("invalidating cached data makes the next feature visit refresh it", () => {
  const cache = createSessionRequestCache();
  cache.set("GET /api/users/me/stats", "resident-a", { total: 2 });

  assert.equal(cache.delete("GET /api/users/me/stats", "resident-a"), true);
  assert.equal(cache.get("GET /api/users/me/stats", "resident-a"), null);
});
