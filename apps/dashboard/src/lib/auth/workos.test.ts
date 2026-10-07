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
    const jar = new Map();
    mock.module("@tanstack/react-start", () => ({ ...start, getGlobalStartContext: () => context }));
    const { dashboardAuthMiddleware } = await import("./src/middleware/auth.ts");
    const { saveAuthSession, signOutAuthSession } = await import("./src/lib/auth/workos.ts");
    const { clearAuthSessionCookie, clearHostAuthSessionCookie } = await import("./src/lib/auth/session-cookie.ts");
    const session = {
      accessToken: await new SignJWT({ sid: "session_fixture" }).setProtectedHeader({ alg: "RS256", kid: "fixture-key" }).setSubject("user_fixture").setIssuedAt().setExpirationTime("1h").sign(privateKey),
      refreshToken: "fixture-refresh",
      user: { id: "user_fixture" },
    };
    const invoke = async (path, downstream, status = 200) => {
      const request = new Request("https://app.fixture.invalid" + path, {
        headers: { cookie: Array.from(jar.values()).join("; ") },
      });
      return server.requestHandler(async () => {
        const result = await dashboardAuthMiddleware.options.server({
          request, pathname: path, handlerType: "serverFn",
          next: async (options) => {
            context = options.context;
            await downstream();
            return { response: new Response(null, { status, headers: status === 307 ? { Location: "/callback" } : undefined }) };
          },
        });
        return result.response;
      })(request);
    };
    const applyCookies = (response, skipHostDeletion = false) => {
      for (const cookie of response.headers.getSetCookie()) {
        assert.ok(cookie.startsWith("wos-session=") && cookie.includes("Path=/"));
        const domain = cookie.match(/(?:^|; )Domain=([^;]+)/)?.[1] ?? "host";
        if (cookie.includes("Max-Age=0")) {
          if (!skipHostDeletion || domain !== "host") jar.delete(domain);
        } else {
          jar.set(domain, cookie.split(";")[0]);
        }
      }
    };
    const signIn = async (skipHostDeletion = false, status = 200) => {
      const response = await invoke("/_serverFn/mfa", () => saveAuthSession(session), status);
      const cookies = response.headers.getSetCookie();
      assert.equal(cookies.length, 2);
      const cookie = cookies.find(value => value.startsWith("wos-session=") && !value.includes("Max-Age=0"));
      assert.ok(cookie?.includes("Domain=.fixture.invalid"));
      assert.ok(cookie.includes("HttpOnly") && cookie.includes("Secure") && cookie.includes("SameSite=Lax"));
      assert.ok(cookies.some(value => value.startsWith("wos-session=;") && value.includes("Max-Age=0") && !value.includes("Domain=")));
      applyCookies(response, skipHostDeletion);
    };
    jar.set(".fixture.invalid", "wos-session=stale-domain");
    jar.set("host", "wos-session=stale-host");
    // Retain the legacy host cookie to reproduce a client that never received its deletion.
    await signIn(true);
    await invoke("/callback", () => assert.equal(context.auth().user, null));
    for (const status of [200, 307]) {
      for (const scopes of [["host", ".fixture.invalid"], [".fixture.invalid", "host"]]) {
        jar.clear();
        for (const scope of scopes) jar.set(scope, "wos-session=stale");
        await signIn(false, status);
        assert.ok(!jar.has("host"));
        await invoke("/callback", () => {
          assert.equal(context.auth().user.id, "user_fixture");
          assert.equal(context.auth().sessionId, "session_fixture");
        });
      }
    }
    await invoke("/_serverFn/logout", async () => {
      jar.set("host", "wos-session=legacy");
      let logout;
      try { await signOutAuthSession(); } catch (error) { logout = error; }
      assert.ok(logout.options.href.includes("session_id=session_fixture"));
    }, 307).then(response => {
      assert.equal(response.headers.getSetCookie().length, 2);
      assert.ok(response.headers.getSetCookie().some(cookie => cookie.includes("Domain=.fixture.invalid") && cookie.includes("Max-Age=0")));
      applyCookies(response);
    });
    assert.equal(jar.size, 0);
    jar.set("host", "wos-session=legacy");
    jar.set(".fixture.invalid", "wos-session=legacy");
    applyCookies(await invoke("/_serverFn/clear", () => clearAuthSessionCookie()));
    assert.equal(jar.size, 0);
    for (const domain of ["app.fixture.invalid", ".app.fixture.invalid", ""]) {
      process.env.WORKOS_COOKIE_DOMAIN = domain;
      const response = await invoke("/_serverFn/clear", () => clearHostAuthSessionCookie());
      assert.equal(response.headers.getSetCookie().length, 0);
    }
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
