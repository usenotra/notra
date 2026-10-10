import { siteVariablesSchema } from "@notra/sites-core/schemas/site-layout";

import { siteVariablesConfigSchema } from "@/schemas/site-variables";
import type { SiteVariableRow } from "@/types/site-variables";

export function readSiteVariablesConfig(content: string) {
  return siteVariablesConfigSchema.parse(JSON.parse(content));
}

export function siteVariablesFromRows(rows: readonly SiteVariableRow[]) {
  const names = rows.map((row) => row.name.trim());
  if (new Set(names).size !== names.length) {
    throw new Error("duplicate");
  }
  return siteVariablesSchema.parse(
    Object.fromEntries(rows.map((row, index) => [names[index], row.value]))
  );
}

export function patchSiteVariables(
  content: string,
  rows: readonly SiteVariableRow[]
) {
  const config = readSiteVariablesConfig(content);
  config.variables = siteVariablesFromRows(rows);
  return `${JSON.stringify(config, null, 2)}\n`;
}
