import { expect, test } from "bun:test";

import type { SiteDiagnostic } from "@notra/sites-core/types/build";
import { createDefaultSiteConfig } from "@notra/sites-core/utils/default-config";

import type { PreparedSite } from "../compiler/types/source";
import { createDevRefresh } from "../compiler/utils/dev-refresh";
import type { BuildParams } from "../src/types/build-params";

function prepared(name = "Original"): PreparedSite {
  return {
    validation: {
      ok: true,
      config: createDefaultSiteConfig(name),
      entries: [],
      outputs: new Map(),
      diagnostics: [],
    },
    collectDiagnostics: [],
    publicFiles: ["/logo.svg"],
    customScripts: ["custom-scripts-first.js"],
  };
}

function setup() {
  const state = {
    source: prepared(),
    ogFiles: ["/_notra/og/blog/index.png"],
    beforePrepare: () => Promise.resolve(),
    beforeOg: () => Promise.resolve(),
    beforePublish: () => Promise.resolve(),
    beforeProcess: (_command: "dev" | "stop") => Promise.resolve(0),
    prepareCalls: 0,
    working: 0,
    peak: 0,
    publications: [] as BuildParams[],
    starts: [] as BuildParams[],
    commands: [] as string[],
    diagnostics: [] as SiteDiagnostic[],
    errors: [] as unknown[],
  };
  const owner = createDevRefresh({
    params: {
      area: "blog",
      mount: "/blog",
      publicOrigin: "http://localhost:4321",
      siteId: "local",
      deploymentId: "local",
      noindex: true,
      includeDrafts: true,
      branding: true,
      workDir: "/work",
      mounts: { blog: "/blog", changelog: "/changelog" },
    },
    prepare: async () => {
      const snapshot = structuredClone(state.source);
      state.prepareCalls += 1;
      state.working += 1;
      state.peak = Math.max(state.peak, state.working);
      try {
        await state.beforePrepare();
        return snapshot;
      } finally {
        state.working -= 1;
      }
    },
    writeOgImages: async () => {
      const files = [...state.ogFiles];
      state.working += 1;
      state.peak = Math.max(state.peak, state.working);
      try {
        await state.beforeOg();
        return {
          manifest: Object.fromEntries(files.map((file) => [file, file])),
          diagnostics: [],
          durationMs: 0,
        };
      } finally {
        state.working -= 1;
      }
    },
    publish: async (params, isCurrent) => {
      await state.beforePublish();
      if (!isCurrent()) {
        return false;
      }
      state.publications.push(structuredClone(params));
      return true;
    },
    runAstro: async (command) => {
      state.commands.push(command);
      if (command === "dev") {
        const latest = state.publications.at(-1);
        if (!latest) {
          throw new Error("Started without params");
        }
        state.starts.push(structuredClone(latest));
      }
      return state.beforeProcess(command);
    },
    printDiagnostics: (diagnostics) => state.diagnostics.push(...diagnostics),
    reportError: (error) => state.errors.push(error),
  });
  return { state, owner };
}

test("config, public assets, scripts and OG files refresh the full startup snapshot", async () => {
  const { state, owner } = setup();
  try {
    expect(await owner.refresh()).toBe(true);
    state.source = prepared("Updated");
    state.source.publicFiles = ["/new-logo.svg", "/download.pdf"];
    state.source.customScripts = ["custom-scripts-second.js"];
    state.ogFiles = ["/_notra/og/blog/new.png"];
    expect(await owner.refresh()).toBe(true);
    const latest = state.starts.at(-1);
    expect(latest?.config.name).toBe("Updated");
    expect(latest?.publicFiles).toEqual([
      "/_notra/og/blog/new.png",
      "/download.pdf",
      "/new-logo.svg",
    ]);
    expect(latest?.headScripts).toContainEqual({
      kind: "external",
      src: "/blog/_notra/assets/custom-scripts-second.js",
      attributes: { defer: true },
    });
    expect(JSON.stringify(latest)).not.toContain("custom-scripts-first.js");
    expect(latest?.includeDrafts).toBe(true);
    expect(latest?.mounts).toEqual({ blog: "/blog", changelog: "/changelog" });
    expect(state.commands).toEqual(["dev", "stop", "dev"]);
  } finally {
    await owner.shutdown();
  }
});

