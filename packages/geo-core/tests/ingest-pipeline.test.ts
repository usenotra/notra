import { beforeEach, describe, expect, mock, test } from "bun:test";

import type { GeoIngestIdentity } from "@notra/geo-core/types/geo";
import type { Ratelimit } from "@upstash/ratelimit";
import { Effect } from "effect";

const STORED = { successful_rows: 1, quarantined_rows: 0 };
const ingestGeoTrafficEvents = mock(
  async (): Promise<typeof STORED | null> => STORED
);
const isGeoIngestIdentityActive = mock(async () => true);
const loadIngestAllowedHosts = mock(
  async (_identity?: GeoIngestIdentity): Promise<string[] | null> => [
    "example.com",
  ]
);
const ratelimitLimit = mock(
  async (): Promise<
    Pick<Awaited<ReturnType<Ratelimit["limit"]>>, "success" | "reason">
  > => ({
    success: true,
  })
);
const trackGeoIngestAnalytics = mock(() => Effect.void);
const verifyGeoIngestToken = mock((): GeoIngestIdentity => ({
  organizationId: "org_1",
  projectId: "proj_1",
  generation: 1,
}));
const verifyGeoIngestSiteToken = mock((token: string): string | null =>
  token === "nst.site_1.good" ? "site_1" : null
);
const loadIngestSite = mock(async (siteId: string) =>
  siteId === "site_1"
    ? {
        id: "site_1",
        organizationId: "org_2",
        projectId: "proj_2",
        hosts: ["acme.com"],
      }
    : null
);
const loadOrganizationSitePrefixes = mock(
  async (): Promise<{ host: string; mounts: string[] }[] | null> => []
);
const resolveJourneyId = mock(() => ({ journeyId: "journey_1", path: "/" }));
const ingestWebPageViews = mock(async () => ({
  successful_rows: 1,
  quarantined_rows: 0,
}));
const isVisitorTrackingEnabled = mock(async (identity: GeoIngestIdentity) =>
  Boolean(identity.site)
);

mock.module("@notra/analytics/tinybird/client", () => ({
  ingestGeoTrafficEvents,
  ingestWebPageViews,
}));
mock.module("@notra/geo-core/geo/ingest", () => ({
  verifyGeoIngestToken,
  verifyGeoIngestSiteToken,
  isGeoIngestSiteToken: (token: string) => token.startsWith("nst."),
  getGeoIngestTokenGeneration: async () => 1,
  geoIngestHostsCacheKey: () => "hosts:key",
  getGeoIngestSecret: () => "test-secret",
}));
mock.module("../src/ingest/identity", () => ({
  isGeoIngestIdentityActive,
}));
mock.module("../src/ingest/hosts", () => ({
  loadIngestAllowedHosts,
}));
mock.module("../src/ingest/sites", () => ({
  loadIngestSite,
  loadOrganizationSitePrefixes,
}));
mock.module("../src/ingest/analytics", () => ({
  trackGeoIngestAnalytics,
}));
mock.module("../src/ingest/journey", () => ({
  resolveJourneyId,
}));
mock.module("../src/ingest/ratelimit", () => ({
  geoIngestRatelimit: { limit: ratelimitLimit },
  webIngestRatelimit: { limit: async () => ({ success: true }) },
  geoIngestAdmissionRatelimit: { limit: async () => ({ success: true }) },
}));
mock.module("../src/ingest/web-tracking", () => ({
  isVisitorTrackingEnabled,
}));

const { runGeoIngest } = await import("../src/ingest/pipeline");
const {
  GeoIngestInvalidTokenError,
  GeoIngestFailedError,
  GeoIngestRateLimitedError,
} = await import("../src/ingest/errors");

function ingestRequest(
  body: unknown = {
    method: "GET",
    url: "https://example.com/",
    userAgent: "GPTBot",
  },
  token = "token_1"
) {
  return {
    headers: new Headers({ authorization: `Bearer ${token}` }),
    json: async () => body,
  } as never;
}

async function run(request: unknown) {
  return Effect.runPromise(
    Effect.result(runGeoIngest(request as never, () => {})) as never
  ) as Promise<
    | { _tag: "Success"; success: unknown }
    | { _tag: "Failure"; failure: unknown }
  >;
}

