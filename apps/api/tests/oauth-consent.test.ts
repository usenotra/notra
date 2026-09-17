import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import {
  API_GRANULAR_SCOPES,
  API_SCOPE_RESOURCES,
} from "@notra/utils/api-scopes";
import {
  buildOAuthConsentOptions,
  readOAuthConsentGrant,
} from "@notra/utils/oauth-consent";
import { PgDialect } from "drizzle-orm/pg-core";
import { Hono } from "hono";
import { exportJWK, generateKeyPair, SignJWT } from "jose";

import { authMiddleware } from "../src/middleware/auth";
import { buildProtectedResourceMetadata } from "../src/utils/agent-discovery";

const issuer = "https://consent-test.authkit.app";
const audience = "https://mcp.usenotra.com/mcp";
const keyPair = await generateKeyPair("RS256");
const jwk = {
  ...(await exportJWK(keyPair.publicKey)),
  kid: "consent-test",
  alg: "RS256",
};
const originalFetch = globalThis.fetch;
let member = true;
let membershipParams: unknown[] = [];

beforeAll(() => {
  globalThis.fetch = async (input, init) => {
    if (String(input) === `${issuer}/oauth2/jwks`) {
      return Response.json({ keys: [jwk] });
    }
    return originalFetch(input, init);
  };
});
afterAll(() => {
  globalThis.fetch = originalFetch;
});

const db = {
  query: {
    users: { findFirst: async () => ({ id: "local-user" }) },
    organizations: {
      findFirst: async ({ where }) => {
        const [workosId] = new PgDialect().sqlToQuery(where).params;
        return workosId === "workos-org" ? { id: "workspace-1" } : undefined;
      },
    },
    members: {
      findFirst: async ({ where }) => {
        membershipParams = new PgDialect().sqlToQuery(where).params;
        return member &&
          membershipParams[0] === "local-user" &&
          membershipParams[1] === "workspace-1"
          ? { id: "membership-1" }
          : undefined;
      },
    },
  },
};

const app = new Hono();
app.use("*", async (c, next) => {
  c.set("db", db);
  await next();
});
app.get("/posts", authMiddleware({ permissions: "posts.read" }), (c) =>
  c.json(c.get("auth"))
);
app.post("/posts", authMiddleware({ permissions: "posts.write" }), (c) =>
  c.json(c.get("auth"))
);
app.get("/traffic", authMiddleware({ permissions: "traffic.read" }), (c) =>
  c.json(c.get("auth"))
);
app.post("/scans", authMiddleware({ permissions: "scans.write" }), (c) =>
  c.json(c.get("auth"))
);
app.get("/workspaces", authMiddleware(), (c) => c.json(c.get("auth")));

const claims = {
  "urn:notra:workspace": "workspace-1",
  "urn:notra:permission:posts": "read",
  "urn:notra:permission:scans": "write",
  scope: "openid offline_access",
};

async function sign(payload = claims, key = keyPair.privateKey) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256", kid: jwk.kid })
    .setIssuer(issuer)
    .setSubject("workos-user")
    .setAudience(audience)
    .setExpirationTime("5m")
    .sign(key);
}

function request(token: string, path = "/posts", method = "GET") {
  return app.request(
    path,
    { method, headers: { Authorization: `Bearer ${token}` } },
    {
      WORKOS_AUTHKIT_DOMAIN: "consent-test.authkit.app",
    }
  );
}

