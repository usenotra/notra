import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

if (process.env.NOTRA_FRAMEWORK_RUNTIME_TEST !== "1") {
  test("dashboard runtime with isolated safe environment", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: {
          PATH: process.env.PATH,
          HOME: process.env.HOME,
          NODE_ENV: "test",
          NOTRA_FRAMEWORK_RUNTIME_TEST: "1",
          NOTRA_DEMO_MODE: "0",
          AXIOM_TOKEN: "",
          NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: "",
          TCC_API_KEY: "",
        },
        timeout: 15_000,
      }
    );
    expect(result.status, result.stderr.toString()).toBe(0);
  }, 20_000);
} else {
  const { H3 } = await import("nitro/h3");
  const { default: runtime, scheduleDashboardTask } = await import("./runtime");

  describe("dashboard Nitro middleware", () => {
    test("retains image-specific SVG sandbox and attachment headers", async () => {
      const { optimizeFrameworkImage } =
        await import("../../utils/framework-image.server");
      const app = new H3();
      app.use(runtime);
      app.get("/api/image", (event) => optimizeFrameworkImage(event.req));
      const response = await app.request(
        "http://localhost/api/image?url=%2Ffile.svg&w=64&q=75"
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("image/svg+xml");
      expect(response.headers.get("content-security-policy")).toBe(
        "default-src 'self'; script-src 'none'; sandbox;"
      );
      expect(response.headers.get("content-disposition")).toStartWith(
        "attachment;"
      );
    });
    test("preserves response bodies, headers, and cookies", async () => {
      const app = new H3();
      app.use(runtime);
      app.get("/probe", () =>
        Response.json(
          { ok: true },
          { headers: { "set-cookie": "session=test; HttpOnly; Path=/" } }
        )
      );
      const response = await app.request("http://localhost/probe");
      expect(response.status).toBe(200);
      expect(response.headers.get("x-frame-options")).toBe("DENY");
      expect(response.headers.get("set-cookie")).toBe(
        "session=test; HttpOnly; Path=/"
      );
      expect(await response.json()).toEqual({ ok: true });
    });

    test("redirects before downstream authentication", async () => {
      const app = new H3();
      app.use(runtime);
      let downstreamCalled = false;
      app.get("/acme/settings", () => {
        downstreamCalled = true;
        return new Response("auth", { status: 401 });
      });
      const response = await app.request(
        "http://localhost/acme/settings?tab=a"
      );
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "/acme?tab=a&settings=general"
      );
      expect(downstreamCalled).toBe(false);
    });

    test("keeps post-response work attached to streamed response disposal", async () => {
      const app = new H3();
      app.use(runtime);
      let flushed = false;
      let complete: (() => void) | undefined;
      const completed = new Promise<void>((resolve) => {
        complete = resolve;
      });
      app.get("/stream", () => {
        scheduleDashboardTask(() => {
          flushed = true;
          complete?.();
        });
        return new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode("streamed"));
              controller.close();
            },
          })
        );
      });
      const response = await app.request("http://localhost/stream");
      expect(flushed).toBe(false);
      expect(await response.text()).toBe("streamed");
      await completed;
      expect(flushed).toBe(true);
    });
  });
}
