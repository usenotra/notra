import { expect, test } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

test("every original handler has a native route registered in the generated tree", () => {
  const sourceRoot = resolve(import.meta.dirname, "../src");
  const generated = readFileSync(
    resolve(sourceRoot, "routeTree.gen.ts"),
    "utf8"
  );
  const originalHandlers = readdirSync(resolve(sourceRoot, "app"), {
    recursive: true,
    encoding: "utf8",
  })
    .filter((file) => file === "route.ts" || file.endsWith("/route.ts"))
    .map((file) => `app/${file.slice(0, -3)}`);
  const representedHandlers = new Set<string>();
  const representedPaths = new Map<string, Set<string>>();
  const files = readdirSync(resolve(sourceRoot, "routes")).filter(
    (file) => file.endsWith(".ts") && !file.startsWith("-")
  );
  expect(originalHandlers.length).toBeGreaterThan(50);
  for (const file of files) {
    const source = readFileSync(resolve(sourceRoot, "routes", file), "utf8");
    const handler = source.match(
      /import\(\s*["']@\/(app\/[^"']+\/route)["']\s*\)/
    )?.[1];
    if (!handler) {
      expect(file).toBe("api.image.ts");
      continue;
    }
    expect(existsSync(resolve(sourceRoot, `${handler}.ts`))).toBe(true);
    const routePath = source.match(
      /createFileRoute\(\s*["']([^"']+)["']\s*\)/
    )?.[1];
    expect(routePath).toBeDefined();
    if (!routePath) {
      throw new Error(`Missing native route path in ${file}`);
    }
    representedHandlers.add(handler);
    const paths = representedPaths.get(handler) ?? new Set<string>();
    paths.add(routePath);
    representedPaths.set(handler, paths);
    expect(source).toMatch(
      /dispatchRouteHandler\(\s*handlers\s*,\s*request\s*,\s*(?:params\s*\)|\{\s*\.\.\.params\s*,)/
    );
    if (handler.includes("[...")) {
      if (routePath.endsWith("/$")) {
        expect(source).toContain('params._splat?.split("/")');
      } else {
        expect(handler).toContain("[[...");
        expect(routePath).toBe(`/${handler.slice(4).split("[[...")[0]}`);
        expect(source).not.toContain("params._splat");
      }
    }
    expect(source).toContain("ANY:");
    expect(generated).toContain(`./routes/${file.slice(0, -3)}`);
  }
  expect(
    originalHandlers.filter((handler) => !representedHandlers.has(handler))
  ).toEqual([]);
  for (const handler of originalHandlers.filter((path) =>
    path.includes("[[...")
  )) {
    const base = `/${handler.slice(4).split("[[...")[0]}`;
    expect(representedPaths.get(handler)?.has(base)).toBe(true);
    expect(representedPaths.get(handler)?.has(`${base}$`)).toBe(true);
  }
});

test("router combines generated server routes with dashboard, entry and onboarding UI routes", () => {
  const source = readFileSync(
    new URL("../src/router.tsx", import.meta.url),
    "utf8"
  );
  expect(source).toContain("Object.values(routeTree.children ?? {})");
  for (const factory of [
    "createDashboardUiRoutes",
    "createEntryUiRoutes",
    "createOnboardingUiRoutes",
  ]) {
    expect(source).toContain(`${factory}(routeTree)`);
  }
  expect(source).toContain("routeTree: dashboardRouteTree");
});