describe("runGeoIngest ordering", () => {
  beforeEach(() => {
    for (const m of [
      ingestGeoTrafficEvents,
      isGeoIngestIdentityActive,
      loadIngestAllowedHosts,
      ratelimitLimit,
      trackGeoIngestAnalytics,
    ]) {
      m.mockClear();
    }
    ingestWebPageViews.mockClear();
    verifyGeoIngestToken.mockClear();
    verifyGeoIngestToken.mockImplementation(() => ({
      organizationId: "org_1",
      projectId: "proj_1",
      generation: 1,
    }));
    resolveJourneyId.mockClear();
    isGeoIngestIdentityActive.mockImplementation(async () => true);
    loadIngestAllowedHosts.mockImplementation(async () => ["example.com"]);
    ratelimitLimit.mockImplementation(async () => ({ success: true }));
    ingestGeoTrafficEvents.mockImplementation(async () => STORED);
    loadOrganizationSitePrefixes.mockImplementation(async () => []);
  });

  test("fails instead of acknowledging when Tinybird is not configured", async () => {
    ingestGeoTrafficEvents.mockImplementation(async () => null);
    const outcome = await run(ingestRequest());
    expect(outcome._tag).toBe("Failure");
    if (outcome._tag === "Failure") {
      expect(outcome.failure).toBeInstanceOf(GeoIngestFailedError);
    }
  });

  test("fails instead of acknowledging a quarantined row", async () => {
    ingestGeoTrafficEvents.mockImplementation(async () => ({
      successful_rows: 0,
      quarantined_rows: 1,
    }));
    const outcome = await run(ingestRequest());
    expect(outcome._tag).toBe("Failure");
    if (outcome._tag === "Failure") {
      expect(outcome.failure).toBeInstanceOf(GeoIngestFailedError);
    }
  });

  test("rejects tracked traffic when the rate-limit transport fails", async () => {
    ratelimitLimit.mockImplementation(async () => {
      throw new Error("Redis unavailable");
    });
    const outcome = await run(ingestRequest());
    expect(outcome._tag).toBe("Failure");
    if (outcome._tag === "Failure") {
      expect(outcome.failure).toBeInstanceOf(GeoIngestFailedError);
    }
    expect(ingestGeoTrafficEvents).not.toHaveBeenCalled();
  });

  test("rejects Upstash timeout responses even when success is true", async () => {
    ratelimitLimit.mockImplementation(async () => ({
      success: true,
      reason: "timeout",
    }));
    const outcome = await run(ingestRequest());
    expect(outcome._tag).toBe("Failure");
    if (outcome._tag === "Failure") {
      expect(outcome.failure).toBeInstanceOf(GeoIngestFailedError);
    }
    expect(ingestGeoTrafficEvents).not.toHaveBeenCalled();
  });

  test("rejects actual rate-limit hits without writing an event", async () => {
    ratelimitLimit.mockImplementation(async () => ({ success: false }));
    const outcome = await run(ingestRequest());
    expect(outcome._tag).toBe("Failure");
    if (outcome._tag === "Failure") {
      expect(outcome.failure).toBeInstanceOf(GeoIngestRateLimitedError);
    }
    expect(ingestGeoTrafficEvents).not.toHaveBeenCalled();
  });

  test("rejects revoked identities for tracked traffic with 401", async () => {
    isGeoIngestIdentityActive.mockImplementation(async () => false);

    const outcome = await run(ingestRequest());

    expect(outcome._tag).toBe("Failure");
    if (outcome._tag === "Failure") {
      expect(outcome.failure).toBeInstanceOf(GeoIngestInvalidTokenError);
    }
    expect(ingestGeoTrafficEvents).not.toHaveBeenCalled();
  });

  test("drops tracked events for hosts outside the allowed list", async () => {
    loadIngestAllowedHosts.mockImplementation(async () => ["other.example"]);

    const outcome = await run(ingestRequest());

    expect(outcome._tag).toBe("Success");
    expect(ingestGeoTrafficEvents).not.toHaveBeenCalled();
  });

  test("legacy organization tokens do not ingest a sibling project's host", async () => {
    verifyGeoIngestToken.mockImplementation(() => ({
      organizationId: "org_1",
      projectId: null,
      generation: 1,
    }));
    loadIngestAllowedHosts.mockImplementation(async () => ["oldest.example"]);

    const outcome = await run(ingestRequest());

    expect(outcome._tag).toBe("Success");
    expect(loadIngestAllowedHosts).toHaveBeenCalledWith({
      organizationId: "org_1",
      projectId: null,
      generation: 1,
    });
    expect(ingestGeoTrafficEvents).not.toHaveBeenCalled();
  });

  test("legacy organization tokens fail closed if host lookup is unavailable", async () => {
    verifyGeoIngestToken.mockImplementation(() => ({
      organizationId: "org_1",
      projectId: null,
      generation: 1,
    }));
    loadIngestAllowedHosts.mockImplementation(async () => null);

    const outcome = await run(ingestRequest());

    expect(outcome._tag).toBe("Failure");
    if (outcome._tag === "Failure") {
      expect(outcome.failure).toBeInstanceOf(GeoIngestFailedError);
    }
    expect(ingestGeoTrafficEvents).not.toHaveBeenCalled();
  });

  test("keeps 401 authoritative when a revoked token sends a malformed payload", async () => {
    isGeoIngestIdentityActive.mockImplementation(async () => false);

    const outcome = await run(ingestRequest({ method: "GET" }));

    expect(outcome._tag).toBe("Failure");
    if (outcome._tag === "Failure") {
      expect(outcome.failure).toBeInstanceOf(GeoIngestInvalidTokenError);
    }
    expect(ingestGeoTrafficEvents).not.toHaveBeenCalled();
  });

  test("keeps 401 authoritative when a revoked token sends an unparseable url", async () => {
    isGeoIngestIdentityActive.mockImplementation(async () => false);

    const outcome = await run(ingestRequest({ method: "GET", url: ":::" }));

    expect(outcome._tag).toBe("Failure");
    if (outcome._tag === "Failure") {
      expect(outcome.failure).toBeInstanceOf(GeoIngestInvalidTokenError);
    }
    expect(ingestGeoTrafficEvents).not.toHaveBeenCalled();
  });

  test("a site token ingests under the site's project and only for its host", async () => {
    loadIngestAllowedHosts.mockImplementation(
      async (identity?: GeoIngestIdentity) =>
        identity?.site ? identity.site.hosts : ["example.com"]
    );
    const page = {
      method: "GET",
      url: "https://acme.com/blog/a",
      userAgent: "GPTBot",
    };
    const outcome = await run(ingestRequest(page, "nst.site_1.good"));
    expect(outcome).toMatchObject({
      _tag: "Success",
      success: {
        outcome: "ingested",
        organizationId: "org_2",
        projectId: "proj_2",
      },
    });
    expect(verifyGeoIngestToken).not.toHaveBeenCalled();

    const elsewhere = await run(
      ingestRequest({ ...page, url: "https://example.com/" }, "nst.site_1.good")
    );
    expect(elsewhere).toMatchObject({
      _tag: "Success",
      success: { outcome: "dropped", reason: "host" },
    });
  });

  test("a site counts its human visitors in web_page_views only", async () => {
    loadIngestAllowedHosts.mockImplementation(
      async (identity?: GeoIngestIdentity) =>
        identity?.site ? identity.site.hosts : ["example.com"]
    );
    const outcome = await run(
      ingestRequest(
        {
          method: "GET",
          url: "https://acme.com/blog/a",
          userAgent:
            "Mozilla/5.0 (Macintosh) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
          referer: "https://www.google.com/",
        },
        "nst.site_1.good"
      )
    );
    expect(outcome).toMatchObject({
      _tag: "Success",
      success: { outcome: "ingested", visitorType: "human" },
    });
    expect(ingestGeoTrafficEvents).not.toHaveBeenCalled();
    expect(ingestWebPageViews).toHaveBeenCalledTimes(1);
    const [rows] = ingestWebPageViews.mock.calls[0] as unknown as [
      Record<string, unknown>[],
    ];
    expect(rows[0]).toMatchObject({
      site_id: "site_1",
      host: "acme.com",
      path: "/blog/a",
      referrer_group: "search",
      referrer_source: "google",
      browser: "Chrome",
    });
  });

  test("a forged or orphaned site token is a 401", async () => {
    const forged = await run(ingestRequest(undefined, "nst.site_1.bad"));
    expect(forged._tag === "Failure" && forged.failure).toBeInstanceOf(
      GeoIngestInvalidTokenError
    );
    verifyGeoIngestSiteToken.mockImplementationOnce(() => "site_gone");
    const orphaned = await run(ingestRequest(undefined, "nst.site_gone.sig"));
    expect(orphaned._tag === "Failure" && orphaned.failure).toBeInstanceOf(
      GeoIngestInvalidTokenError
    );
  });

  test("the SDK does not count a page a Notra Site already reports", async () => {
    loadOrganizationSitePrefixes.mockImplementation(async () => [
      { host: "example.com", mounts: ["/blog"] },
    ]);
    const proxied = await run(
      ingestRequest({
        method: "GET",
        url: "https://example.com/blog/a",
        userAgent: "GPTBot",
      })
    );
    expect(proxied).toMatchObject({
      _tag: "Success",
      success: { outcome: "dropped", reason: "site" },
    });
    const outside = await run(
      ingestRequest({
        method: "GET",
        url: "https://example.com/blogroll",
        userAgent: "GPTBot",
      })
    );
    expect(outside).toMatchObject({
      _tag: "Success",
      success: { outcome: "ingested" },
    });
  });
});
