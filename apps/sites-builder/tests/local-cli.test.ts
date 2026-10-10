import { expect, test } from "bun:test";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  truncate,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import { SITE_BUILD_LIMITS } from "@notra/sites-core/constants/sites";
import { siteBuildRequestSchema } from "@notra/sites-core/schemas/build";
import type { SiteDiagnostic } from "@notra/sites-core/types/build";
import { createDefaultSiteConfig } from "@notra/sites-core/utils/default-config";

import { readSiteFiles } from "../compiler/prepare";
import {
  localDefaultConfig,
  localPreviewArea,
} from "../compiler/utils/local-options";

const cli = resolve(import.meta.dir, "../compiler/cli.ts");
const toolchainRoot = resolve(import.meta.dir, "..");
const post =
  "---\ntitle: Synthetic post\ndate: 2026-10-09\ndraft: true\n---\nHello.\n\n![Logo](/logo.svg)\n";

function target(mounts = { blog: "/articles", changelog: "/releases" }) {
  return siteBuildRequestSchema.parse({
    siteId: "snapshot",
    deploymentId: "snapshot",
    publicOrigin: "https://hosted.example",
    mounts,
    branding: false,
    defaultConfig: createDefaultSiteConfig("Snapshot name"),
  });
}

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "notra-local-cli-"));
  const source = join(root, "source");
  await mkdir(join(source, "blog"), { recursive: true });
  await mkdir(join(source, "changelog"));
  await mkdir(join(source, "public"));
  await writeFile(join(source, "blog/hello.md"), post);
  await writeFile(
    join(source, "changelog/release.md"),
    post.replace("Synthetic post", "Release post")
  );
  await writeFile(
    join(source, "public/logo.svg"),
    '<svg xmlns="http://www.w3.org/2000/svg"/>'
  );
  const targetPath = join(root, "target.json");
  await writeFile(targetPath, JSON.stringify(target()));
  return { root, source, targetPath };
}

