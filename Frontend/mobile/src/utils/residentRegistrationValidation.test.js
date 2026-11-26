import test from "node:test";
import assert from "node:assert/strict";
import { isUsableLiveFace } from "./residentRegistrationValidation.js";

test("requires a confident, centered, sufficiently large single live-face candidate", () => {
  const candidate = {
    detection: {
      score: 0.9,
      box: { x: 180, y: 70, width: 240, height: 300 },
    },
  };
  assert.equal(isUsableLiveFace(candidate, 600, 480), true);
  assert.equal(
    isUsableLiveFace({ ...candidate, detection: { ...candidate.detection, score: 0.4 } }, 600, 480),
    false
  );
});
