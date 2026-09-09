import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { $ } from "bun";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(packageRoot, "../../apps/ui/public/r");

await $`bunx shadcn build --output ${output}`.cwd(packageRoot);

const aliasRewrites: Array<[string, string]> = [
  ["@notra/ui/lib/utils", "@/lib/utils"],
  ["@notra/ui/lib/motion", "@/lib/motion"],
  ["@notra/ui/components/ui/", "@/components/ui/"],
];

const files = await readdir(output);
for (const name of files) {
  if (!name.endsWith(".json")) {
    continue;
  }
  const path = join(output, name);
  let contents = await readFile(path, "utf8");
  for (const [from, to] of aliasRewrites) {
    contents = contents.replaceAll(from, to);
  }
  await writeFile(path, contents);
}
