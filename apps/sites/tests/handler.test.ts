import { beforeEach, describe, expect, test } from "bun:test";

import { SITE_PREVIEW_COOKIE } from "@notra/sites-core/constants/sites";
import type {
  SiteManifest,
  SiteServingState,
} from "@notra/sites-core/schemas/deployment";
import { signSitePreviewToken } from "@notra/sites-core/utils/preview-token";

import { handleSiteRequest, resetCachesForTests } from "../src/handler";
import type { SitesDeps } from "../src/types";

const SECRET = "test-secret";
const DOMAIN = "notra.site";
const SITE = "site_a";

function contentTypeFor(path: string): string {
  if (path.endsWith(".html")) {
    return "text/html; charset=utf-8";
  }
  return path.endsWith(".md") ? "text/markdown; charset=utf-8" : "text/css";
}

function manifest(
  deploymentId: string,
  publicOrigin: string,
  paths: string[]
): SiteManifest {
  return {
    version: 1,
    siteId: SITE,
    deploymentId,
    commitSha: "abc",
    toolchainVersion: "t",
    target: {
      publicOrigin,
      mounts: { blog: "/blog", changelog: "/changelog" },
      noindex: false,
    },
    configHash: "h",
    createdAt: "2026-10-03T00:00:00Z",
    totalBytes: 1,
    files: paths.map((path) => ({
      path,
      size: 1,
      sha256: path
        .replace(/[^a-z0-9]/g, "")
        .padEnd(64, "0")
        .slice(0, 64),
      contentType: contentTypeFor(path),
    })),
    redirects: [
      { source: "/blog/old", destination: "/blog/new", status: 308 },
      { source: "/blog/archive/*", destination: "/blog/*", status: 301 },
    ],
  };
}

function setup(state: Partial<SiteServingState> = {}) {
  const objects = new Map<string, string>();
  const put = (key: string, value: unknown) =>
    objects.set(key, typeof value === "string" ? value : JSON.stringify(value));
  put("hosts/acme.notra.site.json", {
    version: 1,
    siteId: SITE,
    kind: "alias",
  });
  put("hosts/blog.acme.com.json", { version: 1, siteId: SITE, kind: "custom" });
  put(`sites/${SITE}/state.json`, {
    version: 1,
    siteId: SITE,
    slug: "acme",
    status: "active",
    production: { deploymentId: "dep_live", generation: 3, activatedAt: "x" },
    previews: {
      "pr-7": {
        deploymentId: "dep_pr",
        visibility: "protected",
        sequence: 4,
        activatedAt: "x",
        expiresAt: null,
      },
    },
    updatedAt: "x",
    ...state,
  });
  const files = [
    "/blog/index.html",
    "/blog/post/index.html",
    "/blog/post/index.md",
    "/blog/404.html",
    "/changelog/index.html",
    "/blog/_notra/assets/app.css",
  ];
  put(
    `deployments/${SITE}/dep_live/manifest.json`,
    manifest("dep_live", "https://acme.com", files)
  );
  put(
    `deployments/${SITE}/dep_pr/manifest.json`,
    manifest("dep_pr", "https://pr-7--acme.notra.site", files)
  );
  for (const deployment of ["dep_live", "dep_pr"]) {
    for (const file of files) {
      put(
        `deployments/${SITE}/${deployment}/files${file}`,
        `${deployment}:${file}`
      );
    }
  }
  const deps: SitesDeps = {
    bucket: {
      get: async (key) => {
        const value = objects.get(key);
        if (value === undefined) {
          return null;
        }
        return { body: new Response(value).body, text: async () => value };
      },
    },
    cache: null,
    hostingDomain: DOMAIN,
    dashboardUrl: "https://app.example.com",
    previewSecret: SECRET,
    devHostOverrideToken: null,
    waitUntil: () => undefined,
    now: () => new Date("2026-10-03T12:00:00Z"),
  };
  const request = (url: string, headers: Record<string, string> = {}) =>
    handleSiteRequest(new Request(url, { headers }), deps);
  return { objects, put, deps, request };
}

beforeEach(() => resetCachesForTests());

