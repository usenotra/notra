import type { ModuleDeclaration, Node as EstreeNode, Statement } from "estree";
import { EXIT, visit as visitEstree } from "estree-util-visit";

import { COMPONENT_NAME, NODE_ONLY_GLOBALS } from "../constants/builtins";
import type {
  ForbiddenSyntax,
  IdentifierReference,
  JsxReferenceNode,
  SourceRange,
} from "../types/estree";

export function nodeRange(node: EstreeNode): SourceRange {
  const ranged = node as EstreeNode & Partial<SourceRange>;
  return { start: ranged.start ?? 0, end: ranged.end ?? 0 };
}

function patternNames(pattern: EstreeNode | null | undefined): string[] {
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

export function exportedDeclarationNames(
  statement: Statement | ModuleDeclaration
): string[] {
  if (statement.type !== "ExportNamedDeclaration" || !statement.declaration) {
    return [];
  }
  const { declaration } = statement;
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

export function referencedIdentifiers(root: EstreeNode): IdentifierReference[] {
  const references: IdentifierReference[] = [];
  visitEstree(root, (node, key, _index, ancestors) => {
    const current = node as EstreeNode & Partial<SourceRange>;
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
        shorthand:
          parent?.type === "Property" && parent.shorthand && key === "value",
      });
      return;
    }
    const jsx = node as JsxReferenceNode;
    if (
      jsx.type === "JSXIdentifier" &&
      key === "name" &&
      jsx.name &&
      COMPONENT_NAME.test(jsx.name)
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

export function containsJsxOrFunction(root: EstreeNode): boolean {
  let found = false;
  visitEstree(root, (node) => {
    const { type } = node as { type: string };
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

function findForbiddenSyntax(root: EstreeNode): ForbiddenSyntax[] {
  const found: ForbiddenSyntax[] = [];
  visitEstree(root, (node) => {
    const current = node as EstreeNode;
    const { start } = nodeRange(current);
    if (current.type === "ImportExpression") {
      found.push({ message: "Dynamic import() is not supported", start });
    }
    if (
      current.type === "CallExpression" &&
      current.callee.type === "Identifier" &&
      (current.callee.name === "require" || current.callee.name === "eval")
    ) {
      found.push({
        message: `${current.callee.name}() is not supported`,
        start,
      });
    }
    if (
      current.type === "NewExpression" &&
      current.callee.type === "Identifier" &&
      current.callee.name === "Function"
    ) {
      found.push({ message: "new Function() is not supported", start });
    }
    if (current.type === "MetaProperty") {
      found.push({
        message: "import.meta is not available in site code",
        start,
      });
    }
  });
  return found;
}

function findNodeApiUsage(
  root: EstreeNode,
  declared: ReadonlySet<string>
): ForbiddenSyntax[] {
  return referencedIdentifiers(root)
    .filter(
      (reference) =>
        NODE_ONLY_GLOBALS.has(reference.name) && !declared.has(reference.name)
    )
    .map((reference) => ({
      message: `${reference.name} is a Node.js API and is not available in site components`,
      start: reference.start,
    }));
}

export function forbiddenUsage(
  root: EstreeNode,
  declared: ReadonlySet<string> = new Set()
): ForbiddenSyntax[] {
  return [...findForbiddenSyntax(root), ...findNodeApiUsage(root, declared)];
}
