import test from "node:test";
import assert from "node:assert/strict";
import {
  canStartPull,
  getPullDistance,
  isHorizontalGesture,
  MAX_PULL_DISTANCE_PX,
  PULL_TO_REFRESH_THRESHOLD_PX,
  shouldTriggerPullRefresh,
} from "./pullToRefresh.js";

test("pull distance is resisted, bounded, and returns to zero when cancelled", () => {
  assert.equal(getPullDistance(-20), 0);
  assert.equal(getPullDistance(20), 13);
  assert.equal(getPullDistance(1000), MAX_PULL_DISTANCE_PX);
});

test("only a sufficiently long pull with an available refresh handler triggers", () => {
  assert.equal(shouldTriggerPullRefresh(PULL_TO_REFRESH_THRESHOLD_PX - 1, true), false);
  assert.equal(shouldTriggerPullRefresh(PULL_TO_REFRESH_THRESHOLD_PX, true), true);
  assert.equal(shouldTriggerPullRefresh(MAX_PULL_DISTANCE_PX, false), false);
});

test("horizontal gestures are distinguished from downward pulls", () => {
  assert.equal(isHorizontalGesture(50, 10), true);
  assert.equal(isHorizontalGesture(5, 30), false);
});

test("pull can start only at the top on one non-interactive touch with a refresh handler", () => {
  const start = { atTop: true, touchCount: 1, interactive: false, hasRefreshHandler: true };
  assert.equal(canStartPull(start), true);
  assert.equal(canStartPull({ ...start, atTop: false }), false);
  assert.equal(canStartPull({ ...start, touchCount: 2 }), false);
  assert.equal(canStartPull({ ...start, interactive: true }), false);
  assert.equal(canStartPull({ ...start, hasRefreshHandler: false }), false);
});
