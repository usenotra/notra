import { describe, expect, test } from "bun:test";

import { assertAccessInParallel } from "@/lib/auth/parallel-access";

const membershipDenied = new Error("not a member");
const gateDenied = new Error("plan required");

describe("parallel access assertions", () => {
  test("both checks run even when the first one is going to fail", async () => {
    const started: string[] = [];

    const attempt = assertAccessInParallel(
      (async () => {
        started.push("membership");
        throw membershipDenied;
      })(),
      (async () => {
        started.push("gate");
      })()
    );

    await expect(attempt).rejects.toBe(membershipDenied);
    expect(started.toSorted()).toEqual(["gate", "membership"]);
  });

  test("the membership error wins when both fail", async () => {
    const attempt = assertAccessInParallel(
      Promise.reject(membershipDenied),
      Promise.reject(gateDenied)
    );

    // A non-member must not learn anything about the organization's plan.
    await expect(attempt).rejects.toBe(membershipDenied);
  });

  test("the gate error surfaces when only the gate fails", async () => {
    const attempt = assertAccessInParallel(
      Promise.resolve(),
      Promise.reject(gateDenied)
    );

    await expect(attempt).rejects.toBe(gateDenied);
  });

  test("both passing resolves", async () => {
    await expect(
      assertAccessInParallel(Promise.resolve("member"), Promise.resolve(true))
    ).resolves.toBeUndefined();
  });
});
