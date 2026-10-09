import { describe, expect, test } from "bun:test";
import { Script } from "node:vm";

import { siteBuildRequestSchema } from "../src/schemas/build";
import { siteConfigSchema } from "../src/schemas/site-config";
import { siteIntegrationUpdateSchema } from "../src/schemas/site-integrations";
import { buildSiteContentSecurityPolicy } from "../src/utils/content-security-policy";
import { sortCustomScriptPaths } from "../src/utils/custom-scripts";
import {
  inlineScriptLiteral,
  integrationCspSources,
  integrationHeadScripts,
} from "../src/utils/integrations";

const parse = (extra: Record<string, unknown>) =>
  siteConfigSchema.safeParse({ name: "Acme", ...extra });

const issuePaths = (extra: Record<string, unknown>) => {
  const result = parse(extra);
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join("."));
};

describe("integrations schema", () => {
  test("builds require explicit analytics opt-in", () => {
    const target = {
      siteId: "site",
      deploymentId: "deployment",
      publicOrigin: "https://acme.com",
      mounts: { blog: "/blog", changelog: "/changes" },
    };
    expect(siteBuildRequestSchema.parse(target).analytics).toBe(false);
    expect(
      siteBuildRequestSchema.parse({ ...target, analytics: true }).analytics
    ).toBe(true);
  });

  test.each(["8443", "65535"])(
    "self-hosted Plausible supports port %s",
    (port) => {
      const integrations = siteConfigSchema.parse({
        name: "Acme",
        integrations: {
          plausible: { domain: "acme.com", server: `Stats.Acme.com:${port}` },
        },
      }).integrations;
      expect(integrationHeadScripts(integrations)[0]).toMatchObject({
        src: `https://stats.acme.com:${port}/js/script.js`,
      });
      expect(integrationCspSources(integrations)).toEqual({
        scriptSrc: [`https://stats.acme.com:${port}`],
        connectSrc: [`https://stats.acme.com:${port}`],
      });
    }
  );

  test.each([
    "stats.acme.com:65536",
    "stats.acme.com:99999",
    "stats.acme.com:abc",
    "stats.acme.com:8443/path",
    "stats.acme.com:8443?x=y",
    "stats.acme.com:8443; script-src *",
  ])("rejects invalid Plausible server %s", (server) => {
    expect(
      issuePaths({
        integrations: { plausible: { domain: "acme.com", server } },
      })
    ).toEqual(["integrations.plausible.server"]);
  });
  test("accepts every preset in its documented shape", () => {
    const result = parse({
      integrations: {
        databuddy: { clientId: "3ed1fce1-5a56" },
        plausible: { domain: "Acme.com", server: "Plausible.Acme.com" },
        posthog: {
          apiKey: "phc_abcdefghijklmnopqrstuvwxyz0123",
          apiHost: "https://acme.com/ingest/",
          sessionRecording: false,
        },
        ga4: { measurementId: "G-ABC123XYZ9" },
      },
    });
    expect(result.success).toBe(true);
    expect(result.data?.integrations.plausible?.domain).toBe("acme.com");
    expect(result.data?.integrations.plausible?.server).toBe(
      "plausible.acme.com"
    );
    expect(result.data?.integrations.posthog?.sessionRecording).toBe(false);
    expect(result.data?.integrations.posthog?.apiHost).toBe(
      "https://acme.com/ingest"
    );
    expect(result.data?.security).toEqual({
      contentSecurityPolicy: true,
      allowedOrigins: [],
    });
  });

  test("provider updates validate the matching settings and accept removal", () => {
    expect(
      siteIntegrationUpdateSchema.safeParse({
        provider: "ga4",
        settings: { domain: "acme.com" },
      }).success
    ).toBe(false);
    expect(
      siteIntegrationUpdateSchema.safeParse({
        provider: "posthog",
        settings: {
          apiKey: "phc_abcdefghijklmnopqrstuvwxyz0123",
          sessionRecording: "false",
        },
      }).success
    ).toBe(false);
    expect(
      siteIntegrationUpdateSchema.safeParse({
        provider: "plausible",
        settings: {
          domain: "acme.com",
          server: "https://plausible.acme.com/path",
        },
      }).success
    ).toBe(false);
    for (const provider of [
      "ga4",
      "posthog",
      "plausible",
      "databuddy",
    ] as const) {
      expect(
        siteIntegrationUpdateSchema.parse({ provider, settings: null })
      ).toEqual({ provider, settings: null });
    }
  });

  test("rejects ids that could break out of HTML or JS, and unknown keys", () => {
    expect(
      issuePaths({
        integrations: {
          ga4: { measurementId: 'G-1234"><script>alert(1)</script>' },
          databuddy: { clientId: "abc def ghi" },
          plausible: { domain: "acme.com/<x>" },
          posthog: { apiKey: "phc_short" },
          mixpanel: { projectToken: "x" },
        },
      }).sort()
    ).toEqual(
      [
        "integrations",
        "integrations.databuddy.clientId",
        "integrations.ga4.measurementId",
        "integrations.plausible.domain",
        "integrations.posthog.apiKey",
      ].sort()
    );
    expect(
      issuePaths({ integrations: { ga4: { measurementId: "G-ABCD", x: 1 } } })
    ).toEqual(["integrations.ga4"]);
  });

  test("allowed origins are bare https/wss origins", () => {
    expect(
      issuePaths({
        security: {
          allowedOrigins: [
            "https://cdn.example.com",
            "https://*.example.com",
            "wss://ws.example.com:8443",
            "http://cdn.example.com",
            "https://cdn.example.com/path",
            "*",
            "https://example.com; script-src *",
          ],
        },
      })
    ).toEqual([
      "security.allowedOrigins.3",
      "security.allowedOrigins.4",
      "security.allowedOrigins.5",
      "security.allowedOrigins.6",
    ]);
  });
});

