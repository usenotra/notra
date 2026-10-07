import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("native WorkOS operations preserve PKCE, session persistence, and logout without SDK RPC", async () => {
  const script = `
    import { mock } from "bun:test";
    import assert from "node:assert/strict";
    import * as start from "@tanstack/react-start";
    const emitted = new Headers();
    let auth = { user: null };
    const context = {
      auth: () => auth,
      request: new Request("http://localhost:3000/auth/initiate", {
        headers: { cookie: Array.from({ length: 5 }, (_, i) => "wos-auth-verifier-old" + i + "=old").join("; ") },
      }),
      redirectUri: "http://localhost:3000/auth/callback",
      __setPendingHeader: (key, value) => emitted.append(key, value),
    };
    mock.module("@tanstack/react-start", () => ({ ...start, getGlobalStartContext: () => context }));
    globalThis.fetch = () => { throw new Error("Unexpected provider request"); };
    const { configure, sessionEncryption } = await import("@workos/authkit-session");
    configure({ apiKey: "sk_test_local_fixture_only", clientId: "client_local_fixture", cookiePassword: "local-test-cookie-password-with-32-characters", redirectUri: context.redirectUri });
    const { createAuthSignInUrl, saveAuthSession, signOutAuthSession } = await import("./src/lib/auth/workos.ts");
    const url = new URL(await createAuthSignInUrl());
    assert.equal(url.searchParams.get("redirect_uri"), context.redirectUri);
    assert.equal(url.searchParams.get("code_challenge_method"), "S256");
    assert.ok(url.searchParams.get("state"));
    assert.equal(emitted.getSetCookie().length, 6);
    assert.ok(emitted.getSetCookie()[0].includes("HttpOnly"));
    assert.equal(emitted.getSetCookie().filter(cookie => cookie.includes("Max-Age=0")).length, 5);
    emitted.delete("set-cookie");
    const { GET } = await import("./src/app/auth/initiate/route.ts");
    let signInRedirect;
    try { await GET(); } catch (error) { signInRedirect = error; }
    assert.ok(new URL(signInRedirect.options.href).searchParams.get("code_challenge"));
    assert.equal(emitted.getSetCookie().length, 6);
    emitted.delete("set-cookie");
    const session = { accessToken: "local-access", refreshToken: "local-refresh", user: { id: "user_local_fixture" } };
    await saveAuthSession(session);
    const cookie = emitted.getSetCookie()[0];
    assert.ok(cookie.startsWith("wos-session="));
    const sealed = decodeURIComponent(cookie.split(";")[0].slice("wos-session=".length));
    assert.deepEqual(await sessionEncryption.unsealData(sealed, { password: "local-test-cookie-password-with-32-characters", ttl: 0 }), session);
    emitted.delete("set-cookie");
    auth = { user: session.user, sessionId: "session_local_fixture" };
    let logout;
    try { await signOutAuthSession({ returnTo: "http://localhost:3000/login" }); } catch (error) { logout = error; }
    assert.ok(logout);
    const logoutUrl = new URL(logout.options.href);
    assert.equal(logoutUrl.searchParams.get("session_id"), "session_local_fixture");
    assert.equal(logoutUrl.searchParams.get("return_to"), "http://localhost:3000/login");
    assert.equal(logout.options.reloadDocument, true);
    assert.ok(emitted.getSetCookie().some(cookie => cookie.startsWith("wos-session=") && cookie.includes("Max-Age=0")));
    auth = { user: null };
    let anonymous;
    try { await signOutAuthSession({ returnTo: "/login" }); } catch (error) { anonymous = error; }
    assert.equal(anonymous.options.href, "/login");
  `;
  const child = spawnSync(process.execPath, ["--eval", script], {
    cwd: fileURLToPath(new URL("../../..", import.meta.url)),
    env: {
      PATH: process.env.PATH,
      NODE_ENV: "test",
      WORKOS_API_KEY: "sk_test_local_fixture_only",
      WORKOS_CLIENT_ID: "client_local_fixture",
      WORKOS_COOKIE_PASSWORD: "local-test-cookie-password-with-32-characters",
      WORKOS_REDIRECT_URI: "http://localhost:3000/auth/callback",
    },
    encoding: "utf8",
  });
  expect(child.stderr).toBe("");
  expect(child.status).toBe(0);
});

