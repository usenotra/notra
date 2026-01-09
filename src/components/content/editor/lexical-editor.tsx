"use client";

import { CodeNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { $convertFromMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { ClickableLinkPlugin } from "@lexical/react/LexicalClickableLinkPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { type RefObject, useCallback, useMemo, useRef } from "react";
import { editorTheme } from "./editor-theme";
import { EditorAutoLinkPlugin } from "./plugins/auto-link-plugin";
import {
  type EditorRefHandle,
  EditorRefPlugin,
} from "./plugins/editor-ref-plugin";
import { MarkdownSyncPlugin } from "./plugins/markdown-sync-plugin";
import { SelectionPlugin } from "./plugins/selection-plugin";

interface LexicalEditorProps {
  initialMarkdown: string;
  onChange: (markdown: string) => void;
  onSelectionChange: (selectedText: string | null) => void;
  editable?: boolean;
  editorRef?: RefObject<EditorRefHandle | null>;
}

export function LexicalEditor({
  initialMarkdown,
  onChange,
  onSelectionChange,
  editable = true,
  editorRef,
}: LexicalEditorProps) {
  const isProgrammaticUpdateRef = useRef(false);

  const onError = useCallback((error: Error) => {
    console.error("Lexical error:", error);
  }, []);

  const initialConfig = useMemo(
    () => ({
      namespace: "ContentEditor",
      nodes: [
        HeadingNode,
        QuoteNode,
        ListNode,
        ListItemNode,
        CodeNode,
        LinkNode,
        AutoLinkNode,
      ],
      theme: editorTheme,
      editable,
      onError,
      editorState: () => {
        $convertFromMarkdownString(initialMarkdown, TRANSFORMERS);
      },
    }),
    [initialMarkdown, editable, onError]
  );

  const handleChange = useCallback(
    (markdown: string) => {
      if (!isProgrammaticUpdateRef.current) {
        onChange(markdown);
      }
    },
    [onChange]
  );

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="lexical-editor relative">
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              className={`min-h-[500px] outline-none ${
                editable ? "" : "cursor-default"
              }`}
            />
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <ListPlugin />
        {editable && <MarkdownShortcutPlugin transformers={TRANSFORMERS} />}
        {editable && <EditorAutoLinkPlugin />}
        <ClickableLinkPlugin newTab />
        <MarkdownSyncPlugin onChange={handleChange} />
        <SelectionPlugin onSelectionChange={onSelectionChange} />
        {editorRef && (
          <EditorRefPlugin
            editorRef={editorRef}
            isProgrammaticUpdateRef={isProgrammaticUpdateRef}
          />
        )}
      </div>
    </LexicalComposer>
  );
}
