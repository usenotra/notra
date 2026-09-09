import { describe, expect, test, spyOn } from "bun:test";

import { createTimeoutFetch } from "@notra/utils/timeout-fetch";

import { createORPCContext, getORPCRequestMemo } from "@/lib/orpc/context";
import { geoHydrationInputs } from "@/utils/geo-hydration";

describe("review regressions", () => {
  test("explicit null clears a Request signal while undefined inherits it", async () => {
    const controller = new AbortController();
    controller.abort();
    const request = new Request("https://example.test", {
      signal: controller.signal,
    });
    const signals: (AbortSignal | null | undefined)[] = [];
    const fetchSpy = spyOn(globalThis, "fetch").mockImplementation(
      (_input, init) => {
        signals.push(init?.signal);
        return Promise.resolve(new Response());
      }
    );
    try {
      const fetchWithTimeout = createTimeoutFetch(10_000);
      await fetchWithTimeout(request, { signal: null });
      await fetchWithTimeout(request, { signal: undefined });
      expect(signals.map((signal) => signal?.aborted)).toEqual([false, true]);
    } finally {
      fetchSpy.mockRestore();
    }
  });

  test("GEO hydration normalizes unknown tabs and uses the resolved scope for journeys", () => {
    const unknown = geoHydrationInputs("org-1", "resolved-project", {
      tab: "invalid",
    });
    expect(unknown.activeTab).toBe("visibility");
    const journeys = geoHydrationInputs("org-1", "resolved-project", {
      tab: ["journeys", "visibility"],
      project: "stale-project",
    });
    expect(journeys.activeTab).toBe("journeys");
    expect(journeys.trafficJourneys).toMatchObject({
      organizationId: "org-1",
      projectId: "resolved-project",
    });
    expect(journeys.trafficJourneys).toEqual(journeys.overview);
  });

  test("oRPC contexts share memoized promises only within the same request", async () => {
    const headers = new Headers({ authorization: "Bearer test" });
    const first = await createORPCContext({ headers });
    const second = await createORPCContext({ headers });
    const separate = await createORPCContext({ headers: new Headers(headers) });
    const pending = Promise.resolve(true);
    first.requestMemo.analyticsEnabledByOrganization.set("org-1", pending);
    expect(getORPCRequestMemo(headers)).toBe(first.requestMemo);
    expect(second.requestMemo.analyticsEnabledByOrganization.get("org-1")).toBe(
      pending
    );
    expect(second.requestMemo.analyticsEnabledByOrganization.has("org-2")).toBe(
      false
    );
    expect(separate.requestMemo.analyticsEnabledByOrganization.size).toBe(0);
  });
});
