import type { SiteDiagnostic } from "@notra/sites-core/types/build";
import type { Program } from "estree";

import type { JsxSnippetAnalysis } from "./types/jsx";
import { hasErrors } from "./utils/diagnostics";
import { acornSyntaxError } from "./utils/errors";
import {
  declaredNames,
  exportedDeclarationNames,
  forbiddenUsage,
  nodeRange,
} from "./utils/estree";
import { missingHookImports, parseJsxModule } from "./utils/jsx";
import { offsetToLineColumn } from "./utils/paths";

export function analyzeJsxSnippet(
  path: string,
  source: string
): JsxSnippetAnalysis {
  const diagnostics: SiteDiagnostic[] = [];
  const error = (code: string, message: string, offset: number) => {
    diagnostics.push({
      severity: "error",
      code,
      message,
      file: path,
      ...offsetToLineColumn(source, offset),
    });
  };

  let program: Program;
  try {
    program = parseJsxModule(source);
  } catch (parseError) {
    const syntax = acornSyntaxError(parseError);
    error("jsx_syntax", `Syntax error: ${syntax.message}`, syntax.offset);
    return { diagnostics, exportedNames: [], output: null };
  }

  const ownNames = new Set<string>();
  const exportedNames: string[] = [];
  for (const statement of program.body) {
    const { start } = nodeRange(statement);
    switch (statement.type) {
      case "ImportDeclaration":
        if (statement.source.value !== "react") {
          error(
            "snippet_import",
            `Snippets cannot import "${String(statement.source.value)}". Import every snippet directly in the MDX page instead; npm packages are not supported.`,
            start
          );
        }
        for (const specifier of statement.specifiers) {
          ownNames.add(specifier.local.name);
        }
        break;
      case "ExportDefaultDeclaration":
        error(
          "default_export",
          "Default exports are not supported. Use a named export: export const MyComponent = () => …",
          start
        );
        break;
      case "ExportAllDeclaration":
        error("export_all", "export * is not supported in snippets", start);
        break;
      case "ExportNamedDeclaration":
        if (statement.source) {
          error(
            "reexport",
            "Re-exporting from another file is not supported",
            start
          );
        }
        for (const name of exportedDeclarationNames(statement)) {
          exportedNames.push(name);
          ownNames.add(name);
        }
        for (const specifier of statement.specifiers) {
          const { exported } = specifier;
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

  for (const forbidden of forbiddenUsage(program, declaredNames(program))) {
    error("forbidden_syntax", forbidden.message, forbidden.start);
  }

  if (exportedNames.length === 0) {
    diagnostics.push({
      severity: "warning",
      code: "no_exports",
      message: "This snippet exports nothing, so it cannot be used from MDX",
      file: path,
    });
  }

  if (hasErrors(diagnostics)) {
    return { diagnostics, exportedNames, output: null };
  }

  const hooks = missingHookImports(program, ownNames);
  const header =
    hooks.length > 0 ? `import { ${hooks.join(", ")} } from "react";\n` : "";
  return { diagnostics, exportedNames, output: `${header}${source}` };
}
