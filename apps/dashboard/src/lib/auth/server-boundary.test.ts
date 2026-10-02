import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

import { getAuthKitContext } from "@workos/authkit-tanstack-react-start";

describe("server-side WorkOS session boundary", () => {
  test.each(["server.ts", "banned.ts", "user-actions.ts"])(
    "%s reads middleware authentication without SDK server-function dispatch",
    async (filename) => {
      const source = await readFile(new URL(filename, import.meta.url), "utf8");
      expect(source).toContain("getAuthKitContext().auth()");
      expect(source).not.toMatch(/\bgetAuth\s*\(/);
    }
  );

  test("native session access fails closed outside authenticated middleware context", () => {
    expect(() => getAuthKitContext()).toThrow();
  });

  test("sign-in and logout delegate to native operations rather than SDK RPC wrappers", async () => {
    const logout = await readFile(
      new URL("user-actions.ts", import.meta.url),
      "utf8"
    );
    const initiate = await readFile(
      new URL("../../app/auth/initiate/route.ts", import.meta.url),
      "utf8"
    );
    expect(logout).toContain(
      "signOutAuthSession(parsed.success ? parsed.data : undefined)"
    );
    expect(logout).not.toMatch(/\bsignOut\s*\(/);
    expect(initiate).toContain("createAuthSignInUrl()");
    expect(initiate).not.toMatch(/\bgetSignInUrl\s*\(/);
  });
});