describe("head scripts", () => {
  test("GA4 initializes its queue with exactly one page-view configuration", () => {
    const scripts = integrationHeadScripts({
      ga4: { measurementId: "G-ABC123XYZ9" },
    });
    const window: { dataLayer?: IArguments[] } = {};
    for (const script of scripts) {
      if (script.kind === "inline") {
        new Script(script.code).runInNewContext({
          window,
          Date,
          get dataLayer() {
            return window.dataLayer;
          },
        });
      }
    }
    expect(window.dataLayer?.map((args) => Array.from(args))).toEqual([
      ["js", expect.any(Date)],
      ["config", "G-ABC123XYZ9"],
    ]);
  });

  test("PostHog initializes the configured endpoint and recording option", () => {
    for (const sessionRecording of [undefined, true, false]) {
      const window: { posthog?: { _i: unknown[][] } } = {};
      const scriptElement = {
        type: "",
        src: "",
        crossOrigin: "",
        async: false,
      };
      const document = {
        createElement: () => scriptElement,
        getElementsByTagName: () => [
          { parentNode: { insertBefore: () => {} } },
        ],
      };
      const scripts = integrationHeadScripts({
        posthog: {
          apiKey: "phc_abcdefghijklmnopqrstuvwxyz0123",
          apiHost: "https://eu.i.posthog.com",
          sessionRecording,
        },
      });
      for (const script of scripts) {
        if (script.kind === "inline") {
          new Script(script.code).runInNewContext({
            window,
            document,
            get posthog() {
              return window.posthog;
            },
          });
        }
      }
      expect(scriptElement.src).toBe(
        "https://eu-assets.i.posthog.com/static/array.js"
      );
      expect(window.posthog?._i[0]?.slice(0, 2)).toEqual([
        "phc_abcdefghijklmnopqrstuvwxyz0123",
        {
          api_host: "https://eu.i.posthog.com",
          disable_session_recording: sessionRecording === false,
        },
      ]);
    }
  });

  test("self-hosted Plausible uses its server for both script and events", () => {
    const integrations = {
      plausible: { domain: "acme.com", server: "stats.acme.com" },
    };
    expect(integrationHeadScripts(integrations)).toEqual([
      {
        kind: "external",
        src: "https://stats.acme.com/js/script.js",
        attributes: { "data-domain": "acme.com", defer: true },
      },
    ]);
    expect(integrationCspSources(integrations)).toEqual({
      scriptSrc: ["https://stats.acme.com"],
      connectSrc: ["https://stats.acme.com"],
    });
  });
  test("inline values are JSON-encoded and cannot close the script", () => {
    expect(inlineScriptLiteral("</script><script>alert(1)")).toBe(
      '"\\u003c/script>\\u003cscript>alert(1)"'
    );
    expect(inlineScriptLiteral("a\u2028b")).toBe('"a\\u2028b"');
  });

  test("renders the vendor snippets", () => {
    const scripts = integrationHeadScripts({
      databuddy: { clientId: "client_123" },
      ga4: { measurementId: "G-ABC123" },
    });
    expect(scripts).toEqual([
      {
        kind: "external",
        src: "https://cdn.databuddy.cc/databuddy.js",
        attributes: {
          "data-client-id": "client_123",
          crossorigin: "anonymous",
          async: true,
        },
      },
      {
        kind: "external",
        src: "https://www.googletagmanager.com/gtag/js?id=G-ABC123",
        attributes: { async: true },
      },
      {
        kind: "inline",
        code: 'window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config","G-ABC123");',
      },
    ]);
  });

  test("custom scripts: script.js first, then every plain script by path", () => {
    expect(
      sortCustomScriptPaths([
        "scripts/b.js",
        "snippets/a.js",
        "blog/widget.js",
        "scripts/A.js",
        "script.js",
        "databuddy.js",
        "assets/track.js",
        "scripts/nested/c.js",
        "scripts/readme.txt",
      ])
    ).toEqual([
      "script.js",
      "assets/track.js",
      "databuddy.js",
      "scripts/A.js",
      "scripts/b.js",
      "scripts/nested/c.js",
    ]);
  });
});

