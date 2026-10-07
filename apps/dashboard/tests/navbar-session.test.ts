import { beforeEach, describe, expect, mock, test } from "bun:test";

const getAuthIdentity = mock(
  async () => null as { user: { id: string } } | null
);
const getAuthSession = mock(async () => null);

mock.module("@/lib/auth/server", () => ({ getAuthIdentity, getAuthSession }));

const { GET } = await import("../src/app/api/session/route");

beforeEach(() => {
  getAuthIdentity.mockReset();
  getAuthIdentity.mockResolvedValue(null);
  getAuthSession.mockClear();
});

describe("navbar session view", () => {
  test("returns only authentication status without resolving an organization", async () => {
    getAuthIdentity.mockResolvedValue({ user: { id: "user-test" } });
    const response = await GET(
      new Request("https://app.usenotra.com/api/session?view=navbar", {
        headers: { origin: "https://www.usenotra.com" },
      })
    );

    expect(await response.json()).toEqual({ isAuthenticated: true });
    expect(getAuthIdentity).toHaveBeenCalledTimes(1);
    expect(getAuthSession).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("access-control-allow-credentials")).toBe(
      "true"
    );
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "https://www.usenotra.com"
    );
  });

  test("does not authenticate a missing or rejected identity", async () => {
    const response = await GET(
      new Request("https://app.usenotra.com/api/session?view=navbar")
    );
    expect(await response.json()).toEqual({ isAuthenticated: false });
    expect(getAuthSession).not.toHaveBeenCalled();
  });

  test("keeps the default session response unchanged", async () => {
    const response = await GET(
      new Request("https://app.usenotra.com/api/session")
    );
    expect(await response.json()).toBeNull();
    expect(getAuthSession).toHaveBeenCalledTimes(1);
    expect(getAuthIdentity).not.toHaveBeenCalled();
  });
});