describe("production serving", () => {
  test("serves both mounts with directory indexes and per-area 404s", async () => {
    const { request } = setup();
    expect(await (await request("https://acme.notra.site/blog")).text()).toBe(
      "dep_live:/blog/index.html"
    );
    expect(
      await (await request("https://acme.notra.site/blog/post/")).text()
    ).toBe("dep_live:/blog/post/index.html");
    expect(
      await (await request("https://acme.notra.site/changelog")).text()
    ).toBe("dep_live:/changelog/index.html");
    const missing = await request("https://acme.notra.site/blog/nope");
    expect(missing.status).toBe(404);
    expect(await missing.text()).toBe("dep_live:/blog/404.html");
    expect((await request("https://acme.notra.site/outside")).status).toBe(404);
  });

  test("hashed assets are immutable, HTML revalidates, ETag gives 304", async () => {
    const { request } = setup();
    const asset = await request(
      "https://acme.notra.site/blog/_notra/assets/app.css"
    );
    expect(asset.headers.get("Cache-Control")).toContain("immutable");
    const page = await request("https://acme.notra.site/blog");
    expect(page.headers.get("Cache-Control")).toBe(
      "public, max-age=0, must-revalidate"
    );
    const etag = page.headers.get("ETag") ?? "";
    expect(
      (await request("https://acme.notra.site/blog", { "If-None-Match": etag }))
        .status
    ).toBe(304);
  });

  test("agents get every page as Markdown, browsers keep HTML", async () => {
    const { request } = setup();
    const page = await request("https://acme.notra.site/blog/post");
    expect(await page.text()).toBe("dep_live:/blog/post/index.html");
    expect(page.headers.get("Vary")).toBe("Accept");
    expect(page.headers.get("Link")).toContain("</blog/post/index.md>");

    const negotiated = await request("https://acme.notra.site/blog/post", {
      Accept: "text/markdown, text/html;q=0.9, */*;q=0.8",
    });
    expect(negotiated.headers.get("Content-Type")).toBe(
      "text/markdown; charset=utf-8"
    );
    expect(await negotiated.text()).toBe("dep_live:/blog/post/index.md");

    const browser = await request("https://acme.notra.site/blog/post", {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    });
    expect(await browser.text()).toBe("dep_live:/blog/post/index.html");

    expect(
      await (await request("https://acme.notra.site/blog/post.md")).text()
    ).toBe("dep_live:/blog/post/index.md");
    const missing = await request("https://acme.notra.site/blog/nope.md");
    expect([missing.status, missing.headers.get("Content-Type")]).toEqual([
      404,
      "text/markdown; charset=utf-8",
    ]);
  });

  test("redirects from notra.json, including wildcards", async () => {
    const { request } = setup();
    const exact = await request("https://acme.notra.site/blog/old/");
    expect([exact.status, exact.headers.get("Location")]).toEqual([
      308,
      "/blog/new",
    ]);
    const wildcard = await request(
      "https://acme.notra.site/blog/archive/2024/post"
    );
    expect([wildcard.status, wildcard.headers.get("Location")]).toEqual([
      301,
      "/blog/2024/post",
    ]);
  });

  test("path traversal and unknown hosts never reach the bucket", async () => {
    const { request } = setup();
    // The URL parser already resolves %2e%2e; an encoded slash survives it and must still be rejected.
    expect(
      (
        await request(
          "https://acme.notra.site/blog/%2e%2e/%2e%2e/sites/site_a/state.json"
        )
      ).status
    ).toBe(404);
    expect(
      (
        await request(
          "https://acme.notra.site/blog/..%2f..%2fsites%2fsite_a%2fstate.json"
        )
      ).status
    ).toBe(400);
    expect((await request("https://other.notra.site/blog")).status).toBe(404);
    expect((await request("https://unknown.example.com/blog")).status).toBe(
      404
    );
  });

  test("only the canonical host is crawlable", async () => {
    const { request } = setup();
    expect(
      await (await request("https://acme.notra.site/robots.txt")).text()
    ).toContain("Disallow: /");
    resetCachesForTests();
    const { request: customRequest, put } = setup();
    put(
      `deployments/${SITE}/dep_live/manifest.json`,
      manifest("dep_live", "https://blog.acme.com", ["/blog/index.html"])
    );
    const robots = await (
      await customRequest("https://blog.acme.com/robots.txt")
    ).text();
    expect(robots).toContain("Allow: /");
    expect(robots).toContain("Sitemap: https://blog.acme.com/blog/sitemap.xml");
  });

  test("takedown wins over everything and the state is re-read", async () => {
    const { request, put, deps } = setup();
    expect((await request("https://acme.notra.site/blog")).status).toBe(200);
    put(`sites/${SITE}/state.json`, {
      ...JSON.parse('{"version":1}'),
      siteId: SITE,
      slug: "acme",
      status: "suspended",
      production: { deploymentId: "dep_live", generation: 3, activatedAt: "x" },
      previews: {},
      updatedAt: "x",
    });
    deps.now = () => new Date("2026-10-03T12:00:06Z");
    expect((await request("https://acme.notra.site/blog")).status).toBe(410);
    expect(
      (await request("https://acme.notra.site/blog/_notra/assets/app.css"))
        .status
    ).toBe(410);
  });

  test("a broken or unreadable state fails closed", async () => {
    const { request, put } = setup();
    put(`sites/${SITE}/state.json`, "{not json");
    expect((await request("https://acme.notra.site/blog")).status).toBe(503);
  });
});

