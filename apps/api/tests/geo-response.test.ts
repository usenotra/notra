import { describe, expect, test } from "bun:test";

import { attachGeoOrganization, respondGeoOutcome } from "../src/utils/geo";

const organization = {
  id: "org-1",
  slug: "acme",
  name: "Acme",
  logo: null,
};

describe("attachGeoOrganization", () => {
  test("adds the organization envelope without mutating the body", () => {
    const body = { configured: true, engines: [] };

    expect(attachGeoOrganization(organization, body)).toEqual({
      configured: true,
      engines: [],
      organization,
    });
  });
});

describe("respondGeoOutcome", () => {
  test("returns the mapped success body with organization", () => {
    const calls: unknown[][] = [];
    const context = {
      json: (...args: unknown[]) => {
        calls.push(args);
        return args[0];
      },
    };

    const response = respondGeoOutcome(
      context as never,
      { ok: true, value: { checks: 3 } },
      organization,
      (value) => value,
      200
    );

    expect(calls).toEqual([[{ checks: 3, organization }, 200]]);
    expect(response).toEqual({ checks: 3, organization });
  });

  test("returns the normalized failure response", () => {
    const calls: unknown[][] = [];
    const context = {
      json: (...args: unknown[]) => {
        calls.push(args);
        return args[0];
      },
    };

    const response = respondGeoOutcome(
      context as never,
      { ok: false, failure: { status: 409, error: "Conflict" } },
      organization,
      (value) => value
    );

    expect(calls).toEqual([[{ error: "Conflict" }, 409]]);
    expect(response).toEqual({ error: "Conflict" });
  });
});
