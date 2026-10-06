import type { ImportDeclaration, Program } from "estree";
import type { Root } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { mdxFromMarkdown } from "mdast-util-mdx";
import { mdxjs } from "micromark-extension-mdxjs";
import { visit } from "unist-util-visit";

import {
  BUILTIN_COMPONENT_NAMES,
  BUILTINS_IMPORT_SOURCE,
  COMPONENT_NAME,
  INJECTED_HOOK_NAMES,
  INLINE_MODULE_SUFFIX,
  KNOWN_GLOBALS,
  SITE_IMPORT_ALIAS,
} from "./constants/builtins";
import {
  BLOCKED_ELEMENT_HINT,
  BLOCKED_HTML_ELEMENTS,
} from "./constants/elements";
import { missingHookImports, parseJsxModule } from "./jsx";
import type {
  EsmNode,
  InlineModule,
  MdxAnalysis,
  MdxAnalysisContext,
  MdxPass,
  ModuleScan,
} from "./types/mdx";
import { hasErrors } from "./utils/diagnostics";
import { errorSummary, micromarkErrorPosition } from "./utils/errors";
import {
  containsJsxOrFunction,
  declaredNames,
  exportedDeclarationNames,
  forbiddenUsage,
  nodeRange,
  referencedIdentifiers,
} from "./utils/estree";
import {
  expressionPrograms,
  hasClientDirective,
  isMdxJsxElement,
} from "./utils/mdast";
import { offsetToLineColumn, resolveSiteImport } from "./utils/paths";
import { applyEdits, blankFrontmatter } from "./utils/text-edits";

function report(pass: MdxPass, code: string, message: string, offset: number) {
  pass.diagnostics.push({
    severity: "error",
    code,
    message,
    file: pass.path,
    ...offsetToLineColumn(pass.source, offset),
  });
}

function checkForbidden(
  pass: MdxPass,
  program: Program,
  declared?: ReadonlySet<string>
) {
  for (const forbidden of forbiddenUsage(program, declared)) {
    report(pass, "forbidden_syntax", forbidden.message, forbidden.start);
  }
}

function parseMdx(pass: MdxPass): Root | null {
  try {
    return fromMarkdown(pass.text, {
      extensions: [mdxjs()],
      mdastExtensions: [mdxFromMarkdown()],
    });
  } catch (parseError) {
    pass.diagnostics.push({
      severity: "error",
      code: "mdx_syntax",
      file: pass.path,
      ...micromarkErrorPosition(parseError),
      message: `MDX syntax error: ${errorSummary(parseError)}`,
    });
    return null;
  }
}

function scanImport(
  pass: MdxPass,
  statement: ImportDeclaration,
  scan: ModuleScan
) {
  const { start } = nodeRange(statement);
  const sourceValue = String(statement.source.value);
  const resolved = resolveSiteImport(
    pass.path,
    sourceValue,
    pass.context.files
  );
  if (!resolved.ok) {
    report(pass, "import", resolved.message, start);
    return;
  }
  scan.imports.push(resolved.path);
  pass.edits.push({
    ...nodeRange(statement.source),
    text: JSON.stringify(`${SITE_IMPORT_ALIAS}/${resolved.path}`),
  });
  for (const specifier of statement.specifiers) {
    scan.importedNames.add(specifier.local.name);
    if (resolved.kind === "content") {
      if (specifier.type === "ImportDefaultSpecifier") {
        scan.contentComponents.add(specifier.local.name);
      }
      continue;
    }
    if (specifier.type !== "ImportSpecifier") {
      report(
        pass,
        "component_import",
        `Import components by name: import { ${specifier.local.name} } from "${sourceValue}"`,
        start
      );
      continue;
    }
    const importedName =
      specifier.imported.type === "Identifier"
        ? specifier.imported.name
        : String(specifier.imported.value);
    if (
      !(pass.context.componentExports.get(resolved.path) ?? []).includes(
        importedName
      )
    ) {
      report(
        pass,
        "missing_export",
        `"${resolved.path}" has no export named ${importedName}`,
        start
      );
    }
    scan.hydrated.add(specifier.local.name);
  }
}

