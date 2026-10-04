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
