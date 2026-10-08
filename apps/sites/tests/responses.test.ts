import { describe, expect, test } from "bun:test";

import type { SiteManifestFile } from "@notra/sites-core/types/deployment";

import { serveFile } from "../src/responses";
import type { SitesDeps } from "../src/types/worker";

const POLICY = "script-src 'self' 'sha256-abc='; object-src 'none'";

const deps = {
  bucket: {
    get: async () => ({
      body: new Response("body").body,
      text: async () => "body",
    }),
  },
  cache: null,
  waitUntil: () => undefined,
} as unknown as SitesDeps;

const file = (path: string, contentType: string): SiteManifestFile => ({
  path,
  size: 4,
  sha256: "0".repeat(64),
  contentType,
});

const serve = (served: SiteManifestFile, contentSecurityPolicy?: string) =>
  serveFile({
    deps,
    request: new Request(`https://acme.notra.site${served.path}`),
    siteId: "site_a",
    deploymentId: "dep_a",
    file: served,
    status: 200,
    isPreview: false,
    contentSecurityPolicy,
  });

describe("content security policy", () => {
  test("is sent with customer HTML only", async () => {
    const page = await serve(
      file("/blog/index.html", "text/html; charset=utf-8"),
      POLICY
    );
    expect(page.headers.get("Content-Security-Policy")).toBe(POLICY);
    const css = await serve(
      file("/blog/_notra/assets/a.css", "text/css"),
      POLICY
    );
    expect(css.headers.get("Content-Security-Policy")).toBeNull();
  });

  test("deployments without a policy send none", async () => {
    const page = await serve(
      file("/blog/index.html", "text/html; charset=utf-8")
    );
    expect(page.headers.get("Content-Security-Policy")).toBeNull();
  });
});