test("MDX and stable-name asset edits leave unchanged params to native hot reload", async () => {
  const { state, owner } = setup();
  try {
    await owner.refresh();
    state.source.validation.outputs.set("blog/post.mdx", "Changed MDX");
    state.source.validation.outputs.set("scripts/first.js", "Changed script");
    state.source.validation.outputs.set("public/logo.svg", "Changed SVG");
    state.source.publicFiles.reverse();
    await owner.refresh();
    expect(state.prepareCalls).toBe(2);
    expect(state.publications).toHaveLength(1);
    expect(state.commands).toEqual(["dev"]);
  } finally {
    await owner.shutdown();
  }
});

test("local development never loads analytics providers after startup or config edits", async () => {
  const { state, owner } = setup();
  try {
    const config = state.source.validation.config;
    if (!config) {
      throw new Error("Missing development config");
    }
    config.integrations = {
      umami: { websiteId: "94db1cb1-74f4-4a40-ad6c-962362670409" },
      ga4: { measurementId: "G-ABC123XYZ9" },
    };
    await owner.refresh();
    config.integrations = {
      plausible: { domain: "acme.com" },
    };
    await owner.refresh();
    for (const params of state.starts) {
      expect(params.headScripts).toEqual([
        {
          kind: "external",
          src: "/blog/_notra/assets/custom-scripts-first.js",
          attributes: { defer: true },
        },
      ]);
    }
    expect(state.starts).toHaveLength(2);
  } finally {
    await owner.shutdown();
  }
});

test("edits during preparation coalesce without overlapping or publishing the stale run", async () => {
  const { state, owner } = setup();
  const entered = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  state.beforePrepare = async () => {
    entered.resolve();
    await release.promise;
  };
  const first = owner.refresh();
  await entered.promise;
  state.source = prepared("Intermediate");
  const second = owner.refresh();
  state.source = prepared("Final");
  const third = owner.refresh();
  release.resolve();
  try {
    await Promise.all([first, second, third]);
    expect(state.peak).toBe(1);
    expect(state.prepareCalls).toBe(2);
    expect(state.publications.map((params) => params.config.name)).toEqual([
      "Final",
    ]);
    expect(state.commands).toEqual(["dev"]);
  } finally {
    await owner.shutdown();
  }
});

test("edits during OG rendering discard the obsolete manifest and snapshot", async () => {
  const { state, owner } = setup();
  const entered = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  state.beforeOg = async () => {
    entered.resolve();
    await release.promise;
  };
  const first = owner.refresh();
  await entered.promise;
  state.source = prepared("Final");
  state.ogFiles = ["/_notra/og/blog/final.png"];
  const second = owner.refresh();
  release.resolve();
  try {
    await Promise.all([first, second]);
    expect(state.peak).toBe(1);
    expect(state.publications).toHaveLength(1);
    expect(state.publications[0]?.config.name).toBe("Final");
    expect(state.publications[0]?.publicFiles).toContain(
      "/_notra/og/blog/final.png"
    );
    expect(state.publications[0]?.publicFiles).not.toContain(
      "/_notra/og/blog/index.png"
    );
  } finally {
    await owner.shutdown();
  }
});

test("publication checks freshness after asynchronous staging", async () => {
  const { state, owner } = setup();
  const entered = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  state.beforePublish = async () => {
    entered.resolve();
    await release.promise;
  };
  const first = owner.refresh();
  await entered.promise;
  state.source = prepared("Final");
  const second = owner.refresh();
  release.resolve();
  try {
    await Promise.all([first, second]);
    expect(state.publications.map((params) => params.config.name)).toEqual([
      "Final",
    ]);
    expect(state.starts).toHaveLength(1);
  } finally {
    await owner.shutdown();
  }
});

test("invalid config is diagnosed but never published as valid params", async () => {
  const { state, owner } = setup();
  const invalid = prepared("Invalid");
  invalid.validation.ok = false;
  invalid.validation.config = null;
  invalid.validation.diagnostics = [
    {
      severity: "error",
      file: "blog.json",
      code: "config",
      message: "Invalid",
    },
  ];
  try {
    state.source = invalid;
    expect(await owner.refresh()).toBe(false);
    expect(state.publications).toEqual([]);
    expect(state.commands).toEqual([]);
    state.source = prepared("Valid");
    expect(await owner.refresh()).toBe(true);
    state.source = invalid;
    await owner.refresh();
    expect(state.publications.map((params) => params.config.name)).toEqual([
      "Valid",
    ]);
    expect(state.commands).toEqual(["dev"]);
    expect(state.diagnostics).toHaveLength(2);
  } finally {
    await owner.shutdown();
  }
});

