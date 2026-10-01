import { describe, expect, test } from "bun:test";

import { createDemoClock, isDifferentLocalDay } from "@notra/utils/demo-clock";
import { isDemoMode } from "@notra/utils/demo-mode";

import { buildDemoCurl, resolveDemoConsolePath } from "@/utils/demo-console";
import { resolveDemoLanding, safeDemoReturnTo } from "@/utils/demo-return-to";

describe("demo mode switch", () => {
  test("needs the flag and no WorkOS key", () => {
    expect(isDemoMode("1", undefined)).toBe(true);
    expect(isDemoMode("true", "")).toBe(true);
    expect(isDemoMode("1", "sk_live_123")).toBe(false);
    expect(isDemoMode(undefined, undefined)).toBe(false);
    expect(isDemoMode("0", undefined)).toBe(false);
  });
});

describe("demo clock", () => {
  const edgeCases: [string, string][] = [
    ["2026-03-29T00:30:00Z", "Europe/Berlin"],
    ["2026-11-01T08:30:00Z", "America/New_York"],
    ["2026-01-01T00:05:00Z", "Pacific/Auckland"],
    ["2028-02-29T12:00:00Z", "America/Los_Angeles"],
    ["2026-12-31T23:59:00Z", "UTC"],
  ];

  test.each(edgeCases)(
    "never seeds history in the future (%s, %s)",
    (iso, zone) => {
      const now = new Date(iso);
      const clock = createDemoClock(now, zone);
      for (let daysAgo = 0; daysAgo < 45; daysAgo++) {
        for (const hour of [0, 9, 23]) {
          expect(clock.local({ daysAgo, hour }).getTime()).toBeLessThanOrEqual(
            now.getTime()
          );
        }
      }
      expect(clock.startOfDay(0).getTime()).toBeLessThanOrEqual(now.getTime());
      expect(clock.startOfDay(1).getTime()).toBeLessThan(
        clock.startOfDay(0).getTime()
      );
    }
  );

  test("places wall-clock times in the visitor's zone across DST", () => {
    const clock = createDemoClock(
      new Date("2026-11-01T20:00:00Z"),
      "America/New_York"
    );
    // Oct 31 is still EDT (UTC-4); Nov 1 afternoon is EST (UTC-5).
    expect(clock.local({ daysAgo: 1, hour: 9 }).toISOString()).toBe(
      "2026-10-31T13:00:00.000Z"
    );
    expect(clock.local({ daysAgo: 0, hour: 9 }).toISOString()).toBe(
      "2026-11-01T14:00:00.000Z"
    );
  });

  test("falls back to UTC for unknown zones", () => {
    expect(createDemoClock(new Date(), "Mars/Olympus").timeZone).toBe("UTC");
  });

  test("detects a new local day for the rebase", () => {
    const zone = "Europe/Berlin";
    expect(
      isDifferentLocalDay(
        new Date("2026-09-29T21:00:00Z"),
        new Date("2026-09-29T22:30:00Z"),
        zone
      )
    ).toBe(true);
    expect(
      isDifferentLocalDay(
        new Date("2026-09-29T20:00:00Z"),
        new Date("2026-09-29T21:30:00Z"),
        zone
      )
    ).toBe(false);
  });
});

describe("demo landing", () => {
  test("rejects open redirects", () => {
    expect(safeDemoReturnTo("//evil.example")).toBeNull();
    expect(safeDemoReturnTo("https://evil.example")).toBeNull();
    expect(safeDemoReturnTo("/geo")).toBe("/geo");
  });

  test("swaps a shared workspace slug for the visitor's own", () => {
    expect(
      resolveDemoLanding("/fieldnote-ab12cd34/geo/prompts", "fieldnote-zz99")
    ).toBe("/fieldnote-zz99/geo/prompts");
    expect(resolveDemoLanding("/fieldnote-ab12cd34", "fieldnote-zz99")).toBe(
      "/fieldnote-zz99"
    );
    expect(resolveDemoLanding(null, "fieldnote-zz99")).toBe(
      "/fieldnote-zz99/geo"
    );
  });
});

describe("demo API console", () => {
  test("fills the project id and quotes curl safely", () => {
    expect(resolveDemoConsolePath("/v1/projects/{projectId}/geo", "p1")).toBe(
      "/v1/projects/p1/geo"
    );
    const curl = buildDemoCurl({
      baseUrl: "https://demo-api.usenotra.com",
      apiKey: "notra_demo_x",
      method: "POST",
      path: "/v1/posts",
      body: `{"title":"it's here"}`,
    });
    expect(curl).toContain("-X POST 'https://demo-api.usenotra.com/v1/posts'");
    expect(curl).toContain(`-d '{"title":"it'\\''s here"}'`);
  });
});
