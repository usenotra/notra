import { SITE_INJECTED_REACT_HOOKS } from "@notra/sites-core/constants/sites";
import { Parser } from "acorn";
import jsx from "acorn-jsx";
import type { Program } from "estree";

import type { SiteDiagnostic } from "./types/diagnostics";
import {
  declaredNames,
  findForbiddenSyntax,
  findNodeApiUsage,
  referencedIdentifiers,
} from "./utils/estree";
import { offsetToLineColumn } from "./utils/paths";

const JsxParser = Parser.extend(jsx());
const INJECTED_HOOKS = new Set<string>(SITE_INJECTED_REACT_HOOKS);

export function parseJsxModule(source: string): Program {
  return JsxParser.parse(source, {
    ecmaVersion: "latest",
    sourceType: "module",
  }) as unknown as Program;
}

/** Hooks the code uses but neither imports nor declares; these get injected like on Mintlify. */
export function missingHookImports(
  program: Program,
  ownNames: ReadonlySet<string>
): string[] {
  const missing = new Set<string>();
  for (const reference of referencedIdentifiers(program as never)) {
    if (INJECTED_HOOKS.has(reference.name) && !ownNames.has(reference.name)) {
      missing.add(reference.name);
    }
  }
  return [...missing].sort();
}

export interface JsxSnippetAnalysis {
  diagnostics: SiteDiagnostic[];
  exportedNames: string[];
  output: string | null;
}

/**
 * Checks a `.jsx`/`.js` snippet against the documented contract (named exports,
 * no imports except React, no dynamic code loading) and returns the module with
 * hook imports injected.
 */
export function analyzeJsxSnippet(
  path: string,
  source: string
): JsxSnippetAnalysis {
  const diagnostics: SiteDiagnostic[] = [];
  const at = (offset: number) => ({
    file: path,
    ...offsetToLineColumn(source, offset),
  });

  let program: Program;
  try {
    program = parseJsxModule(source);
  } catch (error) {
    const pos = (error as { pos?: number }).pos ?? 0;
    diagnostics.push({
      severity: "error",
      code: "jsx_syntax",
      message: `Syntax error: ${(error as Error).message.replace(/\s*\(\d+:\d+\)$/, "")}`,
      ...at(pos),
    });
    return { diagnostics, exportedNames: [], output: null };
  }

  const ownNames = new Set<string>();
  const exportedNames: string[] = [];
  for (const statement of program.body) {
    const start = (statement as { start?: number }).start ?? 0;
    switch (statement.type) {
      case "ImportDeclaration":
        if (statement.source.value !== "react") {
          diagnostics.push({
            severity: "error",
            code: "snippet_import",
            message: `Snippets cannot import "${String(statement.source.value)}". Import every snippet directly in the MDX page instead; npm packages are not supported.`,
            ...at(start),
          });
        }
        for (const specifier of statement.specifiers) {
          ownNames.add(specifier.local.name);
        }
        break;
      case "ExportDefaultDeclaration":
        diagnostics.push({
          severity: "error",
          code: "default_export",
          message:
            "Default exports are not supported. Use a named export: export const MyComponent = () => …",
          ...at(start),
        });
        break;
      case "ExportAllDeclaration":
        diagnostics.push({
          severity: "error",
          code: "export_all",
          message: "export * is not supported in snippets",
          ...at(start),
        });
        break;
      case "ExportNamedDeclaration":
        if (statement.source) {
          diagnostics.push({
            severity: "error",
            code: "reexport",
            message: "Re-exporting from another file is not supported",
            ...at(start),
          });
        }
        if (statement.declaration?.type === "VariableDeclaration") {
          for (const declarator of statement.declaration.declarations) {
            if (declarator.id.type === "Identifier") {
              exportedNames.push(declarator.id.name);
              ownNames.add(declarator.id.name);
            }
          }
        } else if (
          statement.declaration?.type === "FunctionDeclaration" ||
          statement.declaration?.type === "ClassDeclaration"
        ) {
          exportedNames.push(statement.declaration.id.name);
          ownNames.add(statement.declaration.id.name);
        }
        for (const specifier of statement.specifiers) {
          const exported = specifier.exported;
          exportedNames.push(
            exported.type === "Identifier"
              ? exported.name
              : String(exported.value)
          );
        }
        break;
      case "VariableDeclaration":
        for (const declarator of statement.declarations) {
          if (declarator.id.type === "Identifier") {
            ownNames.add(declarator.id.name);
          }
        }
        break;
      case "FunctionDeclaration":
      case "ClassDeclaration":
        ownNames.add(statement.id.name);
        break;
      default:
        break;
    }
  }

  for (const forbidden of [
    ...findForbiddenSyntax(program),
    ...findNodeApiUsage(program, declaredNames(program as never)),
  ]) {
    diagnostics.push({
      severity: "error",
      code: "forbidden_syntax",
      message: forbidden.message,
      ...at(forbidden.start),
    });
  }

  if (exportedNames.length === 0) {
    diagnostics.push({
      severity: "warning",
      code: "no_exports",
      message: "This snippet exports nothing, so it cannot be used from MDX",
      file: path,
    });
  }

  if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    return { diagnostics, exportedNames, output: null };
  }

  const hooks = missingHookImports(program, ownNames);
  const header =
    hooks.length > 0 ? `import { ${hooks.join(", ")} } from "react";\n` : "";
  return { diagnostics, exportedNames, output: `${header}${source}` };
}
