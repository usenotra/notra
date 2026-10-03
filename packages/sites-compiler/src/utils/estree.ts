import type { Node as EstreeNode, Program } from "estree";
import { EXIT, visit as visitEstree } from "estree-util-visit";

/** Names bound by a declaration pattern (`const { a, b: [c] } = …` → a, c). */
export function patternNames(pattern: EstreeNode | null | undefined): string[] {
  if (!pattern) {
    return [];
  }
  switch (pattern.type) {
    case "Identifier":
      return [pattern.name];
    case "ObjectPattern":
      return pattern.properties.flatMap((property) =>
        property.type === "RestElement"
          ? patternNames(property.argument)
          : patternNames(property.value)
      );
    case "ArrayPattern":
      return pattern.elements.flatMap((element) => patternNames(element));
    case "RestElement":
      return patternNames(pattern.argument);
    case "AssignmentPattern":
      return patternNames(pattern.left);
    default:
      return [];
  }
}

/** Every name a node declares locally (params, variables, functions, classes, catch bindings). */
export function declaredNames(root: EstreeNode): Set<string> {
  const names = new Set<string>();
  visitEstree(root, (node) => {
    const current = node as EstreeNode;
    switch (current.type) {
      case "VariableDeclarator":
        for (const name of patternNames(current.id)) {
          names.add(name);
        }
        break;
      case "FunctionDeclaration":
      case "FunctionExpression":
      case "ArrowFunctionExpression":
        if ("id" in current && current.id) {
          names.add(current.id.name);
        }
        for (const param of current.params) {
          for (const name of patternNames(param)) {
            names.add(name);
          }
        }
        break;
      case "ClassDeclaration":
        if (current.id) {
          names.add(current.id.name);
        }
        break;
      case "CatchClause":
        for (const name of patternNames(current.param)) {
          names.add(name);
        }
        break;
      default:
        break;
    }
  });
  return names;
}

/**
 * Identifiers used as values (not property keys, member names or JSX attribute
 * names). Over-approximates scope on purpose: callers only use it to decide
 * whether something might reference an outer binding.
 */
export function referencedIdentifiers(
  root: EstreeNode
): Array<{ name: string; start: number; end: number }> {
  const references: Array<{ name: string; start: number; end: number }> = [];
  visitEstree(root, (node, key, _index, ancestors) => {
    const current = node as EstreeNode & { start?: number; end?: number };
    const parent = ancestors.at(-1) as EstreeNode | undefined;
    if (current.type === "Identifier") {
      if (
        parent?.type === "MemberExpression" &&
        key === "property" &&
        !parent.computed
      ) {
        return;
      }
      if (parent?.type === "Property" && key === "key" && !parent.computed) {
        return;
      }
      references.push({
        name: current.name,
        start: current.start ?? -1,
        end: current.end ?? -1,
      });
      return;
    }
    // JSX element names reference components too (`<Counter />`).
    const jsx = current as unknown as {
      type: string;
      name?: string;
      start?: number;
      end?: number;
    };
    if (
      jsx.type === "JSXIdentifier" &&
      key === "name" &&
      jsx.name &&
      /^[A-Z]/.test(jsx.name)
    ) {
      references.push({
        name: jsx.name,
        start: jsx.start ?? -1,
        end: jsx.end ?? -1,
      });
    }
  });
  return references;
}

export function containsJsxOrFunction(root: EstreeNode | Program): boolean {
  let found = false;
  visitEstree(root as EstreeNode, (node) => {
    const type = (node as { type: string }).type;
    if (
      type === "JSXElement" ||
      type === "JSXFragment" ||
      type === "ArrowFunctionExpression" ||
      type === "FunctionExpression" ||
      type === "FunctionDeclaration"
    ) {
      found = true;
      return EXIT;
    }
    return undefined;
  });
  return found;
}

export interface ForbiddenSyntax {
  message: string;
  start: number;
}

/** Dynamic imports, `require`, `eval` and `new Function` are never allowed in site code. */
export function findForbiddenSyntax(
  root: EstreeNode | Program
): ForbiddenSyntax[] {
  const found: ForbiddenSyntax[] = [];
  visitEstree(root as EstreeNode, (node) => {
    const current = node as EstreeNode & { start?: number };
    if (current.type === "ImportExpression") {
      found.push({
        message: "Dynamic import() is not supported",
        start: current.start ?? 0,
      });
    }
    if (
      current.type === "CallExpression" &&
      current.callee.type === "Identifier" &&
      (current.callee.name === "require" || current.callee.name === "eval")
    ) {
      found.push({
        message: `${current.callee.name}() is not supported`,
        start: current.start ?? 0,
      });
    }
    if (
      current.type === "NewExpression" &&
      current.callee.type === "Identifier" &&
      current.callee.name === "Function"
    ) {
      found.push({
        message: "new Function() is not supported",
        start: current.start ?? 0,
      });
    }
    if (current.type === "MetaProperty") {
      found.push({
        message: "import.meta is not available in site code",
        start: current.start ?? 0,
      });
    }
  });
  return found;
}

const NODE_ONLY_GLOBALS = new Set([
  "process",
  "require",
  "module",
  "exports",
  "__dirname",
  "__filename",
  "Bun",
  "Deno",
  "Buffer",
]);

/**
 * Site components run in the browser (and once at build time in the sandbox).
 * Node-only globals are part of neither contract, so using them is an error
 * even though the sandbox would contain it anyway.
 */
export function findNodeApiUsage(
  root: EstreeNode | Program,
  declared: ReadonlySet<string> = new Set()
): ForbiddenSyntax[] {
  const found: ForbiddenSyntax[] = [];
  for (const reference of referencedIdentifiers(root as EstreeNode)) {
    if (
      NODE_ONLY_GLOBALS.has(reference.name) &&
      !declared.has(reference.name)
    ) {
      found.push({
        message: `${reference.name} is a Node.js API and is not available in site components`,
        start: reference.start,
      });
    }
  }
  return found;
}
