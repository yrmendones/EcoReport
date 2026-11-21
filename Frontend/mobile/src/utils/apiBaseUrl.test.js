import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_PRODUCTION_API_URL,
  resolveApiBaseUrl,
} from "./apiBaseUrl.js";

test("development uses Vite's relative API proxy", () => {
  assert.equal(
    resolveApiBaseUrl({ isDevelopment: true, configuredUrl: "https://api.example.test/" }),
    ""
  );
});

test("production uses the deployed Railway API if VITE_API_URL is missing", () => {
  assert.equal(resolveApiBaseUrl({ isDevelopment: false }), DEFAULT_PRODUCTION_API_URL);
  assert.equal(resolveApiBaseUrl({ isDevelopment: false, configuredUrl: "  " }), DEFAULT_PRODUCTION_API_URL);
});

test("production replaces a localhost API override that cannot be reached from a resident's phone", () => {
  assert.equal(
    resolveApiBaseUrl({ isDevelopment: false, configuredUrl: "http://localhost:5000" }),
    DEFAULT_PRODUCTION_API_URL
  );
});

test("a configured production API URL overrides the fallback and drops trailing slashes", () => {
  assert.equal(
    resolveApiBaseUrl({ isDevelopment: false, configuredUrl: "https://api.example.test/// " }),
    "https://api.example.test"
  );
});
