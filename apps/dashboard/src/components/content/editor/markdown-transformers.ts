import {
  $createHorizontalRuleNode,
  $isHorizontalRuleNode,
  HorizontalRuleNode,
} from "@lexical/extension";
import type {
  ElementTransformer,
  MultilineElementTransformer,
  Transformer,
} from "@lexical/markdown";
import { TRANSFORMERS } from "@lexical/markdown";
import {
  $createKiboCodeBlockNode,
  $isKiboCodeBlockNode,
  KiboCodeBlockNode,
} from "./nodes/kibo-code-block-node";

export const HORIZONTAL_RULE: ElementTransformer = {
  dependencies: [HorizontalRuleNode],
  export: (node) => {
    return $isHorizontalRuleNode(node) ? "---" : null;
  },
  regExp: /^(---|\*\*\*|___)\s?$/,
  replace: (parentNode, _children, _match, isImport) => {
    const hrNode = $createHorizontalRuleNode();
    // When importing from markdown or when there's a next sibling, replace the node.
    // Otherwise, insert before to ensure proper cursor positioning after the transformation.
    if (isImport || parentNode.getNextSibling() != null) {
      parentNode.replace(hrNode);
    } else {
      parentNode.insertBefore(hrNode);
    }
    hrNode.selectNext();
  },
  type: "element",
};

export const KIBO_CODE_BLOCK: MultilineElementTransformer = {
  dependencies: [KiboCodeBlockNode],
  export: (node) => {
    if (!$isKiboCodeBlockNode(node)) {
      return null;
    }
    const language = node.getLanguage();
    const code = node.getCode();
    return `\`\`\`${language}\n${code}\n\`\`\``;
  },
  regExpEnd: {
    optional: true,
    regExp: /^[ \t]*```$/,
  },
  regExpStart: /^[ \t]*```(\w+)?/,
  replace: (
    rootNode,
    children,
    startMatch,
    _endMatch,
    linesInBetween,
    _isImport,
  ) => {
    const language = startMatch[1] || "";

    // During markdown import (linesInBetween has content)
    if (linesInBetween) {
      const code = linesInBetween.join("\n");
      const codeBlockNode = $createKiboCodeBlockNode(code, language);
      rootNode.append(codeBlockNode);
      return;
    }

    // During markdown shortcut (children exist, replace parent)
    if (children && children.length > 0) {
      const code = children.map((child) => child.getTextContent()).join("\n");
      const codeBlockNode = $createKiboCodeBlockNode(code, language);
      const firstChild = children[0];
      if (firstChild) {
        firstChild.getParentOrThrow().replace(codeBlockNode);
      } else {
        rootNode.append(codeBlockNode);
      }
    } else {
      // Handle empty code block (just ``` with no content)
      const codeBlockNode = $createKiboCodeBlockNode("", language);
      rootNode.append(codeBlockNode);
    }
  },
  type: "multiline-element",
};

function isMultilineTransformer(
  transformer: Transformer,
): transformer is MultilineElementTransformer {
  return transformer.type === "multiline-element";
}

// Filter out the default CODE transformer and add our custom one
const filteredTransformers = TRANSFORMERS.filter((transformer: Transformer) => {
  if (isMultilineTransformer(transformer)) {
    // Filter out the default code block transformer by checking its dependencies
    // The default CODE transformer uses CodeNode and CodeHighlightNode
    if (transformer.dependencies?.some((dep) => dep.getType?.() === "code")) {
      return false;
    }
  }
  return true;
});

export const EDITOR_TRANSFORMERS = [
  ...filteredTransformers,
  HORIZONTAL_RULE,
  KIBO_CODE_BLOCK,
];
