import { expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

test.each([
  "../../src/",
  "../../../../packages/ui/src/",
  "../../../../packages/ai/src/",
])("%s has no Next framework imports", (directory) => {
  const source = fileURLToPath(new URL(directory, import.meta.url));
  const violations = readdirSync(source, { recursive: true })
    .filter((file) => /\.[cm]?[jt]sx?$/.test(String(file)))
    .filter((file) =>
      /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)["'](?:next(?:\/[^"']*)?|next-intl(?:\/[^"']*)?|@workos-inc\/authkit-nextjs(?:\/[^"']*)?|evlog\/next(?:\/[^"']*)?|workflow\/next)["']/.test(
        readFileSync(join(source, String(file)), "utf8")
      )
    );
  expect(violations).toEqual([]);
});

test("dashboard configuration does not depend on Next framework adapters", () => {
  const dashboard = fileURLToPath(new URL("../../", import.meta.url));
  const manifest = JSON.parse(
    readFileSync(join(dashboard, "package.json"), "utf8")
  );
  for (const dependencies of [
    manifest.dependencies,
    manifest.devDependencies,
  ]) {
    for (const name of ["next", "next-intl", "@workos-inc/authkit-nextjs"]) {
      expect(dependencies?.[name]).toBeUndefined();
    }
  }
  for (const name of [
    "next.config.ts",
    "next-env.d.ts",
    "src/i18n/request.ts",
  ]) {
    expect(existsSync(join(dashboard, name))).toBe(false);
  }
  const vite = readFileSync(join(dashboard, "vite.config.ts"), "utf8");
  expect(vite).not.toContain("next-intl");
  expect(vite).not.toContain("next\\/");
  expect(
    readFileSync(join(dashboard, "src/routes/__root.tsx"), "utf8")
  ).toContain("@/lib/analytics/client-init");
});
