"use client";

import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from "lexical";
import { $applyNodeReplacement, DecoratorNode } from "lexical";
import type { JSX } from "react";

import { ContentImageView } from "./content-image-view";

export interface SerializedContentImageNode extends Spread<
  {
    altText: string;
    src: string;
  },
  SerializedLexicalNode
> {}

function markdownImageDestination(src: string) {
  // Parentheses destinations cannot contain a raw space or `)`.
  return src.replaceAll(" ", "%20").replaceAll(")", "%29");
}

function isSafeContentImageSrc(src: string) {
  if (/[\s)]/.test(src) || src.includes("\\")) {
    return false;
  }
  if (src.startsWith("/") && !src.startsWith("//")) {
    return true;
  }
  try {
    const url = new URL(src);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function $convertImageElement(
  domNode: HTMLElement
): DOMConversionOutput | null {
  if (!(domNode instanceof HTMLImageElement)) {
    return null;
  }
  const src = domNode.getAttribute("src") ?? "";
  if (!isSafeContentImageSrc(src)) {
    return null;
  }
  return {
    node: $createContentImageNode({
      altText: domNode.alt,
      src,
    }),
  };
}

export class ContentImageNode extends DecoratorNode<JSX.Element> {
  __altText: string;
  __src: string;

  static getType(): string {
    return "content-image";
  }

  static clone(node: ContentImageNode): ContentImageNode {
    return new ContentImageNode(node.__src, node.__altText, node.__key);
  }

  static importJSON(
    serializedNode: SerializedContentImageNode
  ): ContentImageNode {
    return $createContentImageNode({
      altText: serializedNode.altText,
      src: serializedNode.src,
    });
  }

  static importDOM(): DOMConversionMap | null {
    return {
      img: () => ({
        conversion: $convertImageElement,
        priority: 0,
      }),
    };
  }

  constructor(src: string, altText: string, key?: NodeKey) {
    super(key);
    this.__src = src;
    this.__altText = altText;
  }

  exportJSON(): SerializedContentImageNode {
    return {
      altText: this.__altText,
      src: this.__src,
      type: "content-image",
      version: 1,
    };
  }

  exportDOM(): DOMExportOutput {
    const img = document.createElement("img");
    img.setAttribute("src", this.__src);
    img.setAttribute("alt", this.__altText);
    return { element: img };
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const figure = document.createElement("figure");
    figure.className = "content-editor-image my-6";
    return figure;
  }

  updateDOM(): false {
    return false;
  }

  getSrc(): string {
    return this.__src;
  }

  getAltText(): string {
    return this.__altText;
  }

  decorate(): JSX.Element {
    return <ContentImageView alt={this.__altText} src={this.__src} />;
  }
}

export function $createContentImageNode(params: {
  altText: string;
  src: string;
}): ContentImageNode {
  const src = markdownImageDestination(params.src);
  if (!isSafeContentImageSrc(src)) {
    throw new Error("Image URL is not allowed");
  }
  return $applyNodeReplacement(
    new ContentImageNode(src, params.altText.replace(/[\r\n]/g, " "))
  );
}

export function $isContentImageNode(
  node: LexicalNode | null | undefined
): node is ContentImageNode {
  return node instanceof ContentImageNode;
}