test("shutdown waits for preparation and discards queued edits without starting Astro", async () => {
  const { state, owner } = setup();
  const entered = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  state.beforePrepare = async () => {
    entered.resolve();
    await release.promise;
  };
  const refreshing = owner.refresh();
  await entered.promise;
  owner.refresh();
  const stopping = owner.shutdown();
  expect(await owner.refresh()).toBe(false);
  release.resolve();
  await Promise.all([refreshing, stopping]);
  expect(state.publications).toEqual([]);
  expect(state.commands).toEqual([]);
  expect(state.prepareCalls).toBe(1);
});

test("shutdown during startup waits for it and stops the process exactly once", async () => {
  const { state, owner } = setup();
  const entered = Promise.withResolvers<void>();
  const release = Promise.withResolvers<number>();
  state.beforeProcess = (command) => {
    if (command === "dev") {
      entered.resolve();
      return release.promise;
    }
    return Promise.resolve(0);
  };
  const refreshing = owner.refresh();
  await entered.promise;
  const stopping = owner.shutdown();
  const repeated = owner.shutdown();
  expect(stopping).toBe(repeated);
  expect(state.commands).toEqual(["dev"]);
  release.resolve(0);
  await Promise.all([refreshing, stopping, repeated]);
  expect(state.commands).toEqual(["dev", "stop"]);
});

test("restart waits for process shutdown and superseded params are not started", async () => {
  const { state, owner } = setup();
  await owner.refresh();
  const entered = Promise.withResolvers<void>();
  const release = Promise.withResolvers<number>();
  state.beforeProcess = (command) => {
    if (command === "stop") {
      entered.resolve();
      return release.promise;
    }
    return Promise.resolve(0);
  };
  state.source = prepared("Intermediate");
  const first = owner.refresh();
  await entered.promise;
  state.source = prepared("Final");
  const second = owner.refresh();
  expect(state.commands).toEqual(["dev", "stop"]);
  expect(state.publications).toHaveLength(1);
  release.resolve(0);
  try {
    await Promise.all([first, second]);
    expect(state.commands).toEqual(["dev", "stop", "dev"]);
    expect(state.starts.map((params) => params.config.name)).toEqual([
      "Original",
      "Final",
    ]);
  } finally {
    await owner.shutdown();
  }
});

test("failed startup preserves the process error and cleans up the attempted server", async () => {
  const { state, owner } = setup();
  state.beforeProcess = (command) => Promise.resolve(command === "dev" ? 7 : 0);
  await expect(owner.refresh()).rejects.toThrow("Astro dev failed (7)");
  await owner.shutdown();
  expect(state.commands).toEqual(["dev", "stop"]);
});

test("a preparation error with queued edits reports the error and still refreshes the final snapshot", async () => {
  const { state, owner } = setup();
  const entered = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  const error = new Error("Source disappeared while reading");
  state.beforePrepare = async () => {
    if (state.prepareCalls === 1) {
      entered.resolve();
      await release.promise;
      throw error;
    }
  };
  const first = owner.refresh();
  await entered.promise;
  state.source = prepared("Final");
  const second = owner.refresh();
  release.resolve();
  try {
    await Promise.all([first, second]);
    expect(state.errors).toEqual([error]);
    expect(state.peak).toBe(1);
    expect(state.starts.map((params) => params.config.name)).toEqual(["Final"]);
  } finally {
    await owner.shutdown();
  }
});

test("debounced events coalesce before preparation and shutdown cancels the pending timer", async () => {
  const { state, owner } = setup();
  const first = owner.refresh(60_000);
  await Promise.resolve();
  state.source = prepared("Final");
  const second = owner.refresh();
  await Promise.all([first, second]);
  expect(state.prepareCalls).toBe(1);
  expect(state.starts[0]?.config.name).toBe("Final");
  const pending = owner.refresh(60_000);
  await Promise.resolve();
  await owner.shutdown();
  await pending;
  expect(state.prepareCalls).toBe(1);
  expect(state.commands).toEqual(["dev", "stop"]);
});

test("failed process shutdown prevents publishing or launching replacement params", async () => {
  const { state, owner } = setup();
  await owner.refresh();
  state.source = prepared("Replacement");
  state.beforeProcess = (command) =>
    Promise.resolve(command === "stop" ? 9 : 0);
  await expect(owner.refresh()).rejects.toThrow("Astro stop failed (9)");
  expect(state.publications).toHaveLength(1);
  expect(state.commands).toEqual(["dev", "stop"]);
  state.beforeProcess = () => Promise.resolve(0);
  await owner.shutdown();
  expect(state.commands).toEqual(["dev", "stop", "stop"]);
});
