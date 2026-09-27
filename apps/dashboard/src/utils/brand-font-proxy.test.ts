import { expect, mock, test } from "bun:test";

let signedIn = true;
const getServerSession = mock(async () =>
  signedIn
    ? { session: { userId: "user_1" }, user: { id: "user_1" } }
    : { session: null, user: null }
);

mock.module("@/lib/auth/session", () => ({ getServerSession }));

const { GET: getStylesheet } = await import("@/app/api/brand-font/css/route");
const { GET: getFontFile } = await import("@/app/api/brand-font/file/route");

test("proxies a Google font without browser requests to Google", async () => {
  const originalFetch = globalThis.fetch;
  const requests: string[] = [];
  globalThis.fetch = async (input) => {
    requests.push(String(input));
    if (requests.length === 1) {
      return new Response(
        "@font-face { font-family: 'Roboto'; src: url(https://fonts.gstatic.com/s/roboto/v51/example.woff2) format('woff2'); }"
      );
    }
    return new Response(new Uint8Array([119, 79, 70, 50]));
  };

  try {
    const stylesheet = await getStylesheet(
      new Request("https://app.test/api/brand-font/css?family=Roboto")
    );
    expect(stylesheet.status).toBe(200);
    expect(stylesheet.headers.get("cache-control")).toBe("private, no-store");
    const css = await stylesheet.text();
    expect(css).toContain("/api/brand-font/file?path=");
    expect(css).not.toContain("fonts.gstatic.com");

    const path = css.match(/\/api\/brand-font\/file\?path=[\w%.-]+/)?.[0];
    expect(path).toBeDefined();
    const file = await getFontFile(new Request(`https://app.test${path}`));
    expect(file.status).toBe(200);
    expect(file.headers.get("content-type")).toBe("font/woff2");
    expect(file.headers.get("cache-control")).toBe("private, no-store");
    expect(requests).toEqual([
      "https://fonts.googleapis.com/css2?family=Roboto&display=swap",
      "https://fonts.gstatic.com/s/roboto/v51/example.woff2",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("does not make upstream requests for signed-out visitors", async () => {
  signedIn = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mock(async () => {
    throw new Error("Unauthenticated request must not fetch a font");
  });

  try {
    const stylesheet = await getStylesheet(
      new Request("https://app.test/api/brand-font/css?family=Roboto")
    );
    const file = await getFontFile(
      new Request(
        "https://app.test/api/brand-font/file?path=%2Fs%2Froboto%2Fv51%2Fexample.woff2"
      )
    );
    expect(stylesheet.status).toBe(401);
    expect(file.status).toBe(401);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  } finally {
    signedIn = true;
    globalThis.fetch = originalFetch;
  }
});

test("rejects unsafe font paths and non-Google stylesheet URLs", async () => {
  expect(
    (
      await getFontFile(
        new Request(
          "https://app.test/api/brand-font/file?path=https://evil.test/a.woff2"
        )
      )
    ).status
  ).toBe(400);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response("@font-face { src: url(https://evil.test/a.woff2); }");
  try {
    expect(
      (
        await getStylesheet(
          new Request("https://app.test/api/brand-font/css?family=Roboto")
        )
      ).status
    ).toBe(502);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
