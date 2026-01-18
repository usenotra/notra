"use client";

import type { Transformer } from "@lexical/markdown";
import { $convertToMarkdownString } from "@lexical/markdown";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";

interface MarkdownSyncPluginProps {
  onChange: (markdown: string) => void;
  transformers: Transformer[];
}

export function MarkdownSyncPlugin({
  onChange,
  transformers,
}: MarkdownSyncPluginProps) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const markdown = $convertToMarkdownString(transformers);
        onChange(markdown);
      });
    });
  }, [editor, onChange, transformers]);

  return null;
}
