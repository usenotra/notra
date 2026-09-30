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

import { ContentVideoPlayer } from "./content-video-player";

export interface SerializedContentVideoNode extends Spread<
  {
    src: string;
  },
  SerializedLexicalNode
> {}

function isSafeContentVideoSrc(src: string) {
  if (
    src.includes('"') ||
    src.includes("<") ||
    src.includes(">") ||
    src.includes(" ") ||
    src.includes(")") ||
    src.includes("\\")
  ) {
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

function $convertVideoElement(
  domNode: HTMLElement
): DOMConversionOutput | null {
  if (!(domNode instanceof HTMLVideoElement)) {
    return null;
  }
  const src = domNode.getAttribute("src") ?? "";
  if (!isSafeContentVideoSrc(src)) {
    return null;
  }
  return { node: $createContentVideoNode({ src }) };
}

export class ContentVideoNode extends DecoratorNode<JSX.Element> {
  __src: string;

  static getType(): string {
    return "content-video";
  }

  static clone(node: ContentVideoNode): ContentVideoNode {
    return new ContentVideoNode(node.__src, node.__key);
  }

  static importJSON(
    serializedNode: SerializedContentVideoNode
  ): ContentVideoNode {
    return $createContentVideoNode({ src: serializedNode.src });
  }

  static importDOM(): DOMConversionMap | null {
    return {
      video: () => ({
        conversion: $convertVideoElement,
        priority: 0,
      }),
    };
  }

  constructor(src: string, key?: NodeKey) {
    super(key);
    this.__src = src;
  }

  exportJSON(): SerializedContentVideoNode {
    return {
      src: this.__src,
      type: "content-video",
      version: 1,
    };
  }

  exportDOM(): DOMExportOutput {
    const video = document.createElement("video");
    video.setAttribute("src", this.__src);
    video.setAttribute("controls", "");
    return { element: video };
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const figure = document.createElement("figure");
    figure.className = "content-editor-video my-6";
    return figure;
  }

  updateDOM(): false {
    return false;
  }

  getSrc(): string {
    return this.__src;
  }

  decorate(): JSX.Element {
    return <ContentVideoPlayer src={this.__src} />;
  }
}

export function $createContentVideoNode(params: {
  src: string;
}): ContentVideoNode {
  if (!isSafeContentVideoSrc(params.src)) {
    throw new Error("Video URL is not allowed");
  }
  return $applyNodeReplacement(new ContentVideoNode(params.src));
}

export function $isContentVideoNode(
  node: LexicalNode | null | undefined
): node is ContentVideoNode {
  return node instanceof ContentVideoNode;
}
