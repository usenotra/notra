import {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  statSync,
} from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const storeDir = path.join(repoRoot, "node_modules/.bun");
const turbopackCacheDir = path.join(
  repoRoot,
  "apps/dashboard/.next/cache/turbopack"
);
const MAX_TURBOPACK_CACHE_BYTES = 2 * 1024 ** 3;

const listDir = (dir: string): string[] =>
  existsSync(dir) ? readdirSync(dir) : [];

const listPackageLinks = (nodeModulesDir: string): string[] =>
  listDir(nodeModulesDir)
    .filter((name) => name !== ".bun" && name !== ".bin")
    .flatMap((name) =>
      name.startsWith("@")
        ? listDir(path.join(nodeModulesDir, name)).map((scoped) =>
            path.join(nodeModulesDir, name, scoped)
          )
        : [path.join(nodeModulesDir, name)]
    )
    .filter((link) => lstatSync(link).isSymbolicLink());

const toStoreEntry = (link: string): string | undefined => {
  const target = path.resolve(path.dirname(link), readlinkSync(link));
  const relative = path.relative(storeDir, target);
  if (relative.startsWith("..")) {
    return undefined;
  }
  return relative.split(path.sep)[0];
};

const directorySize = (dir: string): number =>
  readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .reduce(
      (total, entry) =>
        total + statSync(path.join(entry.parentPath, entry.name)).size,
      0
    );

const DEPENDENCY_FIELDS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
] as const;

const workspaceDirs = (): string[] =>
  [
    repoRoot,
    ...["apps", "packages"].flatMap((group) =>
      listDir(path.join(repoRoot, group)).map((workspace) =>
        path.join(repoRoot, group, workspace)
      )
    ),
  ].filter((dir) => existsSync(path.join(dir, "package.json")));

const declaredDependencyLinks = (workspaceDir: string): string[] => {
  const manifest: Partial<
    Record<(typeof DEPENDENCY_FIELDS)[number], Record<string, string>>
  > = JSON.parse(readFileSync(path.join(workspaceDir, "package.json"), "utf8"));
  const names = new Set(
    DEPENDENCY_FIELDS.flatMap((field) => Object.keys(manifest[field] ?? {}))
  );
  return [...names]
    .map((name) => path.join(workspaceDir, "node_modules", name))
    .filter((link) => {
      try {
        return lstatSync(link).isSymbolicLink();
      } catch {
        return false;
      }
    });
};

const removeDanglingLinks = (nodeModulesDir: string): number => {
  const links = [
    ...listPackageLinks(nodeModulesDir),
    ...listDir(path.join(nodeModulesDir, ".bin")).map((name) =>
      path.join(nodeModulesDir, ".bin", name)
    ),
  ].filter((link) => !existsSync(link));
  for (const link of links) {
    rmSync(link, { force: true });
  }
  return links.length;
};

const pruneBunStore = (): void => {
  if (!existsSync(storeDir)) {
    return;
  }

  const workspaces = workspaceDirs();
  const reachable = new Set<string>();
  const queue = workspaces.flatMap(declaredDependencyLinks);
  while (queue.length > 0) {
    const link = queue.pop();
    const entry = link ? toStoreEntry(link) : undefined;
    if (!entry || reachable.has(entry)) {
      continue;
    }
    reachable.add(entry);
    queue.push(...listPackageLinks(path.join(storeDir, entry, "node_modules")));
  }

  const stale = listDir(storeDir).filter(
    (entry) => entry !== "node_modules" && !reachable.has(entry)
  );
  for (const entry of stale) {
    rmSync(path.join(storeDir, entry), { force: true, recursive: true });
  }
  const danglingLinks = [
    path.join(storeDir, "node_modules"),
    ...workspaces.map((dir) => path.join(dir, "node_modules")),
  ].reduce((total, dir) => total + removeDanglingLinks(dir), 0);
  console.log(
    `Pruned ${stale.length} stale bun store entries and ${danglingLinks} dangling links, kept ${reachable.size}`
  );
};

const pruneTurbopackCache = (): void => {
  const [current, ...stale] = listDir(turbopackCacheDir)
    .map((name) => path.join(turbopackCacheDir, name))
    .toSorted((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  for (const dir of stale) {
    rmSync(dir, { force: true, recursive: true });
  }
  console.log(`Pruned ${stale.length} stale Turbopack caches`);

  if (!current) {
    return;
  }
  const size = directorySize(current);
  if (size > MAX_TURBOPACK_CACHE_BYTES) {
    rmSync(current, { force: true, recursive: true });
  }
  console.log(
    `Turbopack cache ${path.basename(current)} is ${Math.round(size / 1024 ** 2)} MB${size > MAX_TURBOPACK_CACHE_BYTES ? ", reset" : ""}`
  );
};

pruneBunStore();
pruneTurbopackCache();