function scanExport(
  pass: MdxPass,
  statement: Exclude<Program["body"][number], ImportDeclaration>,
  scan: ModuleScan
) {
  const range = nodeRange(statement);
  if (statement.type === "ExportDefaultDeclaration") {
    report(
      pass,
      "default_export",
      "Default exports are not supported in MDX. Use a named export instead.",
      range.start
    );
    return;
  }
  if (statement.type === "ExportAllDeclaration") {
    report(pass, "export_all", "export * is not supported", range.start);
    return;
  }
  if (statement.type !== "ExportNamedDeclaration") {
    return;
  }
  if (statement.source || !statement.declaration) {
    report(
      pass,
      "reexport",
      "Only export const/function declarations are supported",
      range.start
    );
    return;
  }
  const names = exportedDeclarationNames(statement);
  for (const name of names) {
    scan.exportedNames.add(name);
  }
  const source = pass.text.slice(range.start, range.end);
  if (containsJsxOrFunction(statement)) {
    scan.inline.push({ names, source, node: statement, start: range.start });
    pass.edits.push({ ...range, text: "" });
  } else {
    scan.valueExports.push(source);
  }
}

function scanModule(pass: MdxPass, tree: Root): ModuleScan {
  const scan: ModuleScan = {
    imports: [],
    importedNames: new Set(),
    exportedNames: new Set(),
    hydrated: new Set(),
    contentComponents: new Set(),
    inline: [],
    valueExports: [],
  };
  for (const node of tree.children.filter(
    (child): child is EsmNode => child.type === "mdxjsEsm"
  )) {
    const program = node.data?.estree;
    if (!program) {
      continue;
    }
    checkForbidden(pass, program, declaredNames(program));
    for (const statement of program.body) {
      if (statement.type === "ImportDeclaration") {
        scanImport(pass, statement, scan);
      } else {
        scanExport(pass, statement, scan);
      }
    }
  }
  for (const inline of scan.inline) {
    for (const name of inline.names.filter((candidate) =>
      COMPONENT_NAME.test(candidate)
    )) {
      scan.hydrated.add(name);
    }
  }
  return scan;
}

function checkInlineComponents(pass: MdxPass, scan: ModuleScan) {
  for (const inline of scan.inline) {
    const used = new Set(
      referencedIdentifiers(inline.node).map((reference) => reference.name)
    );
    for (const name of scan.importedNames) {
      if (used.has(name)) {
        report(
          pass,
          "inline_uses_import",
          `An inline component uses "${name}", which is imported in this file. Move the component into a snippet (.jsx) and import what it needs there.`,
          inline.start
        );
      }
    }
  }
}

function snippetPropOffsets(
  program: Program,
  localNames: ReadonlySet<string>
): number[] {
  const declared = declaredNames(program);
  return referencedIdentifiers(program)
    .filter(
      (reference) =>
        reference.start >= 0 &&
        !localNames.has(reference.name) &&
        !declared.has(reference.name) &&
        !KNOWN_GLOBALS.has(reference.name) &&
        !BUILTIN_COMPONENT_NAMES.has(reference.name) &&
        !INJECTED_HOOK_NAMES.has(reference.name) &&
        !COMPONENT_NAME.test(reference.name) &&
        !(reference.name in globalThis)
    )
    .map((reference) => reference.start);
}

