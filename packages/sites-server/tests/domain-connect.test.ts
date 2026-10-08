import { describe, expect, test } from "bun:test";
import { createPublicKey, generateKeyPairSync, verify } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  DOMAIN_CONNECT_CNAME_TARGET,
  DOMAIN_CONNECT_NOTRA_OWNERSHIP_VARIABLE,
  DOMAIN_CONNECT_OWNERSHIP_VARIABLE,
  DOMAIN_CONNECT_TEMPLATE_VERSION,
} from "../src/constants/domain-connect";
import {
  buildApplyUrl,
  discoverDomainConnect,
  domainConnectForDomain,
  getDomainConnectConfig,
} from "../src/domain-connect";
import { domainConnectTemplateSchema } from "../src/schemas/domain-connect";
import type { DomainConnectDeps } from "../src/types/domain-connect";
import type { SiteDomain } from "../src/types/domains";
import {
  signDomainConnectCallback,
  verifyDomainConnectCallback,
} from "../src/utils/domain-connect-callback";
import { publicKeyTxtRecords } from "../src/utils/domain-connect-keys";
import { domainOwnershipRecord } from "../src/utils/domain-ownership";
import { applyVercelDnsRecords } from "../src/vercel-dns";

function publicKeyFromTxt(records: string[]): string {
  const parts = records
    .map((record) => {
      const fields = Object.fromEntries(
        record.split(",").map((field) => [field.slice(0, 1), field.slice(2)])
      );
      return { index: Number(fields.p), data: fields.d ?? "" };
    })
    .sort((a, b) => a.index - b.index);
  return `-----BEGIN PUBLIC KEY-----\n${parts.map((part) => part.data).join("")}\n-----END PUBLIC KEY-----\n`;
}

describe("signed apply URL", () => {
  test("verifies against the key published in DNS, sig last", () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
    const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    process.env.SITES_DOMAIN_CONNECT_PRIVATE_KEY = pem.replaceAll("\n", "\\n");
    const config = getDomainConnectConfig();
    expect(config).not.toBeNull();
    if (!config) {
      return;
    }

    const url = buildApplyUrl({
      settings: { urlSyncUX: "https://dash.cloudflare.com/domainconnect/" },
      config,
      domain: "acme.co.uk",
      host: "blog",
      variables: {
        ownership: "5ff4a0b2-d1e6-4a7c-9b1d-0c7f2a9e8f11",
        notraOwnership: "notra-domain-v1=synthetic-site-proof",
      },
      redirectUri:
        "https://app.usenotra.com/sites/domain-connect/eyJ.a_b-c?x=1 2",
    });

    const parsed = new URL(url);
    expect(parsed.pathname).toBe(
      "/domainconnect/v2/domainTemplates/providers/usenotra.com/services/sites/apply"
    );
    expect([...parsed.searchParams.keys()].slice(-2)).toEqual(["key", "sig"]);
    expect(parsed.searchParams.get("redirect_uri")).toBe(
      "https://app.usenotra.com/sites/domain-connect/eyJ.a_b-c?x=1 2"
    );
    expect(
      parsed.searchParams.get(DOMAIN_CONNECT_NOTRA_OWNERSHIP_VARIABLE)
    ).toBe("notra-domain-v1=synthetic-site-proof");

    const records = publicKeyTxtRecords(publicKey);
    for (const record of records) {
      expect(record.length).toBeLessThan(255);
    }
    const signed = url.slice(url.indexOf("?") + 1, url.indexOf("&key="));
    const signature = Buffer.from(
      parsed.searchParams.get("sig") ?? "",
      "base64"
    );
    const providerKey = createPublicKey(publicKeyFromTxt(records));
    expect(
      verify("sha256", Buffer.from(signed), providerKey, signature)
    ).toBeTrue();
    expect(
      verify("sha256", Buffer.from(`${signed}x`), providerKey, signature)
    ).toBeFalse();
    expect(
      verify(
        "sha256",
        Buffer.from(
          signed.replace("synthetic-site-proof", "another-site-proof")
        ),
        providerKey,
        signature
      )
    ).toBeFalse();
  });
});

