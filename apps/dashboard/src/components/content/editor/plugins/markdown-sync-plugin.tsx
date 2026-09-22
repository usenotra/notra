"use client";

import type { Transformer } from "@lexical/markdown";
import { $convertToMarkdownString } from "@lexical/markdown";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect, useRef } from "react";

import { stripReviewMarks } from "@/utils/review-markdown";

interface MarkdownSyncPluginProps {
  onChange: (markdown: string) => void;
  transformers: Transformer[];
  cleanReviewMarks?: boolean;
}

export function MarkdownSyncPlugin({
  onChange,
  transformers,
  cleanReviewMarks = false,
}: MarkdownSyncPluginProps) {
  const [editor] = useLexicalComposerContext();
  const lastMarkdownRef = useRef<string | null>(null);

  useEffect(() => {
    return editor.registerUpdateListener(
      ({ dirtyElements, dirtyLeaves, editorState }) => {
        if (dirtyElements.size === 0 && dirtyLeaves.size === 0) {
          return;
        }
        editorState.read(() => {
          const markdown = $convertToMarkdownString(transformers);
          const next = cleanReviewMarks ? stripReviewMarks(markdown) : markdown;
          if (next === lastMarkdownRef.current) {
            return;
          }
          lastMarkdownRef.current = next;
          onChange(next);
        });
      }
    );
  }, [cleanReviewMarks, editor, onChange, transformers]);

  return null;
}
