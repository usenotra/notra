import { Parser } from "acorn";
import jsx from "acorn-jsx";
import type { Program } from "estree";

import { INJECTED_HOOK_NAMES } from "../constants/builtins";
import { referencedIdentifiers } from "./estree";

const JsxParser = Parser.extend(jsx());

export function parseJsxModule(source: string): Program {
  return JsxParser.parse(source, {
    ecmaVersion: "latest",
    sourceType: "module",
  }) as unknown as Program;
}

export function missingHookImports(
  program: Program,
  ownNames: ReadonlySet<string>
): string[] {
  const missing = new Set<string>();
  for (const reference of referencedIdentifiers(program)) {
    if (
      INJECTED_HOOK_NAMES.has(reference.name) &&
      !ownNames.has(reference.name)
    ) {
      missing.add(reference.name);
    }
  }
  return [...missing].sort();
}
