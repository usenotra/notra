import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { isValidSiteSlug } from "@notra/sites-core/utils/hosts";

const listId = process.argv[2] ?? "Y83KG";
const count = Number(process.argv[3] ?? 5000);
const output = join(
  import.meta.dir,
  "../src/constants/reserved-brand-slugs.json"
);

async function download(url: string): Promise<Response> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} answered ${response.status}`);
  }
  return response;
}

const psl = await (
  await download("https://publicsuffix.org/list/public_suffix_list.dat")
).text();
const suffixes = new Set(
  psl
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("//") && !line.startsWith("!"))
);

const GENERIC_TLDS = new Set([
  "app",
  "biz",
  "co",
  "com",
  "dev",
  "gg",
  "info",
  "io",
  "ai",
  "me",
  "net",
  "org",
  "sh",
  "so",
  "tv",
  "xyz",
]);

function isCompanyDomain(domain: string): boolean {
  const tld = domain.split(".").at(-1) ?? "";
  return tld.length === 2 || GENERIC_TLDS.has(tld);
}

function brandLabel(domain: string): string | null {
  const labels = domain.toLowerCase().split(".");
  for (let start = 1; start < labels.length; start += 1) {
    const suffix = labels.slice(start).join(".");
    const wildcard = ["*", ...labels.slice(start + 1)].join(".");
    if (suffixes.has(suffix) || suffixes.has(wildcard)) {
      return labels[start - 1] ?? null;
    }
  }
  return null;
}

const dir = await mkdtemp(join(tmpdir(), "tranco-"));
const zip = join(dir, "list.zip");
await writeFile(
  zip,
  new Uint8Array(
    await (
      await download(`https://tranco-list.eu/download_daily/${listId}`)
    ).arrayBuffer()
  )
);
await Bun.$`unzip -o -q ${zip} -d ${dir}`;
const csv = await readFile(
  join(
    dir,
    (await Bun.$`ls ${dir}`.text())
      .split("\n")
      .find((name) => name.endsWith(".csv")) ?? "top-1m.csv"
  ),
  "utf8"
);

const reserved: Record<string, string> = {};
for (const line of csv.split("\n")) {
  if (Object.keys(reserved).length >= count) {
    break;
  }
  const domain = line.split(",")[1]?.trim();
  const label = domain && isCompanyDomain(domain) ? brandLabel(domain) : null;
  if (domain && label && isValidSiteSlug(label) && !(label in reserved)) {
    reserved[label] = domain;
  }
}

await writeFile(output, `${JSON.stringify(reserved, null, 2)}\n`);
console.log(`${Object.keys(reserved).length} reserved addresses → ${output}`);