function walkContent(pass: MdxPass, tree: Root, scan: ModuleScan): Set<string> {
  const localNames = new Set([...scan.importedNames, ...scan.exportedNames]);
  const usedBuiltins = new Set<string>();
  const propOffsets = new Set<number>();
  visit(tree, (node) => {
    for (const program of expressionPrograms(node)) {
      checkForbidden(pass, program);
      if (!pass.context.isEntry) {
        for (const offset of snippetPropOffsets(program, localNames)) {
          propOffsets.add(offset);
        }
      }
    }
    if (!(isMdxJsxElement(node) && node.name)) {
      return;
    }
    const { name } = node;
    const root = name.split(".")[0] ?? "";
    const start = node.position?.start.offset ?? 0;
    if (BLOCKED_HTML_ELEMENTS.has(name.toLowerCase())) {
      report(
        pass,
        "blocked_element",
        `<${name}> ${BLOCKED_ELEMENT_HINT}`,
        start
      );
      return;
    }
    if (!COMPONENT_NAME.test(root)) {
      return;
    }
    if (scan.hydrated.has(root)) {
      if (!hasClientDirective(node)) {
        const at = start + 1 + name.length;
        pass.edits.push({ start: at, end: at, text: " client:load" });
      }
    } else if (BUILTIN_COMPONENT_NAMES.has(root) && !localNames.has(root)) {
      usedBuiltins.add(root);
    } else if (!(localNames.has(root) || scan.contentComponents.has(root))) {
      report(
        pass,
        "unknown_component",
        `Unknown component <${name}>. Import it from a snippet or use a built-in component.`,
        start
      );
    }
  });
  for (const offset of propOffsets) {
    pass.edits.push({ start: offset, end: offset, text: "props." });
  }
  return usedBuiltins;
}

function buildInlineModule(
  pass: MdxPass,
  scan: ModuleScan
): InlineModule | null {
  const first = scan.inline[0];
  if (!first) {
    return null;
  }
  const modulePath = `${pass.path}${INLINE_MODULE_SUFFIX}`;
  const body = [
    ...scan.valueExports,
    ...scan.inline.map((inline) => inline.source),
  ].join("\n\n");
  let hooks: string[];
  try {
    hooks = missingHookImports(parseJsxModule(body), scan.exportedNames);
  } catch (parseError) {
    pass.diagnostics.push({
      severity: "error",
      code: "inline_component",
      file: pass.path,
      message: `Inline component could not be compiled: ${(parseError as Error).message}`,
    });
    return null;
  }
  const names = scan.inline.flatMap((inline) => inline.names).join(", ");
  pass.edits.push({
    start: first.start,
    end: first.start,
    text: `import { ${names} } from ${JSON.stringify(`${SITE_IMPORT_ALIAS}/${modulePath}`)};\nexport { ${names} };`,
  });
  return {
    path: modulePath,
    source:
      hooks.length > 0
        ? `import { ${hooks.join(", ")} } from "react";\n\n${body}`
        : body,
  };
}

export function analyzeMdxFile(
  path: string,
  source: string,
  context: MdxAnalysisContext
): MdxAnalysis {
  const { text, length: frontmatterLength } = blankFrontmatter(source);
  const pass: MdxPass = {
    path,
    source,
    text,
    context,
    diagnostics: [],
    edits: [],
  };
  const failed = (imports: string[]): MdxAnalysis => ({
    diagnostics: pass.diagnostics,
    output: null,
    inlineModule: null,
    imports,
  });
  const tree = parseMdx(pass);
  if (!tree) {
    return failed([]);
  }
  const scan = scanModule(pass, tree);
  checkInlineComponents(pass, scan);
  const usedBuiltins = walkContent(pass, tree, scan);
  if (hasErrors(pass.diagnostics)) {
    return failed(scan.imports);
  }
  const inlineModule = buildInlineModule(pass, scan);
  if (hasErrors(pass.diagnostics)) {
    return failed(scan.imports);
  }
  if (usedBuiltins.size > 0) {
    pass.edits.push({
      start: frontmatterLength,
      end: frontmatterLength,
      text: `import { ${[...usedBuiltins].sort().join(", ")} } from ${JSON.stringify(BUILTINS_IMPORT_SOURCE)};\n\n`,
    });
  }
  const edited = applyEdits(text, pass.edits);
  return {
    diagnostics: pass.diagnostics,
    output:
      source.slice(0, frontmatterLength) + edited.slice(frontmatterLength),
    inlineModule,
    imports: scan.imports,
  };
}
