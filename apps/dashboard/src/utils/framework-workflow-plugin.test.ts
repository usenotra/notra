import { describe, expect, spyOn, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  dashboardWorkflow,
  traceWorkflowDependencies,
} from "./framework-workflow-plugin";

describe("Workflow Vite and Nitro transform ownership", () => {
  test("leaves Nitro transformation to the Nitro module", async () => {
    const plugins = dashboardWorkflow();
    const transform = plugins.find(
      (plugin) => plugin.name === "workflow:transform"
    );
    expect(transform?.applyToEnvironment).toBeFunction();
    const environment = (name: string) => ({
      name,
      mode: "build" as const,
      config: {},
    });
    expect(
      await transform?.applyToEnvironment?.(environment("nitro") as never)
    ).toBe(false);
    expect(
      await transform?.applyToEnvironment?.(environment("ssr") as never)
    ).toBe(true);
    expect(
      await transform?.applyToEnvironment?.(environment("client") as never)
    ).toBe(true);
    expect(plugins.some((plugin) => plugin.name === "workflow:nitro")).toBe(
      true
    );
  });
});

describe("Workflow Vercel deployment", () => {
  test("adds CommonJS entries without removing Nitro's ESM trace entries", () => {
    const files = ["existing-esm-entry.js"];
    traceWorkflowDependencies(files, ["@cursor/sdk"]);
    expect(files[0]).toBe("existing-esm-entry.js");
    expect(files[1]).toBe(
      createRequire(import.meta.url).resolve("@cursor/sdk")
    );
    expect(() =>
      traceWorkflowDependencies([], ["@notra/nonexistent-workflow-package"])
    ).toThrow();
    const node = spawnSync(
      "node",
      [
        "--input-type=module",
        "-e",
        `import { traceWorkflowDependencies } from ${JSON.stringify(import.meta.resolve("./framework-workflow-plugin.ts"))}; const files = []; traceWorkflowDependencies(files, ["@cursor/sdk"]); console.log(files[0]);`,
      ],
      { encoding: "utf8" }
    );
    expect(node.status).toBe(0);
    expect(node.stdout.trim()).toEndWith("/@cursor/sdk/dist/cjs/index.js");
  });

  test("packages traced dependencies and preserves routes and architecture", async () => {
    const require = createRequire(import.meta.resolve("workflow/nitro"));
    const { VercelBuilder } = await import(
      new URL("builders.js", pathToFileURL(require.resolve("@workflow/nitro")))
        .href
    );
    const root = await mkdtemp(join(tmpdir(), "workflow-nitro-test-"));
    const output = join(root, ".vercel/output");
    const server = join(output, "functions/__server.func");
    const step = join(output, "functions/.well-known/workflow/v1/step.func");
    const configPath = join(output, "config.json");
    const externalPackages = ["native-fixture"];
    const builder = new VercelBuilder({
      options: {
        rootDir: root,
        workspaceDir: root,
        output: { serverDir: server },
        workflow: { externalPackages, runtime: "nodejs24.x" },
        vercel: { functions: { architecture: "x86_64" } },
      },
    });
    const build = spyOn(
      Object.getPrototypeOf(VercelBuilder.prototype),
      "build"
    ).mockImplementation(async () => {
      await writeFile(
        configPath,
        JSON.stringify({ version: 3, routes: [{ src: "/webhook" }] })
      );
    });
    try {
      await mkdir(join(server, "node_modules"), { recursive: true });
      await mkdir(join(root, "native-fixture"));
      await writeFile(
        join(root, "native-fixture/binding.node"),
        "native fixture"
      );
      await symlink(
        join(root, "native-fixture"),
        join(server, "node_modules/native-fixture")
      );
      await writeFile(
        configPath,
        JSON.stringify({ version: 3, routes: [{ src: "/existing" }] })
      );
      expect(builder.config.externalPackages).toEqual(externalPackages);
      await builder.build();
      await rm(join(root, "native-fixture"), { recursive: true });
      expect(
        await readFile(
          join(step, "node_modules/native-fixture/binding.node"),
          "utf8"
        )
      ).toBe("native fixture");
      const config = JSON.parse(await readFile(configPath, "utf8"));
      expect(config.routes).toMatchObject([
        { src: "^\\/\\.well-known\\/workflow\\/v1\\/flow$" },
        { src: "^\\/\\.well-known\\/workflow\\/v1\\/step$" },
        { src: "/webhook" },
        { src: "/existing" },
      ]);
      await builder.createVcConfig(step, { runtime: "nodejs24.x" });
      expect(
        JSON.parse(await readFile(join(step, ".vc-config.json"), "utf8"))
      ).toMatchObject({ runtime: "nodejs24.x", architecture: "x86_64" });
      await rm(join(server, "node_modules"), { recursive: true });
      await expect(builder.build()).rejects.toThrow();
    } finally {
      build.mockRestore();
      await rm(root, { recursive: true, force: true });
    }
  });
});
