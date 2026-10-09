import { beforeEach, describe, expect, test } from "bun:test";

import { SITE_PREVIEW_COOKIE } from "@notra/sites-core/constants/sites";
import type {
  SiteManifest,
  SitePreviewPassword,
  SiteServingState,
} from "@notra/sites-core/types/deployment";
import type { SitePreviewTokenClaims } from "@notra/sites-core/types/preview-token";
import { hashPreviewPassword } from "@notra/sites-core/utils/preview-password";
import { revokePreviewSessionsInState } from "@notra/sites-core/utils/preview-revocation";
import { signSitePreviewToken } from "@notra/sites-core/utils/preview-token";

import { handleSiteRequest } from "../src/handler";
import { resetCachesForTests } from "../src/loaders";
import type { SitesDeps } from "../src/types/worker";

const SECRET = "test-secret";
const SITE = "site_a";
const PREVIEW = "https://pr-7--acme.notra.site";
const NOW = new Date("2026-10-03T12:00:00Z");
const PASSWORD = "correct horse battery";

let password: SitePreviewPassword;

const MEMBER = "user_member";
const NOW_SECONDS = Math.floor(NOW.getTime() / 1000);

function memberClaims(
  minutesAgo = 1,
  overrides: Partial<SitePreviewTokenClaims> = {}
): SitePreviewTokenClaims {
  const issuedAt = NOW.getTime() - minutesAgo * 60_000;
  return {
    siteId: SITE,
    previewKey: "pr-7",
    exp: Math.floor(issuedAt / 1000) + 3600,
    kind: "member",
    userId: MEMBER,
    issuedAt,
    ...overrides,
  };
}

function previewManifest(): SiteManifest {
  return {
    version: 1,
    siteId: SITE,
    deploymentId: "dep_pr",
    commitSha: "abc",
    toolchainVersion: "t",
    target: {
      publicOrigin: PREVIEW,
      mounts: { blog: "/blog" },
      noindex: true,
      branding: true,
    },
    configHash: "h",
    createdAt: "2026-10-03T00:00:00Z",
    totalBytes: 1,
    files: [
      {
        path: "/blog/index.html",
        size: 1,
        sha256: "a".repeat(64),
        contentType: "text/html; charset=utf-8",
      },
    ],
    redirects: [],
  };
}

