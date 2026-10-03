import { SITE_INJECTED_REACT_HOOKS } from "@notra/sites-core/constants/sites";
import type {
  ImportDeclaration,
  ModuleDeclaration,
  Program,
  Statement,
} from "estree";
import type { Nodes, Root, RootContent } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { mdxFromMarkdown } from "mdast-util-mdx";
import { mdxjs } from "micromark-extension-mdxjs";
import { visit } from "unist-util-visit";

import {
  BUILTIN_COMPONENTS,
  BUILTINS_IMPORT_SOURCE,
  INLINE_MODULE_SUFFIX,
  KNOWN_GLOBALS,
  SITE_IMPORT_ALIAS,
} from "./constants/builtins";
import { missingHookImports, parseJsxModule } from "./jsx";
import type { SiteDiagnostic } from "./types/diagnostics";
import {
  containsJsxOrFunction,
  declaredNames,
  findForbiddenSyntax,
  findNodeApiUsage,
  referencedIdentifiers,
} from "./utils/estree";
import { offsetToLineColumn, resolveSiteImport } from "./utils/paths";

const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/;
const BUILTINS = new Set<string>(BUILTIN_COMPONENTS);
const INJECTED_HOOKS = new Set<string>(SITE_INJECTED_REACT_HOOKS);

interface TextEdit {
  start: number;
  end: number;
  text: string;
}

export interface MdxAnalysisContext {
  /** Every file of the site, site-relative. */
  files: ReadonlySet<string>;
  /** Named exports of each `.jsx`/`.js` snippet, for import checks. */
  componentExports: ReadonlyMap<string, readonly string[]>;
  /** Entries (blog posts, changelog entries) get frontmatter; snippets get `{prop}` rewriting. */
  isEntry: boolean;
}

export interface MdxAnalysis {
  diagnostics: SiteDiagnostic[];
  /** Transformed MDX, or null when there are errors. */
  output: string | null;
  /** Generated module holding inline components, so they can hydrate as islands. */
  inlineModule: { path: string; source: string } | null;
  /** Site-relative paths this file imports. */
  imports: string[];
}

/** Replaces the frontmatter with same-length whitespace so parser offsets stay absolute. */
function blankFrontmatter(source: string): { text: string; length: number } {
  const match = FRONTMATTER.exec(source);
  if (!match) {
    return { text: source, length: 0 };
  }
  const blanked = match[0].replace(/[^\n]/g, " ");
  return {
    text: blanked + source.slice(match[0].length),
    length: match[0].length,
  };
}

function applyEdits(source: string, edits: TextEdit[]): string {
  let output = source;
  for (const edit of [...edits].sort(
    (a, b) => b.start - a.start || b.end - a.end
  )) {
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
  }
  return output;
}

function statementRange(statement: Statement | ModuleDeclaration): {
  start: number;
  end: number;
} {
  const ranged = statement as unknown as { start: number; end: number };
  return { start: ranged.start, end: ranged.end };
}

function exportedDeclarationNames(statement: ModuleDeclaration): string[] {
  if (statement.type !== "ExportNamedDeclaration" || !statement.declaration) {
    return [];
  }
  const declaration = statement.declaration;
  if (declaration.type === "VariableDeclaration") {
    return declaration.declarations.flatMap((declarator) =>
      declarator.id.type === "Identifier" ? [declarator.id.name] : []
    );
  }
  if (
    declaration.type === "FunctionDeclaration" ||
    declaration.type === "ClassDeclaration"
  ) {
    return declaration.id ? [declaration.id.name] : [];
  }
  return [];
}

function hasClientDirective(
  attributes: Array<{ type: string; name?: unknown }>
): boolean {
  return attributes.some(
    (attribute) =>
      attribute.type === "mdxJsxAttribute" &&
      typeof attribute.name === "string" &&
      attribute.name.startsWith("client:")
  );
}

type EsmNode = Extract<RootContent, { type: "mdxjsEsm" }>;

/** Shared state of one file's analysis: where errors and text edits are collected. */
interface MdxPass {
  path: string;
  source: string;
  /** Source with the frontmatter blanked, so parser offsets are absolute. */
  text: string;
  context: MdxAnalysisContext;
  diagnostics: SiteDiagnostic[];
  edits: TextEdit[];
}

/** What the file's import/export statements declare. */
interface ModuleScan {
  imports: string[];
  importedNames: Set<string>;
  exportedNames: Set<string>;
  /** React components from `.jsx` snippets or inline exports; they hydrate as islands. */
  hydrated: Set<string>;
  /** Default imports of `.mdx` snippets; rendered at build time. */
  contentComponents: Set<string>;
  /** `export const X = () => …`: moved into a generated module. */
  inline: Array<{
    names: string[];
    source: string;
    node: ModuleDeclaration;
    start: number;
  }>;
  /** `export const x = "value"`: kept, and copied into the generated module. */
  valueExports: string[];
}

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
  declared: ReadonlySet<string> = new Set()
) {
  for (const forbidden of [
    ...findForbiddenSyntax(program),
    ...findNodeApiUsage(program, declared),
  ]) {
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
    const place = (
      parseError as {
        place?: {
          line?: number;
          column?: number;
          start?: { line: number; column: number };
        };
      }
    ).place;
    const line = place?.line ?? place?.start?.line;
    const column = place?.column ?? place?.start?.column;
    pass.diagnostics.push({
      severity: "error",
      code: "mdx_syntax",
      file: pass.path,
      ...(line ? { line } : {}),
      ...(column ? { column } : {}),
      message: `MDX syntax error: ${(parseError as Error).message.split("\n")[0]}`,
    });
    return null;
  }
}