describe("Connect consent authorization through API middleware", () => {
  test("consent covers every API-key permission and discovery requests supported scopes", () => {
    const options = buildOAuthConsentOptions();
    expect(options).toHaveLength(1);
    expect(options[0].claim).toBe("urn:notra:access");
    expect(options[0].choices.map(({ value }) => value)).toEqual([
      "read",
      "write",
      "full",
    ]);
    expect(buildProtectedResourceMetadata().scopes_supported).toEqual([
      "openid",
      "offline_access",
    ]);
  });

  test("access levels enforce read, write and full across content and GEO", async () => {
    for (const level of ["read", "write", "full"]) {
      const token = await sign({
        ...claims,
        "urn:notra:access": level,
        permissions: ["*"],
      });
      expect((await request(token)).status).toBe(level === "write" ? 403 : 200);
      expect((await request(token, "/traffic")).status).toBe(
        level === "write" ? 403 : 200
      );
      expect((await request(token, "/posts", "POST")).status).toBe(
        level === "read" ? 403 : 200
      );
      expect((await request(token, "/scans", "POST")).status).toBe(
        level === "read" ? 403 : 200
      );
      const grant = readOAuthConsentGrant({
        ...claims,
        "urn:notra:access": level,
      });
      expect(new Set(grant?.scopes)).toEqual(
        new Set(
          API_GRANULAR_SCOPES.filter(
            (scope) => level === "full" || scope.endsWith(`.${level}`)
          )
        )
      );
    }
    expect(
      (await request(await sign({ ...claims, "urn:notra:access": "invalid" })))
        .status
    ).toBe(401);
    expect(readOAuthConsentGrant({ "urn:notra:access": "full" })).toBeNull();
  });

  test("WorkOS organization selection resolves to a local organization and checks membership", async () => {
    const token = await sign({
      org_id: "workos-org",
      "urn:notra:access": "full",
    });
    const response = await request(token);
    expect(response.status).toBe(200);
    expect((await response.json()).identity.externalId).toBe("workspace-1");
    expect(membershipParams).toEqual(["local-user", "workspace-1"]);
    member = false;
    try {
      expect((await request(token)).status).toBe(403);
    } finally {
      member = true;
    }
    expect(
      (
        await request(
          await sign({ org_id: "unmapped-org", "urn:notra:access": "full" })
        )
      ).status
    ).toBe(401);
    expect(
      (await request(await sign({ org_id: "", "urn:notra:access": "full" })))
        .status
    ).toBe(401);
    expect(
      (await request(await sign({ "urn:notra:access": "full" }))).status
    ).toBe(401);
  });

  test("all 34 permissions remain available, including every GEO resource", () => {
    const allWrite = Object.fromEntries(
      API_SCOPE_RESOURCES.map(({ id }) => [
        `urn:notra:permission:${id}`,
        "write",
      ])
    );
    const grant = readOAuthConsentGrant({
      ...allWrite,
      "urn:notra:workspace": "workspace-1",
    });
    expect(new Set(grant?.scopes)).toEqual(new Set(API_GRANULAR_SCOPES));
    expect(
      readOAuthConsentGrant({ "urn:notra:workspace": "workspace-1" })?.scopes
    ).toEqual([]);
  });

  test("signed read grant works without org_id; write includes read and GEO write works", async () => {
    const token = await sign();
    const response = await request(token);
    expect(response.status).toBe(200);
    const auth = await response.json();
    expect(auth.identity.externalId).toBe("workspace-1");
    expect(auth.scopes).toEqual(["posts.read", "scans.read", "scans.write"]);
    expect(membershipParams).toEqual(["local-user", "workspace-1"]);
    expect((await request(token, "/scans", "POST")).status).toBe(200);
  });

  test("read-only and ungranted tools stay forbidden, even with broad role permissions", async () => {
    const token = await sign({
      ...claims,
      permissions: ["*", "api.write", "traffic.read"],
    });
    expect((await request(token, "/posts", "POST")).status).toBe(403);
    expect((await request(token, "/traffic")).status).toBe(403);
  });

  test("removing membership invalidates an existing token immediately", async () => {
    const token = await sign();
    expect((await request(token)).status).toBe(200);
    member = false;
    try {
      expect((await request(token)).status).toBe(403);
    } finally {
      member = true;
    }
    expect((await request(token)).status).toBe(200);
  });

  test("another workspace, identity-only tokens and malformed grants cannot access tools", async () => {
    expect(
      (
        await request(
          await sign({ ...claims, "urn:notra:workspace": "workspace-2" })
        )
      ).status
    ).toBe(403);
    expect(
      (
        await request(
          await sign({ scope: "openid offline_access", org_id: "workos-org" })
        )
      ).status
    ).toBe(403);
    expect(
      (
        await request(
          await sign({ ...claims, "urn:notra:permission:posts": "*" })
        )
      ).status
    ).toBe(401);
    expect(
      (
        await request(
          await sign({
            "urn:notra:permission:posts": "write",
            permissions: ["*"],
          })
        )
      ).status
    ).toBe(401);
    expect(
      (
        await request(
          await sign({ ...claims, "urn:notra:workspace": "" }),
          "/workspaces"
        )
      ).status
    ).toBe(401);
  });

  test("forged signatures cannot authorize consent claims", async () => {
    const otherKey = await generateKeyPair("RS256");
    expect(
      (await request(await sign(claims, otherKey.privateKey))).status
    ).toBe(401);
  });
});
