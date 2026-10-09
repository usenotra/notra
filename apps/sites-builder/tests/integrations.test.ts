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
          umami: { websiteId: "94db1cb1-74f4-4a40-ad6c-962362670409" },
          plausible: { domain: "acme.com", server: "stats.acme.com:8443" },
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
      [undefined, true],
    ] as const) {
      const config = JSON.parse(
        await readFile(join(siteRoot, "blog.json"), "utf8")
      );
      config.integrations.posthog.sessionRecording = sessionRecording;
      await writeFile(join(siteRoot, "blog.json"), JSON.stringify(config));
      const enabled = analytics === true;
      const outDir = join(root, enabled ? "live" : "preview");
      const result = await buildSite({
        toolchainRoot,
        siteRoot,
        workDir: join(root, "work"),
        outDir,
        target: siteBuildRequestSchema.parse({
          siteId: "site_integrations",
          deploymentId: enabled ? "dep_live" : "dep_preview",
          publicOrigin: enabled
            ? "https://acme.com"
            : "https://pr-1--acme.notra.site",
          mounts: { blog: "/blog", changelog: "/changes" },
          noindex: true,
          includeDrafts: !enabled,
          analytics,
        }),
      });
      expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
      for (const area of ["blog", "changes"]) {
        const html = await readFile(join(outDir, area, "index.html"), "utf8");
        expect(html).toMatch(/\/_notra\/assets\/custom-script\.[a-f0-9]+\.js/);
        expect(html.includes("94db1cb1-74f4-4a40-ad6c-962362670409")).toBe(
          enabled
        );
        expect(html.includes("cloud.umami.is/script.js")).toBe(enabled);
        expect(html).not.toContain("googletagmanager");
        expect(html).not.toContain("databuddy");
        expect(html.includes("stats.acme.com:8443/js/script.js")).toBe(enabled);
        expect(html.includes("posthog.init(")).toBe(enabled);
        if (enabled) {
          expect(html).toContain(
            `"disable_session_recording":${!sessionRecording}`
          );
          for (const [, code] of html.matchAll(
            /<script>([\s\S]*?)<\/script>/gi
          )) {
            const hash = createHash("sha256")
              .update(code ?? "")
              .digest("base64");
            expect(result.contentSecurityPolicy).toContain(`'sha256-${hash}'`);
          }
        }
      }
      const scriptSources =
        result.contentSecurityPolicy
          ?.split("; ")
          .find((directive) => directive.startsWith("script-src "))
          ?.split(" ")
          .slice(1) ?? [];
      expect(
        scriptSources.some((source) => source === "https://stats.acme.com:8443")
      ).toBe(enabled);
      expect(
        scriptSources.some((source) => source === "https://cloud.umami.is")
      ).toBe(enabled);
      const connectSources =
        result.contentSecurityPolicy
          ?.split("; ")
          .find((directive) => directive.startsWith("connect-src "))
          ?.split(" ")
          .slice(1) ?? [];
      expect(
        connectSources.some((source) => source === "https://gateway.umami.is")
      ).toBe(enabled);
      expect(result.contentSecurityPolicy).not.toContain("'unsafe-inline'");
      expect(result.contentSecurityPolicy).toContain("'sha256-");
      expect(
        result.contentSecurityPolicy?.includes("worker-src 'self' blob: data:")
      ).toBe(enabled && sessionRecording);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 120_000);