describe("previews", () => {
  test("protected previews need a valid token for exactly that preview", async () => {
    const { request } = setup();
    const locked = await request("https://pr-7--acme.notra.site/blog");
    expect(locked.status).toBe(401);
    expect(await locked.text()).toContain(
      "app.example.com/sites/preview-access"
    );

    const exp = Math.floor(new Date("2026-10-03T13:00:00Z").getTime() / 1000);
    const token = await signSitePreviewToken(
      { siteId: SITE, previewKey: "pr-7", exp, kind: "share" },
      SECRET
    );
    const login = await request(
      `https://pr-7--acme.notra.site/_notra/auth?token=${token}&next=/blog/post`
    );
    expect(login.status).toBe(302);
    expect(login.headers.get("Location")).toBe("/blog/post");
    expect(login.headers.get("Set-Cookie")).toContain("HttpOnly");

    const page = await request("https://pr-7--acme.notra.site/blog/post", {
      Cookie: `${SITE_PREVIEW_COOKIE}=${token}`,
    });
    expect(page.status).toBe(200);
    expect(await page.text()).toBe("dep_pr:/blog/post/index.html");
    expect(page.headers.get("X-Robots-Tag")).toContain("noindex");
    expect(page.headers.get("Cache-Control")).toBe("private, no-store");

    const otherPreview = await signSitePreviewToken(
      { siteId: SITE, previewKey: "pr-8", exp, kind: "share" },
      SECRET
    );
    expect(
      (
        await request("https://pr-7--acme.notra.site/blog", {
          Cookie: `${SITE_PREVIEW_COOKIE}=${otherPreview}`,
        })
      ).status
    ).toBe(401);
    const expired = await signSitePreviewToken(
      { siteId: SITE, previewKey: "pr-7", exp: exp - 7200, kind: "share" },
      SECRET
    );
    expect(
      (
        await request("https://pr-7--acme.notra.site/blog", {
          Cookie: `${SITE_PREVIEW_COOKIE}=${expired}`,
        })
      ).status
    ).toBe(401);
  });

  test("auth redirect never leaves the preview host", async () => {
    const { request } = setup();
    const exp = Math.floor(new Date("2026-10-03T13:00:00Z").getTime() / 1000);
    const token = await signSitePreviewToken(
      { siteId: SITE, previewKey: null, exp, kind: "member" },
      SECRET
    );
    const login = await request(
      `https://pr-7--acme.notra.site/_notra/auth?token=${token}&next=//evil.example.com`
    );
    expect(login.headers.get("Location")).toBe("/");
  });

  test("public previews are open but noindex; unknown previews 404", async () => {
    const { request, put } = setup();
    put(`sites/${SITE}/state.json`, {
      version: 1,
      siteId: SITE,
      slug: "acme",
      status: "active",
      production: null,
      previews: {
        "br-docs": {
          deploymentId: "dep_pr",
          visibility: "public",
          sequence: 1,
          activatedAt: "x",
          expiresAt: null,
        },
      },
      updatedAt: "x",
    });
    const page = await request("https://br-docs--acme.notra.site/blog");
    expect(page.status).toBe(200);
    expect(page.headers.get("X-Robots-Tag")).toContain("noindex");
    expect(
      (await request("https://br-nope--acme.notra.site/blog")).status
    ).toBe(404);
    expect((await request("https://acme.notra.site/blog")).status).toBe(404);
  });

  test("the dev host override only works with its secret", async () => {
    const { request, deps } = setup();
    const headers = {
      "x-notra-host": "acme.notra.site",
      "x-notra-dev-token": "dev",
    };
    expect(
      (await request("https://notra-sites-dev.workers.dev/blog", headers))
        .status
    ).toBe(404);
    deps.devHostOverrideToken = "dev";
    expect(
      (await request("https://notra-sites-dev.workers.dev/blog", headers))
        .status
    ).toBe(200);
  });
});