function setup(previewPassword: SitePreviewPassword | null = password) {
  const objects = new Map<string, string>();
  const limiterKeys: string[] = [];
  let allowedAttempts = Number.POSITIVE_INFINITY;
  const state: SiteServingState = {
    version: 1,
    siteId: SITE,
    slug: "acme",
    status: "active",
    production: null,
    trafficToken: null,
    previews: {
      "pr-7": {
        deploymentId: "dep_pr",
        visibility: "protected",
        sequence: 4,
        activatedAt: "x",
        expiresAt: null,
      },
      "pr-8": {
        deploymentId: "dep_pr",
        visibility: "protected",
        sequence: 5,
        activatedAt: "x",
        expiresAt: null,
      },
      "pr-9": {
        deploymentId: "dep_pr",
        visibility: "protected",
        sequence: 6,
        activatedAt: "x",
        expiresAt: "2026-10-01T00:00:00Z",
      },
    },
    removedPreviews: { "pr-3": 2 },
    previewPassword,
    revokedSessions: {},
    updatedAt: "x",
  };
  const writeState = (next: SiteServingState) => {
    objects.set(`sites/${SITE}/state.json`, JSON.stringify(next));
    resetCachesForTests();
  };
  objects.set(
    "hosts/acme.notra.site.json",
    JSON.stringify({ version: 1, siteId: SITE, kind: "alias" })
  );
  objects.set(
    `deployments/${SITE}/dep_pr/manifest.json`,
    JSON.stringify(previewManifest())
  );
  objects.set(`deployments/${SITE}/dep_pr/files/blog/index.html`, "preview");
  writeState(state);

  const deps: SitesDeps = {
    bucket: {
      get: async (key) => {
        const value = objects.get(key);
        return value === undefined
          ? null
          : { body: new Response(value).body, text: async () => value };
      },
    },
    cache: null,
    hostingDomain: "notra.site",
    dashboardUrl: "https://app.example.com",
    previewSecret: SECRET,
    devHostOverrideToken: null,
    trafficIngestUrl: null,
    fetch: () => Promise.reject(new Error("no network in tests")),
    passwordAttemptLimiter: {
      limit: async ({ key }) => {
        limiterKeys.push(key);
        return { success: limiterKeys.length <= allowedAttempts };
      },
    },
    waitUntil: () => undefined,
    now: () => NOW,
  };
  const get = (
    url: string,
    cookie?: string,
    headers: Record<string, string> = {}
  ) =>
    handleSiteRequest(
      new Request(url, {
        headers: cookie
          ? { ...headers, Cookie: `${SITE_PREVIEW_COOKIE}=${cookie}` }
          : headers,
      }),
      deps
    );
  const submit = (
    fields: Record<string, string>,
    options: { origin?: string; host?: string } = {}
  ) => {
    const host = options.host ?? PREVIEW;
    return handleSiteRequest(
      new Request(`${host}/_notra/auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Origin: options.origin ?? host,
          "CF-Connecting-IP": "203.0.113.9",
        },
        body: new URLSearchParams(fields).toString(),
      }),
      deps
    );
  };
  return {
    deps,
    state,
    writeState,
    get,
    submit,
    limiterKeys,
    limitTo: (attempts: number) => {
      allowedAttempts = attempts;
    },
  };
}

function cookieValue(response: Response): string {
  const header = response.headers.get("Set-Cookie") ?? "";
  const match = new RegExp(`${SITE_PREVIEW_COOKIE}=([^;]*)`).exec(header);
  return match?.[1] ?? "";
}

beforeEach(async () => {
  resetCachesForTests();
  password ??= await hashPreviewPassword(PASSWORD, NOW);
});

describe("preview password", () => {
  test("the gate offers the password form only when a password is set", async () => {
    const withPassword = await setup().get(`${PREVIEW}/blog`);
    expect(withPassword.status).toBe(401);
    const page = await withPassword.text();
    expect(page).toContain('name="password"');
    expect(page).toContain('value="/blog"');
    expect(page).toContain("Continue with Notra");

    const withoutPassword = await (
      await setup(null).get(`${PREVIEW}/blog`)
    ).text();
    expect(withoutPassword).not.toContain('name="password"');
    expect(withoutPassword).toContain("app.example.com/sites/preview-access");
  });

  test("a wrong password shows an error and sets no cookie; the right one opens the preview", async () => {
    const { get, submit } = setup();
    const wrong = await submit({ password: "nope", next: "/blog" });
    expect(wrong.status).toBe(401);
    expect(wrong.headers.get("Set-Cookie")).toBeNull();
    expect(await wrong.text()).toContain("isn't right");

    const right = await submit({ password: PASSWORD, next: "/blog?x=1" });
    expect(right.status).toBe(303);
    expect(right.headers.get("Location")).toBe("/blog?x=1");
    const setCookie = right.headers.get("Set-Cookie") ?? "";
    for (const attribute of [
      "HttpOnly",
      "Secure",
      "SameSite=Lax",
      "Path=/",
      "Max-Age=43200",
    ]) {
      expect(setCookie).toContain(attribute);
    }
    expect(setCookie).not.toContain("Domain=");
    expect(setCookie).not.toContain(PASSWORD);

    const session = cookieValue(right);
    const page = await get(`${PREVIEW}/blog`, session);
    expect(page.status).toBe(200);
    expect(await page.text()).toBe("preview");
    expect(
      (await get("https://pr-8--acme.notra.site/blog", session)).status
    ).toBe(401);
  });

  test("changing or removing the password ends existing password sessions", async () => {
    const { state, writeState, get, submit } = setup();
    const session = cookieValue(
      await submit({ password: PASSWORD, next: "/blog" })
    );
    expect((await get(`${PREVIEW}/blog`, session)).status).toBe(200);

    writeState({
      ...state,
      previewPassword: await hashPreviewPassword(PASSWORD, NOW),
    });
    expect((await get(`${PREVIEW}/blog`, session)).status).toBe(401);
    const renewed = cookieValue(
      await submit({ password: PASSWORD, next: "/blog" })
    );
    expect((await get(`${PREVIEW}/blog`, renewed)).status).toBe(200);

    writeState({ ...state, previewPassword: null });
    expect((await get(`${PREVIEW}/blog`, renewed)).status).toBe(401);
    expect((await submit({ password: PASSWORD, next: "/blog" })).status).toBe(
      403
    );
  });

  test("member and share sessions keep working when the password changes", async () => {
    const { state, writeState, get } = setup();
    const share = await signSitePreviewToken(
      { siteId: SITE, previewKey: "pr-7", exp: 1_800_000_000, kind: "share" },
      SECRET
    );
    writeState({ ...state, previewPassword: null });
    expect((await get(`${PREVIEW}/blog`, share)).status).toBe(200);
  });

  test("password sessions cannot be forged or passed around as links", async () => {
    const { get } = setup();
    const exp = Math.floor(NOW.getTime() / 1000) + 600;
    const wrongVersion = await signSitePreviewToken(
      {
        siteId: SITE,
        previewKey: "pr-7",
        exp,
        kind: "password",
        passwordVersion: "guess",
      },
      SECRET
    );
    expect((await get(`${PREVIEW}/blog`, wrongVersion)).status).toBe(401);
    const unsigned = await signSitePreviewToken(
      {
        siteId: SITE,
        previewKey: "pr-7",
        exp,
        kind: "password",
        passwordVersion: password.version,
      },
      "another-secret"
    );
    expect((await get(`${PREVIEW}/blog`, unsigned)).status).toBe(401);

    const valid = await signSitePreviewToken(
      {
        siteId: SITE,
        previewKey: "pr-7",
        exp,
        kind: "password",
        passwordVersion: password.version,
      },
      SECRET
    );
    const viaLink = await get(`${PREVIEW}/_notra/auth?token=${valid}&next=/`);
    expect(viaLink.status).toBe(401);
    expect(viaLink.headers.get("Set-Cookie")).toBeNull();
  });

  test("cross-origin posts, oversized bodies and other hosts never reach the check", async () => {
    const { submit, limiterKeys } = setup();
    const crossOrigin = await submit(
      { password: PASSWORD, next: "/blog" },
      { origin: "https://evil.example.com" }
    );
    expect(crossOrigin.status).toBe(403);
    expect(crossOrigin.headers.get("Set-Cookie")).toBeNull();
    expect(limiterKeys).toHaveLength(0);

    const huge = await submit({ password: "x".repeat(5000), next: "/" });
    expect(huge.status).toBe(413);

    const onAlias = await submit(
      { password: PASSWORD, next: "/" },
      { host: "https://acme.notra.site" }
    );
    expect(onAlias.status).toBe(405);
    expect(limiterKeys).toEqual([`${SITE}:pr-7:203.0.113.9`]);
  });

  test("streamed oversized password forms stop at the byte limit", async () => {
    const { deps } = setup();
    let reads = 0;
    let canceled = false;
    const body = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          reads += 1;
          controller.enqueue(new Uint8Array(2048).fill(97));
        },
        cancel() {
          canceled = true;
        },
      },
      { highWaterMark: 0 }
    );
    const request = new Request(`${PREVIEW}/_notra/auth`, {
      method: "POST",
      headers: { Origin: PREVIEW },
      body,
    });
    expect(request.headers.get("Content-Length")).toBeNull();
    const response = await handleSiteRequest(request, deps);
    expect(response.status).toBe(413);
    expect(reads).toBe(3);
    expect(canceled).toBe(true);
  });

  test("password form limits count UTF-8 bytes rather than characters", async () => {
    const { deps } = setup();
    const response = await handleSiteRequest(
      new Request(`${PREVIEW}/_notra/auth`, {
        method: "POST",
        headers: { Origin: PREVIEW },
        body: `password=${"é".repeat(2500)}`,
      }),
      deps
    );
    expect(response.status).toBe(413);
  });

  test("a streamed form at the byte limit preserves split UTF-8 characters", async () => {
    const { deps } = setup();
    const form = `password=${PASSWORD}&next=/blog?x=é&padding=`;
    const encoder = new TextEncoder();
    const bytes = encoder.encode(
      form + "x".repeat(4096 - encoder.encode(form).byteLength)
    );
    const split = bytes.indexOf(0xc3) + 1;
    const response = await handleSiteRequest(
      new Request(`${PREVIEW}/_notra/auth`, {
        method: "POST",
        headers: { Origin: PREVIEW },
        body: new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(bytes.slice(0, split));
            controller.enqueue(bytes.slice(split));
            controller.close();
          },
        }),
      }),
      deps
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("Location")).toBe("/blog?x=%C3%A9");
  });

  test("forbidden and rate-limited forms are rejected before reading their bodies", async () => {
    for (const reason of ["origin", "password", "rate-limit"]) {
      const { deps, limitTo } = setup(reason === "password" ? null : password);
      if (reason === "rate-limit") {
        limitTo(0);
      }
      let reads = 0;
      const body = new ReadableStream<Uint8Array>(
        {
          pull(controller) {
            reads += 1;
            controller.error(new Error("body must not be read"));
          },
        },
        { highWaterMark: 0 }
      );
      const response = await handleSiteRequest(
        new Request(`${PREVIEW}/_notra/auth`, {
          method: "POST",
          headers: {
            Origin: reason === "origin" ? "https://evil.example.com" : PREVIEW,
          },
          body,
        }),
        deps
      );
      expect(response.status).toBe(reason === "rate-limit" ? 429 : 403);
      expect(reads).toBe(0);
    }
  });

  test("the rate limiter stops guessing per client and preview", async () => {
    const { submit, limiterKeys, limitTo } = setup();
    limitTo(2);
    expect((await submit({ password: "a", next: "/" })).status).toBe(401);
    expect((await submit({ password: "b", next: "/" })).status).toBe(401);
    const blocked = await submit({ password: PASSWORD, next: "/" });
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Set-Cookie")).toBeNull();
    expect(await blocked.text()).toContain("Too many attempts");
    expect(limiterKeys[0]).toBe(`${SITE}:pr-7:203.0.113.9`);
  });
});

describe("preview login and lifecycle", () => {
  test("redirects after login never leave the preview host", async () => {
    const { get, submit } = setup();
    const token = await signSitePreviewToken(memberClaims(), SECRET);
    for (const next of [
      "/\\evil.example.com",
      "//evil.example.com",
      "https://evil.example.com",
      "/%5Cevil.example.com/..",
      "data:text/html,hi",
    ]) {
      const viaToken = await get(
        `${PREVIEW}/_notra/auth?token=${token}&next=${encodeURIComponent(next)}`
      );
      expect(viaToken.status).toBe(302);
      const location = viaToken.headers.get("Location") ?? "";
      expect(new URL(location, PREVIEW).origin).toBe(PREVIEW);
      const viaPassword = await submit({ password: PASSWORD, next });
      expect(
        new URL(viaPassword.headers.get("Location") ?? "", PREVIEW).origin
      ).toBe(PREVIEW);
    }
  });

  test("plain-http dev hosts get a cookie without Secure", async () => {
    const { get } = setup();
    const token = await signSitePreviewToken(memberClaims(), SECRET);
    const login = await get(
      `http://pr-7--acme.notra.site/_notra/auth?token=${token}&next=/blog`
    );
    expect(login.headers.get("Set-Cookie")).not.toContain("Secure");
  });

  test("a non-member coming back from the dashboard sees why, not a loop", async () => {
    const denied = await setup().get(
      `${PREVIEW}/_notra/auth?error=forbidden&next=/blog`
    );
    expect(denied.status).toBe(403);
    expect(await denied.text()).toContain("doesn't have access");
  });

  test("sign-out clears the session cookie", async () => {
    const response = await setup().get(`${PREVIEW}/_notra/auth/sign-out`);
    expect(response.status).toBe(303);
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
  });

  test("closed and expired previews say so; unknown ones are 404", async () => {
    const { get } = setup();
    const closed = await get("https://pr-3--acme.notra.site/blog");
    expect(closed.status).toBe(410);
    expect(await closed.text()).toContain("This preview is closed");
    expect((await get("https://pr-9--acme.notra.site/blog")).status).toBe(410);
    expect((await get("https://pr-404--acme.notra.site/blog")).status).toBe(
      404
    );
  });
});

