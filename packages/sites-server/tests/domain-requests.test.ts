import { beforeEach, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import { fileURLToPath } from "node:url";

import type { SiteDomain } from "../src/types/domains";
import type { Site } from "../src/types/sites";

if (process.env.NOTRA_SITES_DOMAIN_REQUEST_TEST_WORKER !== "1") {
  test("domain requests use the shared public-network fetch policy", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: { ...process.env, NOTRA_SITES_DOMAIN_REQUEST_TEST_WORKER: "1" },
      }
    );
    expect(result.status, result.stderr?.toString()).toBe(0);
  });
} else {
  let discoveryHost = "provider.example";
  let address = "93.184.216.34";
  let requests: string[] = [];
  let respond = (_url: string) => new Response("", { status: 404 });
  mock.module("node:dns/promises", () => ({
    lookup: async () => [{ address, family: 4 }],
    Resolver: class {
      resolveTxt() {
        return Promise.resolve([[discoveryHost]]);
      }
    },
  }));
  mock.module("undici/index.js", () => ({
    Agent: class {
      close() {
        return Promise.resolve();
      }
    },
    fetch: async (url: string) => {
      requests.push(url);
      return respond(url);
    },
  }));
  const { discoverDomainConnect, domainConnectForDomain } =
    await import("../src/domain-connect");
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  process.env.SITES_DOMAIN_CONNECT_PRIVATE_KEY = privateKey
    .export({ type: "pkcs8", format: "pem" })
    .toString();
  process.env.SITES_CNAME_TARGET = "cname.notra.site";
  const domain = {
    id: "domain1",
    siteId: "site1",
    hostname: "blog.acme.com",
    kind: "subdomain",
    status: "pending",
    verificationRecords: [
      {
        type: "TXT",
        name: "_notra.blog.acme.com",
        value: "synthetic-notra-proof",
        purpose: "ownership",
      },
      {
        type: "TXT",
        name: "_cf-custom-hostname.blog.acme.com",
        value: "ownership-token",
        purpose: "ownership",
      },
    ],
  } as SiteDomain;
  let proxyDomain = { ...domain, kind: "proxy" as const, hostname: "127.1" };
  mock.module("@notra/db/drizzle", () => ({
    createDb: () => {
      throw new Error("Unexpected provider binding database");
    },
    db: {
      select: () => ({
        from: () => ({ where: () => ({ limit: async () => [proxyDomain] }) }),
      }),
      update: () => ({
        set: (patch: Partial<SiteDomain>) => ({
          where: () => ({
            returning: async () => [{ ...proxyDomain, ...patch }],
          }),
        }),
      }),
    },
  }));
  mock.module("../src/utils/site-host-lock", () => ({
    acquireSiteHostLock: () => {
      throw new Error("Unexpected hostname acquisition");
    },
    withSiteHostLock: async (
      _hostname: string,
      run: (tx: unknown) => Promise<unknown>
    ) =>
      await run({
        select: () => ({ from: () => ({ where: async () => [proxyDomain] }) }),
        update: () => ({
          set: (patch: Partial<SiteDomain>) => ({
            where: () => ({
              returning: async () => [{ ...proxyDomain, ...patch }],
            }),
          }),
        }),
      }),
  }));
  const { refreshSiteDomain } = await import("../src/domains");

  beforeEach(() => {
    discoveryHost = "provider.example";
    address = "93.184.216.34";
    requests = [];
    respond = () => new Response("", { status: 404 });
  });

  test("discovery rejects canonical loopback literals before issuing a request", async () => {
    discoveryHost = "127.1:8443";
    expect(await discoverDomainConnect(domain.hostname)).toBeNull();
    expect(requests).toEqual([]);
  });

  test("proxy verification rejects canonical loopback before requesting it", async () => {
    proxyDomain = { ...proxyDomain, hostname: "127.1" };
    const result = await refreshSiteDomain(
      { id: "site1", mounts: { blog: "/blog" } } as Site,
      domain.id,
      null
    );
    expect(result.domain.status).toBe("verifying");
    expect(result.domain.lastError).toContain(
      "Private or reserved IP addresses"
    );
    expect(requests).toEqual([]);
  });

  test("discovery rejects DNS answers pointing to private networks", async () => {
    address = "10.0.0.1";
    expect(await discoverDomainConnect(domain.hostname)).toBeNull();
    expect(requests).toEqual([]);
  });

  test("discovery revalidates redirect destinations", async () => {
    respond = () =>
      new Response(null, {
        status: 302,
        headers: { location: "https://127.1/settings" },
      });
    expect(await discoverDomainConnect(domain.hostname)).toBeNull();
    expect(requests).toEqual(["https://provider.example/v2/acme.com/settings"]);
  });

  test("provider-supplied API URLs are validated before checking the template", async () => {
    respond = () =>
      Response.json({
        providerId: "example",
        providerName: "Example",
        urlSyncUX: "https://provider.example/setup",
        urlAPI: "https://127.1/api",
      });
    expect(
      (await domainConnectForDomain({ siteId: "site1", domain })).status
    ).toBe("unsupported");
    expect(requests).toEqual(["https://provider.example/v2/acme.com/settings"]);
  });

  test("template API redirects also revalidate DNS and block private destinations", async () => {
    respond = (url) =>
      url.endsWith("/settings")
        ? Response.json({
            providerId: "example",
            providerName: "Example",
            urlSyncUX: "https://provider.example/setup",
            urlAPI: "https://provider.example/api",
          })
        : new Response(null, {
            status: 302,
            headers: { location: "http://169.254.169.254/" },
          });
    expect(
      (await domainConnectForDomain({ siteId: "site1", domain })).status
    ).toBe("unsupported");
    expect(requests).toHaveLength(2);
    expect(
      requests.every((url) => new URL(url).hostname === "provider.example")
    ).toBe(true);
  });

  test("oversized streamed provider JSON is cancelled at the settings limit", async () => {
    let cancelled = false;
    let pulls = 0;
    respond = () =>
      new Response(
        new ReadableStream({
          pull(controller) {
            pulls += 1;
            controller.enqueue(new Uint8Array(4096));
          },
          cancel() {
            cancelled = true;
          },
        })
      );
    expect(await discoverDomainConnect(domain.hostname)).toBeNull();
    expect(cancelled).toBe(true);
    expect(pulls).toBeLessThanOrEqual(18);
  });

  test("unsuccessful settings responses cancel their unread body", async () => {
    let cancelled = false;
    respond = () =>
      new Response(
        new ReadableStream({
          cancel() {
            cancelled = true;
          },
        }),
        { status: 404 }
      );
    expect(await discoverDomainConnect(domain.hostname)).toBeNull();
    expect(cancelled).toBe(true);
  });

  test("oversized streamed probes stop before requesting the landing page", async () => {
    let cancelled = false;
    let pulls = 0;
    proxyDomain = { ...proxyDomain, hostname: "blog.acme.com" };
    respond = () =>
      new Response(
        new ReadableStream({
          pull(controller) {
            pulls += 1;
            controller.enqueue(
              pulls === 1
                ? new TextEncoder().encode("notra-site=site1\n")
                : new Uint8Array(4096)
            );
          },
          cancel() {
            cancelled = true;
          },
        })
      );
    const result = await refreshSiteDomain(
      { id: "site1", mounts: { blog: "/blog" } } as Site,
      domain.id,
      null
    );
    expect(result.domain.lastError).toContain("larger than 8192 bytes");
    expect(cancelled).toBe(true);
    expect(pulls).toBeLessThanOrEqual(5);
    expect(requests).toHaveLength(1);
  });

  test("proxy verification discards the landing page body after reading headers", async () => {
    let cancelled = false;
    proxyDomain = { ...proxyDomain, hostname: "blog.acme.com" };
    respond = (url) =>
      url.endsWith("probe.txt")
        ? new Response("notra-site=site1\n")
        : new Response(
            new ReadableStream({
              cancel() {
                cancelled = true;
              },
            }),
            { headers: { "x-robots-tag": "noindex" } }
          );
    const result = await refreshSiteDomain(
      { id: "site1", mounts: { blog: "/blog" } } as Site,
      domain.id,
      null
    );
    expect(result.domain.lastError).toContain("X-Robots-Tag: noindex");
    expect(cancelled).toBe(true);
    expect(requests).toHaveLength(2);
  });
}
