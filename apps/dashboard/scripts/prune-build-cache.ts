import {
  existsSync,
  lstatSync,
  readdirSync,
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

const pruneBunStore = (): void => {
  if (!existsSync(storeDir)) {
    return;
  }

  const workspaceNodeModules = ["apps", "packages"].flatMap((group) =>
    listDir(path.join(repoRoot, group)).map((workspace) =>
      path.join(repoRoot, group, workspace, "node_modules")
    )
  );
  const roots = [
    path.join(repoRoot, "node_modules"),
    path.join(storeDir, "node_modules"),
    ...workspaceNodeModules,
  ];

  const reachable = new Set<string>();
  const queue = roots.flatMap(listPackageLinks);
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
  console.log(
    `Pruned ${stale.length} stale bun store entries, kept ${reachable.size}`
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
