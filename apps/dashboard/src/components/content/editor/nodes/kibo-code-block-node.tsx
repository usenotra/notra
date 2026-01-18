"use client";

import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from "lexical";
import { $applyNodeReplacement, DecoratorNode } from "lexical";
import { type JSX, lazy, Suspense } from "react";

const KiboCodeBlockComponent = lazy(
  () => import("./kibo-code-block-component")
);

export interface SerializedKiboCodeBlockNode
  extends Spread<
    {
      code: string;
      language: string;
    },
    SerializedLexicalNode
  > {}

function $convertCodeBlockElement(
  domNode: HTMLElement
): DOMConversionOutput | null {
  const code = domNode.textContent || "";
  const language = domNode.getAttribute("data-language") || "";
  const node = $createKiboCodeBlockNode(code, language);
  return { node };
}

export class KiboCodeBlockNode extends DecoratorNode<JSX.Element> {
  __code: string;
  __language: string;

  static getType(): string {
    return "kibo-code-block";
  }

  static clone(node: KiboCodeBlockNode): KiboCodeBlockNode {
    return new KiboCodeBlockNode(node.__code, node.__language, node.__key);
  }

  static importJSON(
    serializedNode: SerializedKiboCodeBlockNode
  ): KiboCodeBlockNode {
    return $createKiboCodeBlockNode(
      serializedNode.code,
      serializedNode.language
    );
  }

  static importDOM(): DOMConversionMap | null {
    return {
      pre: () => ({
        conversion: $convertCodeBlockElement,
        priority: 1,
      }),
    };
  }

  constructor(code: string, language: string, key?: NodeKey) {
    super(key);
    this.__code = code;
    this.__language = language;
  }

  exportJSON(): SerializedKiboCodeBlockNode {
    return {
      type: "kibo-code-block",
      version: 1,
      code: this.__code,
      language: this.__language,
    };
  }

  exportDOM(): DOMExportOutput {
    const pre = document.createElement("pre");
    const code = document.createElement("code");
    code.textContent = this.__code;
    pre.appendChild(code);
    pre.setAttribute("data-language", this.__language);
    return { element: pre };
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const div = document.createElement("div");
    div.className = "kibo-code-block-wrapper my-4";
    return div;
  }

  updateDOM(): false {
    return false;
  }

  getCode(): string {
    return this.__code;
  }

  getLanguage(): string {
    return this.__language;
  }

  setCode(code: string): void {
    const writable = this.getWritable();
    writable.__code = code;
  }

  setLanguage(language: string): void {
    const writable = this.getWritable();
    writable.__language = language;
  }

  decorate(_editor: LexicalEditor, _config: EditorConfig): JSX.Element {
    return (
      <Suspense
        fallback={<div className="h-32 animate-pulse rounded-lg bg-muted" />}
      >
        <KiboCodeBlockComponent
          code={this.__code}
          language={this.__language}
          nodeKey={this.__key}
        />
      </Suspense>
    );
  }
}

export function $createKiboCodeBlockNode(
  code: string,
  language: string
): KiboCodeBlockNode {
  return $applyNodeReplacement(new KiboCodeBlockNode(code, language));
}

export function $isKiboCodeBlockNode(
  node: LexicalNode | null | undefined
): node is KiboCodeBlockNode {
  return node instanceof KiboCodeBlockNode;
}
