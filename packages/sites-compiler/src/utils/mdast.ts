import type { Program } from "estree";
import type { Nodes } from "mdast";

import type { MdxJsxElement } from "../types/mdx";

export function isMdxJsxElement(node: Nodes): node is MdxJsxElement {
  return node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement";
}

export function hasClientDirective(element: MdxJsxElement): boolean {
  return element.attributes.some(
    (attribute) =>
      attribute.type === "mdxJsxAttribute" &&
      attribute.name.startsWith("client:")
  );
}

export function expressionPrograms(node: Nodes): Program[] {
  if (node.type === "mdxFlowExpression" || node.type === "mdxTextExpression") {
    return node.data?.estree ? [node.data.estree] : [];
  }
  if (!isMdxJsxElement(node)) {
    return [];
  }
  return node.attributes.flatMap((attribute) => {
    if (attribute.type === "mdxJsxExpressionAttribute") {
      return attribute.data?.estree ? [attribute.data.estree] : [];
    }
    const { value } = attribute;
    return typeof value === "object" && value?.data?.estree
      ? [value.data.estree]
      : [];
  });
}
