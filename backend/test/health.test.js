import test from "node:test";
import assert from "node:assert/strict";

const baseUrl = process.env.TEST_API_URL || "http://localhost:5000";

test("API liveness endpoint responds successfully", async () => {
  const response = await fetch(`${baseUrl}/api/health/live`);

  assert.equal(response.status, 200);

  const body = await response.json();

  assert.equal(body.success, true);
  assert.equal(body.status, "alive");
});

test("API root endpoint responds successfully", async () => {
  const response = await fetch(`${baseUrl}/`);

  assert.equal(response.status, 200);

  const body = await response.json();

  assert.equal(body.success, true);
  assert.equal(body.status, "operational");
});

test("Unknown API route returns 404", async () => {
  const response = await fetch(`${baseUrl}/api/route-that-does-not-exist`);

  assert.equal(response.status, 404);
});