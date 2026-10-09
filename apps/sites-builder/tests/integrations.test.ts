import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { siteBuildRequestSchema } from "@notra/sites-core/schemas/build";

import { buildSite } from "../compiler/build";

test("real live builds include every provider while previews omit them and their CSP hosts", async () => {
  const toolchainRoot = resolve(import.meta.dir, "..");
  const scratch = join(toolchainRoot, ".astro");
  await mkdir(scratch, { recursive: true });
  const root = await mkdtemp(join(scratch, "test-integrations-"));
  try {
    const siteRoot = join(root, "source");
    await mkdir(siteRoot);
    await writeFile(
      join(siteRoot, "blog.json"),
      JSON.stringify({
        name: "Acme",
        integrations: {
          ga4: { measurementId: "G-ABC123XYZ9" },
          databuddy: { clientId: "3ed1fce1-5a56-4db3-8df5-a1036322c999" },
          plausible: { domain: "acme.com", server: "stats.acme.com" },
          posthog: {
            apiKey: "phc_abcdefghijklmnopqrstuvwxyz0123",
            apiHost: "https://eu.i.posthog.com",
            sessionRecording: false,
          },
        },
      })
    );
    await writeFile(
      join(siteRoot, "script.js"),
      "window.customScriptLoaded=true;"
    );
    for (const [analytics, sessionRecording] of [
      [true, false],
      [true, true],
      [false, true],
    ] as const) {
      const config = JSON.parse(
        await readFile(join(siteRoot, "blog.json"), "utf8")
      );
      config.integrations.posthog.sessionRecording = sessionRecording;
      await writeFile(join(siteRoot, "blog.json"), JSON.stringify(config));
      const outDir = join(root, analytics ? "live" : "preview");
      const result = await buildSite({
        toolchainRoot,
        siteRoot,
        workDir: join(root, "work"),
        outDir,
        target: siteBuildRequestSchema.parse({
          siteId: "site_integrations",
          deploymentId: analytics ? "dep_live" : "dep_preview",
          publicOrigin: analytics
            ? "https://acme.com"
            : "https://pr-1--acme.notra.site",
          mounts: { blog: "/blog", changelog: "/changes" },
          noindex: true,
          includeDrafts: !analytics,
          analytics,
        }),
      });
      expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
      for (const area of ["blog", "changes"]) {
        const html = await readFile(join(outDir, area, "index.html"), "utf8");
        expect(html).toMatch(/\/_notra\/assets\/custom-script\.[a-f0-9]+\.js/);
        expect(html.includes("G-ABC123XYZ9")).toBe(analytics);
        expect(html.includes("cdn.databuddy.cc/databuddy.js")).toBe(analytics);
        expect(html.includes("stats.acme.com/js/script.js")).toBe(analytics);
        expect(html.includes("posthog.init(")).toBe(analytics);
        if (analytics) {
          expect(html).toContain(
            `"disable_session_recording":${!sessionRecording}`
          );
          for (const [, code] of html.matchAll(
            /<script>([\s\S]*?)<\/script>/g
          )) {
            const hash = createHash("sha256")
              .update(code ?? "")
              .digest("base64");
            expect(result.contentSecurityPolicy).toContain(`'sha256-${hash}'`);
          }
        }
      }
      expect(
        result.contentSecurityPolicy?.includes("https://stats.acme.com")
      ).toBe(analytics);
      expect(
        result.contentSecurityPolicy?.includes(
          "https://www.googletagmanager.com"
        )
      ).toBe(analytics);
      expect(result.contentSecurityPolicy).not.toContain("'unsafe-inline'");
      expect(result.contentSecurityPolicy).toContain("'sha256-");
      expect(
        result.contentSecurityPolicy?.includes("worker-src 'self' blob: data:")
      ).toBe(analytics && sessionRecording);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 120_000);