describe("content security policy", () => {
  test("self, deduplicated hashes, preset hosts and allowed origins", () => {
    const policy = buildSiteContentSecurityPolicy({
      integrations: {
        plausible: { domain: "acme.com" },
        posthog: { apiKey: "phc_x", apiHost: "https://acme.com/ingest" },
      },
      security: {
        contentSecurityPolicy: true,
        allowedOrigins: ["https://widget.example.com", "wss://ws.example.com"],
      },
      scriptHashes: ["bbb=", "aaa=", "bbb="],
    });
    expect(policy).toBe(
      [
        "script-src 'self' 'sha256-aaa=' 'sha256-bbb=' https://*.posthog.com https://acme.com https://plausible.io https://widget.example.com",
        "connect-src 'self' https://*.posthog.com https://acme.com https://plausible.io https://widget.example.com wss://ws.example.com",
        "worker-src 'self' blob: data: https://*.posthog.com https://acme.com https://plausible.io https://widget.example.com",
        "object-src 'none'",
        "base-uri 'self'",
      ].join("; ")
    );
  });

  test("PostHog replay workers are allowed only when recordings are enabled", () => {
    for (const sessionRecording of [undefined, true, false]) {
      const policy = buildSiteContentSecurityPolicy({
        integrations: {
          posthog: {
            apiKey: "phc_abcdefghijklmnopqrstuvwxyz0123",
            sessionRecording,
          },
        },
        security: { contentSecurityPolicy: true, allowedOrigins: [] },
        scriptHashes: [],
      });
      expect(policy?.includes("worker-src 'self' blob: data:")).toBe(
        sessionRecording !== false
      );
      expect(policy).not.toContain("'unsafe-inline'");
      expect(policy).not.toContain("'unsafe-eval'");
    }
    expect(
      buildSiteContentSecurityPolicy({
        integrations: {},
        security: { contentSecurityPolicy: true, allowedOrigins: [] },
        scriptHashes: [],
      })
    ).not.toContain("worker-src");
  });

  test("turned off in blog.json", () => {
    expect(
      buildSiteContentSecurityPolicy({
        integrations: {},
        security: { contentSecurityPolicy: false, allowedOrigins: [] },
        scriptHashes: ["aaa="],
      })
    ).toBeNull();
  });
});