describe("member session revocation", () => {
  const sign = (claims: SitePreviewTokenClaims) =>
    signSitePreviewToken(claims, SECRET);

  test("signing out ends member sessions issued before it, not newer ones", async () => {
    const { state, writeState, get } = setup(null);
    const before = await sign(memberClaims(10));
    expect((await get(`${PREVIEW}/blog`, before)).status).toBe(200);

    writeState({
      ...state,
      revokedSessions: revokePreviewSessionsInState(
        {},
        MEMBER,
        "signed_out",
        NOW.getTime() - 5 * 60_000
      ),
    });
    expect((await get(`${PREVIEW}/blog`, before)).status).toBe(401);
    expect(
      (await get(`${PREVIEW}/blog`, await sign(memberClaims(1)))).status
    ).toBe(200);
    const colleague = await sign(memberClaims(10, { userId: "user_other" }));
    expect((await get(`${PREVIEW}/blog`, colleague)).status).toBe(200);
  });

  test("sign-out keeps the member's share links; losing access ends them too", async () => {
    const { state, writeState, get } = setup(null);
    const share = await sign({
      siteId: SITE,
      previewKey: "pr-7",
      exp: NOW_SECONDS + 86_400,
      kind: "share",
      userId: MEMBER,
      issuedAt: NOW.getTime() - 60 * 60_000,
    });
    const revokedAt = NOW.getTime() - 60_000;
    writeState({
      ...state,
      revokedSessions: revokePreviewSessionsInState(
        {},
        MEMBER,
        "signed_out",
        revokedAt
      ),
    });
    expect((await get(`${PREVIEW}/blog`, share)).status).toBe(200);
    writeState({
      ...state,
      revokedSessions: revokePreviewSessionsInState(
        {},
        MEMBER,
        "access_lost",
        revokedAt
      ),
    });
    expect((await get(`${PREVIEW}/blog`, share)).status).toBe(401);
  });

  test("member tokens without a member or issue time are refused", async () => {
    const { get } = setup(null);
    const anonymous = await sign({
      siteId: SITE,
      previewKey: "pr-7",
      exp: NOW_SECONDS + 600,
      kind: "member",
    });
    expect((await get(`${PREVIEW}/blog`, anonymous)).status).toBe(401);
    const viaLink = await get(
      `${PREVIEW}/_notra/auth?token=${anonymous}&next=/blog`
    );
    expect(viaLink.headers.get("Set-Cookie")).toBeNull();
  });

  test("an expired member session renews through the dashboard without the gate", async () => {
    const { state, writeState, get } = setup(null);
    const expired = await sign(memberClaims(90));
    const navigation = { Accept: "text/html", "Sec-Fetch-Mode": "navigate" };
    const renew = await get(`${PREVIEW}/blog?x=1`, expired, navigation);
    expect(renew.status).toBe(302);
    const location = new URL(renew.headers.get("Location") ?? "");
    expect(location.origin).toBe("https://app.example.com");
    expect(location.searchParams.get("next")).toBe("/blog?x=1");
    expect((await get(`${PREVIEW}/blog`, expired)).status).toBe(401);
    writeState({
      ...state,
      revokedSessions: revokePreviewSessionsInState(
        {},
        MEMBER,
        "signed_out",
        NOW.getTime() - 60_000
      ),
    });
    expect((await get(`${PREVIEW}/blog`, expired, navigation)).status).toBe(
      401
    );
  });

  test("member cookies outlive the 1 h token; the dashboard's no clears them", async () => {
    const { get } = setup(null);
    const login = await get(
      `${PREVIEW}/_notra/auth?token=${await sign(memberClaims(0))}&next=/blog`
    );
    expect(login.status).toBe(302);
    expect(login.headers.get("Set-Cookie")).toContain(
      `Max-Age=${7 * 24 * 3600}`
    );
    const denied = await get(`${PREVIEW}/_notra/auth?error=forbidden&next=/`);
    expect(denied.headers.get("Set-Cookie")).toContain("Max-Age=0");
  });

  test("revocations are pruned once every token they cover has expired", () => {
    const day = 24 * 3600 * 1000;
    const nowMs = NOW.getTime();
    const pruned = revokePreviewSessionsInState(
      {
        old: { sessions: nowMs - 8 * day, shareLinks: nowMs - 8 * day },
        recent: { sessions: nowMs - 8 * day, shareLinks: nowMs - day },
      },
      MEMBER,
      "signed_out",
      nowMs
    );
    expect(pruned).toEqual({
      recent: { shareLinks: nowMs - day },
      [MEMBER]: { sessions: nowMs },
    });
  });
});
