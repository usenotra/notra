import { describe, expect, test } from "bun:test";

import {
  InternalDashboardAdapterError,
  InternalDashboardError,
} from "@notra/schemas/api/internal-dashboard";

import { isConfirmedContentGenerationRejection } from "../src/utils/content-generation";

describe("isConfirmedContentGenerationRejection", () => {
  test("treats explicit 4xx dashboard rejections as confirmed", () => {
    expect(
      isConfirmedContentGenerationRejection(
        new InternalDashboardError(402, "payment_required", "credits exhausted")
      )
    ).toBe(true);
    expect(
      isConfirmedContentGenerationRejection(
        new InternalDashboardError(404, null, "organization not found")
      )
    ).toBe(true);
  });

  test("treats ambiguous 5xx dashboard responses as unconfirmed", () => {
    expect(
      isConfirmedContentGenerationRejection(
        new InternalDashboardError(500, null, "upstream unavailable")
      )
    ).toBe(false);
    expect(
      isConfirmedContentGenerationRejection(
        new InternalDashboardError(503, null, "maintenance")
      )
    ).toBe(false);
  });

  test("treats configuration and authentication adapter failures as confirmed", () => {
    expect(
      isConfirmedContentGenerationRejection(
        new InternalDashboardAdapterError({
          kind: "configuration",
          message: "workflow URL missing",
        })
      )
    ).toBe(true);
    expect(
      isConfirmedContentGenerationRejection(
        new InternalDashboardAdapterError({
          kind: "authentication",
          message: "invalid token",
        })
      )
    ).toBe(true);
  });

  test("treats transport and decode adapter failures as ambiguous", () => {
    expect(
      isConfirmedContentGenerationRejection(
        new InternalDashboardAdapterError({
          kind: "transport",
          message: "socket hang up",
        })
      )
    ).toBe(false);
    expect(
      isConfirmedContentGenerationRejection(
        new InternalDashboardAdapterError({
          kind: "decode",
          message: "invalid JSON",
        })
      )
    ).toBe(false);
  });

  test("treats missing workflow URL configuration as confirmed", () => {
    expect(
      isConfirmedContentGenerationRejection(
        new Error("Content generation workflow URL is not configured")
      )
    ).toBe(true);
  });

  test("treats generic transport errors as ambiguous", () => {
    expect(
      isConfirmedContentGenerationRejection(new Error("fetch failed"))
    ).toBe(false);
  });
});