function scanImport(
  pass: MdxPass,
  statement: ImportDeclaration,
  scan: ModuleScan
) {
  const start = statementRange(statement).start;
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
  const literal = statementRange(statement.source as never);
  pass.edits.push({
    ...literal,
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
  statement: ModuleDeclaration,
  scan: ModuleScan
) {
  const range = statementRange(statement);
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
  if (containsJsxOrFunction(statement as never)) {
    scan.inline.push({ names, source, node: statement, start: range.start });
    pass.edits.push({ ...range, text: "" });
  } else {
    scan.valueExports.push(source);
  }
}

/** Import and export statements: resolves imports, sorts exports into inline components and values. */
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
    const program = node.data?.estree as Program | undefined;
    if (!program) {
      continue;
    }
    checkForbidden(pass, program, declaredNames(program as never));
    for (const statement of program.body) {
      if (statement.type === "ImportDeclaration") {
        scanImport(pass, statement, scan);
      } else {
        scanExport(pass, statement as ModuleDeclaration, scan);
      }
    }
  }
  for (const inline of scan.inline) {
    for (const name of inline.names.filter((candidate) =>
      /^[A-Z]/.test(candidate)
    )) {
      scan.hydrated.add(name);
    }
  }
  return scan;
}

/**
 * Inline components run in the browser as islands, so they cannot see values
 * imported by the MDX file (those only exist at build time).
 */
function checkInlineComponents(pass: MdxPass, scan: ModuleScan) {
  for (const inline of scan.inline) {
    const used = new Set(
      referencedIdentifiers(inline.node as never).map(
        (reference) => reference.name
      )
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

function expressionPrograms(node: Nodes): Program[] {
  if (node.type === "mdxFlowExpression" || node.type === "mdxTextExpression") {
    const program = (node as { data?: { estree?: Program } }).data?.estree;
    return program ? [program] : [];
  }
  if (node.type !== "mdxJsxFlowElement" && node.type !== "mdxJsxTextElement") {
    return [];
  }
  const element = node as Extract<RootContent, { type: "mdxJsxFlowElement" }>;
  return element.attributes.flatMap((attribute) => {
    if (attribute.type === "mdxJsxExpressionAttribute") {
      return attribute.data?.estree ? [attribute.data.estree as Program] : [];
    }
    const value = attribute.value;
    return value && typeof value === "object" && value.data?.estree
      ? [value.data.estree as Program]
      : [];
  });
}

/**
 * Snippets take props like Mintlify's: `{word}` in a snippet means the prop
 * `word`. Rewrites free identifiers to `props.word`.
 */
function snippetPropOffsets(
  program: Program,
  localNames: ReadonlySet<string>
): number[] {
  const declared = declaredNames(program as never);
  return referencedIdentifiers(program as never)
    .filter(
      (reference) =>
        reference.start >= 0 &&
        !localNames.has(reference.name) &&
        !declared.has(reference.name) &&
        !KNOWN_GLOBALS.has(reference.name) &&
        !BUILTINS.has(reference.name) &&
        !INJECTED_HOOKS.has(reference.name) &&
        !/^[A-Z]/.test(reference.name) &&
        !(reference.name in globalThis)
    )
    .map((reference) => reference.start);
}

/** Expressions and JSX in the content: checks, prop rewrites, client directives, built-ins. */
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
    if (
      node.type !== "mdxJsxFlowElement" &&
      node.type !== "mdxJsxTextElement"
    ) {
      return;
    }
    const name = node.name;
    const root = name?.split(".")[0] ?? "";
    if (!(name && /^[A-Z]/.test(root))) {
      return;
    }
    const start = node.position?.start.offset ?? 0;
    if (scan.hydrated.has(root)) {
      if (!hasClientDirective(node.attributes as never)) {
        const at = start + 1 + name.length;
        pass.edits.push({ start: at, end: at, text: " client:load" });
      }
    } else if (BUILTINS.has(root) && !localNames.has(root)) {
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

/** Moves inline components into `<file>.notra-inline.jsx` (hooks injected) and imports them back. */
function buildInlineModule(
  pass: MdxPass,
  scan: ModuleScan
): MdxAnalysis["inlineModule"] {
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

const hasErrors = (pass: MdxPass) =>
  pass.diagnostics.some((diagnostic) => diagnostic.severity === "error");

/**
 * Validates one MDX file against the site contract and rewrites it for the
 * Astro build: site imports go through the `@site` alias, inline components
 * move into a hydratable module, custom React components get `client:load`,
 * built-in components are imported, and snippet `{props}` resolve.
 * Nothing here executes customer code.
 */
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
  const tree = parseMdx(pass);
  if (!tree) {
    return {
      diagnostics: pass.diagnostics,
      output: null,
      inlineModule: null,
      imports: [],
    };
  }
  const scan = scanModule(pass, tree);
  checkInlineComponents(pass, scan);
  const usedBuiltins = walkContent(pass, tree, scan);
  const inlineModule = hasErrors(pass) ? null : buildInlineModule(pass, scan);
  if (hasErrors(pass)) {
    return {
      diagnostics: pass.diagnostics,
      output: null,
      inlineModule: null,
      imports: scan.imports,
    };
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
