import { describe, expect, test } from "bun:test";
import { Script } from "node:vm";

import { siteConfigSchema } from "../src/schemas/site-config";
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
  test("accepts every preset in its documented shape", () => {
    const result = parse({
      integrations: {
        databuddy: { clientId: "3ed1fce1-5a56" },
        plausible: { domain: "Acme.com" },
        posthog: {
          apiKey: "phc_abcdefghijklmnopqrstuvwxyz0123",
          apiHost: "https://acme.com/ingest/",
        },
        ga4: { measurementId: "G-ABC123XYZ9" },
      },
    });
    expect(result.success).toBe(true);
    expect(result.data?.integrations.plausible?.domain).toBe("acme.com");
    expect(result.data?.integrations.posthog?.apiHost).toBe(
      "https://acme.com/ingest"
    );
    expect(result.data?.security).toEqual({
      contentSecurityPolicy: true,
      allowedOrigins: [],
    });
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
        "object-src 'none'",
        "base-uri 'self'",
      ].join("; ")
    );
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
