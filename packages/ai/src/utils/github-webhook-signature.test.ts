import { describe, expect, test } from "bun:test";
import { createHmac } from "node:crypto";

import { verifyGitHubWebhookSignature } from "./github-webhook-signature";

const secret = "test-github-app-webhook-secret";
const payload = '{"zen":"Responsive is better than fast."}';

function sign(body: string, key = secret) {
  return `sha256=${createHmac("sha256", key).update(body).digest("hex")}`;
}

describe("verifyGitHubWebhookSignature", () => {
  test("accepts a matching GitHub HMAC", () => {
    expect(verifyGitHubWebhookSignature(payload, sign(payload), secret)).toBe(
      true
    );
  });

  test("rejects missing, truncated, and wrong signatures", () => {
    expect(verifyGitHubWebhookSignature(payload, null, secret)).toBe(false);
    expect(verifyGitHubWebhookSignature(payload, "sha256=ab", secret)).toBe(
      false
    );
    expect(
      verifyGitHubWebhookSignature(payload, sign(payload, "other"), secret)
    ).toBe(false);
  });
});