test("a new session authenticates the next request after replacing both cookie scopes", () => {
  const script = `
    import { mock } from "bun:test";
    import assert from "node:assert/strict";
    import { createRequire } from "node:module";
    import { dirname } from "node:path";
    import * as start from "@tanstack/react-start";
    import * as server from "@tanstack/react-start/server";
    const require = createRequire(import.meta.url);
    const { SignJWT, exportJWK, generateKeyPair } = await import(require.resolve("jose", {
      paths: [dirname(require.resolve("@workos/authkit-session"))],
    }));
    const { privateKey, publicKey } = await generateKeyPair("RS256");
    const jwk = { ...await exportJWK(publicKey), kid: "fixture-key", alg: "RS256" };
    globalThis.fetch = async (url) => {
      assert.equal(new URL(String(url)).pathname, "/sso/jwks/client_local_fixture");
      return Response.json({ keys: [jwk] });
    };
    let context;
    let cleanupEnabled = false;
    const jar = new Map();
    const hostDeletes = [];
    mock.module("@tanstack/react-start", () => ({ ...start, getGlobalStartContext: () => context }));
    mock.module("@tanstack/react-start/server", () => ({
      ...server,
      getRequest: () => context.request,
      deleteCookie: (name, options) => {
        assert.equal(name, "wos-session");
        assert.equal(options.path, "/");
        hostDeletes.push(options);
        if (cleanupEnabled) jar.delete(options.domain ?? "host");
      },
    }));
    const { dashboardAuthMiddleware } = await import("./src/middleware/auth.ts");
    const { saveAuthSession, signOutAuthSession } = await import("./src/lib/auth/workos.ts");
    const { clearAuthSessionCookie, clearHostAuthSessionCookie } = await import("./src/lib/auth/session-cookie.ts");
    const session = {
      accessToken: await new SignJWT({ sid: "session_fixture" }).setProtectedHeader({ alg: "RS256", kid: "fixture-key" }).setSubject("user_fixture").setIssuedAt().setExpirationTime("1h").sign(privateKey),
      refreshToken: "fixture-refresh",
      user: { id: "user_fixture" },
    };
    const invoke = async (path, downstream) => {
      const request = new Request("https://app.fixture.invalid" + path, {
        headers: { cookie: Array.from(jar.values()).join("; ") },
      });
      return dashboardAuthMiddleware.options.server({
        request, pathname: path, handlerType: "serverFn",
        next: async (options) => {
          context = options.context;
          await downstream();
          return { response: new Response("ok") };
        },
      });
    };
    const signIn = async () => {
      const result = await invoke("/_serverFn/mfa", () => saveAuthSession(session));
      const cookie = result.response.headers.getSetCookie().find(value => value.startsWith("wos-session=") && !value.includes("Max-Age=0"));
      assert.ok(cookie?.includes("Domain=.fixture.invalid"));
      assert.ok(cookie.includes("HttpOnly") && cookie.includes("Secure") && cookie.includes("SameSite=Lax"));
      jar.set(".fixture.invalid", cookie.split(";")[0]);
    };
    jar.set(".fixture.invalid", "wos-session=stale-domain");
    jar.set("host", "wos-session=stale-host");
    await signIn();
    await invoke("/callback", () => assert.equal(context.auth().user, null));
    cleanupEnabled = true;
    for (const scopes of [["host", ".fixture.invalid"], [".fixture.invalid", "host"]]) {
      jar.clear();
      for (const scope of scopes) jar.set(scope, "wos-session=stale");
      await signIn();
      assert.ok(!jar.has("host"));
      await invoke("/callback", () => {
        assert.equal(context.auth().user.id, "user_fixture");
        assert.equal(context.auth().sessionId, "session_fixture");
      });
    }
    await invoke("/_serverFn/logout", async () => {
      jar.set("host", "wos-session=legacy");
      let logout;
      try { await signOutAuthSession(); } catch (error) { logout = error; }
      assert.ok(logout.options.href.includes("session_id=session_fixture"));
    }).then(result => {
      assert.ok(result.response.headers.getSetCookie().some(cookie => cookie.includes("Domain=.fixture.invalid") && cookie.includes("Max-Age=0")));
    });
    assert.ok(!jar.has("host"));
    jar.set("host", "wos-session=legacy");
    await clearAuthSessionCookie();
    assert.equal(jar.size, 0);
    process.env.WORKOS_COOKIE_DOMAIN = "app.fixture.invalid";
    const deleted = hostDeletes.length;
    clearHostAuthSessionCookie();
    assert.equal(hostDeletes.length, deleted);
  `;
  const child = spawnSync(process.execPath, ["--eval", script], {
    cwd: fileURLToPath(new URL("../../..", import.meta.url)),
    env: {
      PATH: process.env.PATH,
      NODE_ENV: "test",
      WORKOS_API_KEY: "sk_test_local_fixture_only",
      WORKOS_CLIENT_ID: "client_local_fixture",
      WORKOS_COOKIE_PASSWORD: "local-test-cookie-password-with-32-characters",
      WORKOS_REDIRECT_URI: "https://app.fixture.invalid/auth/callback",
      WORKOS_COOKIE_DOMAIN: ".fixture.invalid",
    },
    encoding: "utf8",
  });
  expect(child.stderr).toBe("");
  expect(child.status).toBe(0);
});