describe("discovery", () => {
  test("walks up to the zone the provider actually hosts", async () => {
    const queried: string[] = [];
    const deps: DomainConnectDeps = {
      resolveTxt: (name) => {
        queried.push(name);
        if (name === "_domainconnect.blog.acme.co.uk") {
          return Promise.resolve([["stale.example"]]);
        }
        if (name === "_domainconnect.acme.co.uk") {
          return Promise.resolve([
            ["api.cloudflare.com/client/v4/dns/", "domainconnect"],
          ]);
        }
        return Promise.reject(
          Object.assign(new Error("ENOTFOUND"), { code: "ENOTFOUND" })
        );
      },
      fetch: ((input: string | URL | Request) => {
        const url = String(input);
        if (
          url ===
          "https://api.cloudflare.com/client/v4/dns/domainconnect/v2/acme.co.uk/settings"
        ) {
          return Promise.resolve(
            Response.json({
              providerId: "cloudflare.com",
              providerName: "cloudflare",
              providerDisplayName: "Cloudflare",
              urlSyncUX: "https://dash.cloudflare.com/domainconnect",
              urlAPI: "https://api.cloudflare.com/client/v4/dns/domainconnect",
            })
          );
        }
        return Promise.resolve(new Response("Not Found", { status: 404 }));
      }) as typeof fetch,
    };

    const settings = await discoverDomainConnect("Docs.Blog.Acme.co.uk.", deps);
    expect(settings).toMatchObject({
      providerId: "cloudflare.com",
      domain: "acme.co.uk",
      host: "docs.blog",
    });
    expect(queried).toEqual([
      "_domainconnect.blog.acme.co.uk",
      "_domainconnect.acme.co.uk",
    ]);

    expect(await discoverDomainConnect("blog.unknown.dev", deps)).toBeNull();
    expect(queried.at(-1)).toBe("_domainconnect.unknown.dev");
  });
});

describe("callback token", () => {
  test("round-trips and rejects tampering and expiry", () => {
    process.env.SITES_PREVIEW_SECRET = "test-secret";
    const now = 1_800_000_000;
    const token = signDomainConnectCallback(
      { siteId: "site_a", domainId: "dom_b" },
      now
    );
    expect(verifyDomainConnectCallback(token, now)).toMatchObject({
      siteId: "site_a",
      domainId: "dom_b",
    });
    const [payload, signature] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ siteId: "site_x", domainId: "dom_b", exp: now + 60 })
    ).toString("base64url");
    expect(
      verifyDomainConnectCallback(`${forged}.${signature}`, now)
    ).toBeNull();
    expect(
      verifyDomainConnectCallback(`${payload}.${signature}x`, now)
    ).toBeNull();
    expect(verifyDomainConnectCallback(token, now + 3 * 60 * 60)).toBeNull();
  });
});

test("published template matches what the code sends", () => {
  const template = JSON.parse(
    readFileSync(
      new URL("../domain-connect/usenotra.com.sites.json", import.meta.url),
      "utf8"
    )
  ) as {
    providerId: string;
    serviceId: string;
    version: number;
    records: Array<{
      type: string;
      host: string;
      pointsTo?: string;
      data?: string;
    }>;
  };
  expect(`${template.providerId}.${template.serviceId}`).toBe(
    "usenotra.com.sites"
  );
  expect(template.version).toBe(DOMAIN_CONNECT_TEMPLATE_VERSION);
  expect(template.records).toContainEqual(
    expect.objectContaining({
      type: "CNAME",
      host: "@",
      pointsTo: DOMAIN_CONNECT_CNAME_TARGET,
    })
  );
  expect(template.records).toContainEqual(
    expect.objectContaining({
      type: "TXT",
      host: "_cf-custom-hostname",
      data: `%${DOMAIN_CONNECT_OWNERSHIP_VARIABLE}%`,
    })
  );
  expect(template.records).toContainEqual(
    expect.objectContaining({
      type: "TXT",
      host: "_notra",
      data: `%${DOMAIN_CONNECT_NOTRA_OWNERSHIP_VARIABLE}%`,
    })
  );
});

