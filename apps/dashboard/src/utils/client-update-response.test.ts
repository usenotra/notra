import { describe, expect, test } from "bun:test";

import { getClientUpdateResponse } from "./client-update-response";

describe("client updates", () => {
  test("clears deployment pinning before returning to the same chat", () => {
    const returnTo = "/acme/chat/123?tab=posts#draft";
    const response = getClientUpdateResponse(
      new Request(
        `https://app.example/api/client-update?${new URLSearchParams({ returnTo })}`
      )
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      `https://app.example${returnTo}`
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("set-cookie")).toBe(
      "__vdpl=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax"
    );
  });

  test("does not allow external redirects or update loops", () => {
    for (const returnTo of [
      "https://evil.example/",
      "//evil.example/",
      "/\\evil.example/",
      "data:text/plain,test",
      "http://[",
      "/api/client-update?returnTo=/api/client-update",
    ]) {
      const response = getClientUpdateResponse(
        new Request(
          `https://app.example/api/client-update?${new URLSearchParams({ returnTo })}`
        )
      );
      expect(response.headers.get("location")).toBe("https://app.example/");
    }
  });

  test("keeps same-origin double-slash paths on the app origin", () => {
    const response = getClientUpdateResponse(
      new Request(
        "https://app.example/api/client-update?returnTo=https%3A%2F%2Fapp.example%2F%2Fevil.example"
      )
    );
    expect(response.headers.get("location")).toBe(
      "https://app.example//evil.example"
    );
  });

  test("rejects non-GET requests without changing cookies", () => {
    const response = getClientUpdateResponse(
      new Request("https://app.example/api/client-update", { method: "POST" })
    );
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET");
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