async function run(...args: string[]) {
  const child = Bun.spawn([process.execPath, cli, ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return { stdout, stderr, code };
}

async function sourceSnapshot(source: string) {
  const { collected } = await readSiteFiles(source);
  return Promise.all(
    collected.files.map(async (file) => ({
      path: file.path,
      bytes: await readFile(join(source, file.path)),
    }))
  );
}

test("local options use schema-sized names, target config and enabled normalized mounts", () => {
  expect(localDefaultConfig("/source/My site").name).toBe("My site");
  expect(localDefaultConfig("/").name).toBe("Local site");
  expect(localDefaultConfig(`/source/${"a".repeat(100)}`).name).toHaveLength(
    80
  );
  expect(localDefaultConfig("/source/   ").name).toBe("Local site");
  expect(localDefaultConfig("/source/local", target()).name).toBe(
    "Snapshot name"
  );
  expect(
    localDefaultConfig("/source/local", {
      ...target(),
      defaultConfig: undefined,
    }).name
  ).toBe("local");
  expect(localPreviewArea().selected).toEqual({ area: "blog", mount: "/blog" });
  expect(localPreviewArea(undefined, "changelog").selected.mount).toBe(
    "/changelog"
  );
  expect(
    localPreviewArea(target({ blog: " /Articles/ ", changelog: "/releases" }))
      .mounts.blog
  ).toBe("/articles");
  expect(
    localPreviewArea(target({ blog: "/", changelog: "/releases" })).selected
      .mount
  ).toBe("/");
  const changelogOnly = siteBuildRequestSchema.parse({
    ...target(),
    mounts: { changelog: "/releases" },
  });
  expect(localPreviewArea(changelogOnly).selected.area).toBe("changelog");
  expect(() => localPreviewArea(changelogOnly, "blog")).toThrow(
    "Cannot preview area"
  );
  expect(() => localPreviewArea(undefined, "typo")).toThrow(
    "Cannot preview area"
  );
  expect(() =>
    localPreviewArea(target({ blog: "/bad_path", changelog: "/releases" }))
  ).toThrow();
  expect(() =>
    localPreviewArea(
      target({ blog: "/articles", changelog: "/articles/releases" })
    )
  ).toThrow();
});

test("validate CLI accepts no config and target snapshots without changing source; real config wins", async () => {
  const { root, source, targetPath } = await fixture();
  try {
    const before = (await readdir(source, { recursive: true })).sort();
    const bytes = await sourceSnapshot(source);
    for (const args of [[], ["--target", targetPath]]) {
      const result = await run(
        "validate",
        "--source",
        source,
        "--json",
        ...args
      );
      expect(result.code).toBe(0);
      expect(JSON.parse(result.stdout).ok).toBe(true);
      expect(JSON.parse(result.stdout).entries).toHaveLength(2);
    }
    expect((await readdir(source, { recursive: true })).sort()).toEqual(before);
    expect(await sourceSnapshot(source)).toEqual(bytes);
    expect(await readFile(join(source, "blog/hello.md"), "utf8")).toBe(post);
    await writeFile(
      join(source, "blog/hello.md"),
      post.replace("Hello.", "{{ real }}")
    );
    await writeFile(
      join(source, "blog.json"),
      JSON.stringify({ name: "Real name", variables: { real: "Real value" } })
    );
    const actual = await run(
      "validate",
      "--source",
      source,
      "--target",
      targetPath,
      "--json"
    );
    expect(actual.code).toBe(0);
    expect(JSON.parse(actual.stdout).diagnostics).toEqual([]);
    for (const invalid of ["{", '{"name":""}']) {
      await writeFile(join(source, "blog.json"), invalid);
      const result = await run(
        "validate",
        "--source",
        source,
        "--target",
        targetPath,
        "--json"
      );
      expect(result.code).toBe(1);
      expect(JSON.parse(result.stdout).ok).toBe(false);
      expect(await readFile(join(source, "blog.json"), "utf8")).toBe(invalid);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("collection errors fail validate JSON and exit status even with fallback config", async () => {
  const { root, source } = await fixture();
  try {
    const oversized = join(source, "public/large.txt");
    await writeFile(oversized, "");
    await truncate(oversized, SITE_BUILD_LIMITS.maxSingleFileBytes + 1);
    const result = await run("validate", "--source", source, "--json");
    expect(result.code).toBe(1);
    expect(JSON.parse(result.stdout).ok).toBe(false);
    expect(
      JSON.parse(result.stdout).diagnostics.map(
        (item: SiteDiagnostic) => item.code
      )
    ).toContain("file_too_large");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("CLI rejects invalid targets and explicitly invalid or disabled preview areas before starting Astro", async () => {
  const { root, source, targetPath } = await fixture();
  try {
    for (const mounts of [
      { blog: "/bad_path" },
      { blog: "/articles", changelog: "/articles/releases" },
      {},
    ]) {
      await writeFile(targetPath, JSON.stringify({ ...target(), mounts }));
      for (const command of ["validate", "dev"]) {
        expect(
          (await run(command, "--source", source, "--target", targetPath)).code
        ).toBe(1);
      }
    }
    await writeFile(
      targetPath,
      JSON.stringify({ ...target(), mounts: { changelog: "/releases" } })
    );
    for (const area of ["blog", "typo", ""]) {
      const result = await run(
        "dev",
        "--source",
        source,
        "--target",
        targetPath,
        "--area",
        area
      );
      expect(result.code).toBe(1);
      expect(result.stderr).toContain("Cannot preview area");
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function waitForPage(
  url: string,
  text: string,
  diagnostics: () => string
) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
      const html = await response.text();
      if (response.ok && html.includes(text)) {
        return html;
      }
    } catch {
      // The background server may still be starting or refreshing.
    }
    await Bun.sleep(150);
  }
  throw new Error(`Preview did not serve ${text} at ${url}\n${diagnostics()}`);
}

test("real dev serves config-free custom, root, default and changelog-only mounts, refreshes and shuts down", async () => {
  const { root, source, targetPath } = await fixture();
  try {
    const bytes = await sourceSnapshot(source);
    const scenarios = [
      {
        mounts: { blog: "/articles", changelog: "/releases" },
        mount: "/articles",
        slug: "hello",
        title: "Synthetic post",
        snapshot: true,
      },
      {
        mounts: { blog: "/", changelog: "/releases" },
        mount: "",
        slug: "hello",
        title: "Synthetic post",
        snapshot: true,
      },
      {
        mounts: { changelog: "/releases" },
        mount: "/releases",
        slug: "release",
        title: "Release post",
        snapshot: true,
      },
      {
        mounts: { blog: "/blog", changelog: "/changelog" },
        mount: "/blog",
        slug: "hello",
        title: "Synthetic post",
        snapshot: false,
      },
    ];
    for (const [index, scenario] of scenarios.entries()) {
      await writeFile(
        targetPath,
        JSON.stringify({ ...target(), mounts: scenario.mounts })
      );
      const probe = Bun.serve({ port: 0, fetch: () => new Response() });
      const port = probe.port;
      probe.stop(true);
      const origin = `http://localhost:${port}`;
      const child = Bun.spawn(
        [
          process.execPath,
          cli,
          "dev",
          "--source",
          source,
          "--port",
          String(port),
          ...(scenario.snapshot ? ["--target", targetPath] : []),
        ],
        { stdout: "ignore", stderr: "pipe" }
      );
      let log = "";
      const stderr = (async () => {
        for await (const chunk of child.stderr.pipeThrough(
          new TextDecoderStream()
        )) {
          log += chunk;
        }
      })();
      const diagnostics = () => log;
      try {
        const html = await waitForPage(
          `${origin}${scenario.mount}/${scenario.slug}`,
          scenario.title,
          diagnostics
        );
        expect(html.includes(`src="${scenario.mount}/logo.svg"`)).toBe(true);
        expect(html).toContain("noindex");
        expect(html).not.toContain("https://hosted.example");
        const params = JSON.parse(
          await readFile(
            join(toolchainRoot, ".notra/work/params.dev.json"),
            "utf8"
          )
        );
        expect(params.publicOrigin).toBe(origin);
        expect(params.noindex).toBe(true);
        expect(params.includeDrafts).toBe(true);
        expect(params.branding).toBe(!scenario.snapshot);
        expect(params.config.name).toBe(
          scenario.snapshot ? "Snapshot name" : "source"
        );
        expect(params.mounts).toEqual(scenario.mounts);
        await waitForPage(
          `${origin}${scenario.mount}/`,
          scenario.snapshot ? "Snapshot name" : "source",
          diagnostics
        );
        const asset = await fetch(`${origin}${scenario.mount}/logo.svg`);
        expect(asset.status).toBe(200);
        expect(await asset.text()).toBe(
          '<svg xmlns="http://www.w3.org/2000/svg"/>'
        );
        if (index === 0) {
          await writeFile(
            join(source, "blog/hello.md"),
            post.replace("Synthetic post", "Refreshed post")
          );
          await waitForPage(
            `${origin}${scenario.mount}/hello`,
            "Refreshed post",
            diagnostics
          );
          await writeFile(
            join(source, "blog.json"),
            JSON.stringify({ name: "Real preview name" })
          );
          await waitForPage(
            `${origin}${scenario.mount}/`,
            "Real preview name",
            diagnostics
          );
          await rm(join(source, "blog.json"));
          await writeFile(join(source, "blog/hello.md"), post);
          await waitForPage(
            `${origin}${scenario.mount}/hello`,
            "Synthetic post",
            diagnostics
          );
        }
      } finally {
        child.kill("SIGTERM");
        const controller = new AbortController();
        try {
          const code = await Promise.race([
            child.exited,
            delay(10_000, -1, { signal: controller.signal }),
          ]);
          if (code === -1) {
            child.kill("SIGKILL");
            const stop = Bun.spawn(
              [
                process.execPath,
                "node_modules/astro/bin/astro.mjs",
                "dev",
                "stop",
                "--root",
                toolchainRoot,
              ],
              { cwd: toolchainRoot, stdout: "ignore", stderr: "ignore" }
            );
            const stopped = await Promise.race([
              stop.exited,
              delay(5000, -1, { signal: controller.signal }),
            ]);
            if (stopped === -1) {
              stop.kill("SIGKILL");
            }
          }
          expect(code, log).toBe(0);
        } finally {
          controller.abort();
          await stderr;
        }
      }
      await expect(fetch(`${origin}${scenario.mount}/`)).rejects.toThrow();
      expect(await readdir(source)).not.toContain("blog.json");
      expect(await readFile(join(source, "blog/hello.md"), "utf8")).toBe(post);
      expect(await sourceSnapshot(source)).toEqual(bytes);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 180_000);