test("automatic Domain Connect requires the complete tenant-proof template and signs both TXT values", async () => {
  process.env.SITES_PREVIEW_SECRET = "synthetic-domain-connect-secret";
  process.env.SITES_CNAME_TARGET = DOMAIN_CONNECT_CNAME_TARGET;
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  process.env.SITES_DOMAIN_CONNECT_PRIVATE_KEY = privateKey
    .export({ type: "pkcs8", format: "pem" })
    .toString();
  const template = domainConnectTemplateSchema.parse(
    JSON.parse(
      readFileSync(
        new URL("../domain-connect/usenotra.com.sites.json", import.meta.url),
        "utf8"
      )
    )
  );
  let offeredTemplate = { ...template, version: 1 };
  const record = domainOwnershipRecord("site_a", "blog.acme.com");
  const domain = {
    id: "dom_a",
    siteId: "site_a",
    hostname: "blog.acme.com",
    kind: "subdomain",
    status: "pending",
    verificationRecords: [
      record,
      {
        type: "TXT",
        name: "_cf-custom-hostname.blog.acme.com",
        value: "synthetic-cloudflare-proof",
        purpose: "ownership",
      },
    ],
  } as SiteDomain;
  const deps: DomainConnectDeps = {
    resolveTxt: async () => [["provider.example"]],
    fetch: (async (input: string | URL | Request) =>
      String(input).endsWith("/settings")
        ? Response.json({
            providerId: "synthetic",
            providerName: "Synthetic",
            urlSyncUX: "https://provider.example/setup",
            urlAPI: "https://provider.example/api",
          })
        : Response.json(offeredTemplate)) as typeof fetch,
  };
  expect(
    (await domainConnectForDomain({ siteId: "site_a", domain, deps })).status
  ).toBe("unsupported");
  offeredTemplate = {
    ...template,
    records: template.records.filter((entry) => entry.host !== "_notra"),
  };
  expect(
    (await domainConnectForDomain({ siteId: "site_a", domain, deps })).status
  ).toBe("unsupported");
  offeredTemplate = {
    ...template,
    records: [
      ...template.records,
      { type: "TXT", host: "unrelated", data: "unexpected" },
    ],
  };
  expect(
    (await domainConnectForDomain({ siteId: "site_a", domain, deps })).status
  ).toBe("unsupported");
  offeredTemplate = {
    ...template,
    records: template.records.map((entry) =>
      entry.host === "_notra"
        ? { ...entry, data: `%${DOMAIN_CONNECT_OWNERSHIP_VARIABLE}%` }
        : entry
    ),
  };
  expect(
    (await domainConnectForDomain({ siteId: "site_a", domain, deps })).status
  ).toBe("unsupported");
  offeredTemplate = template;
  const result = await domainConnectForDomain({
    siteId: "site_a",
    domain,
    deps,
  });
  expect(result.status).toBe("ready");
  if (result.status !== "ready") {
    throw new Error("Expected complete automatic DNS setup");
  }
  const url = new URL(result.applyUrl);
  expect(url.searchParams.get(DOMAIN_CONNECT_OWNERSHIP_VARIABLE)).toBe(
    "synthetic-cloudflare-proof"
  );
  expect(url.searchParams.get(DOMAIN_CONNECT_NOTRA_OWNERSHIP_VARIABLE)).toBe(
    record.value
  );
  expect(
    (
      await domainConnectForDomain({
        siteId: "site_a",
        domain: { ...domain, verificationRecords: [record] },
        deps,
      })
    ).status
  ).toBe("unsupported");
});

test("Vercel DNS applies every verification record including the site-bound Notra TXT", async () => {
  process.env.SITES_PREVIEW_SECRET = "synthetic-vercel-domain-secret";
  const record = domainOwnershipRecord("site_a", "blog.acme.com");
  const writes: unknown[] = [];
  await applyVercelDnsRecords({
    grant: {
      accessToken: "synthetic",
      teamId: null,
      configurationId: "synthetic",
    },
    zone: "acme.com",
    records: [
      record,
      {
        type: "CNAME",
        name: "blog.acme.com",
        value: DOMAIN_CONNECT_CNAME_TARGET,
        purpose: "routing",
      },
      {
        type: "TXT",
        name: "_cf-custom-hostname.blog.acme.com",
        value: "synthetic-cloudflare-proof",
        purpose: "ownership",
      },
    ],
    deps: {
      fetch: (async (_input: string | URL | Request, init?: RequestInit) => {
        writes.push(JSON.parse(String(init?.body)));
        return new Response(null, { status: 200 });
      }) as typeof fetch,
    },
  });
  expect(writes).toHaveLength(3);
  expect(writes).toContainEqual(
    expect.objectContaining({
      name: "_notra.blog",
      type: "TXT",
      value: record.value,
    })
  );
});
